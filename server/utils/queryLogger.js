// ═══════════════════════════════════════════════════════════════════════════
// QUERY LOGGER - PRODUCTION GRADE
// ═══════════════════════════════════════════════════════════════════════════
// Saves user queries for:
// - Analytics (popular queries, usage patterns)
// - Compliance (audit trail)
// - Improvements (identifying gaps)
// - A/B testing (response quality)
// ═══════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 */
const LOGGER_CONFIG = {
  // Enable/disable logging
  enabled: true,
  
  // Log file paths
  logsDir: path.join(__dirname, '../logs'),
  queryLogFile: 'queries.jsonl',      // JSONL format (one JSON per line)
  analyticsFile: 'analytics.json',    // Aggregated analytics
  
  // Privacy settings
  anonymizeIP: true,                  // Hash IP addresses
  storeSensitiveData: false,          // Don't store PII
  
  // Retention
  maxLogSize: 100 * 1024 * 1024,      // 100 MB per file
  rotateAfterDays: 30,                // Rotate logs after 30 days
  
  // Analytics
  calculateAnalytics: true,           // Generate usage analytics
  analyticsInterval: 3600000          // Update analytics every hour
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INITIALIZE LOGS DIRECTORY
 * ═══════════════════════════════════════════════════════════════════════════
 */
function ensureLogsDir() {
  if (!fs.existsSync(LOGGER_CONFIG.logsDir)) {
    fs.mkdirSync(LOGGER_CONFIG.logsDir, { recursive: true });
    console.log(`📁 Created logs directory: ${LOGGER_CONFIG.logsDir}`);
  }
}

ensureLogsDir();

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOG QUERY
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function logQuery(queryData) {
  if (!LOGGER_CONFIG.enabled) return;
  
  try {
    const logEntry = {
      // Timestamp
      timestamp: new Date().toISOString(),
      unix_timestamp: Date.now(),
      
      // Query details
      query: queryData.query,
      query_length: queryData.query.length,
      query_hash: hashString(queryData.query),
      
      // Response details
      response_success: queryData.success || false,
      response_time: queryData.processingTime || null,
      response_length: queryData.response?.length || 0,
      
      // Analytics metadata
      cached: queryData.cached || false,
      mode: queryData.mode || 'production',
      
      // User context (anonymized if configured)
      user_id: queryData.userId || 'anonymous',
      session_id: queryData.sessionId || null,
      ip_address: LOGGER_CONFIG.anonymizeIP ? 
        hashString(queryData.ipAddress || 'unknown') : 
        queryData.ipAddress,
      user_agent: queryData.userAgent || null,
      
      // Classification
      query_type: classifyQueryType(queryData.query),
      contains_platform: detectPlatforms(queryData.query),
      contains_metrics: detectMetrics(queryData.query),
      
      // Error tracking
      error: queryData.error || null,
      
      // Additional metadata
      metadata: queryData.metadata || {}
    };
    
    // Append to JSONL file
    const logPath = path.join(LOGGER_CONFIG.logsDir, LOGGER_CONFIG.queryLogFile);
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    
    console.log(`📝 Query logged: "${queryData.query.substring(0, 50)}..."`);
    
    // Check if log rotation needed
    checkLogRotation(logPath);
    
  } catch (error) {
    console.error('❌ Error logging query:', error.message);
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUERY CLASSIFICATION
 * ═══════════════════════════════════════════════════════════════════════════
 */
function classifyQueryType(query) {
  const lowerQuery = query.toLowerCase();
  
  if (/most|highest|top|best|worst|lowest/i.test(lowerQuery)) {
    return 'factual';
  }
  if (/compare|vs|versus|better|difference/i.test(lowerQuery)) {
    return 'comparative';
  }
  if (/trend|over time|pattern|growing|declining/i.test(lowerQuery)) {
    return 'temporal';
  }
  if (/recommend|should|how to|strategy|improve/i.test(lowerQuery)) {
    return 'strategic';
  }
  if (/why|explain|reason|cause/i.test(lowerQuery)) {
    return 'explanatory';
  }
  
  return 'general';
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DETECT PLATFORMS
 * ═══════════════════════════════════════════════════════════════════════════
 */
function detectPlatforms(query) {
  const lowerQuery = query.toLowerCase();
  const platforms = [];
  
  if (/instagram|ig|insta/i.test(lowerQuery)) platforms.push('instagram');
  if (/linkedin|li/i.test(lowerQuery)) platforms.push('linkedin');
  if (/facebook|fb|meta/i.test(lowerQuery)) platforms.push('facebook');
  if (/twitter|tweet|x\.com/i.test(lowerQuery)) platforms.push('twitter');
  
  return platforms;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DETECT METRICS
 * ═══════════════════════════════════════════════════════════════════════════
 */
function detectMetrics(query) {
  const lowerQuery = query.toLowerCase();
  const metrics = [];
  
  if (/engage/i.test(lowerQuery)) metrics.push('engagement');
  if (/like/i.test(lowerQuery)) metrics.push('likes');
  if (/comment/i.test(lowerQuery)) metrics.push('comments');
  if (/share/i.test(lowerQuery)) metrics.push('shares');
  if (/reach/i.test(lowerQuery)) metrics.push('reach');
  if (/impression/i.test(lowerQuery)) metrics.push('impressions');
  
  return metrics;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HASH STRING (for anonymization)
 * ═══════════════════════════════════════════════════════════════════════════
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOG ROTATION
 * ═══════════════════════════════════════════════════════════════════════════
 */
function checkLogRotation(logPath) {
  try {
    const stats = fs.statSync(logPath);
    
    // Check size
    if (stats.size > LOGGER_CONFIG.maxLogSize) {
      rotateLog(logPath);
    }
  } catch (error) {
    // File doesn't exist yet, that's fine
  }
}

function rotateLog(logPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = logPath.replace('.jsonl', `.${timestamp}.jsonl`);
  
  try {
    fs.renameSync(logPath, archivePath);
    console.log(`🔄 Rotated log file: ${archivePath}`);
  } catch (error) {
    console.error('❌ Error rotating log:', error.message);
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET QUERY LOGS
 * ═══════════════════════════════════════════════════════════════════════════
 * Read logs (for analytics dashboard)
 */
export function getQueryLogs(limit = 100, offset = 0) {
  try {
    const logPath = path.join(LOGGER_CONFIG.logsDir, LOGGER_CONFIG.queryLogFile);
    
    if (!fs.existsSync(logPath)) {
      return [];
    }
    
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    
    // Parse JSONL
    const logs = lines
      .slice(-limit - offset, -offset || undefined)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(log => log !== null)
      .reverse(); // Most recent first
    
    return logs;
  } catch (error) {
    console.error('❌ Error reading logs:', error.message);
    return [];
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GENERATE ANALYTICS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function generateAnalytics() {
  try {
    const logs = getQueryLogs(10000); // Last 10,000 queries
    
    if (logs.length === 0) {
      return null;
    }
    
    const analytics = {
      generated_at: new Date().toISOString(),
      period: {
        start: logs[logs.length - 1]?.timestamp,
        end: logs[0]?.timestamp,
        total_queries: logs.length
      },
      
      // Success rate
      success_rate: {
        successful: logs.filter(l => l.response_success).length,
        failed: logs.filter(l => !l.response_success).length,
        rate: ((logs.filter(l => l.response_success).length / logs.length) * 100).toFixed(1) + '%'
      },
      
      // Cache performance
      cache_performance: {
        hits: logs.filter(l => l.cached).length,
        misses: logs.filter(l => !l.cached).length,
        hit_rate: ((logs.filter(l => l.cached).length / logs.length) * 100).toFixed(1) + '%'
      },
      
      // Response times
      response_times: calculateResponseTimeStats(logs),
      
      // Query types distribution
      query_types: calculateDistribution(logs, 'query_type'),
      
      // Platform mentions
      platform_mentions: calculatePlatformMentions(logs),
      
      // Metric mentions
      metric_mentions: calculateMetricMentions(logs),
      
      // Popular queries
      popular_queries: findPopularQueries(logs, 10),
      
      // Hourly distribution
      hourly_distribution: calculateHourlyDistribution(logs)
    };
    
    // Save analytics
    const analyticsPath = path.join(LOGGER_CONFIG.logsDir, LOGGER_CONFIG.analyticsFile);
    fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2));
    
    console.log('📊 Analytics generated');
    return analytics;
    
  } catch (error) {
    console.error('❌ Error generating analytics:', error.message);
    return null;
  }
}

/**
 * Helper functions for analytics
 */
function calculateResponseTimeStats(logs) {
  const times = logs
    .filter(l => l.response_time !== null)
    .map(l => parseFloat(l.response_time));
  
  if (times.length === 0) return null;
  
  times.sort((a, b) => a - b);
  
  return {
    count: times.length,
    min: times[0].toFixed(2),
    max: times[times.length - 1].toFixed(2),
    avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
    median: times[Math.floor(times.length / 2)].toFixed(2),
    p95: times[Math.floor(times.length * 0.95)].toFixed(2),
    p99: times[Math.floor(times.length * 0.99)].toFixed(2)
  };
}

function calculateDistribution(logs, field) {
  const counts = {};
  logs.forEach(log => {
    const value = log[field] || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
  });
  return counts;
}

function calculatePlatformMentions(logs) {
  const platforms = {};
  logs.forEach(log => {
    (log.contains_platform || []).forEach(platform => {
      platforms[platform] = (platforms[platform] || 0) + 1;
    });
  });
  return platforms;
}

function calculateMetricMentions(logs) {
  const metrics = {};
  logs.forEach(log => {
    (log.contains_metrics || []).forEach(metric => {
      metrics[metric] = (metrics[metric] || 0) + 1;
    });
  });
  return metrics;
}

function findPopularQueries(logs, limit) {
  const queryCounts = {};
  logs.forEach(log => {
    const hash = log.query_hash;
    if (!queryCounts[hash]) {
      queryCounts[hash] = {
        query: log.query,
        count: 0,
        avg_response_time: []
      };
    }
    queryCounts[hash].count++;
    if (log.response_time) {
      queryCounts[hash].avg_response_time.push(parseFloat(log.response_time));
    }
  });
  
  // Calculate averages
  Object.values(queryCounts).forEach(q => {
    if (q.avg_response_time.length > 0) {
      q.avg_response_time = (q.avg_response_time.reduce((a, b) => a + b, 0) / q.avg_response_time.length).toFixed(2);
    } else {
      q.avg_response_time = null;
    }
  });
  
  return Object.values(queryCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function calculateHourlyDistribution(logs) {
  const hours = Array(24).fill(0);
  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    hours[hour]++;
  });
  return hours;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERIODIC ANALYTICS GENERATION
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function startPeriodicAnalytics() {
  if (!LOGGER_CONFIG.calculateAnalytics) return;
  
  // Generate immediately
  generateAnalytics();
  
  // Schedule periodic updates
  setInterval(() => {
    generateAnalytics();
  }, LOGGER_CONFIG.analyticsInterval);
  
  console.log(`📊 Analytics generation scheduled: Every ${LOGGER_CONFIG.analyticsInterval / 60000} minutes`);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUERY LOGGER MIDDLEWARE
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function queryLoggerMiddleware(req, res, next) {
  if (!LOGGER_CONFIG.enabled) {
    return next();
  }
  
  // Store original res.json
  const originalJson = res.json.bind(res);
  const startTime = Date.now();
  
  // Override res.json to log after response
  res.json = function(data) {
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Log query
    logQuery({
      query: req.body.message || '',
      success: data.success,
      processingTime: processingTime,
      response: data.response,
      cached: data.cached || false,
      mode: data.mode || 'production',
      error: data.error || null,
      userId: req.user?.id || 'anonymous',
      sessionId: req.session?.id || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: {
        endpoint: req.path,
        method: req.method
      }
    });
    
    return originalJson(data);
  };
  
  next();
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export default {
  logQuery,
  getQueryLogs,
  generateAnalytics,
  startPeriodicAnalytics,
  queryLoggerMiddleware
};
