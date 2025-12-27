// ═══════════════════════════════════════════════════════════════════════════
// VECTOR STORE - RAG SYSTEM FOR SOCIAL MEDIA DATA
// ═══════════════════════════════════════════════════════════════════════════

import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from 'langchain/document';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let vectorStore = null;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOAD CSV DATA - NOW LOADS ALL CSV FILES FROM DATA FOLDER
 * ═══════════════════════════════════════════════════════════════════════════
 */
async function loadCampaignData() {
  console.log('📊 Loading campaign data from CSV files...');
  
  try {
    const dataDir = path.join(__dirname, '../data');
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.csv'));
    
    console.log(`📁 Found ${files.length} CSV files:`, files);
    
    let allRecords = [];
    
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      // Add source file info to each record
      const recordsWithSource = records.map(record => ({
        ...record,
        source_file: file
      }));
      
      allRecords = allRecords.concat(recordsWithSource);
      console.log(`  ✅ Loaded ${records.length} records from ${file}`);
    }
    
    console.log(`✅ Total loaded: ${allRecords.length} posts from all CSV files`);
    
    return allRecords;
    
  } catch (error) {
    console.error('❌ Error loading CSV files:', error);
    console.log('⚠️  Using sample data instead');
    
    // Fallback to sample data
    return [
      {
        post_id: 'SAMPLE_001',
        platform: 'Twitter',
        campaign_type: 'organic',
        content: 'Sample post about sustainable fashion',
        posted_date: '2025-01-01',
        impressions: '1000',
        reach: '800',
        engagement_rate: '5.2%',
        source_file: 'sample_data'
      },
      {
        post_id: 'SAMPLE_002',
        platform: 'Instagram',
        campaign_type: 'organic',
        content: 'New sustainable collection launch!',
        posted_date: '2025-01-02',
        impressions: '1500',
        reach: '1200',
        engagement_rate: '6.8%',
        source_file: 'sample_data'
      },
      {
        post_id: 'SAMPLE_003',
        platform: 'Facebook',
        campaign_type: 'organic',
        content: 'Check out our eco-friendly products',
        posted_date: '2025-01-03',
        impressions: '2000',
        reach: '1600',
        engagement_rate: '4.5%',
        source_file: 'sample_data'
      }
    ];
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CREATE HIERARCHICAL CHUNKS
 * ═══════════════════════════════════════════════════════════════════════════
 */
function createHierarchicalChunks(records) {
  console.log('\n🔄 GENERATING HIERARCHICAL CHUNKS');
  console.log('═'.repeat(60));
  
  const documents = [];
  
  console.log(`📊 Total posts to process: ${records.length}`);
  
  // Level 1: Individual posts (most granular)
  console.log('\n📝 Creating Level 1 chunks (individual posts): ' + records.length + ' posts');
  records.forEach(record => {
    const content = `
Platform: ${record.platform || 'Unknown'}
Campaign Type: ${record.campaign_type || record.post_type || 'Unknown'}
Content: ${record.content || 'No content'}
Media Type: ${record.media_type || 'text'}
Posted: ${record.posted_date || 'Unknown'} ${record.posted_time || ''}
Metrics:
- Impressions: ${record.impressions || '0'}
- Reach: ${record.reach || '0'}
- Likes: ${record.likes || '0'}
- Comments: ${record.comments || '0'}
- Shares: ${record.shares || '0'}
- Saves: ${record.saves || '0'}
- Engagement Rate: ${record.engagement_rate || 'N/A'}
Source: ${record.source_file || 'Unknown'}
    `.trim();
    
    documents.push(new Document({
      pageContent: content,
      metadata: {
        type: 'post',
        level: 1,
        post_id: record.post_id || 'unknown',
        platform: record.platform || 'unknown',
        campaign_type: record.campaign_type || record.post_type || 'unknown',
        date: record.posted_date || 'unknown',
        source_file: record.source_file || 'unknown'
      }
    }));
  });
  console.log(`✅ Created ${records.length} Level 1 chunks`);
  
  // Level 2: Daily summaries grouped by platform
  console.log('\n📅 Creating Level 2 chunks (daily summaries)...');
  const dailyGroups = {};
  records.forEach(record => {
    const date = record.posted_date || 'unknown';
    const platform = record.platform || 'unknown';
    const key = `${date}_${platform}`;
    if (!dailyGroups[key]) {
      dailyGroups[key] = [];
    }
    dailyGroups[key].push(record);
  });
  
  Object.entries(dailyGroups).forEach(([key, posts]) => {
    const [date, platform] = key.split('_');
    const totalImpressions = posts.reduce((sum, p) => sum + parseInt(p.impressions || 0), 0);
    const totalReach = posts.reduce((sum, p) => sum + parseInt(p.reach || 0), 0);
    const totalEngagement = posts.reduce((sum, p) => {
      const likes = parseInt(p.likes || 0);
      const comments = parseInt(p.comments || 0);
      const shares = parseInt(p.shares || 0);
      return sum + likes + comments + shares;
    }, 0);
    
    const content = `
Daily Summary for ${platform} on ${date}:
- Total Posts: ${posts.length}
- Total Impressions: ${totalImpressions}
- Total Reach: ${totalReach}
- Total Engagement: ${totalEngagement}
- Post Types: ${[...new Set(posts.map(p => p.campaign_type || p.post_type))].join(', ')}
    `.trim();
    
    documents.push(new Document({
      pageContent: content,
      metadata: {
        type: 'daily_summary',
        level: 2,
        date,
        platform,
        post_count: posts.length
      }
    }));
  });
  console.log(`✅ Created ${Object.keys(dailyGroups).length} Level 2 chunks`);
  
  // Level 3: Monthly summaries by platform
  console.log('\n📆 Creating Level 3 chunks (monthly summaries)...');
  const monthlyGroups = {};
  records.forEach(record => {
    const date = record.posted_date || 'unknown';
    const platform = record.platform || 'unknown';
    const yearMonth = date.substring(0, 7); // Get YYYY-MM
    const key = `${yearMonth}_${platform}`;
    if (!monthlyGroups[key]) {
      monthlyGroups[key] = [];
    }
    monthlyGroups[key].push(record);
  });
  
  Object.entries(monthlyGroups).forEach(([key, posts]) => {
    const [yearMonth, platform] = key.split('_');
    const totalImpressions = posts.reduce((sum, p) => sum + parseInt(p.impressions || 0), 0);
    const totalReach = posts.reduce((sum, p) => sum + parseInt(p.reach || 0), 0);
    const avgEngagementRate = posts.reduce((sum, p) => {
      const rate = parseFloat(p.engagement_rate || 0);
      return sum + rate;
    }, 0) / posts.length;
    
    const content = `
Monthly Summary for ${platform} in ${yearMonth}:
- Total Posts: ${posts.length}
- Total Impressions: ${totalImpressions}
- Total Reach: ${totalReach}
- Average Engagement Rate: ${avgEngagementRate.toFixed(2)}%
- Campaign Types: ${[...new Set(posts.map(p => p.campaign_type || p.post_type))].join(', ')}
    `.trim();
    
    documents.push(new Document({
      pageContent: content,
      metadata: {
        type: 'monthly_summary',
        level: 3,
        year_month: yearMonth,
        platform,
        post_count: posts.length
      }
    }));
  });
  console.log(`✅ Created ${Object.keys(monthlyGroups).length} Level 3 chunks`);
  
  // Level 4: Platform overviews
  console.log('\n🌐 Creating Level 4 chunks (platform overviews)...');
  const platformGroups = {};
  records.forEach(record => {
    const platform = record.platform || 'unknown';
    if (!platformGroups[platform]) {
      platformGroups[platform] = [];
    }
    platformGroups[platform].push(record);
  });
  
  Object.entries(platformGroups).forEach(([platform, posts]) => {
    const totalImpressions = posts.reduce((sum, p) => sum + parseInt(p.impressions || 0), 0);
    const totalReach = posts.reduce((sum, p) => sum + parseInt(p.reach || 0), 0);
    const avgEngagementRate = posts.reduce((sum, p) => {
      const rate = parseFloat(p.engagement_rate || 0);
      return sum + rate;
    }, 0) / posts.length;
    
    const content = `
Platform Overview for ${platform}:
- Total Posts: ${posts.length}
- Total Impressions: ${totalImpressions}
- Total Reach: ${totalReach}
- Average Engagement Rate: ${avgEngagementRate.toFixed(2)}%
- Campaign Types: ${[...new Set(posts.map(p => p.campaign_type || p.post_type))].join(', ')}
- Date Range: ${posts[0].posted_date} to ${posts[posts.length - 1].posted_date}
    `.trim();
    
    documents.push(new Document({
      pageContent: content,
      metadata: {
        type: 'platform_overview',
        level: 4,
        platform,
        post_count: posts.length
      }
    }));
  });
  console.log(`✅ Created ${Object.keys(platformGroups).length} Level 4 chunks`);
  
  // Level 5: Cross-platform comparisons
  console.log('\n🔀 Creating Level 5 chunks (cross-platform comparisons)...');
  const platformStats = Object.entries(platformGroups).map(([platform, posts]) => {
    const totalImpressions = posts.reduce((sum, p) => sum + parseInt(p.impressions || 0), 0);
    const totalReach = posts.reduce((sum, p) => sum + parseInt(p.reach || 0), 0);
    const avgEngagementRate = posts.reduce((sum, p) => {
      const rate = parseFloat(p.engagement_rate || 0);
      return sum + rate;
    }, 0) / posts.length;
    
    return {
      platform,
      postCount: posts.length,
      totalImpressions,
      totalReach,
      avgEngagementRate
    };
  });
  
  const content = `
Cross-Platform Performance Comparison:
${platformStats.map(stat => `
${stat.platform}:
  - Posts: ${stat.postCount}
  - Impressions: ${stat.totalImpressions}
  - Reach: ${stat.totalReach}
  - Avg Engagement: ${stat.avgEngagementRate.toFixed(2)}%
`).join('\n')}

Best Performing Platform (by engagement): ${platformStats.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)[0].platform}
Most Active Platform (by posts): ${platformStats.sort((a, b) => b.postCount - a.postCount)[0].platform}
  `.trim();
  
  documents.push(new Document({
    pageContent: content,
    metadata: {
      type: 'cross_platform_comparison',
      level: 5,
      platforms: platformStats.map(s => s.platform)
    }
  }));
  console.log(`✅ Created 1 Level 5 chunk`);
  
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ TOTAL CHUNKS CREATED: ${documents.length}`);
  console.log('═'.repeat(60) + '\n');
  
  return documents;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INITIALIZE VECTOR STORE
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function initializeVectorStore() {
  try {
    const records = await loadCampaignData();
    const documents = createHierarchicalChunks(records);
    
    console.log('🔧 Creating embeddings...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('💾 Building vector store...');
    vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);
    
    console.log('✅ Vector store initialized successfully!\n');
    return vectorStore;
    
  } catch (error) {
    console.error('❌ Failed to initialize vector store:', error);
    throw error;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEARCH VECTOR STORE
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function searchVectorStore(query, k = 5) {
  if (!vectorStore) {
    throw new Error('Vector store not initialized');
  }
  
  return await vectorStore.similaritySearch(query, k);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SMART RETRIEVAL - HIERARCHICAL SEARCH
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function smartRetrieval(query, k = 10) {
  if (!vectorStore) {
    throw new Error('Vector store not initialized');
  }
  
  console.log(`🔍 Smart retrieval for: "${query}"`);
  
  // Search with higher k to get diverse results across levels
  const results = await vectorStore.similaritySearch(query, k);
  
  // Group by level
  const byLevel = {
    1: [], // individual posts
    2: [], // daily summaries
    3: [], // monthly summaries
    4: [], // platform overviews
    5: []  // cross-platform comparisons
  };
  
  results.forEach(doc => {
    const level = doc.metadata.level || 1;
    if (byLevel[level]) {
      byLevel[level].push(doc);
    }
  });
  
  // Prioritize: get mix of granular posts and higher-level summaries
  const selected = [
    ...byLevel[5].slice(0, 1),  // 1 cross-platform comparison if available
    ...byLevel[4].slice(0, 2),  // 2 platform overviews
    ...byLevel[3].slice(0, 2),  // 2 monthly summaries
    ...byLevel[2].slice(0, 2),  // 2 daily summaries
    ...byLevel[1].slice(0, 3)   // 3 individual posts
  ];
  
  console.log(`✅ Retrieved ${selected.length} documents across ${Object.keys(byLevel).filter(k => byLevel[k].length > 0).length} hierarchy levels`);
  
  return selected;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GET VECTOR STORE
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function getVectorStore() {
  return vectorStore;
}