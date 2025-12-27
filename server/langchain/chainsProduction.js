// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION LANGCHAIN CHAINS - WITH INTEGRATED ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { smartRetrieval } from './vectorStore.js';
import { LANGCHAIN_CONFIG } from './config.js';
import { generateDecisionReport, scorePlatforms, analyzeContentTypes } from '../utils/decisionEngine.js';
import { tTest, validateSampleSize, analyzeTrend } from '../utils/statistics.js';
import { groupBy, crossDimensional, platformContentMatrix } from '../utils/aggregation.js';

// Lazy initialization of LLM to ensure env vars are loaded
let llm = null;
function getLLM() {
  if (!llm) {
    llm = new ChatOpenAI({
      modelName: LANGCHAIN_CONFIG.llm.modelName,
      temperature: LANGCHAIN_CONFIG.llm.temperature,
      maxTokens: LANGCHAIN_CONFIG.llm.maxTokens,
    });
  }
  return llm;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENHANCED RAG PROMPT WITH ANALYTICS
 * ═══════════════════════════════════════════════════════════════════════════
 */
const ENHANCED_PROMPT_TEMPLATE = `${LANGCHAIN_CONFIG.systemPrompt}

ANALYTICAL CONTEXT:
{analytics}

RAW DATA CONTEXT:
{context}

USER QUESTION:
{question}

RESPONSE INSTRUCTIONS:
1. Use the ANALYTICAL CONTEXT first - it contains pre-computed statistics, rankings, and confidence scores
2. Reference specific numbers from the analytics (confidence levels, p-values, effect sizes)
3. For comparisons, cite the statistical significance from the analytics
4. For rankings, use the decision scores provided
5. Always mention confidence levels when making strong claims
6. If confidence is <70%, acknowledge uncertainty
7. Format numbers for readability

CRITICAL: Base your response on the ANALYTICAL CONTEXT which contains rigorous statistical analysis, not just raw data.

RESPONSE:`;

const promptTemplate = PromptTemplate.fromTemplate(ENHANCED_PROMPT_TEMPLATE);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOAD AND PARSE POSTS FROM VECTOR STORE - UPDATED TO LOAD ALL CSV FILES
 * ═══════════════════════════════════════════════════════════════════════════
 */
let cachedPosts = null;

async function loadAllPosts(vectorStore) {
  if (cachedPosts) return cachedPosts;

  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { parse } = await import('csv-parse/sync');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataDir = path.join(__dirname, '../data');

    // Load all CSV files
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.csv'));
    console.log(`📁 Loading ${files.length} CSV files for analytics...`);

    let allPosts = [];

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const csvContent = fs.readFileSync(filePath, 'utf-8');

      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      // Add source file info
      const recordsWithSource = records.map(record => ({
        ...record,
        source_file: file
      }));

      allPosts = allPosts.concat(recordsWithSource);
      console.log(`  ✅ Loaded ${records.length} posts from ${file}`);
    }

    console.log(`✅ Total posts loaded for analytics: ${allPosts.length}`);
    cachedPosts = allPosts;
    return allPosts;

  } catch (error) {
    console.error('Error loading posts:', error);
    return [];
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GENERATE ANALYTICS CONTEXT
 * ═══════════════════════════════════════════════════════════════════════════
 */
async function generateAnalytics(query, posts) {
  const lowerQuery = query.toLowerCase();
  let analytics = '';

  console.log(`\n📊 Generating analytics for query type...`);

  // Platform comparison queries
  if (/platform|compare|vs|versus|better|worse|best|worst/i.test(query)) {
    console.log('🎯 Query type: Platform Comparison');
    const decisionReport = generateDecisionReport(posts);
    const platformScores = scorePlatforms(posts);

    analytics += `\n=== PLATFORM RANKING (DECISION ENGINE) ===\n`;
    platformScores.rankings.forEach((platform, idx) => {
      analytics += `\n${idx + 1}. ${platform.platform.toUpperCase()}:\n`;
      analytics += `   - Overall Score: ${platform.score}/100\n`;
      analytics += `   - Rank: #${platform.rank} of ${platformScores.total_platforms}\n`;
      analytics += `   - Confidence: ${platform.confidence.level} (${platform.confidence.percentage}%)\n`;
      analytics += `   - Sample Size: ${platform.metrics.post_count} posts\n`;
      analytics += `   - Avg Engagement Rate: ${platform.metrics.avg_engagement_rate}%\n`;
      analytics += `   - Trend: ${platform.metrics.trend}% ${platform.breakdown.trend_direction.interpretation}\n`;
      analytics += `   - Engagement per Post: ${platform.metrics.engagement_per_post}\n`;
      if (idx > 0) {
        analytics += `   - Gap to Leader: ${platform.gap_to_leader} points\n`;
      }
      if (platform.confidence.warning) {
        analytics += `   ⚠️  ${platform.confidence.warning}\n`;
      }
    });

    // Statistical comparison between best and worst
    if (platformScores.rankings.length >= 2) {
      const best = platformScores.rankings[0];
      const worst = platformScores.rankings[platformScores.rankings.length - 1];

      const bestPosts = posts.filter(p => p.platform.toLowerCase() === best.platform);
      const worstPosts = posts.filter(p => p.platform.toLowerCase() === worst.platform);

      const bestRates = bestPosts.map(p => parseFloat(p.engagement_rate) || 0);
      const worstRates = worstPosts.map(p => parseFloat(p.engagement_rate) || 0);

      if (bestRates.length >= 3 && worstRates.length >= 3) {
        const tTestResult = tTest(bestRates, worstRates);

        analytics += `\n=== STATISTICAL SIGNIFICANCE ===\n`;
        analytics += `Comparison: ${best.platform} vs ${worst.platform}\n`;
        analytics += `- T-statistic: ${tTestResult.tStatistic}\n`;
        analytics += `- P-value: ${tTestResult.pValue}\n`;
        analytics += `- Statistically Significant: ${tTestResult.significant ? 'YES' : 'NO'}\n`;
        analytics += `- Confidence Level: ${tTestResult.confidenceLevel}%\n`;
        analytics += `- Effect Size: ${tTestResult.effectSize.interpretation} (Cohen's d = ${tTestResult.effectSize.value})\n`;
        analytics += `- Conclusion: ${tTestResult.conclusion}\n`;
      }
    }

    // Key recommendations
    analytics += `\n=== KEY RECOMMENDATIONS ===\n`;
    decisionReport.key_recommendations.slice(0, 3).forEach((rec, idx) => {
      analytics += `\n${idx + 1}. [${rec.priority.toUpperCase()}] ${rec.action}\n`;
      analytics += `   - Rationale: ${rec.rationale}\n`;
      analytics += `   - Expected Impact: ${rec.expected_impact}\n`;
      analytics += `   - Confidence: ${rec.confidence}%\n`;
    });
  }

  // Content type analysis
  if (/content|post type|media type|image|video|carousel|format/i.test(query)) {
    console.log('🎯 Query type: Content Analysis');
    const contentAnalysis = analyzeContentTypes(posts);

    analytics += `\n=== CONTENT TYPE PERFORMANCE MATRIX ===\n`;
    Object.entries(contentAnalysis).forEach(([platform, analysis]) => {
      analytics += `\n${platform.toUpperCase()}:\n`;
      analysis.types.forEach((type, idx) => {
        analytics += `  ${idx + 1}. ${type.type}: ${type.avg_engagement_rate}% avg ER\n`;
        analytics += `     - Posts: ${type.post_count}\n`;
        analytics += `     - Range: ${type.min}% - ${type.max}%\n`;
        analytics += `     - Confidence: ${type.confidence}% (${type.reliability})\n`;
        if (type.statistically_better) {
          analytics += `     - ✓ Statistically superior (${type.confidence_level}% confidence, p=${type.p_value})\n`;
        }
      });

      if (analysis.recommendation) {
        analytics += `  📊 Recommendation: ${analysis.recommendation.action}\n`;
        analytics += `     Expected improvement: ${analysis.recommendation.expected_improvement}\n`;
      }
    });

    // Cross-platform content matrix
    const matrix = platformContentMatrix(posts);
    analytics += `\n=== CROSS-PLATFORM CONTENT MATRIX ===\n`;
    analytics += `Platforms: ${matrix.rows.join(', ')}\n`;
    analytics += `Content Types: ${matrix.cols.join(', ')}\n`;
    matrix.rows.forEach(platform => {
      analytics += `\n${platform}:\n`;
      matrix.cols.forEach(type => {
        analytics += `  ${type}: ${matrix.matrix[platform][type]}%\n`;
      });
    });
  }

  // Specific post queries (most liked, best performing, etc.)
  if (/most|highest|top|best|worst|lowest/i.test(query)) {
    console.log('🎯 Query type: Specific Post Analysis');

    // Check if this is a COMPARATIVE query (asking if same post has two different top metrics)
    const isComparativeQuery = /same|same as|same post/i.test(query) &&
                               (query.match(/most|highest|top|best/gi) || []).length >= 2;

    // Declare metrics variable in outer scope to avoid reference errors
    let metrics = [];

    if (isComparativeQuery) {
      console.log('🔄 Detected comparative query: checking if same post tops multiple metrics');

      // Extract platform if mentioned
      let platform = null;
      if (/instagram/i.test(query)) platform = 'instagram';
      if (/linkedin/i.test(query)) platform = 'linkedin';
      if (/facebook/i.test(query)) platform = 'facebook';
      if (/twitter/i.test(query)) platform = 'twitter';

      let filteredPosts = platform ?
        posts.filter(p => p.platform.toLowerCase() === platform) :
        posts;

      // Extract all metrics mentioned in the query
      if (/\blike[ds]?\b/i.test(query)) metrics.push('likes');
      if (/engage(?:ment)?(?:\s+rate)?/i.test(query)) metrics.push('engagement_rate');
      if (/reach/i.test(query)) metrics.push('reach');
      if (/comment[s]?/i.test(query)) metrics.push('comments');
      if (/share[ds]?/i.test(query)) metrics.push('shares');
      if (/save[ds]?/i.test(query)) metrics.push('saves');

      // Need at least 2 metrics for comparison
      if (metrics.length >= 2) {
        analytics += `\n=== COMPARATIVE POST ANALYSIS ===\n`;
        analytics += `Question: Are the same posts ranking #1 across different metrics?\n`;
        analytics += `Platform Filter: ${platform ? platform.toUpperCase() : 'ALL PLATFORMS'}\n`;
        analytics += `Total Posts Analyzed: ${filteredPosts.length}\n\n`;

        const topPosts = {};

        // Find top post for each metric
        metrics.forEach(metric => {
          const sorted = [...filteredPosts].sort((a, b) => {
            const aVal = parseFloat(a[metric]) || 0;
            const bVal = parseFloat(b[metric]) || 0;
            return bVal - aVal;
          });
          topPosts[metric] = sorted[0];
        });

        // Display top post for each metric
        analytics += `Top Posts by Metric:\n`;
        metrics.forEach(metric => {
          const post = topPosts[metric];
          if (post) {
            analytics += `\n📊 Highest ${metric.toUpperCase().replace('_', ' ')}:\n`;
            analytics += `   - Post ID: ${post.post_id}\n`;
            analytics += `   - ${metric}: ${post[metric]}\n`;
            analytics += `   - Engagement Rate: ${post.engagement_rate}%\n`;
            analytics += `   - Platform: ${post.platform}\n`;
            analytics += `   - Posted: ${post.posted_date}\n`;
            analytics += `   - Content: ${post.content?.substring(0, 80)}...\n`;
          }
        });

        // Check if they're the same post
        const postIds = metrics.map(m => topPosts[m]?.post_id);
        const allSame = postIds.every(id => id === postIds[0]);

        analytics += `\n=== COMPARISON RESULT ===\n`;
        if (allSame) {
          analytics += `✅ YES - The same post (${postIds[0]}) ranks #1 for ALL metrics:\n`;
          metrics.forEach(m => analytics += `   - ${m}: ${topPosts[m][m]}\n`);
        } else {
          analytics += `❌ NO - Different posts rank #1 for each metric:\n`;
          const uniquePosts = {};
          metrics.forEach(m => {
            const postId = topPosts[m].post_id;
            if (!uniquePosts[postId]) {
              uniquePosts[postId] = [];
            }
            uniquePosts[postId].push(m);
          });
          Object.entries(uniquePosts).forEach(([postId, metricsList]) => {
            analytics += `\n   Post ${postId} tops: ${metricsList.join(', ')}\n`;
            const post = topPosts[metricsList[0]];
            metricsList.forEach(m => {
              analytics += `     - ${m}: ${post[m]}\n`;
            });
          });
        }

        const sampleValidation = validateSampleSize(filteredPosts.length, 'general');
        analytics += `\nConfidence: ${sampleValidation.confidence}% (${sampleValidation.reliability})\n`;
        if (sampleValidation.warning) {
          analytics += `⚠️  ${sampleValidation.warning}\n`;
        }
      } else {
        // Fall back to single metric analysis
        console.log('⚠️  Could not extract multiple metrics for comparison, falling back to single metric');
      }
    }

    // Single metric query (original logic)
    if (!isComparativeQuery || metrics?.length < 2) {
      // Extract what metric they're asking about
      let metric = 'likes';
      if (/engage/i.test(query)) metric = 'engagement_rate';
      if (/reach/i.test(query)) metric = 'reach';
      if (/comment/i.test(query)) metric = 'comments';
      if (/share/i.test(query)) metric = 'shares';
      if (/save/i.test(query)) metric = 'saves';

      // Extract platform if mentioned
      let platform = null;
      if (/instagram/i.test(query)) platform = 'instagram';
      if (/linkedin/i.test(query)) platform = 'linkedin';
      if (/facebook/i.test(query)) platform = 'facebook';
      if (/twitter/i.test(query)) platform = 'twitter';

      let filteredPosts = platform ?
        posts.filter(p => p.platform.toLowerCase() === platform) :
        posts;

      // Sort by metric
      const sortedPosts = [...filteredPosts].sort((a, b) => {
        const aVal = parseFloat(a[metric]) || 0;
        const bVal = parseFloat(b[metric]) || 0;
        return /worst|lowest/i.test(query) ? aVal - bVal : bVal - aVal;
      });

      const topPost = sortedPosts[0];
      const sampleValidation = validateSampleSize(filteredPosts.length, 'general');

      if (topPost) {
        analytics += `\n=== ${/worst|lowest/i.test(query) ? 'WORST' : 'BEST'} PERFORMING POST ===\n`;
        analytics += `Post ID: ${topPost.post_id}\n`;
        analytics += `Platform: ${topPost.platform}\n`;
        analytics += `${metric}: ${topPost[metric]}\n`;
        analytics += `Engagement Rate: ${topPost.engagement_rate}%\n`;
        analytics += `Posted: ${topPost.posted_date} ${topPost.posted_time || ''}\n`;
        analytics += `Content: ${topPost.content?.substring(0, 100)}...\n`;
        analytics += `\nSample Context:\n`;
        analytics += `- Total posts analyzed: ${filteredPosts.length}\n`;
        analytics += `- Confidence: ${sampleValidation.confidence}%\n`;
        analytics += `- Reliability: ${sampleValidation.reliability}\n`;
        if (sampleValidation.warning) {
          analytics += `- ⚠️  ${sampleValidation.warning}\n`;
        }
      }
    }
  }

  // Counting and filtering queries (how many, count, list all, etc.)
  if (/how many|count|total number|number of|list all|show all|all the/i.test(query)) {
    console.log('🎯 Query type: Counting/Filtering Query');

    // Detect what entity they're asking about
    let entityType = null;
    let filterField = null;
    let filterValue = null;

    // Detect entity type
    if (/campaign[s]?/i.test(query)) {
      entityType = 'campaigns';
      // Check if it's about ads campaigns specifically
      if (/google ads|google ad/i.test(query)) {
        filterField = 'platform';
        filterValue = 'Google Ads';
      } else if (/instagram ads|instagram ad/i.test(query)) {
        filterField = 'platform';
        filterValue = 'Instagram Ads';
      } else if (/facebook ads|facebook ad/i.test(query)) {
        filterField = 'platform';
        filterValue = 'Facebook Ads';
      }
    } else if (/post[s]?/i.test(query)) {
      entityType = 'posts';
    }

    // Detect campaign_type filter
    if (/brand awareness/i.test(query)) {
      filterField = 'campaign_type';
      filterValue = 'Brand Awareness';
    } else if (/product launch/i.test(query)) {
      filterField = 'campaign_type';
      filterValue = 'Product Launch';
    } else if (/flash sale/i.test(query)) {
      filterField = 'campaign_type';
      filterValue = 'Flash Sale';
    } else if (/festive campaign/i.test(query)) {
      filterField = 'campaign_type';
      filterValue = 'Festive Campaign';
    } else if (/influencer collaboration/i.test(query)) {
      filterField = 'campaign_type';
      filterValue = 'Influencer Collaboration';
    }

    // Detect platform filter for posts
    if (entityType === 'posts') {
      if (/instagram/i.test(query) && !/ads/i.test(query)) {
        filterField = 'platform';
        filterValue = 'Instagram';
      } else if (/linkedin/i.test(query)) {
        filterField = 'platform';
        filterValue = 'LinkedIn';
      } else if (/facebook/i.test(query) && !/ads/i.test(query)) {
        filterField = 'platform';
        filterValue = 'Facebook';
      } else if (/twitter/i.test(query)) {
        filterField = 'platform';
        filterValue = 'Twitter';
      }
    }

    if (entityType) {
      // Filter the data
      let filteredData = posts;

      // Apply platform filter if detected
      if (filterField === 'platform' && filterValue) {
        filteredData = posts.filter(p =>
          p.platform && p.platform.toLowerCase() === filterValue.toLowerCase()
        );
        console.log(`  Filtered by platform: ${filterValue} → ${filteredData.length} records`);
      }

      // Apply campaign_type filter if detected
      if (filterField === 'campaign_type' && filterValue) {
        filteredData = filteredData.filter(p =>
          p.campaign_type && p.campaign_type.toLowerCase() === filterValue.toLowerCase()
        );
        console.log(`  Filtered by campaign_type: ${filterValue} → ${filteredData.length} records`);
      }

      analytics += `\n=== COUNTING/FILTERING QUERY RESULT ===\n`;
      analytics += `Query: "${query}"\n\n`;
      analytics += `Entity Type: ${entityType}\n`;

      if (filterField && filterValue) {
        analytics += `Filter Applied: ${filterField} = "${filterValue}"\n`;
      } else {
        analytics += `Filter: None (showing all ${entityType})\n`;
      }

      analytics += `\nTotal Count: ${filteredData.length}\n\n`;

      // Show sample records if count is reasonable
      if (filteredData.length > 0 && filteredData.length <= 10) {
        analytics += `Complete List:\n`;
        filteredData.forEach((item, idx) => {
          analytics += `\n${idx + 1}. `;
          if (item.campaign_id) {
            analytics += `Campaign: ${item.campaign_id}`;
            if (item.campaign_name) analytics += ` - ${item.campaign_name}`;
            if (item.campaign_type) analytics += ` (${item.campaign_type})`;
            if (item.platform) analytics += ` on ${item.platform}`;
          } else if (item.post_id) {
            analytics += `Post: ${item.post_id}`;
            if (item.platform) analytics += ` on ${item.platform}`;
            if (item.content) analytics += ` - ${item.content.substring(0, 60)}...`;
          }
          analytics += `\n`;
        });
      } else if (filteredData.length > 10) {
        analytics += `Showing first 10 of ${filteredData.length} records:\n`;
        filteredData.slice(0, 10).forEach((item, idx) => {
          analytics += `\n${idx + 1}. `;
          if (item.campaign_id) {
            analytics += `${item.campaign_id}`;
            if (item.campaign_name) analytics += ` - ${item.campaign_name}`;
          } else if (item.post_id) {
            analytics += `${item.post_id}`;
          }
          analytics += `\n`;
        });
        analytics += `\n... and ${filteredData.length - 10} more\n`;
      }

      // Add breakdown by categories if useful
      if (filteredData.length > 0) {
        analytics += `\n=== BREAKDOWN ===\n`;

        // If filtering by platform, show breakdown by other dimensions
        if (filterField === 'platform' && filteredData[0].campaign_type) {
          const typeBreakdown = {};
          filteredData.forEach(item => {
            const type = item.campaign_type || 'Unknown';
            typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
          });
          analytics += `By Campaign Type:\n`;
          Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
            analytics += `  - ${type}: ${count}\n`;
          });
        }

        // If filtering by campaign type, show breakdown by platform
        if (filterField === 'campaign_type' && filteredData[0].platform) {
          const platformBreakdown = {};
          filteredData.forEach(item => {
            const platform = item.platform || 'Unknown';
            platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
          });
          analytics += `By Platform:\n`;
          Object.entries(platformBreakdown).sort((a, b) => b[1] - a[1]).forEach(([platform, count]) => {
            analytics += `  - ${platform}: ${count}\n`;
          });
        }
      }

      const sampleValidation = validateSampleSize(filteredData.length, 'general');
      analytics += `\nData Quality:\n`;
      analytics += `- Confidence: ${sampleValidation.confidence}%\n`;
      analytics += `- Reliability: ${sampleValidation.reliability}\n`;
      if (sampleValidation.warning) {
        analytics += `- ⚠️  ${sampleValidation.warning}\n`;
      }
    } else {
      analytics += `\n⚠️  UNABLE TO PROCESS COUNTING QUERY\n`;
      analytics += `Could not determine what entity type you're asking about.\n`;
      analytics += `Please clarify: Are you asking about campaigns, posts, or something else?\n`;
    }
  }

  // Trend analysis
  if (/trend|over time|pattern|growing|declining/i.test(query)) {
    console.log('🎯 Query type: Trend Analysis');

    // Group by month and analyze trend
    const monthlyData = groupBy(
      posts.map(p => ({ ...p, month: p.posted_date.split('-')[1] })),
      ['month'],
      {
        avg_er: { field: 'engagement_rate', function: 'avg' },
        post_count: { field: 'post_id', function: 'count' }
      }
    ).sort((a, b) => parseInt(a.month) - parseInt(b.month));

    const erValues = monthlyData.map(m => m.avg_er);
    const trendAnalysis = analyzeTrend(erValues);

    analytics += `\n=== TREND ANALYSIS ===\n`;
    analytics += `Overall Trend: ${trendAnalysis.interpretation}\n`;
    analytics += `- Direction: ${trendAnalysis.trend}\n`;
    analytics += `- Strength: ${trendAnalysis.strength}\n`;
    analytics += `- Slope: ${trendAnalysis.slopePercent}% per month\n`;
    analytics += `- R²: ${trendAnalysis.rSquared} (${trendAnalysis.significant ? 'statistically significant' : 'not significant'})\n`;

    analytics += `\nMonthly Breakdown:\n`;
    monthlyData.forEach(m => {
      analytics += `- Month ${m.month}: ${m.avg_er}% avg ER (${m.post_count} posts)\n`;
    });
  }

  console.log(`✅ Analytics generated (${analytics.length} characters)`);
  return analytics || 'No specific analytics generated for this query type.';
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FORMAT CONTEXT (keeping simple - analytics is more important now)
 * ═══════════════════════════════════════════════════════════════════════════
 */
