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
   * Generate filter specification from user query using LLM
   * @param {string} userQuery - The user's natural language query
   * @param {Object} metadata - Dataset metadata from MetadataExtractor
   * @returns {Object} Filter specification object
   */
  async generateFilters(userQuery, metadata) {
    // Check cache first
    const cached = this.cache.get(userQuery);
    if (cached) {
      console.log('💾 Filter cache HIT - Using cached filter spec');
      const cacheStats = this.cache.getStats();
      console.log(`   Cache stats: ${cacheStats.size}/${cacheStats.maxSize} entries, ${cacheStats.hitRate} hit rate`);
      return cached;
    }

    console.log('💾 Filter cache MISS - Generating new filter spec');
    const prompt = this.buildPrompt(userQuery, metadata);

    try {
      const llm = this.getLLM();
      const response = await llm.invoke(prompt);
      const content = response.content;

      // Extract JSON from response (handles cases where LLM adds explanation)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM did not return valid JSON');
      }

      const filterSpec = JSON.parse(jsonMatch[0]);

      // Add metadata
      filterSpec.generatedAt = new Date().toISOString();
      filterSpec.originalQuery = userQuery;

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
   */
  buildPrompt(userQuery, metadata) {
    return `You are a data analyst assistant specialized in generating database filter conditions.

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
    "metric_column": "sum|mean|median|count|min|max|std|variance|mode|range|p25|p50|p75|p90|p95|p99|distinctCount|first|last"
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

DATE HANDLING (ENHANCED):
- Current date: ${new Date().toISOString().split('T')[0]}
- Relative dates supported:
  * "today", "yesterday", "tomorrow"
  * "last week", "this week", "last month", "this month"
  * "3 days ago", "2 weeks ago", "1 month ago"
  * "Q1 2025", "Q2", "Q3 2025", "Q4"
  * "early November", "mid December", "late January"
- Date ranges supported:
  * "last 7 days", "last 30 days", "last 3 months"
- Month names: "January", "Feb", "November 2025"
- Standard formats: "DD-MM-YYYY", "YYYY-MM-DD"
- Use "after"/"before" operators for date comparisons
- Use "between" for date ranges
- Use "contains" for month/year matching (e.g., "11-2025" for November)

PLATFORM NAME HANDLING:
- Platform names are case-insensitive and normalized automatically
- Use proper capitalization: "Instagram", "Facebook", "Twitter", "LinkedIn", "TikTok", "YouTube"
- "instagram", "INSTAGRAM", "Instagram" will all match the same data
- For ads platforms: "Facebook Ads", "Google Ads", "Instagram Ads", etc.

IMPORTANT RULES:
1. Return ONLY the JSON object, no markdown formatting or explanations outside the JSON
2. All column names must exist in the metadata provided
3. All values must match the data types (text for text columns, numbers for numeric columns)
4. For categorical columns, use values from the "possibleValues" list when exact matches are needed
5. Be case-insensitive when matching text values
6. If query is ambiguous, make reasonable assumptions and explain in "interpretation"
7. Always include "interpretation" to show your understanding of the query

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
  "limit": 5,
  "interpretation": "User wants to compare platform performance in November 2025 based on engagement metrics"
}

Example 2:
Query: "Show me videos from Instagram with more than 5% engagement"
Response:
{
  "filters": [
    {
      "column": "platform",
      "operator": "equals",
      "value": "Instagram",
      "reason": "User specified Instagram"
    },
    {
      "column": "media_type",
      "operator": "equals",
      "value": "video",
      "reason": "User wants video content only"
    },
    {
      "column": "engagement_rate",
      "operator": "greater_than",
      "value": 5,
      "reason": "User specified >5% engagement threshold"
    }
  ],
  "groupBy": [],
  "aggregate": {},
  "sortBy": {
    "column": "engagement_rate",
    "order": "desc"
  },
  "limit": 20,
  "interpretation": "User wants a list of Instagram video posts with engagement rate above 5%, sorted by engagement"
}

Example 3:
Query: "Compare Facebook and Instagram campaigns in terms of ROI"
Response:
{
  "filters": [
    {
      "type": "or",
      "conditions": [
        {
          "column": "platform",
          "operator": "equals",
          "value": "Facebook Ads"
        },
        {
          "column": "platform",
          "operator": "equals",
          "value": "Instagram Ads"
        }
      ],
      "reason": "User wants to compare these two platforms"
    }
  ],
  "groupBy": ["platform"],
  "aggregate": {
    "roas": "mean",
    "total_spend": "sum",
    "revenue": "sum"
  },
  "sortBy": {
    "column": "roas",
    "order": "desc"
  },
  "limit": 2,
  "interpretation": "User wants to compare ROI (ROAS) between Facebook Ads and Instagram Ads campaigns"
}

Example 4:
Query: "Most liked post on Instagram for November"
Response:
{
  "filters": [
    {
      "column": "platform",
      "operator": "equals",
      "value": "Instagram",
      "reason": "User specified Instagram"
    },
    {
      "column": "posted_date",
      "operator": "contains",
      "value": "11-2025",
      "reason": "November = month 11"
    }
  ],
  "groupBy": [],
  "aggregate": {},
  "sortBy": {
    "column": "likes",
    "order": "desc"
  },
  "limit": 1,
  "interpretation": "User wants the single Instagram post with the most likes from November 2025"
}

Now generate the filter specification for the user's query above. Return ONLY valid JSON.`;
  }

  /**
   * Format metadata for LLM prompt (concise version)
   */
  formatMetadataForPrompt(metadata) {
    return {
      totalFiles: metadata.files.length,
      totalRecords: metadata.files.reduce((sum, f) => sum + f.recordCount, 0),
      columns: metadata.columns,
      categoricalColumns: Object.keys(metadata.uniqueValues).filter(col =>
        Array.isArray(metadata.uniqueValues[col])
      ).reduce((obj, col) => {
        obj[col] = metadata.uniqueValues[col];
        return obj;
      }, {}),
      numericColumns: metadata.numericColumns.reduce((obj, col) => {
        if (metadata.uniqueValues[col] && typeof metadata.uniqueValues[col] === 'object') {
          obj[col] = metadata.uniqueValues[col];
        }
        return obj;
      }, {}),
      dateColumns: metadata.dateColumns,
      sampleRecords: metadata.sampleData.slice(0, 2)
    };
  }

  /**
   * Get date N days ago in DD-MM-YYYY format
   */
  getDateNDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Clean up invalid or malformed filter specifications from LLM
   * Fixes common issues like empty sortBy, invalid limit, etc.
   *
   * @param {Object} filterSpec - The filter specification to clean
   */
  cleanupFilterSpec(filterSpec) {
    // Fix empty sortBy object - remove it
    if (filterSpec.sortBy && typeof filterSpec.sortBy === 'object') {
      if (!filterSpec.sortBy.column || Object.keys(filterSpec.sortBy).length === 0) {
        console.log('   🧹 Removing empty sortBy object');
        delete filterSpec.sortBy;
      }
    }

    // Fix invalid limit (0 or negative) - set to default 100
    if (filterSpec.limit !== undefined) {
      if (typeof filterSpec.limit !== 'number' || filterSpec.limit < 1) {
        console.log(`   🧹 Fixing invalid limit: ${filterSpec.limit} → 100`);
        filterSpec.limit = 100;
      }
    }

    // Fix empty aggregate object - remove it
    if (filterSpec.aggregate && typeof filterSpec.aggregate === 'object') {
      if (Object.keys(filterSpec.aggregate).length === 0) {
        console.log('   🧹 Removing empty aggregate object');
        delete filterSpec.aggregate;
      }
    }

    // Fix empty groupBy array - remove it
    if (filterSpec.groupBy && Array.isArray(filterSpec.groupBy)) {
      if (filterSpec.groupBy.length === 0) {
        console.log('   🧹 Removing empty groupBy array');
        delete filterSpec.groupBy;
      }
    }

    // Fix empty filters array - remove it
    if (filterSpec.filters && Array.isArray(filterSpec.filters)) {
      if (filterSpec.filters.length === 0) {
        console.log('   🧹 Removing empty filters array');
        delete filterSpec.filters;
      }
    }
  }

  /**
   * Normalize platform names to match actual data values
   * Maps generic platform names to specific variants found in the data
   *
   * @param {Object} filterSpec - The filter specification to normalize
   * @param {Object} metadata - Dataset metadata with actual platform values
   */
  normalizePlatformNames(filterSpec, metadata) {
    if (!filterSpec.filters || !metadata.columns) {
      return;
    }

    // Find the platform column and its actual values
    const platformColumn = metadata.columns.find(col =>
      col && col.name &&
      (col.name.toLowerCase() === 'platform' ||
       col.name.toLowerCase() === 'source' ||
       col.name.toLowerCase() === 'channel')
    );

    if (!platformColumn || !platformColumn.possibleValues) {
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
