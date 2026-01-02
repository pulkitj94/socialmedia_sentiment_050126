import { ChatOpenAI } from '@langchain/openai';
import { LANGCHAIN_CONFIG } from '../langchain/config.js';
import { getFilterCache } from '../utils/filterCache.js';

/**
 * LLM-based filter generator
 * Uses GPT to intelligently create filter conditions based on user queries
 */
class FilterGenerator {
  constructor() {
    this.llm = null; // Lazy initialization
    this.cache = getFilterCache();
  }

  getLLM() {
    if (!this.llm) {
      this.llm = new ChatOpenAI({
        modelName: LANGCHAIN_CONFIG.llm.modelName,
        temperature: 0.1, // Low temperature for deterministic filter generation
        maxTokens: 1500,
      });
    }
    return this.llm;
  }

  /**
   * Classify query type to apply appropriate filtering strategy
   * FIX 4: Added query type classification
   */
  classifyQueryType(userQuery) {
    const query = userQuery.toLowerCase();

    // Comparative ranking queries
    if (/worst|best|top\s+\d*\s*|bottom|highest|lowest|most|least/i.test(query)) {
      // Check if asking for individual items or categories
      const individualPatterns = /\b(post|campaign|ad|tweet|content|item)\b/i;
      const categoryPatterns = /\b(platform|type|format|objective|theme|category)\b/i;

      if (individualPatterns.test(query) && !categoryPatterns.test(query)) {
        return 'ranking_individual';
      }
      return 'ranking_category';
    }

    // Comparative analysis
    if (/compare|vs|versus|difference\s+between/i.test(query)) {
      return 'comparative';
    }

    // Temporal queries
    if (/q1|q2|q3|q4|quarter|last\s+(week|month|year)/i.test(query)) {
      return 'temporal';
    }

    // Counting queries
    if (/how\s+many|number\s+of|count/i.test(query)) {
      return 'counting';
    }

    return 'factual';
  }


  /**
   * POST-PROCESSING: Fix common LLM mistakes
   * This is the KEY addition - validates and corrects LLM output
   */
  postProcessFilters(filterSpec, queryType, userQuery) {
    console.log('🔧 Post-processing filters for query type:', queryType);

    const fixes = [];

    // FIX 1: Remove empty sortBy objects (causes validation errors)
    if (filterSpec.sortBy && typeof filterSpec.sortBy === 'object') {
      if (Object.keys(filterSpec.sortBy).length === 0 || !filterSpec.sortBy.column) {
        delete filterSpec.sortBy;
        fixes.push('Removed empty sortBy object');
      }
    }

    // FIX 2: Counting queries should not have sortBy
    if (queryType === 'counting') {
      if (filterSpec.sortBy) {
        delete filterSpec.sortBy;
        fixes.push('Removed sortBy from counting query');
      }

      // Ensure we're using a valid column for counting
      if (filterSpec.aggregate) {
        const aggKeys = Object.keys(filterSpec.aggregate);
        if (aggKeys.length > 0) {
          const aggColumn = aggKeys[0];
          // If using invalid column name, replace with post_id or campaign_id
          if (aggColumn === 'metric_column' || aggColumn === 'column_name' || aggColumn === 'field') {
            const validColumn = userQuery.toLowerCase().includes('campaign') ? 'campaign_id' : 'post_id';
            filterSpec.aggregate = { [validColumn]: 'count' };
            fixes.push(`Fixed aggregation column: ${aggColumn} → ${validColumn}`);
          }
        }
      }
    }

    // FIX 3: Comparative ranking queries need higher limits and proper structure
    if (queryType === 'ranking_category') {
      // Ensure we're grouping for comparison
      if (!filterSpec.groupBy || filterSpec.groupBy.length === 0) {
        // Detect what to group by from query
        const query = userQuery.toLowerCase();
        if (query.includes('platform')) {
          filterSpec.groupBy = ['platform'];
          fixes.push('Added platform groupBy for comparative query');
        }
        if (query.includes('type') || query.includes('format')) {
          if (!filterSpec.groupBy) filterSpec.groupBy = [];
          if (query.includes('post') || query.includes('content')) {
            filterSpec.groupBy.push('media_type');
            fixes.push('Added media_type groupBy for post type comparison');
          }
        }
        // If asking for "worst/best post type", group by both platform and media_type
        if ((query.includes('worst') || query.includes('best')) &&
          (query.includes('post type') || query.includes('content type'))) {
          filterSpec.groupBy = ['platform', 'media_type'];
          fixes.push('Added platform+media_type groupBy for post type comparison');
        }
      }

      // Ensure proper aggregation exists
      if (!filterSpec.aggregate || Object.keys(filterSpec.aggregate).length === 0) {
        filterSpec.aggregate = { 'engagement_rate': 'mean' };
        fixes.push('Added default engagement_rate aggregation');
      }

      // Ensure sortBy exists for ranking
      if (!filterSpec.sortBy || !filterSpec.sortBy.column) {
        const aggColumn = Object.keys(filterSpec.aggregate)[0];
        const order = userQuery.toLowerCase().includes('worst') ||
          userQuery.toLowerCase().includes('lowest') ? 'asc' : 'desc';
        filterSpec.sortBy = { column: aggColumn, order };
        fixes.push(`Added sortBy: ${aggColumn} ${order}`);
      }

      // CRITICAL: Increase limit to show all categories for comparison
      // ALWAYS set high limit for ranking queries, even if LLM already set one
      if (!filterSpec.limit || filterSpec.limit < 20) {
        filterSpec.limit = 20; // Show ALL platform x type combinations (increased from 15)
        fixes.push(`Increased limit to 20 for comprehensive comparative ranking (was: ${filterSpec.limit || 'none'})`);
      }

      // Remove restrictive filters for "worst/best" queries
      if (userQuery.toLowerCase().includes('worst') || userQuery.toLowerCase().includes('best')) {
        if (filterSpec.filters && filterSpec.filters.length > 0) {
          // Keep only date/platform filters, remove performance filters
          filterSpec.filters = filterSpec.filters.filter(f => {
            const isDateFilter = f.column && f.column.includes('date');
            const isPlatformFilter = f.column && f.column.includes('platform');
            const isPerformanceFilter = f.column &&
              (f.column.includes('engagement') || f.column.includes('rate') ||
                f.column.includes('likes') || f.column.includes('reach'));
            return (isDateFilter || isPlatformFilter) && !isPerformanceFilter;
          });
          if (filterSpec.filters.length === 0) {
            delete filterSpec.filters;
            fixes.push('Removed restrictive filters for worst/best comparison');
          }
        }
      }
    }

    // FIX 4: Temporal comparative queries need higher limits
    if (queryType === 'temporal' || (queryType === 'comparative' && userQuery.toLowerCase().match(/q[1-4]|quarter/))) {
      if (filterSpec.groupBy && filterSpec.groupBy.length > 0) {
        // This is a comparison across time
        if (!filterSpec.limit || filterSpec.limit < 6) {
          filterSpec.limit = 10; // Show all platforms/categories
          fixes.push('Increased limit to 10 for temporal comparison');
        }
      }
    }

    // FIX 5: Individual ranking queries should NOT have groupBy or aggregate
    if (queryType === 'ranking_individual') {
      if (filterSpec.groupBy && filterSpec.groupBy.length > 0) {
        delete filterSpec.groupBy;
        fixes.push('Removed groupBy from individual ranking query');
      }
      if (filterSpec.aggregate && Object.keys(filterSpec.aggregate).length > 0) {
        delete filterSpec.aggregate;
        fixes.push('Removed aggregate from individual ranking query');
      }
      // Ensure sortBy exists
      if (!filterSpec.sortBy || !filterSpec.sortBy.column) {
        // Try to infer sort column from query
        const query = userQuery.toLowerCase();
        let sortColumn = 'engagement_rate'; // default
        if (query.includes('like')) sortColumn = 'likes';
        else if (query.includes('comment')) sortColumn = 'comments';
        else if (query.includes('share')) sortColumn = 'shares';
        else if (query.includes('reach')) sortColumn = 'reach';
        else if (query.includes('impression')) sortColumn = 'impressions';

        filterSpec.sortBy = {
          column: sortColumn,
          order: query.includes('worst') || query.includes('least') ? 'asc' : 'desc'
        };
        fixes.push(`Added sortBy: ${sortColumn} for individual ranking`);
      }
    }

    // FIX 6: Ensure limit is reasonable
    if (filterSpec.limit) {
      if (filterSpec.limit > 100) {
        filterSpec.limit = 100;
        fixes.push('Capped limit at 100');
      }
      if (filterSpec.limit < 1) {
        filterSpec.limit = 10;
        fixes.push('Minimum limit set to 10');
      }
    }


    // FIX 7: Q3/Quarter date filtering - Auto-inject missing date filters
    // If interpretation mentions Q3 but no date filters exist, add them automatically
    if (filterSpec.interpretation) {
      const interp = filterSpec.interpretation.toLowerCase();
      const mentionsQ3 = /q3|third quarter|july.*september|july-september|jul.*sep/i.test(interp);
      const mentionsQ4 = /q4|fourth quarter|october.*december|oct.*dec/i.test(interp);
      const mentionsQ2 = /q2|second quarter|april.*june|apr.*jun/i.test(interp);
      const mentionsQ1 = /q1|first quarter|january.*march|jan.*mar/i.test(interp);

      // Check if we have any date filters
      const hasDateFilters = filterSpec.filters && filterSpec.filters.some(f =>
        f.column === 'posted_date' ||
        (f.type === 'or' && f.conditions && f.conditions.some(c => c.column === 'posted_date'))
      );

      if ((mentionsQ3 || mentionsQ4 || mentionsQ2 || mentionsQ1) && !hasDateFilters) {
        // Determine which quarter
        let months = [];
        let quarterName = '';

        if (mentionsQ3) {
          months = ["07-2025", "08-2025", "09-2025"];
          quarterName = 'Q3';
        } else if (mentionsQ4) {
          months = ["10-2025", "11-2025", "12-2025"];
          quarterName = 'Q4';
        } else if (mentionsQ2) {
          months = ["04-2025", "05-2025", "06-2025"];
          quarterName = 'Q2';
        } else if (mentionsQ1) {
          months = ["01-2025", "02-2025", "03-2025"];
          quarterName = 'Q1';
        }

        // Create OR filter with month conditions
        const quarterFilter = {
          type: "or",
          conditions: months.map(month => ({
            column: "posted_date",
            operator: "contains",
            value: month
          }))
        };

        // Initialize filters if not exists
        if (!filterSpec.filters) {
          filterSpec.filters = [];
        }

        // Add the quarter filter
        filterSpec.filters.push(quarterFilter);

        fixes.push(`Added missing ${quarterName} date filters (${months.join(', ')}) based on interpretation`);
        console.log(`🔧 AUTO-FIX: Injected ${quarterName} date filters - LLM mentioned ${quarterName} but didn't generate filters`);
      }
    }


    if (fixes.length > 0) {
      console.log('✅ Applied post-processing fixes:');
      fixes.forEach(fix => console.log(`   - ${fix}`));
    } else {
      console.log('✅ No post-processing fixes needed');
    }

    return filterSpec;
  }


