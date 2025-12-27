// ═══════════════════════════════════════════════════════════════════════════
// HIERARCHICAL CHUNKING SYSTEM - 6 LEVELS
// ═══════════════════════════════════════════════════════════════════════════
// Level 1: Individual Posts (granular)
// Level 2: Daily Summaries (by platform)
// Level 3: Monthly Summaries (by platform)
// Level 4: Platform Overviews (all-time)
// Level 5: Cross-Platform Comparisons
// Level 6: Strategic Insights & Trends
// ═══════════════════════════════════════════════════════════════════════════

import { generateCompleteMetadata } from './metadata.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEVEL 1: INDIVIDUAL POSTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Most granular - each post is a separate chunk
 */
export function createLevel1Chunks(posts, allPosts) {
  console.log(`📄 Creating Level 1 chunks (individual posts): ${posts.length} posts`);
  
  return posts.map(post => {
    const metadata = generateCompleteMetadata(post, 1, allPosts);
    
    const content = `
POST DETAILS:
Platform: ${post.platform}
Post ID: ${post.post_id}
Date: ${post.posted_date}
Time: ${post.posted_time || 'Not specified'}
Type: ${post.post_type || 'organic'}
Media: ${post.media_type || 'unknown'}

CONTENT:
${post.content || 'No content text'}

PERFORMANCE METRICS:
- Impressions: ${post.impressions?.toLocaleString()}
- Reach: ${post.reach?.toLocaleString()}
- Likes: ${post.likes?.toLocaleString()}
- Comments: ${post.comments?.toLocaleString()}
- Shares: ${post.shares?.toLocaleString()}
- Saves: ${post.saves?.toLocaleString()}
- Total Engagement: ${metadata.total_engagement?.toLocaleString()}
- Engagement Rate: ${post.engagement_rate}%

PERFORMANCE CONTEXT:
- Performance Category: ${metadata.performance_category || 'N/A'}
- Platform Percentile: ${metadata.percentile_rank || 'N/A'}th
- vs Platform Average: ${metadata.performance_vs_platform_avg > 0 ? '+' : ''}${metadata.performance_vs_platform_avg?.toFixed(1) || 'N/A'}%
- Viral Score: ${metadata.viral_score || 'N/A'}/10
- Trend: ${metadata.trend_direction || 'unknown'} (${metadata.momentum || 'neutral'})

CONTENT ANALYSIS:
- Content Length: ${metadata.content_length_category || 'unknown'}
- Hashtags: ${metadata.hashtag_count || 0}
- Themes: ${metadata.content_themes?.join(', ') || 'none detected'}
- Has CTA: ${metadata.has_cta ? 'Yes' : 'No'}
`.trim();
    
    return {
      pageContent: content,
      metadata: metadata
    };
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEVEL 2: DAILY SUMMARIES
 * ═══════════════════════════════════════════════════════════════════════════
 * Aggregate posts by day and platform
 */
export function createLevel2Chunks(posts, allPosts) {
  console.log(`📅 Creating Level 2 chunks (daily summaries)...`);
  
  // Group by date and platform
  const grouped = {};
  
  posts.forEach(post => {
    const key = `${post.posted_date}_${post.platform}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(post);
  });
  
  const chunks = [];
  
  Object.entries(grouped).forEach(([key, dayPosts]) => {
    const [date, platform] = key.split('_');
    
    // Calculate aggregate metrics
    const totalImpressions = dayPosts.reduce((sum, p) => sum + (parseInt(p.impressions) || 0), 0);
    const totalReach = dayPosts.reduce((sum, p) => sum + (parseInt(p.reach) || 0), 0);
    const totalLikes = dayPosts.reduce((sum, p) => sum + (parseInt(p.likes) || 0), 0);
    const totalComments = dayPosts.reduce((sum, p) => sum + (parseInt(p.comments) || 0), 0);
    const totalShares = dayPosts.reduce((sum, p) => sum + (parseInt(p.shares) || 0), 0);
    const totalSaves = dayPosts.reduce((sum, p) => sum + (parseInt(p.saves) || 0), 0);
    const totalEngagement = totalLikes + totalComments + totalShares + totalSaves;
    const avgEngagementRate = dayPosts.reduce((sum, p) => sum + (parseFloat(p.engagement_rate) || 0), 0) / dayPosts.length;
    
    // Find best post
    const bestPost = dayPosts.reduce((best, p) => {
      const bestER = parseFloat(best.engagement_rate) || 0;
      const currentER = parseFloat(p.engagement_rate) || 0;
      return currentER > bestER ? p : best;
    });
    
    // Parse date for metadata
    const [day, month, year] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
    
    const content = `
DAILY SUMMARY: ${platform.toUpperCase()} - ${date} (${dayOfWeek})

POSTING ACTIVITY:
- Total Posts: ${dayPosts.length}
- Media Types: ${[...new Set(dayPosts.map(p => p.media_type))].join(', ')}

AGGREGATE PERFORMANCE:
- Total Impressions: ${totalImpressions.toLocaleString()}
- Total Reach: ${totalReach.toLocaleString()}
- Total Engagement: ${totalEngagement.toLocaleString()}
- Average Engagement Rate: ${avgEngagementRate.toFixed(2)}%

ENGAGEMENT BREAKDOWN:
- Likes: ${totalLikes.toLocaleString()}
- Comments: ${totalComments.toLocaleString()}
- Shares: ${totalShares.toLocaleString()}
- Saves: ${totalSaves.toLocaleString()}

BEST PERFORMING POST:
- Post ID: ${bestPost.post_id}
- Engagement Rate: ${bestPost.engagement_rate}%
- Content: ${bestPost.content?.substring(0, 100)}...

POST DETAILS:
${dayPosts.map(p => `- ${p.post_id}: ${p.engagement_rate}% ER (${p.media_type})`).join('\n')}
`.trim();

    const metadata = {
      chunk_id: `day_${date}_${platform}`,
      chunk_level: 2,
      source_platform: platform.toLowerCase(),
      posted_date: date,
      posted_year: year,
      posted_month: month,
      posted_day: day,
      posted_day_of_week: dayOfWeek,
      post_count: dayPosts.length,
      total_impressions: totalImpressions,
      total_reach: totalReach,
      total_engagement: totalEngagement,
      avg_engagement_rate: parseFloat(avgEngagementRate.toFixed(2)),
      best_post_id: bestPost.post_id,
      metadata_version: '1.0.0',
      generated_at: new Date().toISOString()
    };
    
    chunks.push({
      pageContent: content,
      metadata: metadata
    });
  });
  
  console.log(`✅ Created ${chunks.length} Level 2 chunks`);
  return chunks;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEVEL 3: MONTHLY SUMMARIES
 * ═══════════════════════════════════════════════════════════════════════════
 * Aggregate by month and platform
 */
export function createLevel3Chunks(posts, allPosts) {
  console.log(`📊 Creating Level 3 chunks (monthly summaries)...`);
  
  // Group by year-month and platform
  const grouped = {};
  
  posts.forEach(post => {
    const [day, month, year] = post.posted_date.split('-');
    const key = `${year}-${month}_${post.platform}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(post);
  });
  
  const chunks = [];
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  Object.entries(grouped).forEach(([key, monthPosts]) => {
    const [yearMonth, platform] = key.split('_');
    const [year, month] = yearMonth.split('-').map(Number);
    const monthName = monthNames[month];
    
    // Calculate aggregate metrics
    const totalImpressions = monthPosts.reduce((sum, p) => sum + (parseInt(p.impressions) || 0), 0);
    const totalReach = monthPosts.reduce((sum, p) => sum + (parseInt(p.reach) || 0), 0);
    const totalEngagement = monthPosts.reduce((sum, p) => {
      const likes = parseInt(p.likes) || 0;
      const comments = parseInt(p.comments) || 0;
      const shares = parseInt(p.shares) || 0;
      const saves = parseInt(p.saves) || 0;
      return sum + likes + comments + shares + saves;
    }, 0);
    const avgEngagementRate = monthPosts.reduce((sum, p) => sum + (parseFloat(p.engagement_rate) || 0), 0) / monthPosts.length;
    
    // Media type distribution
    const mediaTypes = {};
    monthPosts.forEach(p => {
      const type = p.media_type || 'unknown';
      mediaTypes[type] = (mediaTypes[type] || 0) + 1;
    });
    
    // Content themes analysis
    const allMetadata = monthPosts.map(p => generateCompleteMetadata(p, 3, allPosts));
    const allThemes = allMetadata.flatMap(m => m.content_themes || []);
    const themeCount = {};
    allThemes.forEach(theme => {
      themeCount[theme] = (themeCount[theme] || 0) + 1;
    });
    
    const topThemes = Object.entries(themeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([theme, count]) => `${theme} (${count} posts)`);
    
    // Top performing posts
    const topPosts = [...monthPosts]
      .sort((a, b) => (parseFloat(b.engagement_rate) || 0) - (parseFloat(a.engagement_rate) || 0))
      .slice(0, 5);
    
    const content = `
MONTHLY SUMMARY: ${platform.toUpperCase()} - ${monthName} ${year}

POSTING ACTIVITY:
- Total Posts: ${monthPosts.length}
- Publishing Frequency: ${(monthPosts.length / 30).toFixed(1)} posts/day
- Media Type Distribution: ${Object.entries(mediaTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}

AGGREGATE PERFORMANCE:
- Total Impressions: ${totalImpressions.toLocaleString()}
- Total Reach: ${totalReach.toLocaleString()} unique accounts
- Total Engagement: ${totalEngagement.toLocaleString()}
- Average Engagement Rate: ${avgEngagementRate.toFixed(2)}%
- Engagement per Post: ${(totalEngagement / monthPosts.length).toFixed(0)}

CONTENT THEMES:
${topThemes.length > 0 ? topThemes.map(t => `- ${t}`).join('\n') : 'No themes detected'}

TOP 5 PERFORMING POSTS:
${topPosts.map((p, i) => `${i + 1}. ${p.post_id} - ${p.engagement_rate}% ER (${p.media_type}) - ${p.content?.substring(0, 60)}...`).join('\n')}

PERFORMANCE DISTRIBUTION:
- Excellent (>20% above avg): ${monthPosts.filter(p => {
  const er = parseFloat(p.engagement_rate) || 0;
  return er > avgEngagementRate * 1.2;
}).length} posts
- Good (within ±20%): ${monthPosts.filter(p => {
  const er = parseFloat(p.engagement_rate) || 0;
  return er >= avgEngagementRate * 0.8 && er <= avgEngagementRate * 1.2;
}).length} posts
- Needs Improvement (<20% below avg): ${monthPosts.filter(p => {
  const er = parseFloat(p.engagement_rate) || 0;
  return er < avgEngagementRate * 0.8;
}).length} posts
`.trim();

    const metadata = {
      chunk_id: `month_${year}-${month}_${platform}`,
      chunk_level: 3,
      source_platform: platform.toLowerCase(),
      posted_year: year,
      posted_month: month,
      month_name: monthName,
      post_count: monthPosts.length,
      total_impressions: totalImpressions,
      total_reach: totalReach,
      total_engagement: totalEngagement,
      avg_engagement_rate: parseFloat(avgEngagementRate.toFixed(2)),
      media_types: Object.keys(mediaTypes),
      top_themes: Object.keys(themeCount).slice(0, 5),
      metadata_version: '1.0.0',
      generated_at: new Date().toISOString()
    };
    
    chunks.push({
      pageContent: content,
      metadata: metadata
    });
  });
  
  console.log(`✅ Created ${chunks.length} Level 3 chunks`);
  return chunks;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEVEL 4: PLATFORM OVERVIEWS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive platform-level analysis
 */
export function createLevel4Chunks(posts, allPosts) {
  console.log(`🎯 Creating Level 4 chunks (platform overviews)...`);
  
  const platforms = ['Instagram', 'LinkedIn', 'Facebook', 'Twitter'];
  const chunks = [];
  
  platforms.forEach(platform => {
    const platformPosts = posts.filter(p => p.platform.toLowerCase() === platform.toLowerCase());
    
    if (platformPosts.length === 0) return;
    
    // Calculate comprehensive stats
    const totalPosts = platformPosts.length;
    const totalImpressions = platformPosts.reduce((sum, p) => sum + (parseInt(p.impressions) || 0), 0);
    const totalReach = platformPosts.reduce((sum, p) => sum + (parseInt(p.reach) || 0), 0);
    const totalEngagement = platformPosts.reduce((sum, p) => {
      return sum + (parseInt(p.likes) || 0) + (parseInt(p.comments) || 0) + 
             (parseInt(p.shares) || 0) + (parseInt(p.saves) || 0);
    }, 0);
    const avgEngagementRate = platformPosts.reduce((sum, p) => sum + (parseFloat(p.engagement_rate) || 0), 0) / totalPosts;
    
    // Best performing content type
    const contentTypePerformance = {};
    platformPosts.forEach(p => {
      const type = p.media_type || 'unknown';
      if (!contentTypePerformance[type]) {
        contentTypePerformance[type] = { count: 0, totalER: 0 };
      }
      contentTypePerformance[type].count++;
      contentTypePerformance[type].totalER += parseFloat(p.engagement_rate) || 0;
    });
    
    const bestContentType = Object.entries(contentTypePerformance)
      .map(([type, data]) => ({ type, avgER: data.totalER / data.count, count: data.count }))
      .sort((a, b) => b.avgER - a.avgER)[0];
    
    // Time analysis
    const timeSlotPerformance = {};
    platformPosts.forEach(p => {
      const metadata = generateCompleteMetadata(p, 4, allPosts);
      const slot = metadata.posted_time_slot;
      if (!timeSlotPerformance[slot]) {
        timeSlotPerformance[slot] = { count: 0, totalER: 0 };
      }
      timeSlotPerformance[slot].count++;
      timeSlotPerformance[slot].totalER += parseFloat(p.engagement_rate) || 0;
    });
    
    const bestTimeSlot = Object.entries(timeSlotPerformance)
      .map(([slot, data]) => ({ slot, avgER: data.totalER / data.count, count: data.count }))
      .filter(t => t.slot !== 'unknown')
      .sort((a, b) => b.avgER - a.avgER)[0];
    
    const content = `
PLATFORM OVERVIEW: ${platform.toUpperCase()}

OVERALL PERFORMANCE:
- Total Posts: ${totalPosts}
- Total Impressions: ${totalImpressions.toLocaleString()}
- Total Reach: ${totalReach.toLocaleString()} unique accounts
- Total Engagement: ${totalEngagement.toLocaleString()}
- Average Engagement Rate: ${avgEngagementRate.toFixed(2)}%
- Engagement per Post: ${(totalEngagement / totalPosts).toFixed(0)}

CONTENT TYPE PERFORMANCE:
${Object.entries(contentTypePerformance)
  .map(([type, data]) => {
    const avgER = (data.totalER / data.count).toFixed(2);
    return `- ${type}: ${avgER}% avg ER (${data.count} posts)`;
  })
  .join('\n')}

BEST PERFORMING CONTENT:
- Type: ${bestContentType?.type || 'N/A'}
- Average Engagement Rate: ${bestContentType?.avgER.toFixed(2) || 'N/A'}%
- Sample Size: ${bestContentType?.count || 0} posts

OPTIMAL POSTING TIME:
- Best Time Slot: ${bestTimeSlot?.slot || 'N/A'}
- Average Engagement Rate: ${bestTimeSlot?.avgER.toFixed(2) || 'N/A'}%
- Posts in Slot: ${bestTimeSlot?.count || 0}

TIME SLOT COMPARISON:
${Object.entries(timeSlotPerformance)
  .filter(([slot]) => slot !== 'unknown')
  .map(([slot, data]) => {
    const avgER = (data.totalER / data.count).toFixed(2);
    return `- ${slot}: ${avgER}% avg ER (${data.count} posts)`;
  })
  .join('\n')}

RECOMMENDATIONS:
- Focus on ${bestContentType?.type || 'best performing'} content (${bestContentType?.avgER > avgEngagementRate ? '+' : ''}${((bestContentType?.avgER - avgEngagementRate) || 0).toFixed(1)}% vs average)
- Post during ${bestTimeSlot?.slot || 'optimal'} hours for best results
- Current posting frequency: ${(totalPosts / 120).toFixed(1)} posts/day
`.trim();

    const metadata = {
      chunk_id: `platform_${platform.toLowerCase()}`,
      chunk_level: 4,
      source_platform: platform.toLowerCase(),
      post_count: totalPosts,
      total_impressions: totalImpressions,
      total_reach: totalReach,
      total_engagement: totalEngagement,
      avg_engagement_rate: parseFloat(avgEngagementRate.toFixed(2)),
      best_content_type: bestContentType?.type,
      best_content_type_er: bestContentType?.avgER,
      best_time_slot: bestTimeSlot?.slot,
      best_time_slot_er: bestTimeSlot?.avgER,
      metadata_version: '1.0.0',
      generated_at: new Date().toISOString()
    };
    
    chunks.push({
      pageContent: content,
      metadata: metadata
    });
  });
  
  console.log(`✅ Created ${chunks.length} Level 4 chunks`);
  return chunks;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEVEL 5: CROSS-PLATFORM COMPARISONS
 * ═══════════════════════════════════════════════════════════════════════════
 * Compare performance across all platforms
 */
export function createLevel5Chunks(posts, allPosts) {
  console.log(`🔄 Creating Level 5 chunks (cross-platform comparisons)...`);
  
  const platforms = ['Instagram', 'LinkedIn', 'Facebook', 'Twitter'];
  const platformStats = {};
  
  platforms.forEach(platform => {
    const platformPosts = posts.filter(p => p.platform.toLowerCase() === platform.toLowerCase());
    if (platformPosts.length === 0) return;
    
    platformStats[platform] = {
      posts: platformPosts.length,
      avgER: platformPosts.reduce((sum, p) => sum + (parseFloat(p.engagement_rate) || 0), 0) / platformPosts.length,
      totalReach: platformPosts.reduce((sum, p) => sum + (parseInt(p.reach) || 0), 0),
      totalEngagement: platformPosts.reduce((sum, p) => {
        return sum + (parseInt(p.likes) || 0) + (parseInt(p.comments) || 0) + 
               (parseInt(p.shares) || 0) + (parseInt(p.saves) || 0);
      }, 0)
    };
  });
  
  // Rank platforms
  const rankedByER = Object.entries(platformStats)
    .sort(([, a], [, b]) => b.avgER - a.avgER);
  
  const rankedByReach = Object.entries(platformStats)
    .sort(([, a], [, b]) => b.totalReach - a.totalReach);
  
  const content = `
CROSS-PLATFORM PERFORMANCE COMPARISON

ENGAGEMENT RATE RANKING:
${rankedByER.map(([platform, stats], i) => 
  `${i + 1}. ${platform}: ${stats.avgER.toFixed(2)}% avg ER (${stats.posts} posts)`
).join('\n')}

REACH RANKING:
${rankedByReach.map(([platform, stats], i) => 
  `${i + 1}. ${platform}: ${stats.totalReach.toLocaleString()} total reach`
).join('\n')}

TOTAL ENGAGEMENT:
${Object.entries(platformStats)
  .sort(([, a], [, b]) => b.totalEngagement - a.totalEngagement)
  .map(([platform, stats], i) => 
    `${i + 1}. ${platform}: ${stats.totalEngagement.toLocaleString()} total engagement`
  ).join('\n')}

EFFICIENCY ANALYSIS (Engagement per Post):
${Object.entries(platformStats)
  .map(([platform, stats]) => {
    const efficiency = (stats.totalEngagement / stats.posts).toFixed(0);
    return `- ${platform}: ${efficiency} engagement/post`;
  })
  .join('\n')}

KEY INSIGHTS:
- Best Overall Platform: ${rankedByER[0][0]} (${rankedByER[0][1].avgER.toFixed(2)}% ER)
- Highest Reach: ${rankedByReach[0][0]} (${rankedByReach[0][1].totalReach.toLocaleString()})
- Most Active: ${Object.entries(platformStats).sort(([, a], [, b]) => b.posts - a.posts)[0][0]}
- Needs Attention: ${rankedByER[rankedByER.length - 1][0]} (lowest ER: ${rankedByER[rankedByER.length - 1][1].avgER.toFixed(2)}%)

STRATEGIC RECOMMENDATION:
Allocate resources based on performance:
${rankedByER.map(([platform, stats], i) => {
  const percentage = i === 0 ? 40 : i === 1 ? 30 : i === 2 ? 20 : 10;
  return `- ${platform}: ${percentage}% of content budget (currently ${((stats.posts / posts.length) * 100).toFixed(1)}%)`;
}).join('\n')}
`.trim();

  const metadata = {
    chunk_id: 'cross_platform_comparison',
    chunk_level: 5,
    platforms_analyzed: Object.keys(platformStats),
    best_platform: rankedByER[0][0].toLowerCase(),
    best_platform_er: rankedByER[0][1].avgER,
    worst_platform: rankedByER[rankedByER.length - 1][0].toLowerCase(),
    worst_platform_er: rankedByER[rankedByER.length - 1][1].avgER,
    metadata_version: '1.0.0',
    generated_at: new Date().toISOString()
  };
  
  console.log(`✅ Created 1 Level 5 chunk`);
  return [{
    pageContent: content,
    metadata: metadata
  }];
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEVEL 6: STRATEGIC INSIGHTS
 * ═══════════════════════════════════════════════════════════════════════════
 * High-level trends and recommendations
 */
export function createLevel6Chunks(posts, allPosts) {
  console.log(`💡 Creating Level 6 chunks (strategic insights)...`);
  
  // Analyze overall trends
  const allMetadata = posts.map(p => generateCompleteMetadata(p, 6, allPosts));
  
  // Content theme performance
  const themePerformance = {};
  allMetadata.forEach(m => {
    (m.content_themes || []).forEach(theme => {
      if (!themePerformance[theme]) {
        themePerformance[theme] = { count: 0, totalER: 0 };
      }
      themePerformance[theme].count++;
      themePerformance[theme].totalER += m.engagement_rate || 0;
    });
  });
  
  const topThemes = Object.entries(themePerformance)
    .map(([theme, data]) => ({ theme, avgER: data.totalER / data.count, count: data.count }))
    .sort((a, b) => b.avgER - a.avgER)
    .slice(0, 5);
  
  const content = `
STRATEGIC INSIGHTS & RECOMMENDATIONS

CONTENT THEME PERFORMANCE:
${topThemes.map((t, i) => 
  `${i + 1}. ${t.theme}: ${t.avgER.toFixed(2)}% avg ER (${t.count} posts)`
).join('\n')}

OVERALL TRENDS:
- Total Posts Analyzed: ${posts.length}
- Average Engagement Rate: ${(allMetadata.reduce((sum, m) => sum + m.engagement_rate, 0) / allMetadata.length).toFixed(2)}%
- Top Performing Theme: ${topThemes[0]?.theme || 'N/A'}
- Underperforming Theme: ${topThemes[topThemes.length - 1]?.theme || 'N/A'}

ACTIONABLE RECOMMENDATIONS:
1. Content Strategy:
   - Increase ${topThemes[0]?.theme || 'top performing'} content by 30%
   - Test variations of high-performing themes
   - Reduce or optimize ${topThemes[topThemes.length - 1]?.theme || 'underperforming'} content

2. Platform Allocation:
   - Review cross-platform comparison for budget allocation
   - Focus resources on platforms with >5% engagement rate
   - Consider reducing presence on platforms with declining trends

3. Posting Optimization:
   - Analyze time slot performance per platform
   - Test different content formats
   - Monitor weekend vs weekday performance

4. Engagement Quality:
   - Posts with high save rates indicate purchase intent
   - High comment rates suggest active community
   - Track shares for viral potential
`.trim();

  const metadata = {
    chunk_id: 'strategic_insights',
    chunk_level: 6,
    total_posts_analyzed: posts.length,
    top_theme: topThemes[0]?.theme,
    top_theme_er: topThemes[0]?.avgER,
    metadata_version: '1.0.0',
    generated_at: new Date().toISOString()
  };
  
  console.log(`✅ Created 1 Level 6 chunk`);
  return [{
    pageContent: content,
    metadata: metadata
  }];
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MASTER CHUNKING FUNCTION
 * ═══════════════════════════════════════════════════════════════════════════
 * Generate all 6 levels of chunks
 */
export async function generateHierarchicalChunks(posts) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log('🔨 GENERATING HIERARCHICAL CHUNKS');
  console.log(`${'═'.repeat(80)}\n`);
  console.log(`📊 Total posts to process: ${posts.length}`);
  
  const startTime = Date.now();
  
  try {
    // Generate all levels
    const level1 = createLevel1Chunks(posts, posts);
    const level2 = createLevel2Chunks(posts, posts);
    const level3 = createLevel3Chunks(posts, posts);
    const level4 = createLevel4Chunks(posts, posts);
    const level5 = createLevel5Chunks(posts, posts);
    const level6 = createLevel6Chunks(posts, posts);
    
    // Combine all chunks
    const allChunks = [
      ...level1,
      ...level2,
      ...level3,
      ...level4,
      ...level5,
      ...level6
    ];
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n${'═'.repeat(80)}`);
    console.log('✅ CHUNKING COMPLETE');
    console.log(`${'═'.repeat(80)}`);
    console.log(`📦 Total chunks created: ${allChunks.length}`);
    console.log(`⏱️  Processing time: ${duration}s`);
    console.log(`📊 Breakdown:`);
    console.log(`   - Level 1 (Posts): ${level1.length}`);
    console.log(`   - Level 2 (Daily): ${level2.length}`);
    console.log(`   - Level 3 (Monthly): ${level3.length}`);
    console.log(`   - Level 4 (Platform): ${level4.length}`);
    console.log(`   - Level 5 (Cross-Platform): ${level5.length}`);
    console.log(`   - Level 6 (Strategic): ${level6.length}`);
    console.log(`${'═'.repeat(80)}\n`);
    
    return allChunks;
  } catch (error) {
    console.error('❌ Error generating chunks:', error);
    throw error;
  }
}

export default {
  generateHierarchicalChunks,
  createLevel1Chunks,
  createLevel2Chunks,
  createLevel3Chunks,
  createLevel4Chunks,
  createLevel5Chunks,
  createLevel6Chunks
};
