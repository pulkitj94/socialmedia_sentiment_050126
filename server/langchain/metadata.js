// ═══════════════════════════════════════════════════════════════════════════
// METADATA GENERATOR - 8-TIER HIERARCHICAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
// Generates rich, multi-dimensional metadata for intelligent RAG retrieval
// Tier 1-4: Post-level metadata
// Tier 5-8: Context-aware metadata (requires full dataset)
// ═══════════════════════════════════════════════════════════════════════════

import { v4 as uuidv4 } from 'uuid';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIER 1: BASIC IDENTIFIERS
 * ═══════════════════════════════════════════════════════════════════════════
 * Direct extraction from post data
 */
export function generateTier1Metadata(post, chunkLevel) {
  return {
    // Unique identifiers
    post_id: post.post_id,
    chunk_id: uuidv4(),
    chunk_level: chunkLevel,
    
    // Platform identification
    source_platform: post.platform.toLowerCase(),
    post_type: post.post_type || 'organic',
    media_type: post.media_type || 'unknown',
    
    // Content identification
    content_snippet: post.content?.substring(0, 100) || '',
    has_hashtags: post.content?.includes('#') || false,
    has_mentions: post.content?.includes('@') || false
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIER 2: TEMPORAL METADATA
 * ═══════════════════════════════════════════════════════════════════════════
 * Date/time parsing and categorization
 */
export function generateTier2Metadata(post) {
  // Parse date (format: DD-MM-YYYY)
  const [day, month, year] = post.posted_date.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  // Parse time if available (format: HH:MM:SS)
  let timeSlot = 'unknown';
  let hour = null;
  
  if (post.posted_time) {
    const [h] = post.posted_time.split(':').map(Number);
    hour = h;
    
    if (h >= 6 && h < 12) timeSlot = 'morning';
    else if (h >= 12 && h < 17) timeSlot = 'afternoon';
    else if (h >= 17 && h < 21) timeSlot = 'evening';
    else timeSlot = 'night';
  }
  
  // Day of week
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = daysOfWeek[date.getDay()];
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  // Quarter
  const quarter = Math.ceil(month / 3);
  
  return {
    posted_date: post.posted_date,
    posted_time: post.posted_time || null,
    posted_year: year,
    posted_month: month,
    posted_day: day,
    posted_quarter: quarter,
    posted_day_of_week: dayOfWeek,
    posted_hour: hour,
    posted_time_slot: timeSlot,
    is_weekend: isWeekend,
    
    // ISO format for easy filtering
    posted_date_iso: date.toISOString().split('T')[0]
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIER 3: PERFORMANCE METRICS
 * ═══════════════════════════════════════════════════════════════════════════
 * Raw and calculated performance data
 */
export function generateTier3Metadata(post) {
  const impressions = parseInt(post.impressions) || 0;
  const reach = parseInt(post.reach) || 0;
  const likes = parseInt(post.likes) || 0;
  const comments = parseInt(post.comments) || 0;
  const shares = parseInt(post.shares) || 0;
  const saves = parseInt(post.saves) || 0;
  
  const totalEngagement = likes + comments + shares + saves;
  const engagementRate = parseFloat(post.engagement_rate) || 0;
  
  // Calculate derived metrics
  const reachRate = impressions > 0 ? (reach / impressions) * 100 : 0;
  const viralityScore = reach > 0 ? (shares / reach) * 100 : 0;
  const saveRate = reach > 0 ? (saves / reach) * 100 : 0;
  const commentRate = reach > 0 ? (comments / reach) * 100 : 0;
  
  return {
    // Raw metrics
    impressions,
    reach,
    likes,
    comments,
    shares,
    saves,
    total_engagement: totalEngagement,
    engagement_rate: engagementRate,
    
    // Derived metrics
    reach_rate: parseFloat(reachRate.toFixed(2)),
    virality_score: parseFloat(viralityScore.toFixed(2)),
    save_rate: parseFloat(saveRate.toFixed(2)),
    comment_rate: parseFloat(commentRate.toFixed(2)),
    
    // Engagement composition
    likes_percentage: totalEngagement > 0 ? parseFloat(((likes / totalEngagement) * 100).toFixed(1)) : 0,
    comments_percentage: totalEngagement > 0 ? parseFloat(((comments / totalEngagement) * 100).toFixed(1)) : 0,
    shares_percentage: totalEngagement > 0 ? parseFloat(((shares / totalEngagement) * 100).toFixed(1)) : 0,
    saves_percentage: totalEngagement > 0 ? parseFloat(((saves / totalEngagement) * 100).toFixed(1)) : 0
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIER 4: CONTENT CLASSIFICATION
 * ═══════════════════════════════════════════════════════════════════════════
 * Analyze content characteristics
 */
export function generateTier4Metadata(post) {
  const content = post.content || '';
  
  // Extract hashtags
  const hashtags = content.match(/#\w+/g) || [];
  const mentions = content.match(/@\w+/g) || [];
  
  // Content length classification
  const contentLength = content.length;
  let lengthCategory = 'unknown';
  if (contentLength > 0 && contentLength <= 50) lengthCategory = 'very_short';
  else if (contentLength <= 100) lengthCategory = 'short';
  else if (contentLength <= 200) lengthCategory = 'medium';
  else if (contentLength <= 400) lengthCategory = 'long';
  else if (contentLength > 400) lengthCategory = 'very_long';
  
  // Detect content themes (simple keyword matching)
  const themes = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('product') || lowerContent.includes('launch')) themes.push('product');
  if (lowerContent.includes('sale') || lowerContent.includes('discount') || lowerContent.includes('offer')) themes.push('promotional');
  if (lowerContent.includes('tip') || lowerContent.includes('how to') || lowerContent.includes('guide')) themes.push('educational');
  if (lowerContent.includes('behind') || lowerContent.includes('team') || lowerContent.includes('office')) themes.push('behind_the_scenes');
  if (lowerContent.includes('customer') || lowerContent.includes('review') || lowerContent.includes('testimonial')) themes.push('social_proof');
  if (lowerContent.includes('question') || lowerContent.includes('poll') || lowerContent.includes('thoughts')) themes.push('engagement');
  
  // Detect calls to action
  const hasCTA = /\b(shop|buy|click|link|swipe|visit|learn more|sign up|subscribe|download)\b/i.test(content);
  
  return {
    content_length: contentLength,
    content_length_category: lengthCategory,
    hashtag_count: hashtags.length,
    mention_count: mentions.length,
    hashtags: hashtags.slice(0, 5), // Top 5 hashtags
    content_themes: themes,
    has_cta: hasCTA,
    word_count: content.split(/\s+/).length
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIER 5: CONTEXTUAL PERFORMANCE
 * ═══════════════════════════════════════════════════════════════════════════
 * Requires full dataset for comparison
 */
export function generateTier5Metadata(post, allPosts) {
  const platform = post.platform.toLowerCase();
  const engagementRate = parseFloat(post.engagement_rate) || 0;
  
  // Filter posts from same platform
  const platformPosts = allPosts.filter(p => p.platform.toLowerCase() === platform);
  
  // Calculate platform averages
  const platformAvgER = platformPosts.reduce((sum, p) => sum + (parseFloat(p.engagement_rate) || 0), 0) / platformPosts.length;
  
  // Calculate percentile
  const sortedByER = platformPosts
    .map(p => parseFloat(p.engagement_rate) || 0)
    .sort((a, b) => a - b);
  
  const percentileIndex = sortedByER.findIndex(er => er >= engagementRate);
  const percentile = percentileIndex >= 0 ? Math.round((percentileIndex / sortedByER.length) * 100) : 0;
  
  // Performance vs average
  const performanceVsAvg = platformAvgER > 0 ? ((engagementRate - platformAvgER) / platformAvgER) * 100 : 0;
  
  // Performance category
  let performanceCategory = 'average';
  if (performanceVsAvg > 50) performanceCategory = 'excellent';
  else if (performanceVsAvg > 20) performanceCategory = 'good';
  else if (performanceVsAvg > -20) performanceCategory = 'average';
  else if (performanceVsAvg > -50) performanceCategory = 'poor';
  else performanceCategory = 'very_poor';
  
  // Viral score (simplified)
  const viralScore = calculateViralScore(post, platformPosts);
  
  return {
    platform_avg_engagement_rate: parseFloat(platformAvgER.toFixed(2)),
    performance_vs_platform_avg: parseFloat(performanceVsAvg.toFixed(2)),
    performance_category: performanceCategory,
    percentile_rank: percentile,
    viral_score: viralScore,
    is_top_performer: percentile >= 90,
    is_bottom_performer: percentile <= 10
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIER 6: TREND ANALYSIS
 * ═══════════════════════════════════════════════════════════════════════════
 * Compare to historical performance
 */
export function generateTier6Metadata(post, allPosts) {
  const platform = post.platform.toLowerCase();
  const postDate = new Date(post.posted_date.split('-').reverse().join('-'));
  
  // Get posts from 30 days before
  const thirtyDaysAgo = new Date(postDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentPosts = allPosts.filter(p => {
    if (p.platform.toLowerCase() !== platform) return false;
    const pDate = new Date(p.posted_date.split('-').reverse().join('-'));
    return pDate >= thirtyDaysAgo && pDate < postDate;
  });
  
  if (recentPosts.length === 0) {
    return {
      trend_direction: 'unknown',
      trend_strength: 0,
      momentum: 'neutral'
    };
  }
  
  // Calculate trend
  const recentAvgER = recentPosts.reduce((sum, p) => sum + (parseFloat(p.engagement_rate) || 0), 0) / recentPosts.length;
  const currentER = parseFloat(post.engagement_rate) || 0;
  
  const trendStrength = recentAvgER > 0 ? ((currentER - recentAvgER) / recentAvgER) * 100 : 0;
  
  let trendDirection = 'stable';
  let momentum = 'neutral';
  
  if (trendStrength > 10) {
    trendDirection = 'improving';
    momentum = trendStrength > 30 ? 'very_positive' : 'positive';
  } else if (trendStrength < -10) {
    trendDirection = 'declining';
    momentum = trendStrength < -30 ? 'very_negative' : 'negative';
  }
  
  return {
    trend_direction: trendDirection,
    trend_strength: parseFloat(trendStrength.toFixed(2)),
    momentum: momentum,
    recent_avg_engagement_rate: parseFloat(recentAvgER.toFixed(2))
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIER 7: CROSS-PLATFORM CONTEXT
 * ═══════════════════════════════════════════════════════════════════════════
 * How this platform compares to others
 */
export function generateTier7Metadata(post, allPosts) {
  const currentPlatform = post.platform.toLowerCase();
  
  // Calculate average ER by platform
  const platformStats = {};
  const platforms = ['instagram', 'linkedin', 'facebook', 'twitter'];
  
  platforms.forEach(platform => {
    const platformPosts = allPosts.filter(p => p.platform.toLowerCase() === platform);
    if (platformPosts.length > 0) {
      const avgER = platformPosts.reduce((sum, p) => sum + (parseFloat(p.engagement_rate) || 0), 0) / platformPosts.length;
      platformStats[platform] = parseFloat(avgER.toFixed(2));
    }
  });
  
  // Rank platforms
  const rankedPlatforms = Object.entries(platformStats)
    .sort(([, a], [, b]) => b - a)
    .map(([platform, _]) => platform);
  
  const platformRank = rankedPlatforms.indexOf(currentPlatform) + 1;
  const totalPlatforms = rankedPlatforms.length;
  
  // Best and worst platforms
  const bestPlatform = rankedPlatforms[0];
  const bestPlatformER = platformStats[bestPlatform];
  const currentER = parseFloat(post.engagement_rate) || 0;
  
  const gapToBest = bestPlatform !== currentPlatform 
    ? parseFloat((((currentER - bestPlatformER) / bestPlatformER) * 100).toFixed(2))
    : 0;
  
  return {
    platform_rank: platformRank,
    total_platforms: totalPlatforms,
    best_performing_platform: bestPlatform,
    gap_to_best_platform: gapToBest,
    all_platform_avg_engagement: platformStats
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIER 8: RECOMMENDATION FLAGS
 * ═══════════════════════════════════════════════════════════════════════════
 * Action flags for AI recommendations
 */
export function generateTier8Metadata(post, tier5, tier6) {
  const flags = [];
  
  // Performance flags
  if (tier5.is_top_performer) flags.push('top_performer');
  if (tier5.is_bottom_performer) flags.push('needs_improvement');
  if (tier5.viral_score > 7) flags.push('highly_viral');
  
  // Trend flags
  if (tier6.momentum === 'very_positive') flags.push('strong_upward_trend');
  if (tier6.momentum === 'very_negative') flags.push('concerning_decline');
  
  // Engagement composition flags
  const saveRate = parseFloat(post.saves) / parseFloat(post.reach) * 100 || 0;
  if (saveRate > 1.5) flags.push('high_purchase_intent');
  
  const commentRate = parseFloat(post.comments) / parseFloat(post.reach) * 100 || 0;
  if (commentRate > 1.0) flags.push('high_discussion');
  
  // Content flags
  const metadata4 = generateTier4Metadata(post);
  if (metadata4.content_themes.includes('behind_the_scenes')) flags.push('authentic_content');
  if (metadata4.has_cta) flags.push('has_call_to_action');
  
  // Actionable recommendations
  const recommendations = [];
  if (tier5.performance_category === 'excellent') recommendations.push('replicate_content_style');
  if (tier5.performance_category === 'very_poor') recommendations.push('review_content_strategy');
  if (tier6.momentum === 'very_negative') recommendations.push('investigate_audience_changes');
  if (saveRate > 1.5) recommendations.push('optimize_for_conversion');
  
  return {
    flags: flags,
    recommendations: recommendations,
    requires_attention: flags.includes('concerning_decline') || flags.includes('needs_improvement')
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MASTER METADATA GENERATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * Combines all tiers into comprehensive metadata object
 */
export function generateCompleteMetadata(post, chunkLevel, allPosts) {
  // Tiers 1-4: Post-level (fast, no context needed)
  const tier1 = generateTier1Metadata(post, chunkLevel);
  const tier2 = generateTier2Metadata(post);
  const tier3 = generateTier3Metadata(post);
  const tier4 = generateTier4Metadata(post);
  
  // Tiers 5-8: Context-aware (requires full dataset)
  let tier5 = {};
  let tier6 = {};
  let tier7 = {};
  let tier8 = {};
  
  if (allPosts && allPosts.length > 1) {
    tier5 = generateTier5Metadata(post, allPosts);
    tier6 = generateTier6Metadata(post, allPosts);
    tier7 = generateTier7Metadata(post, allPosts);
    tier8 = generateTier8Metadata(post, tier5, tier6);
  }
  
  // Combine all tiers
  return {
    ...tier1,
    ...tier2,
    ...tier3,
    ...tier4,
    ...tier5,
    ...tier6,
    ...tier7,
    ...tier8,
    
    // Meta information
    metadata_version: '1.0.0',
    generated_at: new Date().toISOString()
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

function calculateViralScore(post, platformPosts) {
  const engagement = parseInt(post.total_engagement || 0);
  const reach = parseInt(post.reach || 0);
  const shares = parseInt(post.shares || 0);
  const saves = parseInt(post.saves || 0);
  
  // Normalize against platform averages
  const avgEngagement = platformPosts.reduce((sum, p) => sum + (parseInt(p.total_engagement) || 0), 0) / platformPosts.length;
  const avgReach = platformPosts.reduce((sum, p) => sum + (parseInt(p.reach) || 0), 0) / platformPosts.length;
  
  const engagementScore = avgEngagement > 0 ? (engagement / avgEngagement) * 3 : 0;
  const reachScore = avgReach > 0 ? (reach / avgReach) * 3 : 0;
  const shareScore = shares * 0.1;
  const saveScore = saves * 0.05;
  
  const viralScore = Math.min(10, engagementScore + reachScore + shareScore + saveScore);
  return parseFloat(viralScore.toFixed(1));
}

export default {
  generateCompleteMetadata,
  generateTier1Metadata,
  generateTier2Metadata,
  generateTier3Metadata,
  generateTier4Metadata,
  generateTier5Metadata,
  generateTier6Metadata,
  generateTier7Metadata,
  generateTier8Metadata
};
