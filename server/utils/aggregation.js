// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATION ENGINE - PRODUCTION GRADE
// ═══════════════════════════════════════════════════════════════════════════
// Real-time cross-dimensional data aggregation
// - Dynamic GROUP BY equivalent
// - Multi-dimensional pivoting
// - Time-series aggregation
// - Statistical aggregates
// ═══════════════════════════════════════════════════════════════════════════

import { mean, median, standardDeviation, statisticalSummary } from './statistics.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DYNAMIC GROUP BY AGGREGATION
 * ═══════════════════════════════════════════════════════════════════════════
 * SQL-like GROUP BY for arrays of objects
 */
export function groupBy(data, dimensions, aggregations) {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Group data by dimensions
  const groups = {};
  
  data.forEach(item => {
    // Create composite key from dimensions
    const key = dimensions.map(dim => {
      const value = getNestedValue(item, dim);
      return value !== undefined ? value : 'null';
    }).join('|||');
    
    if (!groups[key]) {
      groups[key] = {
        _key: key,
        _items: [],
        _count: 0
      };
      
      // Add dimension values to group
      dimensions.forEach((dim, idx) => {
        groups[key][dim] = key.split('|||')[idx];
      });
    }
    
    groups[key]._items.push(item);
    groups[key]._count++;
  });
  
  // Calculate aggregations for each group
  const result = Object.values(groups).map(group => {
    const aggregated = { ...group };
    
    Object.entries(aggregations).forEach(([alias, config]) => {
      const { field, function: aggFunc } = config;
      const values = group._items
        .map(item => getNestedValue(item, field))
        .filter(val => val !== undefined && val !== null);
      
      switch (aggFunc) {
        case 'sum':
          aggregated[alias] = values.reduce((sum, val) => sum + parseFloat(val), 0);
          break;
        case 'avg':
        case 'mean':
          aggregated[alias] = values.length > 0 ? mean(values.map(v => parseFloat(v))) : 0;
          break;
        case 'median':
          aggregated[alias] = values.length > 0 ? median(values.map(v => parseFloat(v))) : 0;
          break;
        case 'min':
          aggregated[alias] = values.length > 0 ? Math.min(...values.map(v => parseFloat(v))) : 0;
          break;
        case 'max':
          aggregated[alias] = values.length > 0 ? Math.max(...values.map(v => parseFloat(v))) : 0;
          break;
        case 'count':
          aggregated[alias] = values.length;
          break;
        case 'std':
          aggregated[alias] = values.length > 0 ? standardDeviation(values.map(v => parseFloat(v))) : 0;
          break;
        case 'first':
          aggregated[alias] = values[0];
          break;
        case 'last':
          aggregated[alias] = values[values.length - 1];
          break;
        default:
          aggregated[alias] = null;
      }
      
      // Round numeric values
      if (typeof aggregated[alias] === 'number') {
        aggregated[alias] = parseFloat(aggregated[alias].toFixed(2));
      }
    });
    
    // Remove internal fields
    delete aggregated._key;
    delete aggregated._items;
    
    return aggregated;
  });
  
  return result;
}

/**
 * Helper to get nested object values
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CROSS-DIMENSIONAL MATRIX
 * ═══════════════════════════════════════════════════════════════════════════
 * Create pivot table / cross-tab analysis
 */
