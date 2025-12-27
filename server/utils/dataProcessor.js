import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { normalizePlatform } from './normalizer.js';

// ES6 module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Data processing engine that applies LLM-generated filters to CSV data
 * Uses functional programming approach for filtering, grouping, and aggregation
 */
class DataProcessor {
  constructor(dataDir = path.join(__dirname, '../data'), cacheTTL = 3600000) { // Default: 1 hour TTL
    this.dataDir = dataDir;
    this.cachedData = null;
    this.cacheTimestamp = null;
    this.cacheTTL = cacheTTL; // Time to live in milliseconds
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Load all CSV files into memory
   */
  loadAllData() {
    // Check if cache is still valid
    if (this.cachedData && this.cacheTimestamp) {
      const cacheAge = Date.now() - this.cacheTimestamp;
      if (cacheAge < this.cacheTTL) {
        this.cacheHits++;
        console.log(`📦 Data cache HIT (age: ${Math.floor(cacheAge / 1000)}s, hits: ${this.cacheHits}, misses: ${this.cacheMisses})`);
        return this.cachedData;
      } else {
        console.log(`📦 Data cache EXPIRED (age: ${Math.floor(cacheAge / 1000)}s) - Reloading...`);
        this.cachedData = null;
        this.cacheTimestamp = null;
      }
    }

    this.cacheMisses++;
    console.log(`📦 Data cache MISS - Loading data from CSV files...`);

    const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.csv'));
    const allData = [];

    for (const file of files) {
      const filePath = path.join(this.dataDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });

      // Add source file and normalize platform values
      records.forEach(record => {
        record._source_file = file;

        // Normalize platform column if it exists
        if (record.platform) {
          record.platform = normalizePlatform(record.platform);
        }

        allData.push(record);
      });
    }

    this.cachedData = allData;
    this.cacheTimestamp = Date.now();
    console.log(`📦 Data loaded and cached (${allData.length} records from ${files.length} files)`);
    return allData;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    const cacheAge = this.cacheTimestamp ? Date.now() - this.cacheTimestamp : null;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: hitRate.toFixed(2) + '%',
      totalRequests,
      cacheAge: cacheAge ? Math.floor(cacheAge / 1000) + 's' : 'N/A',
      ttl: Math.floor(this.cacheTTL / 1000) + 's',
      recordCount: this.cachedData ? this.cachedData.length : 0
    };
  }

  /**
   * Process data with filter specification
   * @param {Object} filterSpec - The validated filter specification
   * @returns {Object} Processed data and summary
   */
  processData(filterSpec) {
    const startTime = Date.now();
    let data = this.loadAllData();
    const originalCount = data.length;

    // Step 1: Apply filters
    if (filterSpec.filters && filterSpec.filters.length > 0) {
      data = this.applyFilters(data, filterSpec.filters);
    }

    const filteredCount = data.length;

    // Step 2: Group and aggregate
    let results = data;
    if (filterSpec.groupBy && filterSpec.groupBy.length > 0) {
      results = this.groupAndAggregate(data, filterSpec.groupBy, filterSpec.aggregate || {});
    } else if (filterSpec.aggregate && Object.keys(filterSpec.aggregate).length > 0) {
      // Aggregate without grouping (single result)
      results = [this.aggregateRecords(data, filterSpec.aggregate)];
    }

    // Step 3: Sort results
    if (filterSpec.sortBy && filterSpec.sortBy.column) {
      results = this.sortData(results, filterSpec.sortBy.column, filterSpec.sortBy.order || 'desc');
    }

    // Step 4: Apply limit
    if (filterSpec.limit && filterSpec.limit > 0) {
      results = results.slice(0, filterSpec.limit);
    }

    const processingTime = Date.now() - startTime;

    return {
      data: results,
      summary: {
        originalRecords: originalCount,
        filteredRecords: filteredCount,
        resultCount: results.length,
        filtersApplied: filterSpec.filters ? filterSpec.filters.length : 0,
        processingTimeMs: processingTime
      },
      filterSpec: filterSpec
    };
  }

  /**
   * Apply filters to data
   */
  applyFilters(data, filters) {
    return data.filter(record => this.matchesFilters(record, filters));
  }

  /**
   * Check if record matches all filters
   */
  matchesFilters(record, filters) {
    return filters.every(filter => this.matchesFilter(record, filter));
  }

  /**
   * Check if record matches a single filter
   */
  matchesFilter(record, filter) {
    // Handle complex filters (AND/OR)
    if (filter.type === 'and') {
      return filter.conditions.every(cond => this.matchesFilter(record, cond));
    }
    if (filter.type === 'or') {
      return filter.conditions.some(cond => this.matchesFilter(record, cond));
    }

    const value = record[filter.column];
    const filterValue = filter.value;

    // Handle missing values
    if (value === undefined || value === null || value === '') {
      return false;
    }

    switch (filter.operator) {
      case 'equals':
        return this.normalizeValue(value) === this.normalizeValue(filterValue);

      case 'not_equals':
        return this.normalizeValue(value) !== this.normalizeValue(filterValue);

      case 'contains':
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());

      case 'not_contains':
        return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());

      case 'starts_with':
        return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());

      case 'ends_with':
        return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());

      case 'in':
        return Array.isArray(filterValue) &&
               filterValue.some(v => this.normalizeValue(value) === this.normalizeValue(v));

      case 'not_in':
        return Array.isArray(filterValue) &&
               !filterValue.some(v => this.normalizeValue(value) === this.normalizeValue(v));

      case 'greater_than':
        return parseFloat(value) > parseFloat(filterValue);

      case 'less_than':
        return parseFloat(value) < parseFloat(filterValue);

      case 'greater_than_or_equal':
        return parseFloat(value) >= parseFloat(filterValue);

      case 'less_than_or_equal':
        return parseFloat(value) <= parseFloat(filterValue);

      case 'between':
        if (!Array.isArray(filterValue) || filterValue.length !== 2) return false;
        const numValue = parseFloat(value);
        return numValue >= parseFloat(filterValue[0]) && numValue <= parseFloat(filterValue[1]);

      case 'after':
        return new Date(value) > new Date(filterValue);

      case 'before':
        return new Date(value) < new Date(filterValue);

      default:
        console.warn(`Unknown operator: ${filter.operator}`);
        return true;
    }
  }

  /**
   * Normalize value for comparison (case-insensitive, trimmed)
   */
  normalizeValue(value) {
    return String(value).toLowerCase().trim();
  }

  /**
   * Group data and aggregate
   */
  groupAndAggregate(data, groupByColumns, aggregateSpec) {
    // Create groups
    const groups = {};

    data.forEach(record => {
      // Create group key
      const key = groupByColumns.map(col => record[col] || 'null').join('|');

      if (!groups[key]) {
        groups[key] = {
          _records: [],
          _groupKey: key
        };
        // Store group values
        groupByColumns.forEach(col => {
          groups[key][col] = record[col];
        });
      }

      groups[key]._records.push(record);
    });

    // Aggregate each group
    const results = Object.values(groups).map(group => {
      const result = {};

      // Add group by columns
      groupByColumns.forEach(col => {
        result[col] = group[col];
      });

      // Add aggregated metrics
      const aggregated = this.aggregateRecords(group._records, aggregateSpec);
      Object.assign(result, aggregated);

      // Add record count
      result._count = group._records.length;

      return result;
    });

    return results;
  }

  /**
   * Aggregate records based on specification
   */
  aggregateRecords(records, aggregateSpec) {
    const result = {};

    for (const [column, method] of Object.entries(aggregateSpec)) {
      const values = records
        .map(r => r[column])
        .filter(v => v !== null && v !== undefined && v !== '')
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v));

      if (values.length === 0) {
        result[`${column}_${method}`] = null;
        continue;
      }

      switch (method) {
        case 'sum':
          result[`${column}_${method}`] = values.reduce((a, b) => a + b, 0);
          break;

        case 'mean':
          result[`${column}_${method}`] = values.reduce((a, b) => a + b, 0) / values.length;
          break;

        case 'median':
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          result[`${column}_${method}`] = sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
          break;

        case 'min':
          result[`${column}_${method}`] = Math.min(...values);
          break;

        case 'max':
          result[`${column}_${method}`] = Math.max(...values);
          break;

        case 'count':
          result[`${column}_${method}`] = values.length;
          break;

        case 'std':
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
          result[`${column}_${method}`] = Math.sqrt(variance);
          break;

        case 'variance':
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          result[`${column}_${method}`] = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
          break;

        case 'mode':
          const frequency = {};
          values.forEach(v => {
            frequency[v] = (frequency[v] || 0) + 1;
          });
          let maxFreq = 0;
          let mode = null;
          for (const [val, freq] of Object.entries(frequency)) {
            if (freq > maxFreq) {
              maxFreq = freq;
              mode = parseFloat(val);
            }
          }
          result[`${column}_${method}`] = mode;
          break;

        case 'range':
          result[`${column}_${method}`] = Math.max(...values) - Math.min(...values);
          break;

        case 'p25':
        case 'p50':
        case 'p75':
        case 'p90':
        case 'p95':
        case 'p99':
          const percentile = parseInt(method.substring(1));
          result[`${column}_${method}`] = this.calculatePercentile(values, percentile);
          break;

        case 'distinctCount':
          result[`${column}_${method}`] = new Set(values).size;
          break;

        case 'first':
          result[`${column}_${method}`] = values[0];
          break;

        case 'last':
          result[`${column}_${method}`] = values[values.length - 1];
          break;

        default:
          console.warn(`Unknown aggregation method: ${method}`);
      }

      // Round to 2 decimal places for readability
      if (result[`${column}_${method}`] !== null) {
        result[`${column}_${method}`] = Math.round(result[`${column}_${method}`] * 100) / 100;
      }
    }

    return result;
  }

  /**
   * Calculate percentile value
   * @param {Array<number>} values - Sorted array of numbers
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} Percentile value
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);

    if (Number.isInteger(index)) {
      return sorted[index];
    }

    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Sort data by column
   */
  sortData(data, column, order = 'desc') {
    return [...data].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Numeric comparison
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return order === 'desc' ? bNum - aNum : aNum - bNum;
      }

      // String comparison
      const comparison = String(aVal).localeCompare(String(bVal));
      return order === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Clear cache (useful for testing or when data updates)
   */
  clearCache() {
    this.cachedData = null;
  }
}

export default DataProcessor;
