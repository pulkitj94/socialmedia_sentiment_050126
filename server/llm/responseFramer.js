import { ChatOpenAI } from '@langchain/openai';
import { LANGCHAIN_CONFIG } from '../langchain/config.js';

/**
 * LLM-based response framer
 * Converts processed data into natural language insights
 */
class ResponseFramer {
  constructor() {
    this.llm = null; // Lazy initialization
  }

  getLLM() {
    if (!this.llm) {
      this.llm = new ChatOpenAI({
        modelName: LANGCHAIN_CONFIG.llm.modelName,
        temperature: 0.3, // Slightly higher for more natural language
        maxTokens: 2000,
      });
    }
    return this.llm;
  }

  /**
   * Frame response using LLM based on processed data
   * @param {string} userQuery - Original user query
   * @param {Object} processedData - Data from DataProcessor
   * @param {Object} filterSpec - Filter specification used
   * @returns {string} Natural language response
   */
  async frameResponse(userQuery, processedData, filterSpec) {
    const prompt = this.buildPrompt(userQuery, processedData, filterSpec);

    try {
      const llm = this.getLLM();
      const response = await llm.invoke(prompt);
      return response.content.trim();
    } catch (error) {
      console.error('Error framing response:', error);
      throw new Error(`Failed to frame response: ${error.message}`);
    }
  }

  /**
   * Build comprehensive prompt for response framing
   */
  buildPrompt(userQuery, processedData, filterSpec) {
    return `You are a social media analytics expert. Your task is to present data insights in a clear, actionable, and professional manner.

CRITICAL INSTRUCTIONS:
- You MUST use the EXACT numbers provided in the data
- DO NOT make up, estimate, or hallucinate any numbers
- If you mention a metric, it MUST come directly from the data provided
- Copy numbers exactly as they appear (e.g., if data shows "7161", write "7,161" or "7161", not a different number)
- If a field is missing or unclear, acknowledge it rather than inventing data

ORIGINAL USER QUERY:
"${userQuery}"

FILTERS APPLIED:
${this.formatFiltersForPrompt(filterSpec.filters)}

DATA ANALYSIS RESULTS:
${this.formatDataForPrompt(processedData)}

QUERY INTERPRETATION:
${filterSpec.interpretation || 'Not provided'}

YOUR TASK:
Present these insights in a clear, professional format that:
1. Directly answers the user's question
2. Highlights key findings with specific numbers
3. Provides comparisons where relevant
4. Includes actionable recommendations when appropriate
5. Uses proper formatting (bold for emphasis, lists for clarity)
6. Acknowledges limitations if data is insufficient

FORMATTING GUIDELINES:
- Use **bold** for important metrics and platform names
- Use bullet points or numbered lists for multiple items
- Include specific numbers to support claims
- Use percentage comparisons when showing differences
- Structure response with clear sections if needed
- Keep language professional but conversational
- Avoid overly technical jargon

RESPONSE STRUCTURE (adapt based on query type):
1. **Direct Answer**: Start with a clear answer to the question
2. **Key Metrics**: Present the most important numbers
3. **Comparisons**: Show how items compare (if applicable)
4. **Context**: Explain what the numbers mean
5. **Recommendations**: Suggest next steps (if appropriate)

EXAMPLE RESPONSES:

Example 1 - Platform Comparison:
Query: "Which platform performed best in November?"
Response:
Based on November 2025 data, **Instagram was the best performing platform** with the following metrics:

**Top Performer: Instagram**
- Average Engagement Rate: 8.5%
- Total Likes: 50,234
- Total Posts: 45
- Average Reach per Post: 9,444

**Performance Comparison:**
- Instagram outperformed Facebook by 37% in engagement rate
- Instagram had 107% higher engagement than LinkedIn
- Instagram received 2.2x more likes than Facebook

**Rankings:**
1. **Instagram**: 8.5% engagement (45 posts)
2. **Facebook**: 6.2% engagement (38 posts)
3. **LinkedIn**: 4.1% engagement (28 posts)
4. **Twitter**: 3.8% engagement (35 posts)

**Recommendation:** Focus more resources on Instagram content creation. Consider analyzing which content types performed best to replicate success.

Example 2 - Specific Posts:
Query: "Show me top 5 posts with highest engagement"
Response:
Here are the **top 5 highest-engagement posts** from your dataset:

1. **POST_0234** (Instagram - Video)
   - Engagement Rate: 12.3%
   - 15,420 likes | 890 comments | 450 shares
   - Posted: 15-11-2025
   - Content: Product launch announcement

2. **POST_0156** (Facebook - Carousel)
   - Engagement Rate: 10.8%
   - 12,340 likes | 720 comments | 380 shares
   - Posted: 22-11-2025
   - Content: Customer testimonial series

[... continue for top 5 ...]

**Key Insights:**
- Video content dominates top performers (3 out of 5)
- Average engagement rate of top posts: 11.2%
- All top posts were published in November 2025

**Recommendation:** Replicate the video format and customer testimonial approach for future content.

Example 3 - Insufficient Data:
Query: "Show me TikTok performance"
Response:
**No TikTok Data Found**

The current dataset does not include any TikTok posts or campaigns. Available platforms in the dataset are:
- Instagram
- Facebook
- LinkedIn
- Twitter
- Google Ads

If you'd like to analyze TikTok performance, please ensure TikTok data is added to the system first.

Now, generate a professional response for the user's query based on the data provided above. Be specific, use numbers, and make it actionable.`;
  }

