// ═══════════════════════════════════════════════════════════════════════════
// CACHING SYSTEM - PRODUCTION GRADE
// ═══════════════════════════════════════════════════════════════════════════
// Reduces OpenAI costs by caching repeated queries
// - Query result caching
// - Analytics caching
// - TTL (time-to-live) support
// - Cache invalidation
// - Memory-efficient
// ═══════════════════════════════════════════════════════════════════════════

import crypto from 'crypto';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 */
const CACHE_CONFIG = {
  // Cache TTL (time-to-live) in seconds
  defaultTTL: 3600,              // 1 hour default
  queryResultTTL: 3600,          // Query results: 1 hour
  analyticsTTL: 1800,            // Analytics: 30 minutes
  aggregationTTL: 600,           // Aggregations: 10 minutes
  
  // Max cache size (number of entries)
  maxEntries: 1000,
  
  // Enable/disable caching
  enabled: true,
  
  // Cache hit/miss tracking
  trackStats: true
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE STORE (In-Memory)
 * ═══════════════════════════════════════════════════════════════════════════
 * For production: Replace with Redis
 */
class CacheStore {
  constructor() {
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0
    };
  }
  
  get(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      if (CACHE_CONFIG.trackStats) this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      if (CACHE_CONFIG.trackStats) this.stats.misses++;
      return null;
    }
    
    // Cache hit
    if (CACHE_CONFIG.trackStats) this.stats.hits++;
    entry.lastAccessed = Date.now();
    entry.hitCount++;
    
    return entry.value;
  }
  
  set(key, value, ttl = CACHE_CONFIG.defaultTTL) {
    // Enforce max entries (LRU eviction)
    if (this.store.size >= CACHE_CONFIG.maxEntries) {
      this.evictLRU();
    }
    
    const entry = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttl * 1000),
      lastAccessed: Date.now(),
      hitCount: 0,
      ttl
    };
    
    this.store.set(key, entry);
    if (CACHE_CONFIG.trackStats) this.stats.sets++;
    
    return true;
  }
  
  delete(key) {
    const deleted = this.store.delete(key);
    if (deleted && CACHE_CONFIG.trackStats) {
      this.stats.invalidations++;
    }
    return deleted;
  }
  
  clear() {
    const size = this.store.size;
    this.store.clear();
    if (CACHE_CONFIG.trackStats) {
      this.stats.invalidations += size;
    }
  }
  
  evictLRU() {
    // Evict least recently used entry
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.store.delete(oldestKey);
      console.log(`🗑️  Cache evicted LRU entry: ${oldestKey.substring(0, 20)}...`);
    }
  }
  
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : 0;
    
    return {
      ...this.stats,
      total,
      hitRate: `${hitRate}%`,
      size: this.store.size,
      maxSize: CACHE_CONFIG.maxEntries
    };
  }
  
  keys() {
    return Array.from(this.store.keys());
  }
}

// Global cache instance
const cache = new CacheStore();

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUERY HASHING
 * ═══════════════════════════════════════════════════════════════════════════
 * Create consistent hash for queries
 */
