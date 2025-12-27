// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION CHAT ROUTES - LLM-DRIVEN DYNAMIC FILTERS
// ═══════════════════════════════════════════════════════════════════════════

import express from 'express';
// OLD SYSTEM (commented out - using LLM-driven system now)
// import { processQuery } from '../langchain/chainsProduction.js';
// import { getVectorStore } from '../langchain/vectorStore.js';

// NEW LLM-DRIVEN SYSTEM
import { getQueryProcessor } from '../llm/queryProcessor.js';

import { cacheMiddleware, getCacheStats, invalidateCache } from '../utils/cache.js';
import { queryLoggerMiddleware, getQueryLogs, generateAnalytics } from '../utils/queryLogger.js';

const router = express.Router();

// Initialize query processor at startup
let queryProcessor = null;
(async () => {
  queryProcessor = getQueryProcessor();
  await queryProcessor.initialize();
})();

// Apply query logging to all routes
router.use(queryLoggerMiddleware);

// Apply caching middleware (1 hour TTL)
router.post('/', cacheMiddleware(3600), async (req, res) => {
  try {
    const { message, mode, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a non-empty string'
      });
    }

    // Use sessionId for conversation context (default to 'default' if not provided)
    const session = sessionId || 'default';

    console.log(`\n📨 Received query: "${message}"`);
    console.log(`🔧 Mode: ${mode || 'llm-driven'}`);
    console.log(`👤 Session: ${session}`);

    // Ensure query processor is initialized
    if (!queryProcessor) {
      queryProcessor = getQueryProcessor();
      await queryProcessor.initialize();
    }

    // Process query with multi-step support and conversation context
    const result = await queryProcessor.processQuery(message, session);

    // Add mode to response
    result.mode = mode || 'llm-driven';
    result.timestamp = new Date().toISOString();
    result.sessionId = session;

    res.json(result);

  } catch (error) {
    console.error('❌ Chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Social Media Command Center API',
    mode: 'llm-driven',
    features: [
      'Multi-Step Query Support ✨ LATEST',
      'Conversation Context & Memory ✨ LATEST',
      'LLM-Driven Dynamic Filter Generation',
      'Intelligent Query Understanding',
      'Two-Stage LLM Processing',
      'Automatic Metadata Extraction',
      'Complex Filter Support (AND/OR)',
      'Natural Language Insights',
      'Query Result Caching',
      'Real-Time Data Processing'
    ],
    cache: getCacheStats(),
    systemInfo: {
      llmModel: 'gpt-4o-mini',
      llmCalls: '2-6 (depending on query complexity)',
      filteringEngine: 'LLM + Node.js',
      noRegexPatterns: true,
      multiStepSupport: true,
      conversationMemory: true
    }
  });
});

// Cache management endpoints
router.get('/cache/stats', (req, res) => {
  res.json({
    success: true,
    cache: getCacheStats()
  });
});

router.post('/cache/invalidate', (req, res) => {
  const { pattern } = req.body;
  const count = invalidateCache(pattern);
  res.json({
    success: true,
    message: `Invalidated ${count} cache entries`,
    pattern: pattern || 'all'
  });
});

// Query analytics endpoints
router.get('/analytics', (req, res) => {
  const analytics = generateAnalytics();
  res.json({
    success: true,
    analytics
  });
});

router.get('/queries/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const logs = getQueryLogs(limit, offset);
  res.json({
    success: true,
    count: logs.length,
    queries: logs
  });
});

// Metadata inspection endpoint
router.get('/metadata', async (req, res) => {
  try {
    if (!queryProcessor) {
      queryProcessor = getQueryProcessor();
      await queryProcessor.initialize();
    }
    const metadata = await queryProcessor.getMetadataSummary();
    res.json({
      success: true,
      metadata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Conversation management endpoints
router.post('/conversation/clear', (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = sessionId || 'default';

    if (!queryProcessor) {
      return res.status(500).json({
        success: false,
        error: 'Query processor not initialized'
      });
    }

    queryProcessor.clearConversation(session);
    res.json({
      success: true,
      message: `Conversation session '${session}' cleared`,
      sessionId: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/conversation/stats', (req, res) => {
  try {
    if (!queryProcessor) {
      return res.status(500).json({
        success: false,
        error: 'Query processor not initialized'
      });
    }

    const stats = queryProcessor.getConversationStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
