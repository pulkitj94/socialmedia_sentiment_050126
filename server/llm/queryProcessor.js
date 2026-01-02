import MetadataExtractor from '../utils/metadataExtractor.js';
import FilterGenerator from './filterGenerator.js';
import FilterValidator from '../utils/filterValidator.js';
import DataProcessor from '../utils/dataProcessor.js';
import ResponseFramer from './responseFramer.js';
import ResponseValidator from './responseValidator.js';
import { getConversationManager } from './conversationManager.js';
import QueryValidator from './queryValidator.js';

/**
 * Main orchestrator for LLM-driven query processing
 * V4.3 FIXED: Now properly handles V4.3 rich clarification responses
 */
class QueryProcessor {
  constructor() {
    this.metadataExtractor = new MetadataExtractor();
    this.filterGenerator = new FilterGenerator();
    this.queryValidator = new QueryValidator();
    this.dataProcessor = new DataProcessor();
    this.responseFramer = new ResponseFramer();
    this.responseValidator = new ResponseValidator();
    this.metadata = null;
    this.initialized = false;
  }

  /**
   * Initialize metadata (call once at startup)
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    console.log('🔍 Initializing Query Processor...');
    console.log('📊 Extracting dataset metadata...');

    this.metadata = await this.metadataExtractor.extractMetadata();

    console.log(`✅ Metadata extracted successfully`);
    console.log(`   - Files: ${this.metadata.files.length}`);
    console.log(`   - Columns: ${this.metadata.columns.length}`);
    console.log(`   - Total Records: ${this.metadata.files.reduce((sum, f) => sum + f.recordCount, 0)}`);

    this.initialized = true;
  }

  /**
   * Process a user query with multi-step support
   * @param {string} userQuery - The user's natural language query
   * @param {string} sessionId - Session identifier for conversation context
   * @returns {Object} Complete response with data and metadata
   */
  async processQuery(userQuery, sessionId = 'default') {
    const conversationManager = getConversationManager();

    // Analyze if query is multi-step or needs context
    const analysis = await conversationManager.analyzeQuery(userQuery, sessionId);

    // Add user message to conversation history
    conversationManager.addMessage(sessionId, 'user', userQuery);

    if (analysis.isMultiStep && analysis.steps.length > 1) {
      // Multi-step query processing
      console.log(`\n📊 Query Analysis: ${JSON.stringify(analysis)}`);
      console.log(`\n🔄 Multi-step query detected: ${analysis.steps.length} steps`);
      return await this.processMultiStepQuery(userQuery, analysis, sessionId);
    } else {
      // Single-step query (may use context)
      const finalQuery = analysis.steps[0].query;
      const result = await this.processSingleQuery(finalQuery, sessionId);

      // Store result for potential follow-up queries
      conversationManager.storeIntermediateResult(sessionId, result);

      // Add assistant response to conversation
      conversationManager.addMessage(sessionId, 'assistant', result.narrative);

      return result;
    }
  }