  /**
   * Format filters for prompt
   */
  formatFiltersForPrompt(filters) {
    if (!filters || filters.length === 0) {
      return 'No filters applied (analyzing all data)';
    }

    return filters.map((filter, index) => {
      if (filter.type === 'and' || filter.type === 'or') {
        const conditions = filter.conditions.map(c =>
          `${c.column} ${c.operator} ${JSON.stringify(c.value)}`
        ).join(` ${filter.type.toUpperCase()} `);
        return `${index + 1}. Complex Filter: ${conditions}`;
      }
      return `${index + 1}. ${filter.column} ${filter.operator} ${JSON.stringify(filter.value)}${filter.reason ? ` (${filter.reason})` : ''}`;
    }).join('\n');
  }

  /**
   * Format processed data for prompt
   */
  formatDataForPrompt(processedData) {
    const { data, summary } = processedData;

    let formatted = `Summary:\n`;
    formatted += `- Total records in dataset: ${summary.originalRecords.toLocaleString()}\n`;
    formatted += `- Records after filtering: ${summary.filteredRecords.toLocaleString()}\n`;
    formatted += `- Results returned: ${summary.resultCount}\n`;
    formatted += `- Filters applied: ${summary.filtersApplied}\n\n`;

    if (data.length === 0) {
      formatted += 'No data matches the specified filters.\n';
      return formatted;
    }

    formatted += `Results Data:\n`;

    // Format data as readable table
    if (data.length <= 20) {
      // Show all data if small
      formatted += JSON.stringify(data, null, 2);
    } else {
      // Show top 20 for large datasets
      formatted += `Showing top 20 of ${data.length} results:\n`;
      formatted += JSON.stringify(data.slice(0, 20), null, 2);
      formatted += `\n... and ${data.length - 20} more results`;
    }

    return formatted;
  }

  /**
   * Generate a fallback response when LLM fails
   */
  generateFallbackResponse(processedData) {
    const { data, summary } = processedData;

    if (data.length === 0) {
      return 'No data found matching your query. Please try adjusting your search criteria.';
    }

    let response = `Found ${summary.filteredRecords.toLocaleString()} records matching your criteria.\n\n`;

    if (data.length <= 5) {
      response += 'Results:\n';
      data.forEach((item, index) => {
        response += `\n${index + 1}. `;
        response += Object.entries(item)
          .filter(([key]) => !key.startsWith('_'))
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      });
    } else {
      response += `Showing top 5 of ${data.length} results:\n`;
      data.slice(0, 5).forEach((item, index) => {
        response += `\n${index + 1}. `;
        response += Object.entries(item)
          .filter(([key]) => !key.startsWith('_'))
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      });
    }

    return response;
  }
}

export default ResponseFramer;
