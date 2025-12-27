import { ChatOpenAI } from '@langchain/openai';
import { LANGCHAIN_CONFIG } from '../langchain/config.js';

/**
 * Clarification Engine
 * Detects when queries are ambiguous and generates clarification questions
 */
class ClarificationEngine {
  constructor() {
    this.llm = null; // Lazy initialization
  }

  getLLM() {
    if (!this.llm) {
      this.llm = new ChatOpenAI({
        modelName: LANGCHAIN_CONFIG.llm.modelName,
        temperature: 0.1,
        maxTokens: 1000,
      });
    }
    return this.llm;
  }

  /**
   * Check if query needs clarification
   * @param {string} userQuery - The user's query
   * @param {Object} metadata - Dataset metadata
   * @param {Object} filterSpec - Generated filter specification
   * @returns {Object} Clarification analysis
   */
  async checkNeedsClarification(userQuery, metadata, filterSpec) {
    const prompt = this.buildClarificationPrompt(userQuery, metadata, filterSpec);

    try {
      const llm = this.getLLM();
      const response = await llm.invoke(prompt);
      const content = response.content;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If LLM doesn't return JSON, assume no clarification needed
        return {
          needsClarification: false,
          confidence: 1.0,
        };
      }

      const analysis = JSON.parse(jsonMatch[0]);

      console.log('🔍 Clarification Analysis:', {
        needsClarification: analysis.needsClarification,
        confidence: analysis.confidence,
        issueType: analysis.issueType,
      });

      return analysis;
    } catch (error) {
      console.error('Error checking clarification:', error);
      // Fallback: assume no clarification needed
      return {
        needsClarification: false,
        confidence: 1.0,
      };
    }
  }

  /**
   * Build clarification prompt
   */
  buildClarificationPrompt(userQuery, metadata, filterSpec) {
    const availablePlatforms = this.extractAvailablePlatforms(metadata);
    const availableMetrics = this.extractAvailableMetrics(metadata);
    const requestedPlatforms = this.extractRequestedPlatforms(filterSpec);

    return `You are a query clarification assistant. Your job is to detect when a user's query is ambiguous or when the generated filters might not match their intent.

USER QUERY:
"${userQuery}"

GENERATED FILTER SPECIFICATION:
${JSON.stringify(filterSpec, null, 2)}

AVAILABLE DATA:
Platforms: ${availablePlatforms.join(', ')}
Key Metrics: ${availableMetrics.slice(0, 10).join(', ')}
Total Records: ${metadata.files.reduce((sum, f) => sum + f.recordCount, 0)}

FILES IN DATASET:
${metadata.files.map(f => `- ${f.filename} (${f.recordCount} records)`).join('\n')}

YOUR TASK:
Determine if clarification is needed from the user BEFORE executing this query.

CLARIFICATION IS NEEDED IF:
1. **Missing Platform Data**: User asks about a platform but filters don't include it
   - Example: "Compare Facebook and Instagram" but filter only has Facebook
2. **Ambiguous Comparison**: User wants comparison but unclear what to compare
   - Example: "Which is better?" - Better by what metric?
3. **Missing Required Filter**: Query needs filtering but no filter applied
   - Example: "Show top posts" - Top by what? Likes? Engagement?
4. **Data Availability Mismatch**: User asks for data that might not exist
   - Example: Asks for "Q4 2024" but data only has 2025
5. **Contradictory Intent**: Generated filters contradict user's apparent intent
   - Example: User says "compare" but filter only shows one platform

DO NOT NEED CLARIFICATION IF:
- Query is clear and specific
- Filters match user intent
- All requested data is available
- Comparison includes all mentioned platforms

RETURN JSON:
{
  "needsClarification": true/false,
  "confidence": 0.0-1.0,  // How confident are you in the filter spec
  "issueType": "missing_platform|ambiguous_metric|missing_filter|data_mismatch|contradictory_intent|none",
  "specificIssue": "Brief description of the issue",
  "suggestedQuestion": "Question to ask the user (if clarification needed)",
  "suggestedOptions": ["Option 1", "Option 2", "Option 3"],  // User choices
  "reasoning": "Why clarification is/isn't needed"
}

EXAMPLES:

Example 1 (Needs Clarification):
User: "How are my Facebook Ads performing compared to Instagram?"
Filters: platform = "Facebook Ads"
Analysis:
{
  "needsClarification": true,
  "confidence": 0.3,
  "issueType": "missing_platform",
  "specificIssue": "User asked to compare Facebook and Instagram, but filter only includes Facebook Ads",
  "suggestedQuestion": "I found Facebook Ads data (22 records) and Instagram Ads data (15 records). Would you like me to compare both platforms' ad performance?",
  "suggestedOptions": [
    "Yes, compare both Facebook Ads and Instagram Ads",
    "No, just show Facebook Ads performance",
    "Actually, I meant organic posts, not ads"
  ],
  "reasoning": "User explicitly asked for comparison but generated filter only captures one platform. This is a clear mismatch."
}

Example 2 (Needs Clarification):
User: "Show me the best performing posts"
Filters: [no specific filter]
Analysis:
{
  "needsClarification": true,
  "confidence": 0.5,
  "issueType": "ambiguous_metric",
  "specificIssue": "User said 'best performing' but it's unclear which metric to use",
  "suggestedQuestion": "What metric would you like to use to determine 'best performing'?",
  "suggestedOptions": [
    "Engagement rate (likes + comments / reach)",
    "Total likes",
    "Total reach/impressions"
  ],
  "reasoning": "'Best' is subjective and can mean different metrics"
}

Example 3 (No Clarification Needed):
User: "Show Instagram posts from November with engagement > 5%"
Filters: platform = "Instagram", posted_date contains "11-2025", engagement_rate > 5
Analysis:
{
  "needsClarification": false,
  "confidence": 0.95,
  "issueType": "none",
  "specificIssue": null,
  "suggestedQuestion": null,
  "suggestedOptions": null,
  "reasoning": "Query is specific with clear filters. All criteria are well-defined."
}

Example 4 (Needs Clarification):
User: "Compare platforms"
Filters: [some filter]
Analysis:
{
  "needsClarification": true,
  "confidence": 0.4,
  "issueType": "ambiguous_metric",
  "specificIssue": "User wants to compare platforms but didn't specify what to compare or which platforms",
  "suggestedQuestion": "I can compare platforms, but I need more information. What would you like to compare?",
  "suggestedOptions": [
    "Compare all platforms' average engagement rate",
    "Compare Facebook and Instagram ad performance",
    "Compare total reach across all platforms"
  ],
  "reasoning": "Too vague - needs both platform selection and comparison metric"
}

Now analyze the user's query above. Return ONLY valid JSON.`;
  }

  /**
   * Extract available platforms from metadata
   */
  extractAvailablePlatforms(metadata) {
    if (!metadata.uniqueValues || !metadata.uniqueValues.platform) {
      return [];
    }
    return metadata.uniqueValues.platform;
  }

  /**
   * Extract available metrics
   */
  extractAvailableMetrics(metadata) {
    if (!metadata.numericColumns) {
      return [];
    }
    return metadata.numericColumns;
  }

  /**
   * Extract requested platforms from filter spec
   */
  extractRequestedPlatforms(filterSpec) {
    if (!filterSpec.filters) return [];

    const platforms = [];
    filterSpec.filters.forEach(filter => {
      if (filter.column === 'platform') {
        if (Array.isArray(filter.value)) {
          platforms.push(...filter.value);
        } else {
          platforms.push(filter.value);
        }
      }
    });

    return platforms;
  }
}

// Singleton instance
let clarificationEngineInstance = null;

export function getClarificationEngine() {
  if (!clarificationEngineInstance) {
    clarificationEngineInstance = new ClarificationEngine();
  }
  return clarificationEngineInstance;
}

export default ClarificationEngine;
