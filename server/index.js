// ═══════════════════════════════════════════════════════════════════════════
// EXPRESS SERVER - SOCIAL MEDIA COMMAND CENTER (SCENARIO ENABLED)
// ═══════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { parse } from 'csv-parse/sync';
import cron from 'node-cron';

// Existing project imports
import chatRoutes from './routes/chat.js';
import { initializeVectorStore } from './langchain/vectorStore.js';
import { startCacheCleanup } from './utils/cache.js';
import { startPeriodicAnalytics } from './utils/queryLogger.js';
import { getFileWatcher } from './utils/fileWatcher.js';
import { getQueryProcessor } from './llm/queryProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════
// SHARED SIMULATION LOGIC (WITH SCENARIO SUPPORT)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Executes a specific simulation scenario (normal, crisis, viral)
 * then runs the sentiment engine to update the dashboard.
 */
const runSimulationScenario = (scenario = "normal") => {
  const flag = scenario === "normal" ? "--once" : `--${scenario}`;
  console.log(`⚡ [SYSTEM] Triggering Scenario: ${scenario.toUpperCase()}`);

  // Step 1: Run Mock Streamer with the specific scenario flag
  exec(`python3 ../scripts/mock_streamer.py ${flag}`, (err, stdout) => {
    if (err) return console.error(`❌ Scenario ${scenario} failed:`, err);
    console.log(`📝 Mock Data Injected (${scenario}).`);

    // Step 2: Run Sentiment Engine to process the new AI comments
    exec('python3 ../scripts/sentiment_engine.py', (err2) => {
      if (err2) return console.error("❌ AI Engine Step Failed:", err2);
      console.log("🤖 AI Re-analysis Complete. Dashboard Live.");
    });
  });
};

// 🚀 HOURLY CRON: Runs the 'normal' scenario every hour
cron.schedule('0 * * * *', () => {
  runSimulationScenario("normal");
});

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Trigger specific simulation scenarios from the UI
 * Body: { scenario: "normal" | "crisis" | "viral" }
 */
app.post('/api/simulate/trigger', (req, res) => {
  const { scenario } = req.body;
  runSimulationScenario(scenario || "normal");
  res.json({ success: true, message: `Scenario ${scenario} started.` });
});

app.get('/api/sentiment/summary', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'data', 'platform_sentiment_summary.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (e) { res.status(404).json({ success: false }); }
});

app.get('/api/sentiment/history', async (req, res) => {
  try {
    const fileContent = await fs.readFile(path.join(__dirname, 'data', 'sentiment_history.csv'), 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    const chartData = records.reduce((acc, curr) => {
      const time = curr.timestamp;
      let entry = acc.find(item => item.timestamp === time);
      if (!entry) { entry = { timestamp: time }; acc.push(entry); }
      const pKey = curr.platform.charAt(0).toUpperCase() + curr.platform.slice(1).toLowerCase();
      entry[pKey] = parseFloat(curr.health_score);
      return acc;
    }, []);
    res.json(chartData.slice(-15));
  } catch (e) { res.json([]); }
});

app.get('/api/sentiment/negative-alerts', async (req, res) => {
  try {
    const csvPath = path.join(__dirname, 'data', 'enriched_comments_sentiment.csv');
    const fileContent = await fs.readFile(csvPath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    const alerts = records.filter(r => (r.label || "").toLowerCase().includes('neg')).slice(-5).reverse();
    res.json(alerts);
  } catch (error) { res.json([]); }
});

app.post('/api/sentiment/refresh', (req, res) => {
  exec('python3 ../scripts/sentiment_engine.py', (error) => {
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

app.post('/api/sentiment/generate-reply', async (req, res) => {
  const { comment, platform } = req.body;
  try {
    const prompt = `Reply to this comment on ${platform}: "${comment}". Max 2 sentences.`;
    const reply = await getQueryProcessor().processQuery(prompt);
    res.json({ success: true, reply: reply.response });
  } catch (error) { res.status(500).json({ success: false }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════

app.use('/api/chat', chatRoutes);
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

async function startServer() {
  try {
    await initializeVectorStore();
    startCacheCleanup(10);
    startPeriodicAnalytics();
    const fileWatcher = getFileWatcher();
    fileWatcher.start();
    fileWatcher.onChange(() => getQueryProcessor().clearCache());

    app.listen(PORT, () => {
      console.log(`✅ SERVER READY on http://localhost:${PORT}`);
      console.log(`🕒 Cron Active: Hourly Normal Simulation`);
    });
  } catch (error) { process.exit(1); }
}

startServer();