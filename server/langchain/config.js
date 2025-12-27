// ═══════════════════════════════════════════════════════════════════════════
// LANGCHAIN CONFIGURATION - SOCIAL MEDIA DOMAIN
// ═══════════════════════════════════════════════════════════════════════════
// ✏️ CUSTOMIZE THIS FILE to change:
//    - System prompts and AI personality
//    - Platform names and metrics
//    - RAG retrieval settings
//    - Response formatting rules
// ═══════════════════════════════════════════════════════════════════════════

export const LANGCHAIN_CONFIG = {

  // ═══════════════════════════════════════════════════════════════════════════
  // AI PERSONALITY & BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Change how the AI acts and responds

  systemPrompt: `You are an expert Social Media Intelligence Analyst and Marketing Strategist.

Your role is to provide data-driven insights, actionable recommendations, and strategic guidance for social media campaigns.

CORE CAPABILITIES:
- Analyze performance metrics across Instagram, LinkedIn, Facebook, and Twitter
- Identify trends, patterns, and anomalies in engagement data
- Compare platforms, content types, and time periods
- Provide specific, quantified recommendations with expected ROI
- Draft content strategies and post ideas based on proven performance

CRITICAL: HANDLING AMBIGUOUS QUERIES
When a user's question is unclear or could have multiple interpretations:
1. **ASK CLARIFYING QUESTIONS** - Don't guess or provide vague answers
2. **List the available data** - Show what metrics/data you have access to
3. **Suggest specific alternatives** - "Did you mean X or Y?"
4. **Be direct** - "I need clarification: are you asking about [option A] or [option B]?"

Examples of when to clarify:
- "highest engagement" → Ask: "Do you mean engagement rate (%) or total engagement (likes + comments + shares)?"
- "best post" → Ask: "Best by which metric? Likes, engagement rate, reach, or saves?"
- Comparing different metrics → Ask: "These are different metrics. Did you want to know if the same post had both the highest X and highest Y?"

RESPONSE STRUCTURE (for clear queries):
1. **Direct Answer** - Answer the specific question asked (1-2 sentences max)
2. **Key Metrics** - The exact numbers that answer the question
3. **Brief Context** - Only if relevant (e.g., "This is 2x the average")
4. **Optional: Related Insight** - Only if directly useful

RESPONSE STYLE:
- **Be concise and direct** - Answer the question asked, nothing more
- **Don't use the 5-section format** unless the query explicitly asks for analysis
- Use specific numbers and percentages
- Avoid vague statements like "good" or "bad" - quantify everything
- Format numbers for readability (7,161 not 7161)
- Use emojis sparingly for visual markers (📊, 📈, 📉, ⚠️, ✅)

CRITICAL RULES:
- **ALWAYS cite specific data** from the context provided
- **NEVER make up numbers** or metrics
- **ANALYTICAL CONTEXT is your PRIMARY source**: If you see a "COUNTING/FILTERING QUERY RESULT" or other analytics section, that is the AUTHORITATIVE answer - use it directly
- **If ANALYTICAL CONTEXT has the answer**: State it confidently with the exact numbers provided
- **If ANALYTICAL CONTEXT is empty or says "No specific analytics generated"**:
  - DO NOT guess or make up answers
  - DO NOT use vague numbers from vector store chunks
  - RESPOND: "I don't have the specific data loaded to answer this accurately. Let me know if you'd like me to analyze [suggest what type of analysis might help]"
- **BEFORE claiming data is missing**: CAREFULLY CHECK the ANALYTICAL CONTEXT first, then the raw data context
  - The context includes: likes, comments, shares, saves, engagement_rate, reach, impressions
  - If you see "Total Count: 3" in ANALYTICAL CONTEXT, that is the EXACT answer
  - Only claim data is missing if you've thoroughly checked both contexts
- **If data IS in the context**: Answer the question directly with the data
- **If data is truly missing**: Ask "I don't see [metric] in the data. Do you have this information?"
- **If query is ambiguous**: STOP and ask for clarification with specific options
- Distinguish between facts (from data) and recommendations (your analysis)

HANDLING DIFFERENT QUERY TYPES:
- **Factual queries**: Direct answer with exact numbers (1-2 sentences)
- **Comparative queries**: Direct comparison with winner identified
- **Ambiguous queries**: ASK CLARIFYING QUESTIONS immediately
- **Strategic queries**: Multi-step recommendations with priorities
- **Content creation**: Provide specific hooks, formats, and examples`,

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Platform names, metrics, and business context

  domain: {
    name: 'Social Media Marketing',
    platforms: ['Instagram', 'LinkedIn', 'Facebook', 'Twitter'],
    primaryMetrics: [
      'engagement_rate',
      'likes',
      'comments',
      'shares',
      'saves',
      'reach',
      'impressions'
    ],
    timeGranularities: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly'],
    contentTypes: ['image', 'video', 'carousel', 'reel', 'story'],
    postTypes: ['organic', 'sponsored', 'boosted']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RAG RETRIEVAL SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: How many documents to retrieve and filtering behavior

  retrieval: {
    // Number of similar chunks to retrieve
    topK: 15,

    // Minimum similarity score (0-1, higher = more similar required)
    similarityThreshold: 0.3,

    // Maximum chunks to send to LLM (prevents token overflow)
    maxChunksToLLM: 20,

    // Search strategy
    searchType: 'similarity', // Options: 'similarity', 'mmr' (maximal marginal relevance)

    // Metadata filtering (these will be applied automatically when detected in query)
    enableMetadataFiltering: true,

    // Re-ranking strategy (re-order results by relevance)
    enableReranking: true
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHUNK LEVEL STRATEGY
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: How to route queries to different chunk levels

  chunkLevelRouting: {
    // Route queries to appropriate chunk levels based on intent
    factualQueries: [1], // Individual posts (e.g., "most liked post")
    timeBasedQueries: [2, 3], // Daily/monthly summaries
    platformQueries: [4, 5], // Platform comparisons
    strategicQueries: [3, 4, 5, 6], // All levels for comprehensive analysis
    trendQueries: [2, 3, 6], // Time-based patterns

    // Default levels if intent unclear
    defaultLevels: [1, 3, 4]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LLM SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Model behavior and parameters

  llm: {
    modelName: 'gpt-4o-mini',
    temperature: 0.1, // Low = more factual, High = more creative
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMBEDDING SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  embeddings: {
    modelName: 'text-embedding-3-small',
    dimensions: 1536
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSE FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: How responses are formatted

  formatting: {
    includeMetadata: true, // Show which data sources were used
    includeConfidence: true, // Show confidence level in answers
    maxResponseLength: 2000, // Characters

    // Performance indicators
    performanceEmojis: {
      up: '📈',
      down: '📉',
      stable: '➡️',
      excellent: '🔥',
      warning: '⚠️',
      success: '✅'
    },

    // Number formatting
    formatLargeNumbers: true, // 7161 → 7,161
    percentageDecimals: 2 // 7.85%
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// QUERY INTENT PATTERNS (for smart routing)
// ═══════════════════════════════════════════════════════════════════════════
// ✏️ CUSTOMIZE: Add patterns to recognize different query types

export const QUERY_PATTERNS = {
  factual: [
    /most\s+(liked|engaged|viewed|shared|saved)/i,
    /highest\s+(engagement|likes|reach)/i,
    /top\s+\d*\s*(post|content)/i,
    /which\s+post/i,
    /find\s+(post|content)/i
  ],

  comparative: [
    /compare/i,
    /vs\.?|versus/i,
    /better|worse/i,
    /difference\s+between/i,
    /which\s+platform/i
  ],

  temporal: [
    /trend/i,
    /over\s+time/i,
    /last\s+(week|month|quarter)/i,
    /this\s+(week|month|quarter)/i,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i
  ],

  strategic: [
    /how\s+to\s+improve/i,
    /strategy|strategic/i,
    /recommend|suggestion/i,
    /should\s+i|should\s+we/i,
    /what\s+to\s+do/i,
    /optimize|optimization/i
  ],

  negative: [
    /worst|poorest|lowest/i,
    /underperform/i,
    /not\s+recommend/i,
    /avoid/i,
    /decline|declining/i
  ],

  contentCreation: [
    /draft|write|create/i,
    /post\s+ideas?/i,
    /content\s+ideas?/i,
    /what\s+should\s+i\s+post/i
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// METADATA EXTRACTION RULES
// ═══════════════════════════════════════════════════════════════════════════
// Extract platforms, dates, metrics from queries for filtering

export const METADATA_EXTRACTION = {
  platforms: {
    instagram: ['instagram', 'ig', 'insta'],
    linkedin: ['linkedin', 'li'],
    facebook: ['facebook', 'fb', 'meta'],
    twitter: ['twitter', 'tweet', 'x.com', 'x platform']
  },

  months: {
    1: ['january', 'jan'],
    2: ['february', 'feb'],
    3: ['march', 'mar'],
    4: ['april', 'apr'],
    5: ['may'],
    6: ['june', 'jun'],
    7: ['july', 'jul'],
    8: ['august', 'aug'],
    9: ['september', 'sep', 'sept'],
    10: ['october', 'oct'],
    11: ['november', 'nov'],
    12: ['december', 'dec']
  },

  metrics: {
    likes: ['like', 'likes', 'liked'],
    comments: ['comment', 'comments'],
    shares: ['share', 'shares', 'shared'],
    saves: ['save', 'saves', 'saved'],
    engagement: ['engagement', 'engaged', 'interact'],
    reach: ['reach', 'reached', 'views', 'viewed']
  }
};

export default LANGCHAIN_CONFIG;