function formatContext(documents) {
  if (!documents || documents.length === 0) {
    return 'No relevant raw data retrieved.';
  }

  let context = `Retrieved ${documents.length} relevant data chunks:\n\n`;
  documents.slice(0, 5).forEach((doc, i) => {
    context += `[Chunk ${i + 1}]\n${doc.pageContent.substring(0, 500)}...\n\n`;
  });

  return context;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRODUCTION RAG CHAIN
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function createProductionRAGChain(vectorStore) {
  const chain = RunnableSequence.from([
    {
      context: async (input) => {
        console.log('\n🔍 Step 1: Retrieving relevant documents...');
        const docs = await smartRetrieval(input.question);
        return formatContext(docs);
      },
      analytics: async (input) => {
        console.log('📊 Step 2: Generating analytics...');
        const posts = await loadAllPosts();
        return await generateAnalytics(input.question, posts);
      },
      question: (input) => input.question
    },
    promptTemplate,
    getLLM(),
    new StringOutputParser()
  ]);

  return chain;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROCESS QUERY (ENHANCED)
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function processQuery(query, vectorStore) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log('🤖 PROCESSING QUERY (PRODUCTION MODE)');
  console.log(`${'═'.repeat(80)}`);
  console.log(`📝 Query: "${query}"`);

  const startTime = Date.now();

  try {
    const chain = await createProductionRAGChain(vectorStore);

    console.log('🚀 Invoking production chain...');
    const response = await chain.invoke({ question: query });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n${'═'.repeat(80)}`);
    console.log('✅ QUERY COMPLETE');
    console.log(`${'═'.repeat(80)}`);
    console.log(`⏱️  Processing time: ${duration}s`);
    console.log(`📊 Response length: ${response.length} characters`);
    console.log(`${'═'.repeat(80)}\n`);

    return {
      success: true,
      query: query,
      response: response,
      processingTime: duration,
      timestamp: new Date().toISOString(),
      mode: 'production'
    };
  } catch (error) {
    console.error('❌ Error processing query:', error);

    return {
      success: false,
      query: query,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  createProductionRAGChain,
  processQuery
};