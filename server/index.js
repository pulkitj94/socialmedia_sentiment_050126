// ═══════════════════════════════════════════════════════════════════════════
// EXPRESS SERVER - SOCIAL MEDIA COMMAND CENTER
// ═══════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat.js';
import { initializeVectorStore } from './langchain/vectorStore.js';
import { startCacheCleanup } from './utils/cache.js';
import { startPeriodicAnalytics } from './utils/queryLogger.js';
import { getFileWatcher } from './utils/fileWatcher.js';
import { getQueryProcessor } from './llm/queryProcessor.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY is required in .env file');
  console.error('Please create a .env file with: OPENAI_API_KEY=your_key_here');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

app.use('/api/chat', chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Social Media Command Center API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/chat/health',
      chat: 'POST /api/chat',
      batch: 'POST /api/chat/batch'
    },
    documentation: 'See README.md for usage instructions'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════════════

async function startServer() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('🚀 SOCIAL MEDIA COMMAND CENTER - STARTING UP');
    console.log('═'.repeat(80) + '\n');
    
    // Initialize vector store
    console.log('📚 Initializing RAG system...');
    await initializeVectorStore();
    
    // Start cache cleanup (every 10 minutes)
    console.log('🧹 Starting cache cleanup...');
    startCacheCleanup(10);
    
    // Start periodic analytics (every hour)
    console.log('📊 Starting analytics generation...');
    startPeriodicAnalytics();

    // Start file watcher for real-time data updates
    console.log('👀 Starting file watcher...');
    const fileWatcher = getFileWatcher();
    fileWatcher.start();

    // Invalidate caches when data files change
    fileWatcher.onChange((change) => {
      console.log(`\n🔄 Data change detected: ${change.filename}`);
      console.log('   Invalidating caches...');

      // Clear query processor cache
      const queryProcessor = getQueryProcessor();
      queryProcessor.clearCache();

      console.log('   ✅ Caches cleared - Fresh data will be loaded on next query\n');
    });

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n' + '═'.repeat(80));
      console.log('✅ SERVER READY');
      console.log('═'.repeat(80));
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`📡 API endpoint: http://localhost:${PORT}/api/chat`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health`);
      console.log('═'.repeat(80) + '\n');
      console.log('💡 Ready to process queries!');
      console.log('📝 Send POST requests to /api/chat with: { "message": "your query" }\n');
    });
    
  } catch (error) {
    console.error('\n❌ Failed to start server:', error);
    console.error('\n📋 Troubleshooting:');
    console.error('  1. Check your OPENAI_API_KEY in .env file');
    console.error('  2. Ensure campaign_performance.csv exists in /data folder');
    console.error('  3. Run: npm install to install dependencies\n');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Shutting down server...');
  process.exit(0);
});

// Start the server
startServer();
