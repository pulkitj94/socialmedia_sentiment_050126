import crypto from 'crypto';

/**
 * Filter Cache
 * Caches LLM-generated filter specifications to avoid redundant LLM calls
 * for similar or identical queries
 */
class FilterCache {
  constructor(maxSize = 100, ttlMs = 3600000) { // Default: 100 items, 1 hour TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate cache key from query
   * Normalizes the query to improve cache hit rate
   * @param {string} query - User query
   * @returns {string} Cache key
   */
  generateKey(query) {
    // Normalize query: lowercase, trim, remove extra spaces
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');

    // Hash the normalized query for consistent key length
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Get cached filter spec for a query
   * @param {string} query - User query
   * @returns {Object|null} Cached filter spec or null
   */
  get(query) {
    const key = this.generateKey(query);
    const cached = this.cache.get(key);

    if (!cached) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - cached.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access time for LRU
    cached.lastAccessed = Date.now();
    cached.accessCount++;
    this.hits++;

    return cached.filterSpec;
  }

  /**
   * Store filter spec in cache
   * @param {string} query - User query
   * @param {Object} filterSpec - Filter specification to cache
   */
  set(query, filterSpec) {
    const key = this.generateKey(query);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      filterSpec,
      query, // Store original query for debugging
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1
    });
  }

  /**
   * Evict the least recently used entry
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttlMs) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    return keysToDelete.length;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(2) + '%',
      totalRequests
    };
  }

  /**
   * Get most frequently accessed queries
   * @param {number} count - Number of queries to return
   * @returns {Array} Top queries
   */
  getTopQueries(count = 10) {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, count);

    return entries.map(entry => ({
      query: entry.query,
      accessCount: entry.accessCount,
      age: Math.floor((Date.now() - entry.timestamp) / 1000) + 's'
    }));
  }

  /**
   * Find similar cached queries
   * Uses simple similarity matching based on word overlap
   * @param {string} query - User query
   * @param {number} threshold - Similarity threshold (0-1)
   * @returns {Array} Similar queries
   */
  findSimilar(query, threshold = 0.6) {
    const queryWords = new Set(
      query.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2)
    );

    const similar = [];

    for (const entry of this.cache.values()) {
      const entryWords = new Set(
        entry.query.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2)
      );

      // Calculate Jaccard similarity
      const intersection = new Set(
        [...queryWords].filter(w => entryWords.has(w))
      );
      const union = new Set([...queryWords, ...entryWords]);

      const similarity = intersection.size / union.size;

      if (similarity >= threshold) {
        similar.push({
          query: entry.query,
          similarity: (similarity * 100).toFixed(0) + '%',
          filterSpec: entry.filterSpec
        });
      }
    }

    return similar.sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity));
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of FilterCache
 */
export function getFilterCache() {
  if (!instance) {
    instance = new FilterCache();

    // Set up periodic cleanup of expired entries (every 5 minutes)
    setInterval(() => {
      const cleared = instance.clearExpired();
      if (cleared > 0) {
        console.log(`🧹 Filter cache: Cleared ${cleared} expired entries`);
      }
    }, 5 * 60 * 1000);
  }
  return instance;
}

export default FilterCache;