export function hashQuery(query, context = {}) {
  // Normalize query
  const normalizedQuery = query.toLowerCase().trim();
  
  // Create hash input
  const hashInput = JSON.stringify({
    query: normalizedQuery,
    context: context
  });
  
  // Generate SHA-256 hash
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE QUERY RESULT
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function cacheQueryResult(query, result, ttl = CACHE_CONFIG.queryResultTTL) {
  if (!CACHE_CONFIG.enabled) return false;
  
  const key = `query:${hashQuery(query)}`;
  
  console.log(`💾 Caching query result: "${query.substring(0, 50)}..." (TTL: ${ttl}s)`);
  
  return cache.set(key, {
    query,
    result,
    cached_at: new Date().toISOString()
  }, ttl);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET CACHED QUERY RESULT
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function getCachedQueryResult(query) {
  if (!CACHE_CONFIG.enabled) return null;
  
  const key = `query:${hashQuery(query)}`;
  const cached = cache.get(key);
  
  if (cached) {
    console.log(`✅ Cache HIT: "${query.substring(0, 50)}..."`);
    return cached;
  }
  
  console.log(`❌ Cache MISS: "${query.substring(0, 50)}..."`);
  return null;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE ANALYTICS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function cacheAnalytics(queryType, analytics, ttl = CACHE_CONFIG.analyticsTTL) {
  if (!CACHE_CONFIG.enabled) return false;
  
  const key = `analytics:${queryType}`;
  
  console.log(`💾 Caching analytics: ${queryType} (TTL: ${ttl}s)`);
  
  return cache.set(key, analytics, ttl);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET CACHED ANALYTICS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function getCachedAnalytics(queryType) {
  if (!CACHE_CONFIG.enabled) return null;
  
  const key = `analytics:${queryType}`;
  const cached = cache.get(key);
  
  if (cached) {
    console.log(`✅ Analytics cache HIT: ${queryType}`);
  } else {
    console.log(`❌ Analytics cache MISS: ${queryType}`);
  }
  
  return cached;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INVALIDATE CACHE
 * ═══════════════════════════════════════════════════════════════════════════
 * Call when data is updated
 */
export function invalidateCache(pattern = null) {
  if (pattern) {
    // Invalidate specific pattern
    const keys = cache.keys();
    let count = 0;
    
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.delete(key);
        count++;
      }
    });
    
    console.log(`🗑️  Invalidated ${count} cache entries matching: ${pattern}`);
    return count;
  } else {
    // Invalidate all
    const size = cache.store.size;
    cache.clear();
    console.log(`🗑️  Cleared entire cache (${size} entries)`);
    return size;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET CACHE STATISTICS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function getCacheStats() {
  return cache.getStats();
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE MIDDLEWARE (Express)
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function cacheMiddleware(ttl = CACHE_CONFIG.queryResultTTL) {
  return (req, res, next) => {
    if (!CACHE_CONFIG.enabled || req.method !== 'POST') {
      return next();
    }
    
    const { message } = req.body;
    if (!message) {
      return next();
    }
    
    // Check cache
    const cached = getCachedQueryResult(message);
    if (cached) {
      // Return cached result
      return res.json({
        ...cached.result,
        cached: true,
        cached_at: cached.cached_at
      });
    }
    
    // Store original res.json
    const originalJson = res.json.bind(res);
    
    // Override res.json to cache result
    res.json = function(data) {
      if (data.success) {
        cacheQueryResult(message, data, ttl);
      }
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE WARMING (Pre-populate common queries)
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function warmCache(commonQueries, queryFunction) {
  console.log(`\n🔥 Warming cache with ${commonQueries.length} common queries...`);
  
  for (const query of commonQueries) {
    try {
      const result = await queryFunction(query);
      cacheQueryResult(query, result);
      console.log(`  ✅ Cached: "${query}"`);
    } catch (error) {
      console.error(`  ❌ Failed to cache: "${query}"`, error.message);
    }
  }
  
  console.log(`🔥 Cache warming complete!`);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CACHE CONFIGURATION HELPERS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function enableCache() {
  CACHE_CONFIG.enabled = true;
  console.log('✅ Cache enabled');
}

export function disableCache() {
  CACHE_CONFIG.enabled = false;
  console.log('⚠️  Cache disabled');
}

export function setCacheTTL(type, seconds) {
  switch (type) {
    case 'query':
      CACHE_CONFIG.queryResultTTL = seconds;
      break;
    case 'analytics':
      CACHE_CONFIG.analyticsTTL = seconds;
      break;
    case 'aggregation':
      CACHE_CONFIG.aggregationTTL = seconds;
      break;
    default:
      CACHE_CONFIG.defaultTTL = seconds;
  }
  console.log(`⚙️  Cache TTL updated: ${type} = ${seconds}s`);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERIODIC CLEANUP (Remove expired entries)
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function startCacheCleanup(intervalMinutes = 10) {
  setInterval(() => {
    const keys = cache.keys();
    let removed = 0;
    
    keys.forEach(key => {
      const entry = cache.store.get(key);
      if (entry && Date.now() > entry.expiresAt) {
        cache.delete(key);
        removed++;
      }
    });
    
    if (removed > 0) {
      console.log(`🧹 Cache cleanup: Removed ${removed} expired entries`);
    }
  }, intervalMinutes * 60 * 1000);
  
  console.log(`🧹 Cache cleanup scheduled: Every ${intervalMinutes} minutes`);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 */
export default {
  // Core caching
  cacheQueryResult,
  getCachedQueryResult,
  cacheAnalytics,
  getCachedAnalytics,
  
  // Cache management
  invalidateCache,
  getCacheStats,
  
  // Middleware
  cacheMiddleware,
  
  // Utilities
  warmCache,
  enableCache,
  disableCache,
  setCacheTTL,
  startCacheCleanup,
  
  // Query hashing
  hashQuery
};