  /**
   * V4 ADDITION: Validate if query is answerable with available data
   * Prevents out-of-scope queries and provides helpful suggestions
   * PATCH: Added isComparisonQuery flag to skip time validations
   */
  validateQueryScope(userQuery, metadata, isComparisonQuery = false) {
    const query = userQuery.toLowerCase();
    const availablePlatforms = (metadata.uniqueValues && metadata.uniqueValues.platform) || [];

    // Check for non-existent platforms
    const unavailablePlatforms = {
      'tiktok': 'TikTok',
      'youtube': 'YouTube',
      'snapchat': 'Snapchat',
      'pinterest': 'Pinterest',
      'reddit': 'Reddit',
      'whatsapp': 'WhatsApp'
    };

    for (const [keyword, displayName] of Object.entries(unavailablePlatforms)) {
      if (query.includes(keyword)) {
        const exists = availablePlatforms.some(p =>
          p && p.toLowerCase().includes(keyword)
        );

        if (!exists) {
          return {
            valid: false,
            reason: `${displayName} data is not available in the current dataset.`,
            availablePlatforms: availablePlatforms.filter(p => p && p.length > 0),
            suggestedQueries: this.getSuggestedQueries(metadata)
          };
        }
      }
    }

    // Check for metrics that don't exist in organic posts
    const adsOnlyMetrics = {
      'ctr': 'click-through rate (CTR)',
      'click-through': 'click-through rate',
      'cpc': 'cost per click (CPC)',
      'cost per click': 'cost per click',
      'roas': 'return on ad spend (ROAS)',
      'conversion': 'conversions'
    };

    const isAskingAboutOrganicPosts = (query.includes('post') || query.includes('organic')) &&
      !query.includes('ad') &&
      !query.includes('campaign');

    if (isAskingAboutOrganicPosts) {
      for (const [keyword, displayName] of Object.entries(adsOnlyMetrics)) {
        if (query.includes(keyword)) {
          return {
            valid: false,
            needsClarification: true,
            reason: `${displayName} is only available for ad campaigns, not organic posts.`,
            explanation: `For organic posts, try asking about engagement rate, likes, comments, shares, reach, or impressions instead.`,
            alternatives: [
              {
                option: 'Show me engagement rate for organic posts',
                description: 'Similar metric to CTR but for organic content'
              },
              {
                option: `Show me ${displayName} for ad campaigns`,
                description: 'View this metric for paid advertising'
              },
              {
                option: 'Compare organic engagement vs ad performance',
                description: 'See how organic and paid content differ'
              }
            ],
            suggestedQueries: [
              'What is the average engagement rate for organic posts?',
              'Show me top organic posts by likes',
              `What is the ${displayName} for Facebook Ads?`,
              'Compare organic reach vs ad reach'
            ]
          };
        }
      }
    }

    // Check if query is completely off-topic
    const socialMediaKeywords = [
      'post', 'campaign', 'ad', 'engagement', 'like', 'share', 'reach', 'impression',
      'platform', 'facebook', 'instagram', 'twitter', 'linkedin', 'google',
      'content', 'performance', 'roas', 'conversion', 'ctr', 'click',
      'follower', 'audience', 'organic', 'paid', 'media', 'social'
    ];

    const hasRelevantKeyword = socialMediaKeywords.some(kw => query.includes(kw));

    if (!hasRelevantKeyword && query.length > 10) {
      return {
        valid: false,
        reason: 'This query appears to be outside the scope of social media performance data.',
        explanation: 'I can only help analyze social media posts and ad campaign performance.',
        suggestedQueries: this.getSuggestedQueries(metadata)
      };
    }


    // V4.2 ADDITION: Check for queries requiring derived fields

    // Check for day-of-week / weekday/weekend queries
    const weekdayPatterns = /weekday|weekend|week day|day of (the )?week|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i;
    if (weekdayPatterns.test(query)) {
      const availableColumns = (metadata.columns && Object.keys(metadata.columns)) || [];
      const hasDayOfWeek = availableColumns.some(col =>
        col.toLowerCase().includes('day') && col.toLowerCase().includes('week')
      );

      if (!hasDayOfWeek && !query.includes('posted_date')) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'Weekday vs weekend analysis requires grouping by day of week.',
          explanation: 'The data has posted_date but not day-of-week categorization. I cannot automatically determine if a date is a weekday or weekend.',
          alternatives: [
            {
              option: 'Show me engagement grouped by individual date',
              description: 'You can manually identify which dates are weekdays vs weekends'
            },
            {
              option: 'Show me all posts with dates and engagement metrics',
              description: 'Full dataset for manual analysis'
            },
            {
              option: 'Show me top performing posts by date',
              description: 'Identify patterns across different dates'
            }
          ]
        };
      }
    }

    // Check for time-of-day queries
    // PATCH: Skip this validation for comparison queries
    const timeOfDayPatterns = /time of day|morning|afternoon|evening|night|hour|am|pm|peak time|best time to post/i;
    if (!isComparisonQuery && timeOfDayPatterns.test(query) && !query.includes('posted_time')) {
      const availableColumns = (metadata.columns && Object.keys(metadata.columns)) || [];
      const hasTimeCategory = availableColumns.some(col =>
        col.toLowerCase().includes('time') && (col.toLowerCase().includes('category') || col.toLowerCase().includes('period'))
      );

      if (!hasTimeCategory) {
        return {
          valid: false,
          needsClarification: true,
          reason: 'Time-of-day analysis requires grouping by time periods.',
          explanation: 'The data has posted_time (HH:MM:SS) but not time-of-day categorization (morning/afternoon/evening).',
          alternatives: [
            {
              option: 'Show me posts with their posted_time and engagement rate',
              description: 'You can analyze patterns by reviewing timestamps'
            },
            {
              option: 'Show me top 20 posts sorted by engagement with timestamps',
              description: 'Identify which times correlate with high engagement'
            },
            {
              option: 'Group posts by hour (if supported)',
              description: 'See engagement by posting hour'
            }
          ]
        };
      }
    }

    // Check for "weekly" or "last week" without specific dates
    const weeklyPatterns = /weekly|last week|this week|past week/i;
    if (weeklyPatterns.test(query) && !query.includes('2025') && !query.includes('december') && !query.includes('date')) {
      return {
        valid: false,
        needsClarification: true,
        reason: 'Please specify which week you want to analyze.',
        explanation: '"Weekly" is ambiguous - it could mean last 7 days, current calendar week, or a specific week.',
        alternatives: [
          {
            option: 'Show me data from December 23-29, 2025',
            description: 'Last complete week'
          },
          {
            option: 'Show me data from the last 7 days',
            description: 'Rolling 7-day window'
          },
          {
            option: 'Show me overall performance summary',
            description: 'All available data'
          }
        ]
      };
    }

    // Check for specific ad format comparisons (like "Stories")
    const adFormatPatterns = /stories campaign|reels campaign|carousel ad|video ad|collection ad/i;
    const organicComparison = /organic.*vs|vs.*organic|compare.*organic|organic.*compare/i;

    if (adFormatPatterns.test(query) && organicComparison.test(query)) {
      return {
        valid: false,
        needsClarification: true,
        reason: 'Comparing organic posts to specific ad formats requires multiple filters.',
        explanation: 'I can compare organic posts to ads, but filtering by specific ad format (Stories, Carousel, etc.) needs clarification.',
        alternatives: [
          {
            option: 'Compare Instagram organic posts vs all Instagram Ads',
            description: 'Overall organic vs paid comparison'
          },
          {
            option: 'Show me Instagram Ads grouped by ad format',
            description: 'See all ad formats (Stories, Carousel, Single Image, etc.) separately'
          },
          {
            option: 'Show me Stories ads across all platforms',
            description: 'Focus on Stories format specifically'
          },
          {
            option: 'Let me specify the exact comparison I want',
            description: 'Rephrase for clarity'
          }
        ]
      };
    }



    // V4.3 ADDITION: Generic complexity detection (catch-all for unhandled complex queries)

    const complexityIndicators = {
      analysis: /correlat(e|ion)|predict|forecast|trend analysis|pattern detect|regression|statistical/i,
      derivedMetrics: /virality|roi|coefficient|score|index|rating|sentiment|emotion|mood/i,
      transformations: /adjust(ed)?|normaliz(e|ed)|weight(ed)?|factor|baseline|calibrat/i,
      statistics: /percentile|quartile|distribution|variance|standard deviation|median/i,
      segmentation: /cohort|segment|cluster|group analysis|categoriz/i,
      causation: /causation|attribution|impact analysis|because|due to|caused by/i,
      detection: /anomaly|outlier|unusual|irregular|abnormal/i,
      nlp: /sentiment|emotion|tone|language|text analysis|keyword extract/i,
      timeSeries: /seasonality|cyclical|periodic|year.over.year|yoy/i,
      prediction: /will be|going to|future|next month|predict|expect/i
    };

    // Check if query matches any complexity indicator
    let matchedCategory = null;
    let matchedPattern = null;

    for (const [category, pattern] of Object.entries(complexityIndicators)) {
      if (pattern.test(query)) {
        matchedCategory = category;
        matchedPattern = pattern;
        break;
      }
    }

    if (matchedCategory) {
      // Extract what user is asking for
      const queryIntent = query.substring(0, 60) + (query.length > 60 ? '...' : '');

      // Build comprehensive response with all three options
      const response = {
        valid: false,
        needsClarification: true,
        complexityType: matchedCategory,

        // OPTION 3: Explain Data Limitation (Honest)
        reason: `This query requires ${matchedCategory} which may not be available in the current dataset.`,
        explanation: this.getComplexityExplanation(matchedCategory, query),
        dataAvailable: this.getAvailableData(metadata),
        dataNotAvailable: this.getMissingCapabilities(matchedCategory),

        // OPTION 2: Provide Closest Alternatives (Helpful)
        alternatives: this.getSimilarAlternatives(matchedCategory, metadata),

        // OPTION 1: Ask for Clarification (Best UX)
        suggestedActions: this.getSuggestedActions(matchedCategory),

        helpfulContext: `I understand you're looking for ${matchedCategory} insights. While I cannot perform that exact analysis, I can provide related metrics and data that might help you reach your goal.`
      };

      return response;
    }


    // Query seems valid
    return { valid: true };
  }

  /**
   * V4 ADDITION: Generate helpful suggested queries based on available data
   */
  getSuggestedQueries(metadata) {
    const platforms = (metadata.uniqueValues && metadata.uniqueValues.platform) || [];
    const hasAds = platforms.some(p => p && p.includes('Ads'));
    const hasOrganic = platforms.some(p => p && !p.includes('Ads'));

    const suggestions = [];

    if (hasOrganic) {
      suggestions.push({
        query: "Which platform has the highest engagement rate?",
        category: "Platform Comparison"
      });
      suggestions.push({
        query: "Show me the top 5 posts by likes",
        category: "Content Performance"
      });
      suggestions.push({
        query: "What is the worst performing post type?",
        category: "Content Analysis"
      });
    }

    if (hasAds) {
      suggestions.push({
        query: "Compare ROAS across Facebook Ads, Instagram Ads, and Google Ads",
        category: "Ad Performance"
      });
      suggestions.push({
        query: "Which ad campaign has the highest conversion rate?",
        category: "Campaign Analysis"
      });
    }

    if (hasOrganic && hasAds) {
      suggestions.push({
        query: "Compare Instagram organic vs Instagram Ads performance",
        category: "Organic vs Paid"
      });
    }

    return suggestions;
  }


  /**
   * Generate filter specification from user query using LLM
   * @param {string} userQuery - The user's natural language query
   * @param {Object} metadata - Dataset metadata from MetadataExtractor
   * @returns {Object} Filter specification object
   */
  async generateFilters(userQuery, metadata) {
    // ═══════════════════════════════════════════════════════════════════════════
    // PATCH: Early detection of comparison queries to prevent mis-classification
    // ═══════════════════════════════════════════════════════════════════════════
    const lowerQuery = userQuery.toLowerCase();
    const isComparisonQuery = (lowerQuery.includes(' vs ') ||
      lowerQuery.includes(' versus ') ||
      (lowerQuery.includes('compare') && lowerQuery.includes(' and '))) &&
      (lowerQuery.includes('organic') || lowerQuery.includes('ads') ||
        lowerQuery.includes('paid') || lowerQuery.includes('platform'));

    if (isComparisonQuery) {
      console.log('🔧 PATCH: Comparison query detected - using specialized handling');
      console.log('   Skipping time-of-day and other complex validations');
    }

    // V4 ADDITION: Validate query scope before processing
    // BUT skip time-based validations for comparison queries
    const validation = this.validateQueryScope(userQuery, metadata, isComparisonQuery);

    if (!validation.valid) {
      console.log('⚠️  Query validation failed:', validation.reason);
      return {
        needsClarification: true,
        outOfScope: true,
        clarificationNeeded: validation.reason,
        suggestion: validation.suggestion,
        alternativeQuery: validation.alternativeQuery,
        explanation: validation.explanation,
        availablePlatforms: validation.availablePlatforms,
        suggestedQueries: validation.suggestedQueries || [],
        interpretation: "Query is outside the scope of available data or requires clarification"
      };
    }

    // Check cache first
    const cached = this.cache.get(userQuery);
    if (cached) {
      console.log('💾 Filter cache HIT - Using cached filter spec');
      const cacheStats = this.cache.getStats();
      console.log(`   Cache stats: ${cacheStats.size}/${cacheStats.maxSize} entries, ${cacheStats.hitRate} hit rate`);
      return cached;
    }

    console.log('💾 Filter cache MISS - Generating new filter spec');

    // FIX 4: Classify query type
    const queryType = this.classifyQueryType(userQuery);
    console.log(`🔍 Query type detected: ${queryType}`);

    const prompt = this.buildPrompt(userQuery, metadata, queryType);

    try {
      const llm = this.getLLM();
      const response = await llm.invoke(prompt);
      const content = response.content;

      // Extract JSON from response (handles cases where LLM adds explanation)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM did not return valid JSON');
      }

      let filterSpec = JSON.parse(jsonMatch[0]);

      // Add metadata
      filterSpec.generatedAt = new Date().toISOString();
      filterSpec.originalQuery = userQuery;
      filterSpec.queryType = queryType;

      // ⭐ POST-PROCESS: Fix common LLM mistakes (THIS IS THE KEY FIX)
      filterSpec = this.postProcessFilters(filterSpec, queryType, userQuery); // Track query type for debugging

      // Clean up invalid LLM responses
      this.cleanupFilterSpec(filterSpec);

      // Normalize platform names based on actual data
      this.normalizePlatformNames(filterSpec, metadata);

      // Store in cache
      this.cache.set(userQuery, filterSpec);
      const cacheStats = this.cache.getStats();
      console.log(`   Cached filter spec. Cache stats: ${cacheStats.size}/${cacheStats.maxSize} entries, ${cacheStats.hitRate} hit rate`);

      return filterSpec;
    } catch (error) {
      console.error('Error generating filters:', error);
      throw new Error(`Failed to generate filters: ${error.message}`);
    }
  }

  /**
   * Build comprehensive prompt for LLM
   * FIX 1, 2, 3: Enhanced with better aggregation rules, date handling, and comparative query handling
   */
  buildPrompt(userQuery, metadata, queryType = 'factual') {
    let prompt = `You are a data analyst assistant specialized in generating database filter conditions.

DATASET METADATA:
${JSON.stringify(this.formatMetadataForPrompt(metadata), null, 2)}

USER QUERY:
"${userQuery}"

YOUR TASK:
Generate a JSON object that specifies how to filter and analyze this dataset to answer the user's query.

FILTER SPECIFICATION FORMAT:
{
  "filters": [
    {
      "column": "column_name",
      "operator": "equals|not_equals|greater_than|less_than|greater_than_or_equal|less_than_or_equal|contains|not_contains|in|not_in|between|after|before",
      "value": "single_value or array for 'in'/'between' operators",
      "reason": "Brief explanation of why this filter was chosen"
    }
  ],
  "groupBy": ["column1", "column2"],
  "aggregate": {
    "actual_column_name": "sum|mean|median|count|min|max|std|variance|mode|range|p25|p50|p75|p90|p95|p99|distinctCount|first|last"
  },
  "sortBy": {
    "column": "column_name",
    "order": "asc|desc"
  },
  "limit": 10,
  "interpretation": "Brief explanation of what the user is asking for"
}

AGGREGATION FUNCTIONS AVAILABLE:
- Basic: sum, mean, median, count, min, max
- Statistical: std (standard deviation), variance, mode, range
- Percentiles: p25, p50 (median), p75, p90, p95, p99
- Other: distinctCount (unique values), first, last

═══════════════════════════════════════════════════════════
⚠️ FIX 1: CRITICAL AGGREGATION RULES
═══════════════════════════════════════════════════════════

1. ALWAYS use actual column names from the dataset, NEVER use placeholders
2. For COUNT operations, use ANY existing column (recommended: "post_id", "campaign_id", or "platform")
3. NEVER use generic placeholder names like "metric_column", "column_name", "field"

CORRECT EXAMPLES:
✅ {"post_id": "count"}  // Counts total records (RECOMMENDED for counting)
✅ {"campaign_id": "count"}  // Counts campaigns
✅ {"platform": "count"}  // Counts platforms
✅ {"engagement_rate": "mean"}  // Average engagement rate
✅ {"likes": "sum"}  // Total likes
✅ {"reach": "max"}  // Maximum reach

WRONG EXAMPLES (WILL FAIL VALIDATION):
❌ {"metric_column": "count"}  // "metric_column" does not exist in dataset
❌ {"column_name": "sum"}  // "column_name" does not exist in dataset  
❌ {"field": "mean"}  // "field" does not exist in dataset

AVAILABLE COLUMNS FOR AGGREGATION:
Numeric columns: ${metadata.numericColumns?.join(', ') || 'impressions, reach, likes, comments, shares, saves, engagement_rate'}
ID columns (for counting): post_id, campaign_id, platform

For counting queries ("how many"), use: "post_id" (recommended) or "campaign_id" or "platform"

OPERATOR GUIDELINES:
- Use "contains" for partial text/date matching (e.g., "11-2025" in "posted_date" for November)
- Use "equals" for exact matches
- Use "in" for multiple possible values (value must be array)
- Use "between" for ranges (value must be array of 2 elements: [min, max])
- Use "greater_than", "less_than" for numeric comparisons
- Use "after", "before" for date comparisons
- Use "not_equals", "not_contains", "not_in" for exclusions

COMPLEX FILTERS (AND/OR):
For complex conditions, use nested structure:
{
  "type": "and|or",
  "conditions": [
    { "column": "...", "operator": "...", "value": "..." },
    { "column": "...", "operator": "...", "value": "..." }
  ]
}

AGGREGATION RULES:
- For COMPARISON queries ("compare platforms", "which platform is best"), use groupBy and aggregate
- For INDIVIDUAL ITEM queries ("most liked post", "top post", "highest engagement post"), DO NOT use groupBy or aggregate
  - Instead: filter appropriately, sort by the target metric, limit to desired count
  - Return individual records, not aggregated summaries
- When aggregating: use "mean" for rates/percentages, "sum" for counts, "count" for frequency

═══════════════════════════════════════════════════════════
⚠️ FIX 2: CRITICAL DATE HANDLING RULES
═══════════════════════════════════════════════════════════

- Current date: ${new Date().toISOString().split('T')[0]}
- Date format in dataset: DD-MM-YYYY (e.g., "07-11-2025", "15-09-2025")
- Date column name: "posted_date"

⚠️ CRITICAL: Always use "contains" operator for date matching, NEVER use "equals"

QUARTER TO MONTH MAPPING:
- Q1 2025 = January-March 2025 = "01-2025", "02-2025", "03-2025"
- Q2 2025 = April-June 2025 = "04-2025", "05-2025", "06-2025"  
- Q3 2025 = July-September 2025 = "07-2025", "08-2025", "09-2025"
- Q4 2025 = October-December 2025 = "10-2025", "11-2025", "12-2025"

HOW TO FILTER BY QUARTER (USE OR LOGIC) - CRITICAL:

⚠️⚠️⚠️ MANDATORY EXAMPLE - MEMORIZE THIS ⚠️⚠️⚠️

When user asks about "Q3", "third quarter", or "July to September":

YOU ABSOLUTELY MUST GENERATE THIS STRUCTURE:
{
  "filters": [
    {
      "type": "or",
      "conditions": [
        {"column": "posted_date", "operator": "contains", "value": "07-2025"},
        {"column": "posted_date", "operator": "contains", "value": "08-2025"},
        {"column": "posted_date", "operator": "contains", "value": "09-2025"}
      ]
    }
  ],
  "groupBy": ["platform"],
  "aggregate": {"engagement_rate": "mean"},
  "sortBy": {"column": "engagement_rate", "order": "desc"}
}

🚨 CRITICAL RULES:
1. NEVER leave "filters" empty or null for Q3 queries
2. ALWAYS use "type": "or" for quarter queries
3. ALWAYS use "contains" operator with MM-YYYY format
4. NEVER use "Q3" as a value - it won't match any data!

QUARTER TO MONTH MAPPING (MEMORIZE):
- Q1 = "01-2025", "02-2025", "03-2025" (Jan, Feb, Mar)
- Q2 = "04-2025", "05-2025", "06-2025" (Apr, May, Jun)
- Q3 = "07-2025", "08-2025", "09-2025" (Jul, Aug, Sep)
- Q4 = "10-2025", "11-2025", "12-2025" (Oct, Nov, Dec)

WRONG APPROACHES (THESE WILL FAIL):
❌ {"column": "posted_date", "operator": "equals", "value": "Q3"}
❌ {"column": "posted_date", "operator": "contains", "value": "Q3"}
❌ {"column": "quarter", "operator": "equals", "value": "3"}
❌ Leaving filters array empty and putting "Q3" only in interpretation

CORRECT APPROACH (THE ONLY WAY):
✅ Use OR logic with individual month filters as shown above

MORE EXAMPLES:

Example: "Q4 performance"
CORRECT:
{
  "type": "or",
  "conditions": [
    {"column": "posted_date", "operator": "contains", "value": "10-2025"},
    {"column": "posted_date", "operator": "contains", "value": "11-2025"},
    {"column": "posted_date", "operator": "contains", "value": "12-2025"}
  ]
}

Example: "Last quarter" (assuming current date is Dec 2025, last quarter = Q3)
CORRECT:
{
  "type": "or",
  "conditions": [
    {"column": "posted_date", "operator": "contains", "value": "07-2025"},
    {"column": "posted_date", "operator": "contains", "value": "08-2025"},
    {"column": "posted_date", "operator": "contains", "value": "09-2025"}
  ]
}

HOW TO FILTER BY SINGLE MONTH:
November 2025: {"column": "posted_date", "operator": "contains", "value": "11-2025"}
September 2025: {"column": "posted_date", "operator": "contains", "value": "09-2025"}

HOW TO FILTER BY DATE RANGE (Multiple Months):
Use OR logic:
{
  "type": "or",
  "conditions": [
    {"column": "posted_date", "operator": "contains", "value": "10-2025"},
    {"column": "posted_date", "operator": "contains", "value": "11-2025"},
    {"column": "posted_date", "operator": "contains", "value": "12-2025"}
  ]
}

REMEMBER:
- ALWAYS use "contains" for dates (not "equals")
- For quarters/multiple months: use OR logic with type: "or"
- Date format is DD-MM-YYYY

PLATFORM NAME HANDLING:
- Platform names are case-insensitive and normalized automatically
- Use proper capitalization: "Instagram", "Facebook", "Twitter", "LinkedIn", "TikTok", "YouTube"
- "instagram", "INSTAGRAM", "Instagram" will all match the same data
- For ads platforms: "Facebook Ads", "Google Ads", "Instagram Ads", etc.

CONTENT TYPE / POST TYPE HANDLING:
- When user asks about "post type", "content type", "post format", or similar, use "media_type" column
- Available media types: "image", "video", "carousel"
- The "post_type" column only contains "organic" (for organic posts) or is empty for ads
- Examples:
  * "Which post type performs best?" → Group by "media_type"
  * "Worst performing post type" → Group by "media_type", sort by engagement_rate ascending
  * "Compare carousel vs video posts" → Filter media_type in ["carousel", "video"]
- For ads data (Facebook Ads, Google Ads, etc.), there is NO media_type - these have campaign_type instead

AMBIGUOUS QUERY HANDLING:
If a query is ambiguous or missing critical information, set "needsClarification": true and provide options.

Ambiguous patterns:
- "best post" without specifying metric (likes? engagement? reach?)
- "engagement" without specifying platform (all platforms? specific one?)
- "this week/month" without clear date context
- Time-based queries without platform specification
- Generic superlatives without clear criteria

CLARIFIED QUERY HANDLING:
If a query contains "[Selected: ...]" at the end, extract the selection and process accordingly:
- "Best Post on Twitter [Selected: Highest Engagement Rate]" → Use engagement_rate as the metric
- "Are there more engagements during the week or weekends? [Selected: All Platforms Combined]" → Don't filter by platform
- Extract the selection, remove the "[Selected: ...]" part, and process the query with that context
- **CRITICAL**: DO NOT ask for clarification again if the query already has a "[Selected: ...]" tag
- **CRITICAL**: If a query has "[Selected: ...]", you MUST set needsClarification to FALSE
- Make reasonable assumptions based on the selected option rather than asking for more clarification
- If the query references data that doesn't exist (like day_type), return needsClarification with explanation

When needsClarification is true, include:
{
  "needsClarification": true,
  "clarificationNeeded": "What metric should I use to determine 'best'?",
  "suggestedOptions": [
    {"label": "By Likes", "description": "Post with most likes"},
    {"label": "By Engagement Rate", "description": "Highest engagement percentage"},
    {"label": "By Reach", "description": "Post that reached most people"}
  ],
  "interpretation": "User asked for 'best post' but didn't specify the success metric"
}

BEST/TOP/WORST QUERY HANDLING:
- "Best post" → Needs clarification OR default to engagement_rate if context is clear
- "Most liked post" → Sort by likes DESC
- "Highest engagement" → Sort by engagement_rate DESC
- "Worst performing" → Sort by engagement_rate ASC (for organic) or ROAS ASC (for ads)
- "Top posts" → Default to engagement_rate unless metric specified
`;

    // FIX 3: Add query-type specific guidance
    if (queryType === 'ranking_category') {
      prompt += `
═══════════════════════════════════════════════════════════
⚠️ FIX 3: COMPARATIVE RANKING QUERY DETECTED (CATEGORIES)
═══════════════════════════════════════════════════════════

User is asking for worst/best/top/lowest across CATEGORIES (platforms, types, formats).

CRITICAL RULES:
1. DO NOT add restrictive filters that limit comparison
2. USE groupBy for the categories being compared (e.g., ["platform", "media_type"])
3. RETURN all groups (limit 12-20) to show full comparison context
4. SORT by the metric being compared

Example: "What is the worst performing post type?"
User wants to COMPARE all platform × content type combinations

CORRECT:
{
  "filters": [],  // ⚠️ NO filters - need ALL data for full comparison
  "groupBy": ["platform", "media_type"],
  "aggregate": {
    "engagement_rate": "mean"
  },
  "sortBy": {
    "column": "engagement_rate",
    "order": "asc"  // ascending for "worst"
  },
  "limit": 12,  // Return all combinations for comparison context
  "interpretation": "Comparing all platform × content type combinations to find worst performer"
}

WRONG:
❌ {
  "filters": [{"column": "engagement_rate", "operator": "less_than", "value": 5}],
  "limit": 1  // Don't restrict to only the worst - need comparison context
}

Remember: User needs to see ALL categories compared, not just the worst/best one!
`;
    }

    if (queryType === 'ranking_individual') {
      prompt += `
═══════════════════════════════════════════════════════════
⚠️ FIX 3: INDIVIDUAL RANKING QUERY DETECTED
═══════════════════════════════════════════════════════════

User is asking for top/best/worst individual ITEMS (posts, campaigns, etc).

CRITICAL RULES:
1. DO NOT use groupBy (want individual records, not grouped summaries)
2. DO NOT use aggregate (want actual items, not aggregated statistics)
3. USE sortBy to rank items by the relevant metric
4. LIMIT to the requested number of items

Example: "Top 5 posts with most likes"
User wants INDIVIDUAL posts, not grouped data

CORRECT:
{
  "filters": [],  // No filters unless specified
  "groupBy": [],  // ⚠️ NO groupBy - want individual posts
  "aggregate": {},  // ⚠️ NO aggregate - want actual records
  "sortBy": {
    "column": "likes",
    "order": "desc"
  },
  "limit": 5,
  "interpretation": "Finding top 5 individual posts by likes count"
}

WRONG:
❌ {
  "groupBy": ["post_id"],  // Don't group for individual items
  "aggregate": {"likes": "sum"}  // Don't aggregate
}

Remember: Return actual individual records, not aggregated summaries!
`;
    }

    if (queryType === 'temporal') {
      prompt += `
═══════════════════════════════════════════════════════════
⚠️ FIX 2: TEMPORAL QUERY DETECTED
═══════════════════════════════════════════════════════════

User is asking about specific time periods (Q1/Q2/Q3/Q4/months).

CRITICAL RULES:
1. Use OR logic with type: "or" for quarter queries (covers 3 months)
2. Use "contains" operator for dates (NEVER "equals")
3. Date format is DD-MM-YYYY
4. Map quarters correctly: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec

Example: "Q3 performance"
CORRECT:
{
  "filters": [
    {
      "type": "or",
      "conditions": [
        {"column": "posted_date", "operator": "contains", "value": "07-2025"},
        {"column": "posted_date", "operator": "contains", "value": "08-2025"},
        {"column": "posted_date", "operator": "contains", "value": "09-2025"}
      ]
    }
  ]
}
`;
    }

    if (queryType === 'counting') {
      prompt += `
═══════════════════════════════════════════════════════════
⚠️ FIX 1: COUNTING QUERY DETECTED
═══════════════════════════════════════════════════════════

User is asking "how many" or "count".

CRITICAL RULES:
1. Use actual column names like "post_id" or "campaign_id" for counting
2. NEVER use placeholder names like "metric_column", "column_name", "field"
3. Use {"post_id": "count"} for counting posts
4. Use {"campaign_id": "count"} for counting campaigns

Example: "How many campaigns?"
CORRECT:
{
  "aggregate": {
    "campaign_id": "count"  // ✅ Actual column name
  }
}

WRONG:
{
  "aggregate": {
    "metric_column": "count"  // ❌ This will fail validation
  }
}
`;
    }

    prompt += `

IMPORTANT RULES:
1. Return ONLY the JSON object, no markdown formatting or explanations outside the JSON
2. All column names must exist in the metadata provided
3. All values must match the data types (text for text columns, numbers for numeric columns)
4. For categorical columns, use values from the "possibleValues" list when exact matches are needed
5. Be case-insensitive when matching text values
6. If query is ambiguous AND context cannot resolve it, set needsClarification: true
7. Always include "interpretation" to show your understanding of the query
8. Prefer single-step solutions - don't create multi-step dependencies unless truly necessary

EXAMPLES:

Example 1:
Query: "Which platform performed best in November?"
Response:
{
  "filters": [
    {
      "column": "posted_date",
      "operator": "contains",
      "value": "11-2025",
      "reason": "November = month 11"
    }
  ],
  "groupBy": ["platform"],
  "aggregate": {
    "engagement_rate": "mean",
    "likes": "sum",
    "reach": "sum"
  },
  "sortBy": {
    "column": "engagement_rate",
    "order": "desc"
  },
  "limit": 10,
  "interpretation": "Comparing all platforms by average engagement rate in November 2025"
}

Example 2:
Query: "Show me the top 3 posts with most likes on Instagram"
Response:
{
  "filters": [
    {
      "column": "platform",
      "operator": "equals",
      "value": "Instagram",
      "reason": "User specified Instagram"
    }
  ],
  "groupBy": [],
  "aggregate": {},
  "sortBy": {
    "column": "likes",
    "order": "desc"
  },
  "limit": 3,
  "interpretation": "Finding the 3 individual Instagram posts with highest likes count"
}

Example 3:
Query: "How many Facebook posts have more than 100 comments?"
Response:
{
  "filters": [
    {
      "column": "platform",
      "operator": "equals",
      "value": "Facebook",
      "reason": "User specified Facebook"
    },
    {
      "column": "comments",
      "operator": "greater_than",
      "value": 100,
      "reason": "User wants posts with more than 100 comments"
    }
  ],
  "groupBy": [],
  "aggregate": {
    "post_id": "count"
  },
  "sortBy": {},
  "interpretation": "Counting Facebook posts that have more than 100 comments"
}

Example 4:
Query: "Compare Instagram vs Facebook performance in Q3"
Response:
{
  "filters": [
    {
      "type": "or",
      "conditions": [
        {"column": "posted_date", "operator": "contains", "value": "07-2025"},
        {"column": "posted_date", "operator": "contains", "value": "08-2025"},
        {"column": "posted_date", "operator": "contains", "value": "09-2025"}
      ]
    },
    {
      "column": "platform",
      "operator": "in",
      "value": ["Instagram", "Facebook"],
      "reason": "User wants to compare these two platforms"
    }
  ],
  "groupBy": ["platform"],
  "aggregate": {
    "engagement_rate": "mean",
    "reach": "sum"
  },
  "sortBy": {
    "column": "engagement_rate",
    "order": "desc"
  },
  "limit": 2,
  "interpretation": "Comparing Instagram and Facebook performance metrics during Q3 2025 (July-September)"
}

Now process the user's query and return ONLY valid JSON.`;

    return prompt;
  }

  /**
   * Format metadata for prompt (keep existing implementation)
   */
  formatMetadataForPrompt(metadata) {
    return {
      totalRecords: metadata.files.reduce((sum, f) => sum + f.recordCount, 0),
      files: metadata.files.map(f => ({
        name: f.name,
        recordCount: f.recordCount,
        type: f.type
      })),
      columns: metadata.columns,
      numericColumns: metadata.numericColumns,
      categoricalColumns: Object.keys(metadata.uniqueValues || {}).filter(col =>
        Array.isArray(metadata.uniqueValues[col])
      ),
      dateColumns: metadata.dateColumns,
      possibleValues: metadata.uniqueValues,
      sampleData: metadata.sampleData ? metadata.sampleData.slice(0, 1) : []
    };
  }

  /**
   * Clean up LLM-generated filter spec (keep existing implementation)
   */
  cleanupFilterSpec(filterSpec) {
    // Remove empty arrays/objects
    if (filterSpec.filters && filterSpec.filters.length === 0) {
      delete filterSpec.filters;
    }
    if (filterSpec.groupBy && filterSpec.groupBy.length === 0) {
      delete filterSpec.groupBy;
    }
    if (filterSpec.aggregate && Object.keys(filterSpec.aggregate).length === 0) {
      delete filterSpec.aggregate;
    }

    // Ensure limit is reasonable
    if (filterSpec.limit && filterSpec.limit > 100) {
      filterSpec.limit = 100;
    }

    // Remove null/undefined values
    Object.keys(filterSpec).forEach(key => {
      if (filterSpec[key] === null || filterSpec[key] === undefined) {
        delete filterSpec[key];
      }
    });
  }

  /**
   * V4.3: Get detailed explanation for complexity type
   */
  getComplexityExplanation(category, query) {
    const explanations = {
      analysis: 'Complex statistical or correlation analysis requires specialized processing not currently available.',
      derivedMetrics: 'This metric needs to be calculated from raw data using a specific formula that must be defined first.',
      transformations: 'Data transformation and adjustment require baseline values or normalization factors not in the dataset.',
      statistics: 'Advanced statistical calculations (percentiles, distributions) require statistical processing capabilities.',
      segmentation: 'Cohort analysis and segmentation require grouping logic beyond simple platform/date filtering.',
      causation: 'Causal analysis and attribution require historical comparison data and statistical methods.',
      detection: 'Anomaly detection requires baseline calculations and deviation analysis not currently available.',
      nlp: 'Natural language processing and text analysis require the actual text content which is not in the dataset.',
      timeSeries: 'Time series analysis like seasonality adjustment requires historical baselines and trend analysis.',
      prediction: 'Predictive analysis requires machine learning models trained on historical data.'
    };

    return explanations[category] || 'This query requires analysis capabilities beyond current system scope.';
  }

  /**
   * V4.3: Get available data summary
   */
  getAvailableData(metadata) {
    const columns = metadata.columns || {};
    const available = [];

    // Engagement metrics
    if (columns.engagement_rate) available.push('Engagement rates');
    if (columns.likes) available.push('Likes, comments, shares');
    if (columns.reach) available.push('Reach and impressions');

    // Campaign metrics
    if (columns.roas) available.push('ROAS (Return on Ad Spend)');
    if (columns.conversions) available.push('Conversions and conversion rates');
    if (columns.ctr) available.push('Click-through rates (CTR)');

    // Platform/time data
    if (columns.platform) available.push('Platform breakdowns');
    if (columns.posted_date) available.push('Date/time data');

    return available.length > 0 ? available : ['Basic metrics and platform data'];
  }

  /**
   * V4.3: Get missing capabilities for category
   */
  getMissingCapabilities(category) {
    const missing = {
      analysis: ['Correlation coefficients', 'Statistical significance', 'Trend predictions'],
      derivedMetrics: ['Pre-calculated scores', 'Composite indices', 'Custom formulas'],
      transformations: ['Normalized values', 'Seasonality adjustments', 'Baseline comparisons'],
      statistics: ['Percentile rankings', 'Distribution curves', 'Standard deviations'],
      segmentation: ['User cohorts', 'Audience segments', 'Behavioral clusters'],
      causation: ['Causal relationships', 'Attribution models', 'Impact factors'],
      detection: ['Anomaly scores', 'Outlier identification', 'Deviation alerts'],
      nlp: ['Text content', 'Sentiment scores', 'Keyword extraction'],
      timeSeries: ['Seasonality factors', 'Cyclical patterns', 'YoY comparisons'],
      prediction: ['Future projections', 'Predictive models', 'Forecast data']
    };

    return missing[category] || ['Advanced analysis capabilities'];
  }

  /**
   * V4.3: Get helpful alternatives for complexity type
   */
  getSimilarAlternatives(category, metadata) {
    const alternatives = {
      analysis: [
        {
          option: 'Show me performance metrics by platform',
          description: 'Compare platforms side-by-side to spot patterns manually',
          reasoning: 'Visual comparison can reveal correlations'
        },
        {
          option: 'Show me top and bottom performing content',
          description: 'Identify extremes to understand what works and what doesn\'t',
          reasoning: 'Range analysis helps identify trends'
        },
        {
          option: 'Export data for external analysis',
          description: 'Get raw data to perform custom analysis in Excel/Python',
          reasoning: 'Full control over analysis methodology'
        }
      ],
      derivedMetrics: [
        {
          option: 'Show me the underlying metrics',
          description: 'See raw data (shares, reach) that would feed into the calculation',
          reasoning: 'You can calculate the derived metric manually'
        },
        {
          option: 'Show me posts sorted by related metrics',
          description: 'Sort by shares or engagement as proxy measures',
          reasoning: 'Related metrics often correlate with derived ones'
        },
        {
          option: 'Define how to calculate this metric',
          description: 'Specify the formula and I can help compute it',
          reasoning: 'Custom calculations possible with clear formulas'
        }
      ],
      nlp: [
        {
          option: 'Show me posts with highest comment counts',
          description: 'High comment volume may indicate engaging or controversial content',
          reasoning: 'Proxy for sentiment intensity'
        },
        {
          option: 'Show me posts with high engagement rates',
          description: 'Overall engagement correlates with positive reception',
          reasoning: 'Engagement is measurable sentiment indicator'
        },
        {
          option: 'Show me top performing content by platform',
          description: 'Successful content likely has positive sentiment',
          reasoning: 'Performance implies audience approval'
        }
      ]
    };

    // Default alternatives for categories not specifically defined
    const defaultAlternatives = [
      {
        option: 'Show me related available metrics',
        description: 'See what data is available that relates to your question',
        reasoning: 'Find closest available alternative'
      },
      {
        option: 'Show me overall performance summary',
        description: 'Get comprehensive view of all available metrics',
        reasoning: 'Broad view may reveal insights'
      },
      {
        option: 'Help me rephrase my question',
        description: 'Reframe your question using available data',
        reasoning: 'Different angle might be answerable'
      }
    ];

    return alternatives[category] || defaultAlternatives;
  }

  /**
   * V4.3: Get suggested actions for user
   */
  getSuggestedActions(category) {
    const actions = {
      analysis: [
        'Export data for statistical analysis in external tools',
        'Ask for specific metrics instead of correlations',
        'Focus on direct comparisons between platforms or time periods'
      ],
      derivedMetrics: [
        'Ask for the raw metrics that would feed into this calculation',
        'Define the specific formula you want calculated',
        'Use simpler proxy metrics that are directly available'
      ],
      nlp: [
        'Focus on engagement metrics as sentiment proxies',
        'Analyze comment volume and sharing patterns',
        'Look at performance trends to infer content reception'
      ],
      prediction: [
        'Analyze past trends to inform future decisions',
        'Compare time periods to spot patterns',
        'Focus on current performance rather than predictions'
      ]
    };

    const defaultActions = [
      'Simplify your question to use available metrics',
      'Ask to see what data is available',
      'Rephrase focusing on direct measurements'
    ];

    return actions[category] || defaultActions;
  }




  /**
   * Normalize platform names in filters (keep existing implementation)
   */
  normalizePlatformNames(filterSpec, metadata) {
    if (!filterSpec.filters) return;

    // Find platform column in metadata
    const platformColumn = metadata.uniqueValues && metadata.uniqueValues.platform
      ? { possibleValues: metadata.uniqueValues.platform }
      : null;

    if (!platformColumn) {
      return;
    }

    const actualPlatforms = platformColumn.possibleValues;

    // Platform name mapping - maps what users say to what's in the data
    const platformMappings = {
      'facebook': ['Facebook Ads', 'Facebook', 'facebook'],
      'instagram': ['Instagram Ads', 'Instagram', 'instagram'],
      'twitter': ['Twitter', 'X', 'twitter'],
      'linkedin': ['LinkedIn', 'linkedin'],
      'google': ['Google Ads', 'Google', 'google'],
      'youtube': ['YouTube', 'youtube'],
      'tiktok': ['TikTok', 'tiktok'],
    };

    // Helper function to find the best match for a platform name
    const findBestMatch = (platformName) => {
      if (!platformName) return platformName;

      const normalized = platformName.toLowerCase().trim();

      // First, check if it's already an exact match
      const exactMatch = actualPlatforms.find(p =>
        p && p.toLowerCase() === normalized
      );
      if (exactMatch) return exactMatch;

      // Then, check our mapping table
      const mappingKey = Object.keys(platformMappings).find(key =>
        normalized.includes(key) || key.includes(normalized)
      );

      if (mappingKey) {
        // Try to find the best match from the mapping list
        const possibleMatches = platformMappings[mappingKey];
        for (const possibleMatch of possibleMatches) {
          const match = actualPlatforms.find(p =>
            p && p.toLowerCase() === possibleMatch.toLowerCase()
          );
          if (match) {
            console.log(`   🔧 Normalized platform: "${platformName}" → "${match}"`);
            return match;
          }
        }
      }

      // No match found - return original (will be caught by validator)
      return platformName;
    };

    // Recursive function to normalize filters
    const normalizeFilter = (filter) => {
      // Handle complex filters with conditions (AND/OR)
      if (filter.type && filter.conditions) {
        filter.conditions.forEach(normalizeFilter);
        return;
      }

      // Handle simple filters
      if (filter.column &&
        (filter.column.toLowerCase() === 'platform' ||
          filter.column.toLowerCase() === 'source' ||
          filter.column.toLowerCase() === 'channel')) {

        // Normalize single value
        if (typeof filter.value === 'string') {
          filter.value = findBestMatch(filter.value);
        }

        // Normalize array values (for "in" operator)
        if (Array.isArray(filter.value)) {
          filter.value = filter.value.map(v =>
            typeof v === 'string' ? findBestMatch(v) : v
          );
        }
      }
    };

    // Apply normalization to all filters
    if (Array.isArray(filterSpec.filters)) {
      filterSpec.filters.forEach(normalizeFilter);
    }
  }
}

export default FilterGenerator;