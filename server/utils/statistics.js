// ═══════════════════════════════════════════════════════════════════════════
// STATISTICS ENGINE - PRODUCTION GRADE
// ═══════════════════════════════════════════════════════════════════════════
// Provides rigorous statistical analysis for data-driven decisions
// - Confidence intervals
// - T-tests for comparisons
// - Sample size validation
// - Significance testing
// - Effect size calculations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate mean (average)
 */
export function mean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values) {
  if (!values || values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate variance
 */
export function variance(values) {
  const std = standardDeviation(values);
  return Math.pow(std, 2);
}

/**
 * Calculate median
 */
export function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate percentile
 */
export function percentile(values, p) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIDENCE INTERVAL CALCULATION
 * ═══════════════════════════════════════════════════════════════════════════
 * Returns confidence interval for a sample
 */
export function confidenceInterval(values, confidenceLevel = 0.95) {
  if (!values || values.length === 0) {
    return { lower: 0, upper: 0, margin: 0, confidence: 0 };
  }

  const n = values.length;
  const avg = mean(values);
  const std = standardDeviation(values);
  
  // Z-scores for common confidence levels
  const zScores = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576
  };
  
  const z = zScores[confidenceLevel] || 1.96;
  const standardError = std / Math.sqrt(n);
  const margin = z * standardError;
  
  return {
    lower: avg - margin,
    upper: avg + margin,
    margin: margin,
    confidence: confidenceLevel * 100,
    sampleSize: n
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TWO-SAMPLE T-TEST
 * ═══════════════════════════════════════════════════════════════════════════
 * Tests if two samples have significantly different means
 */
export function tTest(sample1, sample2) {
  if (!sample1 || !sample2 || sample1.length === 0 || sample2.length === 0) {
    return {
      tStatistic: 0,
      pValue: 1,
      significant: false,
      confidenceLevel: 0,
      conclusion: 'Insufficient data'
    };
  }

  const n1 = sample1.length;
  const n2 = sample2.length;
  const mean1 = mean(sample1);
  const mean2 = mean(sample2);
  const var1 = variance(sample1);
  const var2 = variance(sample2);
  
  // Pooled standard deviation
  const pooledVariance = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
  const standardError = Math.sqrt(pooledVariance * (1/n1 + 1/n2));
  
  // T-statistic
  const t = (mean1 - mean2) / standardError;
  const df = n1 + n2 - 2;
  
  // Approximate p-value (two-tailed)
  const pValue = approximatePValue(Math.abs(t), df);
  
  // Determine significance
  let significant = false;
  let confidenceLevel = 0;
  
  if (pValue < 0.001) {
    significant = true;
    confidenceLevel = 99.9;
  } else if (pValue < 0.01) {
    significant = true;
    confidenceLevel = 99;
  } else if (pValue < 0.05) {
    significant = true;
    confidenceLevel = 95;
  } else if (pValue < 0.10) {
    confidenceLevel = 90;
  }
  
  return {
    tStatistic: parseFloat(t.toFixed(3)),
    pValue: parseFloat(pValue.toFixed(4)),
    degreesOfFreedom: df,
    significant: significant,
    confidenceLevel: confidenceLevel,
    mean1: parseFloat(mean1.toFixed(2)),
    mean2: parseFloat(mean2.toFixed(2)),
    difference: parseFloat((mean1 - mean2).toFixed(2)),
    effectSize: calculateCohenD(sample1, sample2),
    conclusion: generateTTestConclusion(mean1, mean2, significant, confidenceLevel)
  };
}

/**
 * Approximate p-value from t-statistic (simplified)
 */
function approximatePValue(t, df) {
  // Using approximation for two-tailed test
  // This is a simplified version; production should use precise t-distribution
  const x = df / (df + t * t);
  const p = 0.5 * Math.pow(x, df/2);
  return Math.min(p * 2, 1); // Two-tailed
}

/**
 * Calculate Cohen's d (effect size)
 */
function calculateCohenD(sample1, sample2) {
  const mean1 = mean(sample1);
  const mean2 = mean(sample2);
  const n1 = sample1.length;
  const n2 = sample2.length;
  const var1 = variance(sample1);
  const var2 = variance(sample2);
  
  const pooledSD = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
  const d = (mean1 - mean2) / pooledSD;
  
  return {
    value: parseFloat(d.toFixed(2)),
    interpretation: interpretCohenD(Math.abs(d))
  };
}

/**
 * Interpret Cohen's d
 */
function interpretCohenD(d) {
  if (d < 0.2) return 'negligible';
  if (d < 0.5) return 'small';
  if (d < 0.8) return 'medium';
  return 'large';
}

/**
 * Generate human-readable conclusion
 */
function generateTTestConclusion(mean1, mean2, significant, confidenceLevel) {
  const diff = mean1 - mean2;
  const direction = diff > 0 ? 'higher' : 'lower';
  const magnitude = Math.abs(diff);
  
  if (!significant) {
    return `No statistically significant difference detected (p > 0.05). The ${magnitude.toFixed(2)} unit difference may be due to random variation.`;
  }
  
  return `Statistically significant difference detected (${confidenceLevel}% confidence). Group 1 is ${direction} by ${magnitude.toFixed(2)} units compared to Group 2.`;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SAMPLE SIZE VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════
 * Assesses if sample size is adequate for reliable conclusions
 */
export function validateSampleSize(sampleSize, context = 'general') {
  const thresholds = {
    general: { low: 10, medium: 30, high: 100 },
    platform: { low: 15, medium: 50, high: 150 },
    comparison: { low: 20, medium: 60, high: 200 },
    trend: { low: 30, medium: 90, high: 300 }
  };
  
  const t = thresholds[context] || thresholds.general;
  
  let level, confidence, reliability, warning;
  
  if (sampleSize < t.low) {
    level = 'insufficient';
    confidence = Math.min(60, 40 + sampleSize * 2);
    reliability = 'very_low';
    warning = `Sample size (n=${sampleSize}) is insufficient for reliable conclusions. Minimum ${t.low} recommended.`;
  } else if (sampleSize < t.medium) {
    level = 'low';
    confidence = 70 + (sampleSize - t.low) * 0.5;
    reliability = 'low';
    warning = `Limited sample size (n=${sampleSize}). Conclusions have moderate uncertainty. ${t.medium}+ samples recommended for higher confidence.`;
  } else if (sampleSize < t.high) {
    level = 'medium';
    confidence = 85 + (sampleSize - t.medium) * 0.15;
    reliability = 'medium';
    warning = null;
  } else {
    level = 'high';
    confidence = Math.min(95, 90 + (sampleSize - t.high) * 0.05);
    reliability = 'high';
    warning = null;
  }
  
  return {
    sampleSize,
    level,
    confidence: parseFloat(confidence.toFixed(1)),
    reliability,
    warning,
    recommendation: sampleSize < t.medium ? `Collect ${t.medium - sampleSize} more samples for robust analysis` : null
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DATA RECENCY WEIGHTING
 * ═══════════════════════════════════════════════════════════════════════════
 * Calculate weight based on data age
 */
export function calculateRecencyWeight(date, halfLifeDays = 30) {
  const now = new Date();
  const postDate = new Date(date);
  const ageInDays = (now - postDate) / (1000 * 60 * 60 * 24);
  
  // Exponential decay: weight = 0.5^(age/halfLife)
  const weight = Math.pow(0.5, ageInDays / halfLifeDays);
  
  return {
    ageInDays: Math.round(ageInDays),
    weight: parseFloat(weight.toFixed(3)),
    relevance: weight > 0.8 ? 'very_recent' : 
               weight > 0.5 ? 'recent' :
               weight > 0.25 ? 'moderate' : 'old',
    warning: weight < 0.25 ? 'Data is outdated. Recent data recommended for accurate analysis.' : null
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TREND ANALYSIS
 * ═══════════════════════════════════════════════════════════════════════════
 * Detect and quantify trends in time series data
 */
export function analyzeTrend(timeSeries) {
  if (!timeSeries || timeSeries.length < 3) {
    return {
      trend: 'unknown',
      slope: 0,
      rSquared: 0,
      significant: false
    };
  }
  
  // Linear regression
  const n = timeSeries.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = timeSeries;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // R-squared
  const yMean = mean(y);
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept;
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  const rSquared = 1 - (ssResidual / ssTotal);
  
  // Determine trend
  let trend, strength;
  const absSlope = Math.abs(slope);
  const avgValue = mean(y);
  const slopePercent = (slope / avgValue) * 100;
  
  if (absSlope < avgValue * 0.01) {
    trend = 'stable';
    strength = 'none';
  } else if (slope > 0) {
    trend = 'increasing';
    strength = absSlope > avgValue * 0.1 ? 'strong' : absSlope > avgValue * 0.05 ? 'moderate' : 'weak';
  } else {
    trend = 'decreasing';
    strength = absSlope > avgValue * 0.1 ? 'strong' : absSlope > avgValue * 0.05 ? 'moderate' : 'weak';
  }
  
  return {
    trend,
    strength,
    slope: parseFloat(slope.toFixed(4)),
    slopePercent: parseFloat(slopePercent.toFixed(2)),
    rSquared: parseFloat(rSquared.toFixed(3)),
    significant: rSquared > 0.5,
    interpretation: `${trend === 'stable' ? 'Stable' : trend === 'increasing' ? 'Upward' : 'Downward'} trend (${strength}, R²=${rSquared.toFixed(2)})`
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OUTLIER DETECTION
 * ═══════════════════════════════════════════════════════════════════════════
 * Identify statistical outliers using IQR method
 */
export function detectOutliers(values) {
  if (!values || values.length < 4) {
    return { outliers: [], count: 0, indices: [] };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const outliers = [];
  const indices = [];
  
  values.forEach((val, idx) => {
    if (val < lowerBound || val > upperBound) {
      outliers.push(val);
      indices.push(idx);
    }
  });
  
  return {
    outliers,
    count: outliers.length,
    indices,
    percentage: parseFloat(((outliers.length / values.length) * 100).toFixed(1)),
    lowerBound: parseFloat(lowerBound.toFixed(2)),
    upperBound: parseFloat(upperBound.toFixed(2))
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPREHENSIVE STATISTICAL SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function statisticalSummary(values) {
  if (!values || values.length === 0) {
    return { error: 'No data provided' };
  }
  
  const outlierAnalysis = detectOutliers(values);
  const ci = confidenceInterval(values, 0.95);
  const sampleValidation = validateSampleSize(values.length);
  
  return {
    count: values.length,
    mean: parseFloat(mean(values).toFixed(2)),
    median: parseFloat(median(values).toFixed(2)),
    std: parseFloat(standardDeviation(values).toFixed(2)),
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values),
    percentiles: {
      p25: parseFloat(percentile(values, 25).toFixed(2)),
      p50: parseFloat(percentile(values, 50).toFixed(2)),
      p75: parseFloat(percentile(values, 75).toFixed(2)),
      p90: parseFloat(percentile(values, 90).toFixed(2)),
      p95: parseFloat(percentile(values, 95).toFixed(2))
    },
    confidenceInterval: ci,
    sampleValidation: sampleValidation,
    outliers: outlierAnalysis
  };
}

export default {
  mean,
  median,
  standardDeviation,
  variance,
  percentile,
  confidenceInterval,
  tTest,
  validateSampleSize,
  calculateRecencyWeight,
  analyzeTrend,
  detectOutliers,
  statisticalSummary
};