  /**
   * Process multi-step query with intermediate results
   * @param {string} originalQuery - Original user query
   * @param {Object} analysis - Query analysis with steps
   * @param {string} sessionId - Session identifier
   * @returns {Object} Combined response
   */
  async processMultiStepQuery(originalQuery, analysis, sessionId) {
    const startTime = Date.now();
    const conversationManager = getConversationManager();
    const stepResults = [];

    console.log('\n' + '='.repeat(80));
    console.log('🔄 MULTI-STEP QUERY PROCESSING');
    console.log('='.repeat(80));
    console.log(`Original Query: "${originalQuery}"`);
    console.log(`Number of Steps: ${analysis.steps.length}`);
    console.log('');

    // Process each step sequentially
    for (const step of analysis.steps) {
      console.log(`\n📍 Step ${step.stepNumber}/${analysis.steps.length}: ${step.description}`);
      console.log(`   Query: "${step.query}"`);

      try {
        const stepResult = await this.processSingleQuery(step.query, sessionId);

        // Check if this step needs clarification
        if (stepResult.needsClarification) {
          console.log(`⚠️  Step ${step.stepNumber} needs clarification - returning to user`);
          console.log('='.repeat(80) + '\n');

          // Return clarification immediately - don't continue processing
          return {
            success: false,
            needsClarification: true,
            clarification: stepResult.clarification,
            originalQuery: originalQuery,
            stepNumber: step.stepNumber,
            stepDescription: step.description,
            message: `Clarification needed for step ${step.stepNumber}: ${step.description}`,
          };
        }

        stepResults.push({
          stepNumber: step.stepNumber,
          description: step.description,
          query: step.query,
          data: stepResult.data,
          summary: stepResult.summary,
          success: true,
        });

        // Store intermediate result
        conversationManager.storeIntermediateResult(sessionId, stepResult);

        console.log(`✅ Step ${step.stepNumber} completed: ${stepResult.data.length} results`);
      } catch (error) {
        console.error(`❌ Step ${step.stepNumber} failed:`, error.message);

        stepResults.push({
          stepNumber: step.stepNumber,
          description: step.description,
          query: step.query,
          success: false,
          error: error.message,
        });

        // If a step fails, stop processing
        break;
      }
    }

    // Combine results from all steps
    const lastSuccessfulStep = stepResults.filter(s => s.success).pop();

    if (!lastSuccessfulStep) {
      throw new Error('All steps failed. Please try rephrasing your query.');
    }

    // Generate combined narrative
    const combinedNarrative = await this.generateMultiStepNarrative(
      originalQuery,
      stepResults,
      analysis
    );

    // Add assistant response to conversation
    conversationManager.addMessage(sessionId, 'assistant', combinedNarrative);

    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total multi-step processing time: ${totalTime}ms`);
    console.log('='.repeat(80) + '\n');

    return {
      success: true,
      isMultiStep: true,
      data: lastSuccessfulStep.data,
      narrative: combinedNarrative,
      insights: this.generateInsights(
        { data: lastSuccessfulStep.data, summary: lastSuccessfulStep.summary },
        { filters: [] }
      ),
      response: combinedNarrative,
      summary: lastSuccessfulStep.summary,
      metadata: {
        processingTimeMs: totalTime,
        steps: stepResults.map(s => ({
          stepNumber: s.stepNumber,
          description: s.description,
          success: s.success,
          resultCount: s.data?.length || 0,
        })),
        totalSteps: analysis.steps.length,
        successfulSteps: stepResults.filter(s => s.success).length,
        llmCalls: stepResults.filter(s => s.success).length * 2 + 1, // Each step + analysis
      },
      stepResults: stepResults,
    };
  }

  /**
   * Generate narrative for multi-step query results
   */
  async generateMultiStepNarrative(originalQuery, stepResults, analysis) {
    const successfulSteps = stepResults.filter(s => s.success);
    const lastStep = successfulSteps[successfulSteps.length - 1];

    // If no successful steps, return error narrative
    if (!lastStep || !lastStep.data || lastStep.data.length === 0) {
      let narrative = `I processed your multi-step query in ${stepResults.length} step(s):\n\n`;

      stepResults.forEach(step => {
        if (step.success) {
          narrative += `✅ **Step ${step.stepNumber}**: ${step.description}\n`;
          narrative += `   Found ${step.data?.length || 0} result(s)\n\n`;
        } else {
          narrative += `❌ **Step ${step.stepNumber}**: ${step.description}\n`;
          narrative += `   Failed: ${step.error}\n\n`;
        }
      });

      return narrative;
    }

    // Use LLM to generate detailed, insightful narrative for successful multi-step query
    try {
      // Create a detailed query for the response framer
      const detailedQuery = `${originalQuery}

Provide a comprehensive executive summary with:
1. Key Insight - the main finding
2. Data Evidence - specific metrics from the results
3. Analysis - what this means
4. Recommendation - actionable next steps
5. Context - comparisons or additional insights`;

      // Use the response framer to generate a detailed narrative
      const response = await this.responseFramer.frameResponse(
        detailedQuery,
        {
          data: lastStep.data,
          summary: lastStep.summary
        },
        {
          filters: [],
          interpretation: originalQuery,
          metadata: {
            isMultiStep: true,
            steps: stepResults.map(s => ({
              stepNumber: s.stepNumber,
              description: s.description,
              resultCount: s.data?.length || 0
            }))
          }
        }
      );

      // Validate that the response contains actual insights
      if (response && response.length > 100) {
        return response;
      }

      // Fallback to simple narrative if LLM fails
      throw new Error('LLM response too short');

    } catch (error) {
      console.log('⚠️  Failed to generate detailed narrative with LLM, using fallback:', error.message);

      // Fallback: Simple narrative
      let narrative = `I processed your multi-step query in ${stepResults.length} step(s):\n\n`;

      stepResults.forEach(step => {
        if (step.success) {
          narrative += `✅ **Step ${step.stepNumber}**: ${step.description}\n`;
          narrative += `   Found ${step.data.length} result(s)\n\n`;
        } else {
          narrative += `❌ **Step ${step.stepNumber}**: ${step.description}\n`;
          narrative += `   Failed: ${step.error}\n\n`;
        }
      });

      // Add final results summary
      if (lastStep && lastStep.data.length > 0) {
        narrative += `\n**Final Results:**\n\n`;

        const topResults = lastStep.data.slice(0, 5);
        topResults.forEach((item, index) => {
          const keys = Object.keys(item).filter(k => !k.startsWith('_'));
          const summary = keys.slice(0, 3).map(k => `${k}: ${item[k]}`).join(', ');
          narrative += `${index + 1}. ${summary}\n`;
        });

        if (lastStep.data.length > 5) {
          narrative += `\n...and ${lastStep.data.length - 5} more result(s)\n`;
        }
      }

      return narrative;
    }
  }

  /**
   * Process a single query (used by both single-step and multi-step)
   * V4.3 FIXED: Now properly handles V4.3 rich clarification responses
   * @param {string} userQuery - The user's natural language query
   * @param {string} sessionId - Session identifier
   * @returns {Object} Complete response with data and metadata
   */
  async processSingleQuery(userQuery, sessionId = 'default') {
    const startTime = Date.now();

    console.log('\n' + '='.repeat(80));
    console.log('🔍 PROCESSING QUERY');
    console.log('='.repeat(80));
    console.log(`Query: "${userQuery}"`);
    console.log('');

    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }

      // Step 1: Generate filters using LLM
      console.log('📝 Step 1/5: Generating filters with LLM...');
      const filterSpec = await this.filterGenerator.generateFilters(userQuery, this.metadata);

      // ═══════════════════════════════════════════════════════════
      // V4.3 FIX: Check for clarification using correct field names
      // ═══════════════════════════════════════════════════════════
      if (filterSpec.needsClarification) {
        // V4.3 returns rich response with multiple fields
        // Extract options from ANY of these fields:
        const options = filterSpec.options ||
          filterSpec.alternatives ||
          filterSpec.suggestedOptions ||
          filterSpec.suggestedQueries ||
          [];

        console.log('⚠️  Query validation failed:', filterSpec.reason || filterSpec.clarificationNeeded);
        console.log('⚠️  Query needs clarification from filter generator');
        console.log(`   - Question: ${filterSpec.clarificationNeeded || filterSpec.reason}`);
        console.log(`   - Options: ${options.length}`);

        // Pass through ALL V4.3 rich data to frontend
        return {
          success: false,
          needsClarification: true,
          clarification: {
            // Main question (try multiple field names for compatibility)
            question: filterSpec.clarificationNeeded || filterSpec.reason || filterSpec.question,

            // Options array (handles both V4.2 and V4.3 formats)
            options: options,

            // V4.3 ADDITION: Pass through rich response data
            alternatives: filterSpec.alternatives,
            explanation: filterSpec.explanation,
            dataAvailable: filterSpec.dataAvailable,
            dataNotAvailable: filterSpec.dataNotAvailable,
            suggestedActions: filterSpec.suggestedActions,
            helpfulContext: filterSpec.helpfulContext,

            // Legacy/backward compatibility
            reason: filterSpec.interpretation || filterSpec.reason,
            suggestion: filterSpec.suggestion,
            alternativeQuery: filterSpec.alternativeQuery,
            availablePlatforms: filterSpec.availablePlatforms,
            suggestedQueries: filterSpec.suggestedQueries
          },
          message: 'This query needs clarification',
          metadata: {
            processingTimeMs: Date.now() - startTime,
          }
        };
      }

      console.log(`✅ Filters generated`);
      console.log(`   - Filters: ${filterSpec.filters ? filterSpec.filters.length : 0}`);
      console.log(`   - Group by: ${filterSpec.groupBy ? filterSpec.groupBy.join(', ') : 'none'}`);
      console.log(`   - Aggregate: ${filterSpec.aggregate ? Object.keys(filterSpec.aggregate).join(', ') : 'none'}`);
      console.log(`   - Sort by: ${filterSpec.sortBy ? `${filterSpec.sortBy.column} (${filterSpec.sortBy.order})` : 'none'}`);
      console.log(`   - Limit: ${filterSpec.limit || 'none'}`);
      console.log(`   - Interpretation: ${filterSpec.interpretation}`);
      console.log('\n📋 Full Filter Specification:');
      console.log(JSON.stringify(filterSpec, null, 2));

      // Step 1.5: Check if query intent matches filters (CLARIFICATION CHECK)
      console.log('\n🔍 Step 1.5/5: Validating query intent...');
      const intentValidation = this.queryValidator.validate(userQuery, filterSpec, this.metadata);

      if (intentValidation.needsClarification) {
        console.log('⚠️  Query needs clarification:');
        intentValidation.issues.forEach(issue => {
          console.log(`   - [${issue.severity.toUpperCase()}] ${issue.message}`);
        });

        // Return clarification request instead of proceeding
        return {
          success: false,
          needsClarification: true,
          clarification: intentValidation.clarificationQuestion,
          issues: intentValidation.issues,
          userIntent: intentValidation.userIntent,
          filterIntent: intentValidation.filterIntent,
          message: 'This query needs clarification before proceeding',
          metadata: {
            processingTimeMs: Date.now() - startTime,
          }
        };
      }

      if (intentValidation.warnings.length > 0) {
        console.log('⚠️  Intent validation warnings:');
        intentValidation.warnings.forEach(warning => {
          console.log(`   - [${warning.severity.toUpperCase()}] ${warning.message}`);
        });
      }

      console.log('✅ Query intent validated');

      // Step 2: Validate filters
      console.log('\n🔍 Step 2/4: Validating filters...');
      const validator = new FilterValidator(this.metadata);
      const validation = validator.validate(filterSpec);

      if (!validation.valid) {
        console.error('❌ Filter validation failed:');
        validation.errors.forEach(err => console.error(`   - ${err}`));
        throw new Error(`Filter validation failed: ${validation.errors.join('; ')}`);
      }

      console.log('✅ Filters validated successfully');

      // Sanitize filters
      const sanitizedFilterSpec = validator.sanitize(filterSpec);

      // Step 3: Apply filters and process data
      console.log('\n⚙️  Step 3/4: Processing data with filters...');
      const processedData = this.dataProcessor.processData(sanitizedFilterSpec);
      console.log(`✅ Data processed`);
      console.log(`   - Original records: ${processedData.summary.originalRecords}`);
      console.log(`   - Filtered records: ${processedData.summary.filteredRecords}`);
      console.log(`   - Results: ${processedData.summary.resultCount}`);
      console.log(`   - Processing time: ${processedData.summary.processingTimeMs}ms`);
      console.log('\n📊 Processed Data (first 3 results):');
      console.log(JSON.stringify(processedData.data.slice(0, 3), null, 2));

      // Step 4: Frame response using LLM
      console.log('\n💬 Step 4/5: Framing response with LLM...');
      const narrative = await this.responseFramer.frameResponse(
        userQuery,
        processedData,
        sanitizedFilterSpec
      );
      console.log('✅ Response generated');

      // Step 5: Generate insights from data (not LLM-generated, deterministic)
      console.log('\n📊 Step 5/5: Generating deterministic insights...');
      const insights = this.generateInsights(processedData, sanitizedFilterSpec);
      console.log('✅ Insights generated');

      // Step 6: Validate LLM response
      console.log('\n🔍 Validating LLM response...');
      const responseValidation = this.responseValidator.validate(narrative, processedData.data, insights);

      if (responseValidation.warnings.length > 0) {
        console.log('⚠️  Validation warnings:');
        responseValidation.warnings.forEach(warning => console.log(`   - ${warning}`));
      }

      if (responseValidation.errors.length > 0) {
        console.log('❌ Validation errors:');
        responseValidation.errors.forEach(error => console.log(`   - ${error}`));
      }

      console.log(`✅ Validation complete (confidence: ${(responseValidation.confidence * 100).toFixed(1)}%)`);
      if (responseValidation.stats) {
        console.log(`   - Numbers in narrative: ${responseValidation.stats.totalNumbers}`);
        console.log(`   - Verified against data: ${responseValidation.stats.verifiedNumbers}`);
        console.log(`   - Unverified: ${responseValidation.stats.unverifiedNumbers}`);
      }

      const totalTime = Date.now() - startTime;
      console.log(`\n⏱️  Total processing time: ${totalTime}ms`);
      console.log('='.repeat(80) + '\n');

      return {
        success: true,
        // Structured data (always accurate)
        data: processedData.data,
        // LLM-generated natural language (for qualitative insights)
        narrative: narrative,
        // Data-driven insights (deterministic, no LLM)
        insights: insights,
        // Legacy response field for backward compatibility
        response: narrative,
        // Summary statistics
        summary: processedData.summary,
        // Query metadata
        metadata: {
          processingTimeMs: totalTime,
          dataProcessingTimeMs: processedData.summary.processingTimeMs,
          filtersApplied: filterSpec.filters || [],
          interpretation: filterSpec.interpretation,
          recordsAnalyzed: processedData.summary.filteredRecords,
          recordsTotal: processedData.summary.originalRecords,
          resultsReturned: processedData.summary.resultCount,
          llmCalls: 2, // Filter generation + Response framing
          validation: {
            confidence: responseValidation.confidence,
            warnings: responseValidation.warnings,
            errors: responseValidation.errors,
            stats: responseValidation.stats
          }
        },
        // Debug info
        debug: {
          filterSpec: sanitizedFilterSpec,
          processedData: processedData.data.slice(0, 10) // First 10 results for debugging
        }
      };

    } catch (error) {
      console.error('❌ Error processing query:', error);
      console.log('='.repeat(80) + '\n');

      return {
        success: false,
        response: this.generateErrorResponse(error, userQuery),
        error: error.message,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          llmCalls: 0
        }
      };
    }
  }

  /**
   * Generate user-friendly error response with actionable suggestions
   */
  generateErrorResponse(error, userQuery) {
    const errorMessage = error.message || 'Unknown error';

    // Filter validation errors
    if (errorMessage.includes('Filter validation failed')) {
      return `I encountered an issue understanding your query. The filters I tried to create were invalid.

**Error Details:**
${errorMessage}

**💡 Suggestions:**
Try rephrasing your question more specifically:
- ✅ "Show me Instagram posts from November 2025"
- ✅ "Which platform had the highest engagement rate?"
- ✅ "Compare Facebook and Instagram performance in November"
- ✅ "Top 5 posts with most likes on Instagram"

**Available platforms:** Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube
**Available metrics:** likes, comments, shares, engagement_rate, reach, impressions`;
    }

    // LLM JSON parsing errors
    if (errorMessage.includes('LLM did not return valid JSON')) {
      return `I had trouble processing your query. The system couldn't generate appropriate filters.

**💡 Suggestions:**
- Try simplifying your question
- Break complex queries into smaller parts
- Use clear, specific terms

**Examples of well-formed queries:**
- "Show posts with more than 1000 likes"
- "Posts from November on Instagram"
- "Compare engagement across platforms"`;
    }

    // Column not found errors
    if (errorMessage.includes('Column') && errorMessage.includes('not found')) {
      return `I couldn't find the column or field you're asking about.

**Error:** ${errorMessage}

**💡 Suggestions:**
Available columns you can query:
- **Post data:** post_id, platform, post_date, content, likes, comments, shares, engagement_rate
- **Campaign data:** campaign_id, campaign_name, ad_spend, revenue, roas, ctr, impressions
- **Metrics:** reach, clicks, conversions

Try rephrasing with one of these column names.`;
    }

    // No data found
    if (errorMessage.includes('No data') || errorMessage.includes('0 records')) {
      return `No data found matching your query.

**💡 Suggestions:**
- Try broadening your search criteria
- Check if the platform name is correct (Instagram, Facebook, Twitter, etc.)
- Verify the date range exists in the dataset
- Try removing some filters

**Example queries that work:**
- "Show all Instagram posts"
- "Posts from last month"
- "Top performing content"`;
    }

    // Generic error with suggestions
    return `I encountered an error while processing your query: "${userQuery}"

**Error:** ${errorMessage}

**💡 Suggestions:**
1. Try rephrasing your question more clearly
2. Use specific dates (e.g., "November 2025" instead of "last month")
3. Specify the platform name clearly
4. Break complex questions into simpler parts

**Need help?** Try asking:
- "What platforms are available?"
- "Show me a sample post"
- "What metrics can I query?"

If the issue persists, please contact support.`;
  }

  /**
   * Generate deterministic insights from processed data
   * This is NOT LLM-generated - pure data analysis
   */
  generateInsights(processedData, filterSpec) {
    const { data, summary } = processedData;
    const insights = {
      type: null,
      keyFindings: [],
      topResults: [],
      statistics: {}
    };

    // Determine query type based on filter spec
    if (filterSpec.groupBy && filterSpec.groupBy.length > 0) {
      // Comparison/Aggregation query
      insights.type = 'comparison';
      insights.keyFindings.push(`Analyzed ${summary.filteredRecords} records across ${data.length} groups`);

      // Extract top results
      insights.topResults = data.slice(0, 5).map((item, index) => ({
        rank: index + 1,
        ...item
      }));

      // Calculate statistics
      if (filterSpec.aggregate && Object.keys(filterSpec.aggregate).length > 0) {
        const aggKeys = Object.keys(filterSpec.aggregate);
        const metricKey = `${aggKeys[0]}_${filterSpec.aggregate[aggKeys[0]]}`;

        if (data.length > 0 && data[0][metricKey] !== undefined) {
          const values = data.map(d => d[metricKey]).filter(v => v !== null && v !== undefined);
          insights.statistics = {
            metric: aggKeys[0],
            aggregation: filterSpec.aggregate[aggKeys[0]],
            min: Math.min(...values),
            max: Math.max(...values),
            average: values.reduce((a, b) => a + b, 0) / values.length,
            count: values.length
          };
        }
      }

    } else {
      // Individual item query
      insights.type = 'individual_items';
      insights.keyFindings.push(`Found ${data.length} matching record(s) from ${summary.filteredRecords} filtered records`);

      // Extract top results with all fields
      insights.topResults = data.slice(0, 10);

      // Calculate statistics for numeric columns
      if (data.length > 0) {
        const numericColumns = Object.keys(data[0]).filter(key => {
          const value = data[0][key];
          return !key.startsWith('_') && !isNaN(parseFloat(value));
        });

        insights.statistics = {};
        numericColumns.forEach(col => {
          const values = data.map(d => parseFloat(d[col])).filter(v => !isNaN(v));
          if (values.length > 0) {
            insights.statistics[col] = {
              min: Math.min(...values),
              max: Math.max(...values),
              average: values.reduce((a, b) => a + b, 0) / values.length,
              total: values.reduce((a, b) => a + b, 0)
            };
          }
        });
      }
    }

    // Add filter information
    insights.filtersApplied = filterSpec.filters ? filterSpec.filters.length : 0;
    insights.groupedBy = filterSpec.groupBy || [];
    insights.sortedBy = filterSpec.sortBy ? `${filterSpec.sortBy.column} (${filterSpec.sortBy.order})` : null;

    return insights;
  }

  /**
   * Get metadata summary (for debugging)
   */
  async getMetadataSummary() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.metadataExtractor.getSummary();
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCache() {
    this.dataProcessor.clearCache();
    this.metadata = null;
    this.initialized = false;
  }

  /**
   * Clear conversation session
   * @param {string} sessionId - Session identifier
   */
  clearConversation(sessionId = 'default') {
    const conversationManager = getConversationManager();
    conversationManager.clearSession(sessionId);
  }

  /**
   * Get conversation statistics
   */
  getConversationStats() {
    const conversationManager = getConversationManager();
    return conversationManager.getStats();
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of QueryProcessor
 */
function getQueryProcessor() {
  if (!instance) {
    instance = new QueryProcessor();
  }
  return instance;
}

export { QueryProcessor, getQueryProcessor };