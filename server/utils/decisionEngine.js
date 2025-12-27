// ═══════════════════════════════════════════════════════════════════════════
// DECISION ENGINE - PRODUCTION GRADE
// ═══════════════════════════════════════════════════════════════════════════
// Systematic multi-factor decision making with weighted criteria
// - Platform ranking with confidence scores
// - Content type optimization
// - ROI-based recommendations
// - A/B comparison with statistical significance
// ═══════════════════════════════════════════════════════════════════════════

import { tTest, validateSampleSize, statisticalSummary, mean } from './statistics.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PLATFORM SCORING & RANKING
 * ═══════════════════════════════════════════════════════════════════════════
 * Score platforms based on multiple weighted criteria
 */
export function scorePlatforms(posts, weights = null) {
  // Default weights (can be customized)
  const defaultWeights = {
    engagement_rate: 3.0,      // Most important
    trend_direction: 2.5,      // Growth matters
    post_efficiency: 2.0,      // Engagement per post
    reach_efficiency: 1.5,     // Reach per impression
    content_quality: 1.5,      // Save rate (intent)
    posting_frequency: 1.0,    // Activity level
    audience_growth: 2.0       // Reach trend
  };
  
  const w = weights || defaultWeights;
  const platforms = ['instagram', 'linkedin', 'facebook', 'twitter'];
  const results = [];
  
  platforms.forEach(platform => {
    const platformPosts = posts.filter(p => p.platform.toLowerCase() === platform);
    
    if (platformPosts.length === 0) {
      return; // Skip platforms with no data
    }
    
    // Calculate metrics
    const engagementRates = platformPosts.map(p => parseFloat(p.engagement_rate) || 0);
    const avgER = mean(engagementRates);
    const totalEngagement = platformPosts.reduce((sum, p) => 
      sum + (parseInt(p.likes) || 0) + (parseInt(p.comments) || 0) + 
      (parseInt(p.shares) || 0) + (parseInt(p.saves) || 0), 0);
    const totalReach = platformPosts.reduce((sum, p) => sum + (parseInt(p.reach) || 0), 0);
    const totalImpressions = platformPosts.reduce((sum, p) => sum + (parseInt(p.impressions) || 0), 0);
    
    const postEfficiency = totalEngagement / platformPosts.length;
    const reachEfficiency = totalReach / totalImpressions * 100;
    const saveRate = platformPosts.reduce((sum, p) => sum + (parseInt(p.saves) || 0), 0) / totalReach * 100;
    
    // Trend analysis (compare recent vs older)
    const sortedByDate = [...platformPosts].sort((a, b) => {
      const dateA = new Date(a.posted_date.split('-').reverse().join('-'));
      const dateB = new Date(b.posted_date.split('-').reverse().join('-'));
      return dateB - dateA;
    });
    
    const recent = sortedByDate.slice(0, Math.ceil(platformPosts.length / 3));
    const older = sortedByDate.slice(Math.ceil(platformPosts.length / 3));
    
    const recentER = recent.length > 0 ? mean(recent.map(p => parseFloat(p.engagement_rate) || 0)) : avgER;
    const olderER = older.length > 0 ? mean(older.map(p => parseFloat(p.engagement_rate) || 0)) : avgER;
    const trendPercent = olderER > 0 ? ((recentER - olderER) / olderER) * 100 : 0;
    
    let trendScore;
    if (trendPercent > 20) trendScore = 10;
    else if (trendPercent > 10) trendScore = 8;
    else if (trendPercent > 0) trendScore = 6;
    else if (trendPercent > -10) trendScore = 4;
    else if (trendPercent > -20) trendScore = 2;
    else trendScore = 0;
    
    // Normalize metrics to 0-10 scale
    const maxER = Math.max(...posts.map(p => parseFloat(p.engagement_rate) || 0));
    const maxEfficiency = Math.max(...platforms.map(plt => {
      const plPosts = posts.filter(p => p.platform.toLowerCase() === plt);
      if (plPosts.length === 0) return 0;
      const eng = plPosts.reduce((sum, p) => 
        sum + (parseInt(p.likes) || 0) + (parseInt(p.comments) || 0) + 
        (parseInt(p.shares) || 0) + (parseInt(p.saves) || 0), 0);
      return eng / plPosts.length;
    }));
    
    const normalizedER = (avgER / maxER) * 10;
    const normalizedEfficiency = (postEfficiency / maxEfficiency) * 10;
    const normalizedReachEff = Math.min((reachEfficiency / 100) * 10, 10);
    const normalizedSaveRate = Math.min((saveRate / 2) * 10, 10);
    const normalizedFrequency = Math.min((platformPosts.length / 50) * 10, 10);
    const normalizedReachGrowth = Math.min(((totalReach / totalImpressions) / 1) * 10, 10);
    
    // Calculate weighted score
    const score = (
      normalizedER * w.engagement_rate +
      trendScore * w.trend_direction +
      normalizedEfficiency * w.post_efficiency +
      normalizedReachEff * w.reach_efficiency +
      normalizedSaveRate * w.content_quality +
      normalizedFrequency * w.posting_frequency +
      normalizedReachGrowth * w.audience_growth
    );
    
    const maxScore = Object.values(w).reduce((a, b) => a + b, 0) * 10;
    const normalizedScore = (score / maxScore) * 100;
    
    // Sample size validation
    const sampleValidation = validateSampleSize(platformPosts.length, 'platform');
    
    results.push({
      platform: platform,
      score: parseFloat(normalizedScore.toFixed(1)),
      breakdown: {
        engagement_rate: {
          value: parseFloat(avgER.toFixed(2)),
          normalized: parseFloat(normalizedER.toFixed(1)),
          weighted: parseFloat((normalizedER * w.engagement_rate).toFixed(1)),
          weight: w.engagement_rate
        },
        trend_direction: {
          value: parseFloat(trendPercent.toFixed(1)),
          normalized: trendScore,
          weighted: parseFloat((trendScore * w.trend_direction).toFixed(1)),
          weight: w.trend_direction,
          interpretation: trendPercent > 10 ? 'strongly_positive' : 
                         trendPercent > 0 ? 'positive' :
                         trendPercent > -10 ? 'stable' : 'negative'
        },
        post_efficiency: {
          value: parseFloat(postEfficiency.toFixed(0)),
          normalized: parseFloat(normalizedEfficiency.toFixed(1)),
          weighted: parseFloat((normalizedEfficiency * w.post_efficiency).toFixed(1)),
          weight: w.post_efficiency
        },
        reach_efficiency: {
          value: parseFloat(reachEfficiency.toFixed(1)),
          normalized: parseFloat(normalizedReachEff.toFixed(1)),
          weighted: parseFloat((normalizedReachEff * w.reach_efficiency).toFixed(1)),
          weight: w.reach_efficiency
        },
        content_quality: {
          value: parseFloat(saveRate.toFixed(2)),
          normalized: parseFloat(normalizedSaveRate.toFixed(1)),
          weighted: parseFloat((normalizedSaveRate * w.content_quality).toFixed(1)),
          weight: w.content_quality
        },
        posting_frequency: {
          value: platformPosts.length,
          normalized: parseFloat(normalizedFrequency.toFixed(1)),
          weighted: parseFloat((normalizedFrequency * w.posting_frequency).toFixed(1)),
          weight: w.posting_frequency
        }
      },
      metrics: {
        post_count: platformPosts.length,
        avg_engagement_rate: parseFloat(avgER.toFixed(2)),
        total_reach: totalReach,
        engagement_per_post: parseFloat(postEfficiency.toFixed(0)),
        save_rate: parseFloat(saveRate.toFixed(2)),
        trend: parseFloat(trendPercent.toFixed(1))
      },
      confidence: {
        level: sampleValidation.level,
        percentage: sampleValidation.confidence,
        reliability: sampleValidation.reliability,
        warning: sampleValidation.warning
      }
    });
  });
  
  // Sort by score
  results.sort((a, b) => b.score - a.score);
  
  // Add rankings and gaps
  results.forEach((result, index) => {
    result.rank = index + 1;
    if (index > 0) {
      result.gap_to_leader = parseFloat((results[0].score - result.score).toFixed(1));
      result.gap_to_next = index < results.length - 1 ? 
        parseFloat((results[index - 1].score - result.score).toFixed(1)) : 0;
    } else {
      result.gap_to_leader = 0;
      result.gap_to_next = results.length > 1 ? 
        parseFloat((result.score - results[1].score).toFixed(1)) : 0;
    }
  });
  
  return {
    rankings: results,
    best: results[0],
    worst: results[results.length - 1],
    weights_used: w,
    total_platforms: results.length
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTENT TYPE OPTIMIZATION
 * ═══════════════════════════════════════════════════════════════════════════
 * Identify best/worst performing content types per platform
 */
export function analyzeContentTypes(posts) {
  const platforms = ['instagram', 'linkedin', 'facebook', 'twitter'];
  const results = {};
  
  platforms.forEach(platform => {
    const platformPosts = posts.filter(p => p.platform.toLowerCase() === platform);
    if (platformPosts.length === 0) return;
    
    const contentTypes = {};
    
    platformPosts.forEach(post => {
      const type = post.media_type || 'unknown';
      if (!contentTypes[type]) {
        contentTypes[type] = [];
      }
      contentTypes[type].push(parseFloat(post.engagement_rate) || 0);
    });
    
    const typeStats = Object.entries(contentTypes).map(([type, rates]) => {
      const stats = statisticalSummary(rates);
      const validation = validateSampleSize(rates.length, 'general');
      
      return {
        type,
        avg_engagement_rate: stats.mean,
        median_engagement_rate: stats.median,
        std_deviation: stats.std,
        post_count: rates.length,
        min: stats.min,
        max: stats.max,
        confidence: validation.confidence,
        reliability: validation.reliability
      };
    }).sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate);
    
    // Statistical comparison between best and worst
    if (typeStats.length >= 2) {
      const bestRates = contentTypes[typeStats[0].type];
      const worstRates = contentTypes[typeStats[typeStats.length - 1].type];
      
      if (bestRates.length >= 3 && worstRates.length >= 3) {
        const comparison = tTest(bestRates, worstRates);
        typeStats[0].statistically_better = comparison.significant;
        typeStats[0].confidence_level = comparison.confidenceLevel;
        typeStats[0].p_value = comparison.pValue;
      }
    }
    
    results[platform] = {
      types: typeStats,
      best: typeStats[0],
      worst: typeStats[typeStats.length - 1],
      recommendation: generateContentTypeRecommendation(typeStats)
    };
  });
  
  return results;
}

function generateContentTypeRecommendation(typeStats) {
  if (typeStats.length === 0) return 'Insufficient data';
  
  const best = typeStats[0];
  const worst = typeStats[typeStats.length - 1];
  
  const improvement = ((best.avg_engagement_rate - worst.avg_engagement_rate) / worst.avg_engagement_rate) * 100;
  
  return {
    action: `Increase ${best.type} content`,
    expected_improvement: `+${improvement.toFixed(0)}%`,
    reduce: worst.type,
    rationale: `${best.type} performs ${improvement.toFixed(0)}% better than ${worst.type}`,
    confidence: best.confidence
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROI-BASED RECOMMENDATIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * Calculate opportunity cost and resource allocation
 */
export function calculateROI(platforms, assumedCostPerPost = 100, assumedValuePerEngagement = 0.5) {
  const roiAnalysis = platforms.map(platform => {
    const totalCost = platform.metrics.post_count * assumedCostPerPost;
    const totalEngagement = platform.metrics.engagement_per_post * platform.metrics.post_count;
    const totalValue = totalEngagement * assumedValuePerEngagement;
    const roi = ((totalValue - totalCost) / totalCost) * 100;
    
    return {
      platform: platform.platform,
      total_cost: totalCost,
      total_value: parseFloat(totalValue.toFixed(2)),
      roi: parseFloat(roi.toFixed(1)),
      engagement_per_dollar: parseFloat((totalEngagement / totalCost).toFixed(2)),
      recommendation: roi < 0 ? 'reduce_investment' : roi > 100 ? 'increase_investment' : 'maintain'
    };
  }).sort((a, b) => b.roi - a.roi);
  
  // Calculate opportunity cost of worst platform
  const worst = roiAnalysis[roiAnalysis.length - 1];
  const best = roiAnalysis[0];
  
  const opportunityCost = {
    current_worst_value: worst.total_value,
    potential_best_value: (worst.total_cost / assumedCostPerPost) * best.engagement_per_dollar * assumedCostPerPost * assumedValuePerEngagement,
    gain: 0
  };
  opportunityCost.gain = parseFloat((opportunityCost.potential_best_value - opportunityCost.current_worst_value).toFixed(2));
  opportunityCost.gain_percentage = parseFloat(((opportunityCost.gain / opportunityCost.current_worst_value) * 100).toFixed(1));
  
  return {
    platforms: roiAnalysis,
    best_roi: best,
    worst_roi: worst,
    opportunity_cost: opportunityCost,
    recommendation: `Reallocate budget from ${worst.platform} to ${best.platform} for ${opportunityCost.gain_percentage}% improvement`
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPREHENSIVE DECISION REPORT
 * ═══════════════════════════════════════════════════════════════════════════
 * Generate complete decision analysis with all factors
 */
export function generateDecisionReport(posts) {
  const platformScoring = scorePlatforms(posts);
  const contentAnalysis = analyzeContentTypes(posts);
  const roiAnalysis = calculateROI(platformScoring.rankings);
  
  return {
    summary: {
      best_platform: platformScoring.best.platform,
      best_score: platformScoring.best.score,
      worst_platform: platformScoring.worst.platform,
      worst_score: platformScoring.worst.score,
      score_gap: parseFloat((platformScoring.best.score - platformScoring.worst.score).toFixed(1)),
      confidence: platformScoring.best.confidence.level
    },
    platform_rankings: platformScoring,
    content_optimization: contentAnalysis,
    roi_analysis: roiAnalysis,
    key_recommendations: generateKeyRecommendations(platformScoring, contentAnalysis, roiAnalysis),
    generated_at: new Date().toISOString()
  };
}

function generateKeyRecommendations(platformScoring, contentAnalysis, roiAnalysis) {
  const recommendations = [];
  
  // Platform recommendation
  const best = platformScoring.best;
  const worst = platformScoring.worst;
  
  recommendations.push({
    priority: 'high',
    category: 'platform_allocation',
    action: `Increase investment in ${best.platform}`,
    rationale: `Highest score (${best.score}) with ${best.confidence.level} confidence`,
    expected_impact: `+${platformScoring.best.gap_to_next}% vs second-place platform`,
    confidence: best.confidence.percentage
  });
  
  if (worst.confidence.level !== 'insufficient') {
    recommendations.push({
      priority: 'high',
      category: 'platform_reduction',
      action: `Reduce or optimize ${worst.platform}`,
      rationale: `Lowest score (${worst.score}), ${worst.metrics.trend}% trend`,
      expected_impact: `Reallocate for ${roiAnalysis.opportunity_cost.gain_percentage}% ROI improvement`,
      confidence: worst.confidence.percentage
    });
  }
  
  // Content type recommendations
  Object.entries(contentAnalysis).forEach(([platform, analysis]) => {
    if (analysis.recommendation && analysis.best.confidence > 70) {
      recommendations.push({
        priority: 'medium',
        category: 'content_optimization',
        platform: platform,
        action: analysis.recommendation.action,
        rationale: analysis.recommendation.rationale,
        expected_impact: analysis.recommendation.expected_improvement,
        confidence: analysis.best.confidence
      });
    }
  });
  
  // ROI recommendations
  if (roiAnalysis.best_roi.roi > 150) {
    recommendations.push({
      priority: 'high',
      category: 'investment',
      action: `Scale ${roiAnalysis.best_roi.platform} immediately`,
      rationale: `Exceptional ROI of ${roiAnalysis.best_roi.roi}%`,
      expected_impact: 'High-return investment opportunity',
      confidence: 90
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export default {
  scorePlatforms,
  analyzeContentTypes,
  calculateROI,
  generateDecisionReport
};
