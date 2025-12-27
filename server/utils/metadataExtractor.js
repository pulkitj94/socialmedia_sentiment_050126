import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { normalizePlatform, getKnownPlatforms, isKnownPlatform } from './normalizer.js';

// ES6 module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts comprehensive metadata from all CSV files in the data directory
 * This metadata is used by the LLM to generate intelligent filters
 */
class MetadataExtractor {
  constructor(dataDir = path.join(__dirname, '../data')) {
    this.dataDir = dataDir;
    this.metadata = null;
  }

  /**
   * Extract metadata from all CSV files
   * @returns {Object} Comprehensive dataset metadata
   */
  async extractMetadata() {
    if (this.metadata) {
      return this.metadata;
    }

    const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.csv'));
    const metadata = {
      files: [],
      columns: new Set(),
      columnTypes: {},
      uniqueValues: {},
      dateColumns: new Set(),
      numericColumns: new Set(),
      textColumns: new Set(),
      sampleData: []
    };

    for (const file of files) {
      const filePath = path.join(this.dataDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });

      if (records.length === 0) continue;

      // Extract file info
      metadata.files.push({
        name: file,
        recordCount: records.length,
        type: this.categorizeFile(file)
      });

      // Extract column information
      const columns = Object.keys(records[0]);
      columns.forEach(col => metadata.columns.add(col));

      // Analyze each column
      for (const col of columns) {
        const values = records.map(r => r[col]).filter(v => v !== null && v !== '');

        // Detect column type
        const columnType = this.detectColumnType(col, values);
        metadata.columnTypes[col] = columnType;

        // Categorize column
        if (columnType === 'date' || columnType === 'datetime') {
          metadata.dateColumns.add(col);
        } else if (columnType === 'numeric') {
          metadata.numericColumns.add(col);
        } else if (columnType === 'text') {
          metadata.textColumns.add(col);
        }

        // Extract unique values for categorical columns
        if (this.isCategorical(col, values)) {
          let uniqueVals = [...new Set(values)];

          // Normalize platform values
          if (col.toLowerCase().includes('platform')) {
            uniqueVals = uniqueVals.map(v => normalizePlatform(v));
            uniqueVals = [...new Set(uniqueVals)]; // Remove duplicates after normalization
          }

          // Merge with existing values (accumulate across files)
          if (metadata.uniqueValues[col] && Array.isArray(metadata.uniqueValues[col])) {
            uniqueVals = [...new Set([...metadata.uniqueValues[col], ...uniqueVals])];
          }

          metadata.uniqueValues[col] = uniqueVals.slice(0, 50); // Limit to 50 unique values
        }

        // Store numeric ranges
        if (columnType === 'numeric') {
          const numericVals = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
          if (numericVals.length > 0) {
            metadata.uniqueValues[col] = {
              min: Math.min(...numericVals),
              max: Math.max(...numericVals),
              avg: numericVals.reduce((a, b) => a + b, 0) / numericVals.length
            };
          }
        }
      }

      // Store sample records (first 3 from each file)
      metadata.sampleData.push({
        file: file,
        samples: records.slice(0, 3)
      });
    }

    // Convert Sets to Arrays for JSON serialization
    this.metadata = {
      ...metadata,
      columns: Array.from(metadata.columns),
      dateColumns: Array.from(metadata.dateColumns),
      numericColumns: Array.from(metadata.numericColumns),
      textColumns: Array.from(metadata.textColumns)
    };

    return this.metadata;
  }

  /**
   * Categorize file type based on filename
   */
  categorizeFile(filename) {
    if (filename.includes('organic')) return 'organic_posts';
    if (filename.includes('ads') || filename.includes('ad_campaigns')) return 'ad_campaigns';
    return 'general';
  }

  /**
   * Detect column data type
   */
  detectColumnType(columnName, values) {
    const lowerName = columnName.toLowerCase();
    const sampleValues = values.slice(0, 100);

    // Date detection
    if (lowerName.includes('date') || lowerName.includes('time')) {
      return lowerName.includes('time') ? 'datetime' : 'date';
    }

    // Numeric detection
    if (lowerName.includes('rate') || lowerName.includes('count') ||
        lowerName.includes('amount') || lowerName.includes('budget') ||
        lowerName.includes('spend') || lowerName.includes('revenue') ||
        lowerName.includes('impressions') || lowerName.includes('clicks') ||
        lowerName.includes('conversions') || lowerName.includes('likes') ||
        lowerName.includes('shares') || lowerName.includes('comments') ||
        lowerName.includes('reach') || lowerName.includes('saves') ||
        lowerName.includes('ctr') || lowerName.includes('cpc') ||
        lowerName.includes('roas') || lowerName.includes('cost')) {
      return 'numeric';
    }

    // Check if all values are numeric
    const numericCount = sampleValues.filter(v => !isNaN(parseFloat(v))).length;
    if (numericCount / sampleValues.length > 0.9) {
      return 'numeric';
    }

    // ID fields
    if (lowerName.includes('id')) {
      return 'identifier';
    }

    return 'text';
  }

  /**
   * Determine if column is categorical (has limited unique values)
   */
  isCategorical(columnName, values) {
    const lowerName = columnName.toLowerCase();

    // Explicit categorical fields
    const categoricalKeywords = [
      'platform', 'type', 'status', 'objective', 'format',
      'category', 'media', 'campaign', 'audience', 'gender'
    ];

    if (categoricalKeywords.some(kw => lowerName.includes(kw))) {
      return true;
    }

    // Has limited unique values
    const uniqueCount = new Set(values).size;
    return uniqueCount <= 50 && uniqueCount < values.length * 0.1;
  }

  /**
   * Get a human-readable summary of metadata
   */
  getSummary() {
    if (!this.metadata) {
      throw new Error('Metadata not extracted yet. Call extractMetadata() first.');
    }

    return {
      totalFiles: this.metadata.files.length,
      totalColumns: this.metadata.columns.length,
      categoricalColumns: Object.keys(this.metadata.uniqueValues).filter(col =>
        Array.isArray(this.metadata.uniqueValues[col])
      ),
      numericColumns: this.metadata.numericColumns,
      dateColumns: this.metadata.dateColumns,
      availableFilters: this.getAvailableFilters()
    };
  }

  /**
   * Get list of available filters for LLM context
   */
  getAvailableFilters() {
    if (!this.metadata) return [];

    const filters = [];

    // Categorical filters
    for (const [col, values] of Object.entries(this.metadata.uniqueValues)) {
      if (Array.isArray(values)) {
        filters.push({
          column: col,
          type: 'categorical',
          possibleValues: values,
          operators: ['equals', 'not_equals', 'in', 'not_in']
        });
      } else if (typeof values === 'object') {
        filters.push({
          column: col,
          type: 'numeric',
          range: values,
          operators: ['equals', 'greater_than', 'less_than', 'between', 'greater_than_or_equal', 'less_than_or_equal']
        });
      }
    }

    // Date filters
    this.metadata.dateColumns.forEach(col => {
      filters.push({
        column: col,
        type: 'date',
        operators: ['equals', 'after', 'before', 'between', 'contains']
      });
    });

    // Text filters
    this.metadata.textColumns.forEach(col => {
      if (!this.metadata.uniqueValues[col]) {
        filters.push({
          column: col,
          type: 'text',
          operators: ['contains', 'not_contains', 'starts_with', 'ends_with', 'equals']
        });
      }
    });

    return filters;
  }
}

export default MetadataExtractor;