export function crossDimensional(data, rowDimension, colDimension, valueField, aggFunction = 'avg') {
  if (!data || data.length === 0) {
    return { matrix: [], rows: [], cols: [] };
  }
  
  // Get unique values for each dimension
  const rows = [...new Set(data.map(item => getNestedValue(item, rowDimension)))].sort();
  const cols = [...new Set(data.map(item => getNestedValue(item, colDimension)))].sort();
  
  // Build matrix
  const matrix = {};
  
  rows.forEach(row => {
    matrix[row] = {};
    cols.forEach(col => {
      const filtered = data.filter(item => 
        getNestedValue(item, rowDimension) === row &&
        getNestedValue(item, colDimension) === col
      );
      
      const values = filtered
        .map(item => parseFloat(getNestedValue(item, valueField)))
        .filter(val => !isNaN(val));
      
      let result = 0;
      if (values.length > 0) {
        switch (aggFunction) {
          case 'sum':
            result = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
          case 'mean':
            result = mean(values);
            break;
          case 'median':
            result = median(values);
            break;
          case 'min':
            result = Math.min(...values);
            break;
          case 'max':
            result = Math.max(...values);
            break;
          case 'count':
            result = values.length;
            break;
          default:
            result = mean(values);
        }
      }
      
      matrix[row][col] = parseFloat(result.toFixed(2));
    });
  });
  
  return {
    matrix,
    rows,
    cols,
    config: {
      rowDimension,
      colDimension,
      valueField,
      aggFunction
    }
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIME-SERIES AGGREGATION
 * ═══════════════════════════════════════════════════════════════════════════
 * Aggregate data by time periods (daily, weekly, monthly)
 */
export function timeSeriesAggregation(data, dateField, valueField, period = 'daily', aggFunction = 'avg') {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Parse and group by period
  const groups = {};
  
  data.forEach(item => {
    const dateStr = getNestedValue(item, dateField);
    if (!dateStr) return;
    
    // Parse date (assumes DD-MM-YYYY format)
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    let key;
    switch (period) {
      case 'daily':
        key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        break;
      case 'weekly':
        const weekNum = getWeekNumber(date);
        key = `${year}-W${String(weekNum).padStart(2, '0')}`;
        break;
      case 'monthly':
        key = `${year}-${String(month).padStart(2, '0')}`;
        break;
      case 'quarterly':
        const quarter = Math.ceil(month / 3);
        key = `${year}-Q${quarter}`;
        break;
      case 'yearly':
        key = `${year}`;
        break;
      default:
        key = dateStr;
    }
    
    if (!groups[key]) {
      groups[key] = {
        period: key,
        date: date,
        values: [],
        count: 0
      };
    }
    
    const value = parseFloat(getNestedValue(item, valueField));
    if (!isNaN(value)) {
      groups[key].values.push(value);
      groups[key].count++;
    }
  });
  
  // Calculate aggregates
  const result = Object.values(groups).map(group => {
    let aggregatedValue = 0;
    
    if (group.values.length > 0) {
      switch (aggFunction) {
        case 'sum':
          aggregatedValue = group.values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
        case 'mean':
          aggregatedValue = mean(group.values);
          break;
        case 'median':
          aggregatedValue = median(group.values);
          break;
        case 'min':
          aggregatedValue = Math.min(...group.values);
          break;
        case 'max':
          aggregatedValue = Math.max(...group.values);
          break;
        default:
          aggregatedValue = mean(group.values);
      }
    }
    
    return {
      period: group.period,
      value: parseFloat(aggregatedValue.toFixed(2)),
      count: group.count,
      date: group.date
    };
  }).sort((a, b) => a.date - b.date);
  
  return result;
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MULTI-DIMENSIONAL CUBE
 * ═══════════════════════════════════════════════════════════════════════════
 * OLAP-style cube for complex analysis
 */
export function buildCube(data, dimensions, measures) {
  if (!data || data.length === 0) {
    return { cube: {}, dimensions, measures };
  }
  
  const cube = {};
  
  // Build all possible dimension combinations
  data.forEach(item => {
    // Create path through cube
    let current = cube;
    
    dimensions.forEach((dim, idx) => {
      const value = getNestedValue(item, dim) || 'null';
      
      if (!current[value]) {
        current[value] = idx === dimensions.length - 1 ? {
          _items: [],
          _measures: {}
        } : {};
      }
      
      current = current[value];
    });
    
    // Add item to leaf node
    current._items.push(item);
  });
  
  // Calculate measures at leaf nodes
  function calculateMeasures(node) {
    if (node._items) {
      // Leaf node - calculate measures
      measures.forEach(measure => {
        const { field, function: aggFunc, alias } = measure;
        const values = node._items
          .map(item => parseFloat(getNestedValue(item, field)))
          .filter(val => !isNaN(val));
        
        let result = 0;
        if (values.length > 0) {
          switch (aggFunc) {
            case 'sum':
              result = values.reduce((a, b) => a + b, 0);
              break;
            case 'avg':
              result = mean(values);
              break;
            case 'median':
              result = median(values);
              break;
            case 'min':
              result = Math.min(...values);
              break;
            case 'max':
              result = Math.max(...values);
              break;
            case 'count':
              result = values.length;
              break;
            case 'std':
              result = standardDeviation(values);
              break;
          }
        }
        
        node._measures[alias || field] = parseFloat(result.toFixed(2));
      });
      
      node._count = node._items.length;
      delete node._items; // Remove raw data to save memory
    } else {
      // Internal node - recurse
      Object.keys(node).forEach(key => {
        calculateMeasures(node[key]);
      });
    }
  }
  
  calculateMeasures(cube);
  
  return { cube, dimensions, measures };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUERY CUBE
 * ═══════════════════════════════════════════════════════════════════════════
 * Extract data from cube with filters
 */
export function queryCube(cube, filters = {}) {
  let current = cube.cube;
  
  // Navigate to filtered location
  cube.dimensions.forEach(dim => {
    if (filters[dim]) {
      current = current[filters[dim]];
      if (!current) {
        return { measures: {}, count: 0 };
      }
    }
  });
  
  // If we've filtered to a leaf node, return it
  if (current._measures) {
    return {
      measures: current._measures,
      count: current._count,
      filters: filters
    };
  }
  
  // Otherwise, aggregate across remaining dimensions
  function aggregateNode(node) {
    if (node._measures) {
      return { measures: node._measures, count: node._count };
    }
    
    // Aggregate children
    const aggregated = { measures: {}, count: 0 };
    const childResults = Object.values(node).map(aggregateNode);
    
    childResults.forEach(child => {
      aggregated.count += child.count;
      Object.entries(child.measures).forEach(([key, value]) => {
        aggregated.measures[key] = (aggregated.measures[key] || 0) + value;
      });
    });
    
    // Average measures (since we summed them)
    Object.keys(aggregated.measures).forEach(key => {
      aggregated.measures[key] = parseFloat((aggregated.measures[key] / childResults.length).toFixed(2));
    });
    
    return aggregated;
  }
  
  return aggregateNode(current);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUICK AGGREGATION HELPERS
 * ═══════════════════════════════════════════════════════════════════════════
 */

export function aggregateByPlatform(posts, metric = 'engagement_rate') {
  return groupBy(posts, ['platform'], {
    [`avg_${metric}`]: { field: metric, function: 'avg' },
    [`min_${metric}`]: { field: metric, function: 'min' },
    [`max_${metric}`]: { field: metric, function: 'max' },
    post_count: { field: 'post_id', function: 'count' }
  });
}

export function aggregateByMonth(posts, metric = 'engagement_rate') {
  // Extract month from posted_date
  const postsWithMonth = posts.map(post => ({
    ...post,
    month: post.posted_date.split('-')[1]
  }));
  
  return groupBy(postsWithMonth, ['month'], {
    [`avg_${metric}`]: { field: metric, function: 'avg' },
    post_count: { field: 'post_id', function: 'count' }
  });
}

export function platformContentMatrix(posts) {
  return crossDimensional(
    posts,
    'platform',
    'media_type',
    'engagement_rate',
    'avg'
  );
}

export default {
  groupBy,
  crossDimensional,
  timeSeriesAggregation,
  buildCube,
  queryCube,
  aggregateByPlatform,
  aggregateByMonth,
  platformContentMatrix
};
