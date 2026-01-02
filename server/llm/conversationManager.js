/**
 * Conversation Manager - PATCHED VERSION V2
 * Fixes query decomposition issues for comparison AND ads metric queries
 * 
 * CHANGES:
 * 1. Better detection of simple comparison queries (don't decompose)
 * 2. Detection of ads metric queries like CTR, ROAS (don't decompose)
 * 3. More specific sub-queries when decomposition is needed
 * 4. Avoid vague "retrieve metrics" queries that trigger wrong validations
 */

import OpenAI from 'openai';

// Don't initialize OpenAI at module level - wait for .env to load
let openai = null;

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Conversation Manager
 * Handles multi-turn conversations and query context
 */
class ConversationManager {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Get or create session
   */
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        messages: [],
        intermediateResults: [],
        createdAt: Date.now(),
      });
    }
    return this.sessions.get(sessionId);
  }

  /**
   * Add message to conversation history
   */
  addMessage(sessionId, role, content) {
    const session = this.getSession(sessionId);
    session.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Store intermediate result
   */
  storeIntermediateResult(sessionId, result) {
    const session = this.getSession(sessionId);
    session.intermediateResults.push({
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Get conversation context
   */
  getContext(sessionId) {
    const session = this.getSession(sessionId);
    return {
      messages: session.messages.slice(-10), // Last 10 messages
      intermediateResults: session.intermediateResults.slice(-3), // Last 3 results
    };
  }

  /**
   * Clear session
   */
  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.entries()).map(([id, session]) => ({
        sessionId: id,
        messageCount: session.messages.length,
        age: Date.now() - session.createdAt,
      })),
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * PATCHED: Analyze query for multi-step processing
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async analyzeQuery(userQuery, sessionId = 'default') {
    const context = this.getContext(sessionId);

    // ═══════════════════════════════════════════════════════════════════════════
    // PATCH 1: Quick detection of simple queries that shouldn't be decomposed
    // ═══════════════════════════════════════════════════════════════════════════

    const lowerQuery = userQuery.toLowerCase();

    // Simple comparison queries - DON'T decompose these
    if (this.isSimpleComparisonQuery(lowerQuery)) {
      console.log('🔧 PATCH: Detected simple comparison query - using single step');
      return {
        isMultiStep: false,
        needsContext: false,
        steps: [{
          stepNumber: 1,
          query: userQuery,
          description: 'Process comparison query',
          dependsOn: null
        }],
        contextReference: null,
        reasoning: 'Simple comparison query handled as single step to avoid decomposition issues'
      };
    }

    // Out-of-scope queries (like "Where is New Delhi?")
    const outOfScopeKeywords = ['weather', 'capital', 'location', 'where is', 'what is the capital'];
    const isOutOfScope = outOfScopeKeywords.some(keyword => lowerQuery.includes(keyword));

    // ═══════════════════════════════════════════════════════════════════════════
    // PATCH 2: Detect metric queries that should be processed as single-step
    // ═══════════════════════════════════════════════════════════════════════════

    // Check for ads-only metrics (CTR, CPC, ROAS, etc.)
    const adsOnlyMetrics = ['ctr', 'click-through rate', 'click-through', 'cpc', 'cost per click', 'roas', 'return on ad spend', 'conversion rate'];
    const hasAdsOnlyMetric = adsOnlyMetrics.some(metric => lowerQuery.includes(metric));

    // Scenario 1: CTR/CPC/ROAS on ORGANIC posts (invalid - let validation handle)
    const isAskingAboutOrganic = (lowerQuery.includes('organic') || lowerQuery.includes('post')) &&
      !lowerQuery.includes('ad') &&
      !lowerQuery.includes('campaign');
    const isInvalidMetricQuery = isAskingAboutOrganic && hasAdsOnlyMetric;

    // Scenario 2: CTR/CPC/ROAS for ADS (valid - but don't decompose!)
    const isAskingAboutAds = lowerQuery.includes('ad') || lowerQuery.includes('campaign');
    const isAdsMetricQuery = isAskingAboutAds && hasAdsOnlyMetric;

    // Process as single-step for BOTH invalid metrics AND ads metrics
    if ((isOutOfScope || isInvalidMetricQuery || isAdsMetricQuery) &&
      !lowerQuery.includes('platform') && !lowerQuery.includes('compare')) {

      let reason;
      if (isInvalidMetricQuery) {
        reason = 'invalid metric';
      } else if (isAdsMetricQuery) {
        reason = 'ads metric query';
      } else {
        reason = 'out-of-scope';
      }

      console.log(`🔧 PATCH: Detected ${reason} query - using single step`);

      return {
        isMultiStep: false,
        needsContext: false,
        steps: [{
          stepNumber: 1,
          query: userQuery,
          description: isInvalidMetricQuery ? 'Validate metric availability' :
            isAdsMetricQuery ? 'Process ads metric query' :
              'Process out-of-scope query',
          dependsOn: null
        }],
        contextReference: null,
        reasoning: isInvalidMetricQuery ? 'Invalid metric query - will be caught by validation' :
          isAdsMetricQuery ? 'Ads metric query processed as single step' :
            'Out-of-scope query processed as single step'
      };
    }

    // Try LLM-based analysis
    try {
      const prompt = `Analyze this social media analytics query and determine if it requires multiple steps.

User Query: "${userQuery}"

Recent Context:
${context.messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Instructions:
1. Determine if the query is multi-step or single-step
2. If multi-step, break it down into sequential steps
3. Each step should be SPECIFIC and ACTIONABLE (not vague)
4. Avoid generic "retrieve metrics" queries - be specific about what metrics
5. For comparison queries like "X vs Y", create specific queries for each platform

CRITICAL RULES:
- Comparison queries should specify exact metrics needed
- Don't create vague queries like "Retrieve performance metrics"
- Instead use: "Show [platform] posts with engagement rate, likes, comments, and reach"
- For trend analysis, specify the time period and metric clearly

Return JSON:
{
  "isMultiStep": true/false,
  "needsContext": true/false,
  "steps": [
    {
      "stepNumber": 1,
      "query": "SPECIFIC actionable query with exact metrics and platform",
      "description": "Brief description",
      "dependsOn": null or step number
    }
  ],
  "contextReference": "string or null",
  "reasoning": "Why this approach"
}

Examples of GOOD queries:
- "Show Instagram organic posts with engagement rate, likes, comments, shares, and reach"
- "Show Instagram Ads campaigns with ROAS, CTR, impressions, and conversions"
- "Calculate average engagement rate for Facebook posts in November 2025"

Examples of BAD queries to AVOID:
- "Retrieve performance metrics for Instagram organic posts" (too vague!)
- "Get data for Instagram Ads" (what data?)
- "Analyze Instagram performance" (analyze what?)`;

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      // ═══════════════════════════════════════════════════════════════════════════
      // PATCH 3: Validate and improve the generated steps
      // ═══════════════════════════════════════════════════════════════════════════
      if (analysis.isMultiStep && analysis.steps) {
        analysis.steps = this.validateAndImproveSteps(analysis.steps, userQuery);
      }

      return analysis;

    } catch (error) {
      console.error('Error analyzing query:', error);

      // Fallback: treat as single-step with proper structure
      return {
        isMultiStep: false,
        needsContext: false,
        steps: [{
          stepNumber: 1,
          query: userQuery,
          description: 'Process query',
          dependsOn: null
        }],
        contextReference: null,
        reasoning: 'Error in analysis, defaulting to single step'
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * PATCH 4: Detect simple comparison queries
   * ═══════════════════════════════════════════════════════════════════════════
   */
  isSimpleComparisonQuery(lowerQuery) {
    // Pattern 1: "X vs Y" or "compare X and Y"
    const hasVsPattern = lowerQuery.includes(' vs ') ||
      lowerQuery.includes(' versus ') ||
      (lowerQuery.includes('compare') && lowerQuery.includes(' and '));

    // Pattern 2: Simple comparison (no complex analysis required)
    const isSimple = !lowerQuery.includes('trend') &&
      !lowerQuery.includes('month-over-month') &&
      !lowerQuery.includes('over time') &&
      !lowerQuery.includes('historical') &&
      !lowerQuery.includes('predict') &&
      !lowerQuery.includes('forecast');

    // Pattern 3: Direct comparison keywords
    const hasComparisonKeywords = lowerQuery.includes('organic vs') ||
      lowerQuery.includes('ads vs') ||
      lowerQuery.includes('paid vs') ||
      lowerQuery.includes('performance comparison');

    return hasVsPattern && isSimple && hasComparisonKeywords;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * PATCH 5: Validate and improve decomposed steps
   * ═══════════════════════════════════════════════════════════════════════════
   */
  validateAndImproveSteps(steps, originalQuery) {
    const lowerOriginal = originalQuery.toLowerCase();

    return steps.map((step, index) => {
      let improvedQuery = step.query;
      const lowerStep = step.query.toLowerCase();

      // Fix vague "retrieve" queries
      if (lowerStep.includes('retrieve') && lowerStep.includes('metrics')) {
        console.log(`🔧 PATCH: Improving vague step ${index + 1}: "${step.query}"`);

        // Extract platform from step query
        const platforms = ['instagram', 'facebook', 'twitter', 'linkedin'];
        const platform = platforms.find(p => lowerStep.includes(p));

        // Determine if organic or ads
        const isAds = lowerStep.includes('ads') || lowerStep.includes('ad campaign');
        const type = isAds ? 'Ads' : 'organic posts';

        if (platform) {
          // Create specific query with exact metrics
          const platformCap = platform.charAt(0).toUpperCase() + platform.slice(1);

          if (isAds) {
            improvedQuery = `Show ${platformCap} Ads campaigns with ROAS, CTR, impressions, conversions, and ad spend`;
          } else {
            improvedQuery = `Show ${platformCap} organic posts with engagement rate, likes, comments, shares, and reach`;
          }

          console.log(`   → Improved to: "${improvedQuery}"`);
        }
      }

      // Fix vague "analyze" queries
      if (lowerStep.includes('analyze') && lowerStep.includes('performance')) {
        console.log(`🔧 PATCH: Improving vague analyze step ${index + 1}`);

        // Make it more specific based on original query
        if (lowerOriginal.includes('engagement')) {
          improvedQuery = step.query.replace('analyze performance', 'calculate average engagement rate and total engagement metrics');
        } else if (lowerOriginal.includes('reach')) {
          improvedQuery = step.query.replace('analyze performance', 'calculate average reach and total impressions');
        } else {
          improvedQuery = step.query.replace('analyze performance', 'show all performance metrics including engagement, reach, and interactions');
        }

        console.log(`   → Improved to: "${improvedQuery}"`);
      }

      return {
        ...step,
        query: improvedQuery
      };
    });
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance
 */
export function getConversationManager() {
  if (!instance) {
    instance = new ConversationManager();
  }
  return instance;
}

export default ConversationManager;