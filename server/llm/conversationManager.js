import { ChatOpenAI } from '@langchain/openai';
import { LANGCHAIN_CONFIG } from '../langchain/config.js';

/**
 * Conversation Manager
 * Handles multi-step queries with conversation context and memory
 */
class ConversationManager {
  constructor() {
    this.llm = null; // Lazy initialization
    this.conversations = new Map(); // sessionId -> conversation history
    this.maxConversationAge = 3600000; // 1 hour
    this.maxMessagesPerConversation = 20;
  }

  getLLM() {
    if (!this.llm) {
      this.llm = new ChatOpenAI({
        modelName: LANGCHAIN_CONFIG.llm.modelName,
        temperature: 0.1,
        maxTokens: 2000,
      });
    }
    return this.llm;
  }

  /**
   * Create or get conversation session
   * @param {string} sessionId - Unique session identifier
   * @returns {Object} Conversation context
   */
  getOrCreateSession(sessionId = 'default') {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, {
        messages: [],
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        intermediateResults: [],
      });
    }

    const session = this.conversations.get(sessionId);
    session.lastAccessedAt = Date.now();

    // Clean old sessions
    this.cleanOldSessions();

    return session;
  }

  /**
   * Add message to conversation history
   * @param {string} sessionId - Session identifier
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   */
  addMessage(sessionId, role, content) {
    const session = this.getOrCreateSession(sessionId);

    session.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });

    // Limit conversation length
    if (session.messages.length > this.maxMessagesPerConversation) {
      session.messages = session.messages.slice(-this.maxMessagesPerConversation);
    }
  }

  /**
   * Store intermediate query result
   * @param {string} sessionId - Session identifier
   * @param {Object} result - Query result to store
   */
  storeIntermediateResult(sessionId, result) {
    const session = this.getOrCreateSession(sessionId);

    session.intermediateResults.push({
      timestamp: Date.now(),
      data: result.data,
      summary: result.summary || this.summarizeResult(result),
    });

    // Keep only last 5 intermediate results
    if (session.intermediateResults.length > 5) {
      session.intermediateResults = session.intermediateResults.slice(-5);
    }
  }

  /**
   * Detect if query is multi-step or has dependencies
   * @param {string} userQuery - The user's query
   * @param {string} sessionId - Session identifier
   * @returns {Object} Analysis result
   */
  async analyzeQuery(userQuery, sessionId = 'default') {
    const session = this.getOrCreateSession(sessionId);
    const hasHistory = session.messages.length > 0;

    const prompt = this.buildAnalysisPrompt(userQuery, session, hasHistory);

    try {
      const llm = this.getLLM();
      const response = await llm.invoke(prompt);
      const content = response.content;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM did not return valid JSON');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      console.log('📊 Query Analysis:', {
        isMultiStep: analysis.isMultiStep,
        needsContext: analysis.needsContext,
        steps: analysis.steps?.length || 0,
      });

      return analysis;
    } catch (error) {
      console.error('Error analyzing query:', error);
      // Fallback: treat as single-step
      return {
        isMultiStep: false,
        needsContext: hasHistory,
        steps: [{ query: userQuery, description: userQuery }],
        reasoning: 'Fallback to single-step processing',
      };
    }
  }

  /**
   * Build analysis prompt for LLM
   */
  buildAnalysisPrompt(userQuery, session, hasHistory) {
    const conversationContext = hasHistory
      ? session.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')
      : 'No previous conversation';

    const intermediateResults = session.intermediateResults.length > 0
      ? session.intermediateResults.map((r, i) =>
          `Result ${i + 1}: ${r.summary}`
        ).join('\n')
      : 'No previous results';

    return `You are a query analyzer for a social media analytics system. Analyze if the user's query requires multi-step processing or references previous conversation context.

CONVERSATION CONTEXT:
${conversationContext}

PREVIOUS RESULTS:
${intermediateResults}

USER QUERY:
"${userQuery}"

YOUR TASK:
Determine if this query should be:
1. **Multi-step**: Needs to be broken down into sequential sub-queries
2. **Context-dependent**: References previous results or conversation
3. **Single-step**: Can be processed directly

Return JSON with this structure:
{
  "isMultiStep": true/false,
  "needsContext": true/false,
  "steps": [
    {
      "stepNumber": 1,
      "query": "Rewritten query for step 1",
      "description": "What this step does",
      "dependsOn": null  // or stepNumber if depends on previous step
    }
  ],
  "contextReference": "Description of how this relates to conversation history",
  "reasoning": "Why you classified it this way"
}

MULTI-STEP INDICATORS:
- "then", "after that", "next", "followed by"
- "compare those results", "use that data"
- "first X, then Y"
- Sequential instructions

CONTEXT-DEPENDENT INDICATORS:
- "that", "those", "them" (referring to previous results)
- "also", "additionally", "what about"
- Follow-up questions
- Pronouns without clear antecedents in current query

EXAMPLES:

Example 1 (Multi-step):
User: "Show me top Instagram posts, then compare their engagement rates"
Response:
{
  "isMultiStep": true,
  "needsContext": false,
  "steps": [
    {
      "stepNumber": 1,
      "query": "Show me top Instagram posts sorted by engagement",
      "description": "Get top Instagram posts",
      "dependsOn": null
    },
    {
      "stepNumber": 2,
      "query": "Compare engagement rates of the top Instagram posts from previous step",
      "description": "Compare engagement rates from step 1 results",
      "dependsOn": 1
    }
  ],
  "contextReference": null,
  "reasoning": "Query has 'then' indicating sequential steps"
}

Example 2 (Context-dependent):
Previous: "What are the top Facebook posts?"
Current: "What about Instagram?"
Response:
{
  "isMultiStep": false,
  "needsContext": true,
  "steps": [
    {
      "stepNumber": 1,
      "query": "What are the top Instagram posts?",
      "description": "Get top Instagram posts (similar to previous query)",
      "dependsOn": null
    }
  ],
  "contextReference": "Asking same question as previous query but for different platform",
  "reasoning": "Follow-up question with platform change"
}

Example 3 (Single-step):
User: "Which platform had highest engagement in November?"
Response:
{
  "isMultiStep": false,
  "needsContext": false,
  "steps": [
    {
      "stepNumber": 1,
      "query": "Which platform had highest engagement in November?",
      "description": "Direct comparison query",
      "dependsOn": null
    }
  ],
  "contextReference": null,
  "reasoning": "Self-contained query with no sequential steps"
}

Example 4 (Multi-step with context):
Previous: "Show Instagram posts from November"
Current: "Now filter those by engagement > 5% and show me the top 10"
Response:
{
  "isMultiStep": false,
  "needsContext": true,
  "steps": [
    {
      "stepNumber": 1,
      "query": "Show Instagram posts from November with engagement rate > 5%, sorted by engagement, limit 10",
      "description": "Filter and sort previous results",
      "dependsOn": null
    }
  ],
  "contextReference": "References 'those' from previous query about Instagram posts",
  "reasoning": "Context-dependent query that refines previous request"
}

IMPORTANT:
- If needsContext is true, incorporate context into the rewritten query
- Each step should be a complete, self-contained query
- Return ONLY valid JSON, no explanations outside the JSON

Now analyze the user's query above.`;
  }

  /**
   * Summarize result for storage
   */
  summarizeResult(result) {
    if (!result.data || result.data.length === 0) {
      return 'No results found';
    }

    const recordCount = result.data.length;
    const firstRecord = result.data[0];
    const columns = Object.keys(firstRecord).slice(0, 3).join(', ');

    return `${recordCount} records with columns: ${columns}`;
  }

  /**
   * Clear conversation session
   * @param {string} sessionId - Session identifier
   */
  clearSession(sessionId) {
    this.conversations.delete(sessionId);
  }

  /**
   * Clean old sessions
   */
  cleanOldSessions() {
    const now = Date.now();

    for (const [sessionId, session] of this.conversations.entries()) {
      if (now - session.lastAccessedAt > this.maxConversationAge) {
        console.log(`🧹 Cleaning old conversation session: ${sessionId}`);
        this.conversations.delete(sessionId);
      }
    }
  }

  /**
   * Get conversation context as formatted string
   * @param {string} sessionId - Session identifier
   * @returns {string} Formatted conversation
   */
  getConversationContext(sessionId) {
    const session = this.conversations.get(sessionId);

    if (!session || session.messages.length === 0) {
      return '';
    }

    return session.messages
      .slice(-6) // Last 6 messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeSessions: this.conversations.size,
      totalMessages: Array.from(this.conversations.values())
        .reduce((sum, s) => sum + s.messages.length, 0),
    };
  }
}

// Singleton instance
let conversationManagerInstance = null;

export function getConversationManager() {
  if (!conversationManagerInstance) {
    conversationManagerInstance = new ConversationManager();
  }
  return conversationManagerInstance;
}

export default ConversationManager;
