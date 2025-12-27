// ═══════════════════════════════════════════════════════════════════════════
// LANGCHAIN CHAINS - RAG ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════
// ✏️ CUSTOMIZE THIS FILE to change:
//    - How queries are processed
//    - Response formatting
//    - Additional processing steps
// ═══════════════════════════════════════════════════════════════════════════

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { smartRetrieval } from './vectorStore.js';
import { LANGCHAIN_CONFIG } from './config.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INITIALIZE LLM (Lazy)
 * ═══════════════════════════════════════════════════════════════════════════
 */
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
 * RAG PROMPT TEMPLATE
 * ═══════════════════════════════════════════════════════════════════════════
 * ✏️ CUSTOMIZE: Change how context and queries are formatted
 */
const RAG_PROMPT_TEMPLATE = `${LANGCHAIN_CONFIG.systemPrompt}

CONTEXT FROM SOCIAL MEDIA DATA:
{context}

USER QUESTION:
{question}

INSTRUCTIONS:
1. Analyze the context carefully to find relevant data
2. If this is a factual query (e.g., "most liked post"), provide a direct, specific answer with exact numbers
3. If this is an analytical query (e.g., "which platform is best"), provide comprehensive analysis with data evidence
4. Always cite specific metrics from the context
5. Format numbers for readability (e.g., 7,161 not 7161)
6. Use clear section headers for longer responses
7. Be confident but honest - if data is missing, say so

RESPONSE:`;

const promptTemplate = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FORMAT CONTEXT
 * ═══════════════════════════════════════════════════════════════════════════
 * Format retrieved documents into context string
 */
function formatContext(documents) {
  if (!documents || documents.length === 0) {
    return 'No relevant data found in the database.';
  }

  // Group by chunk level for organized context
  const byLevel = {};
  documents.forEach(doc => {
    const level = doc.metadata?.chunk_level || 'unknown';
    if (!byLevel[level]) {
      byLevel[level] = [];
    }
    byLevel[level].push(doc);
  });

  let context = '';

  // Add context by level (most specific first)
  const levels = Object.keys(byLevel).sort((a, b) => a - b);

  levels.forEach(level => {
    const levelName = getLevelName(parseInt(level));
    context += `\n${'─'.repeat(60)}\n`;
    context += `${levelName.toUpperCase()}\n`;
    context += `${'─'.repeat(60)}\n\n`;

    byLevel[level].forEach((doc, i) => {
      context += `[Document ${i + 1}]\n`;
      context += doc.pageContent;
      context += '\n\n';
    });
  });

  return context;
}

/**
 * Get human-readable level name
 */
function getLevelName(level) {
  const names = {
    1: 'Individual Posts',
    2: 'Daily Summaries',
    3: 'Monthly Summaries',
    4: 'Platform Overviews',
    5: 'Cross-Platform Comparisons',
    6: 'Strategic Insights'
  };
  return names[level] || `Level ${level}`;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CREATE RAG CHAIN
 * ═══════════════════════════════════════════════════════════════════════════
 * Main chain that orchestrates retrieval and generation
 */
export async function createRAGChain() {
  // Create chain: Retrieval → Format → LLM → Parse
  const chain = RunnableSequence.from([
    {
      context: async (input) => {
        console.log('\n🔍 Step 1: Retrieving relevant documents...');
        const docs = await smartRetrieval(input.question, {
          topK: LANGCHAIN_CONFIG.retrieval.topK
        });
        const formattedContext = formatContext(docs);
        console.log(`✅ Retrieved and formatted ${docs.length} documents`);
        return formattedContext;
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
 * PROCESS QUERY
 * ═══════════════════════════════════════════════════════════════════════════
 * Main entry point for processing user queries
 */
export async function processQuery(query) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log('🤖 PROCESSING QUERY');
  console.log(`${'═'.repeat(80)}`);
  console.log(`📝 Query: "${query}"`);

  const startTime = Date.now();

  try {
    // Create and invoke chain
    console.log('\n⚙️  Building RAG chain...');
    const chain = await createRAGChain();

    console.log('🚀 Invoking chain...');
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
      timestamp: new Date().toISOString()
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIMPLE QA CHAIN (without retrieval)
 * ═══════════════════════════════════════════════════════════════════════════
 * For general questions that don't need data retrieval
 */
export async function simpleQAChain(question) {
  const simplePrompt = PromptTemplate.fromTemplate(`
You are a helpful social media marketing assistant.

Question: {question}

Answer:
  `);

  const chain = RunnableSequence.from([
    simplePrompt,
    getLLM(),
    new StringOutputParser()
  ]);

  return await chain.invoke({ question });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BATCH PROCESS QUERIES
 * ═══════════════════════════════════════════════════════════════════════════
 * Process multiple queries efficiently
 */
export async function batchProcessQueries(queries) {
  console.log(`\n📦 Processing ${queries.length} queries in batch...`);

  const results = [];

  for (let i = 0; i < queries.length; i++) {
    console.log(`\n[${i + 1}/${queries.length}] Processing: "${queries[i]}"`);
    const result = await processQuery(queries[i]);
    results.push(result);
  }

  console.log(`\n✅ Batch processing complete: ${results.filter(r => r.success).length}/${queries.length} successful`);

  return results;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STREAMING RESPONSE (for real-time UI updates)
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function streamQuery(query, onToken) {
  console.log(`\n🌊 Streaming query: "${query}"`);

  try {
    // Retrieve context
    const docs = await smartRetrieval(query);
    const context = formatContext(docs);

    // Create streaming LLM
    const streamingLLM = new ChatOpenAI({
      modelName: LANGCHAIN_CONFIG.llm.modelName,
      temperature: LANGCHAIN_CONFIG.llm.temperature,
      streaming: true,
      callbacks: [
        {
          handleLLMNewToken(token) {
            if (onToken) {
              onToken(token);
            }
          }
        }
      ]
    });

    // Create and invoke chain
    const prompt = await promptTemplate.format({ context, question: query });
    const response = await streamingLLM.invoke(prompt);

    return response.content;
  } catch (error) {
    console.error('❌ Streaming error:', error);
    throw error;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUERY CLASSIFICATION
 * ═══════════════════════════════════════════════════════════════════════════
 * Determine if query needs RAG or can be answered directly
 */
export function classifyQuery(query) {
  const lowerQuery = query.toLowerCase();

  // Patterns that need data retrieval
  const needsRAG = [
    /\b(post|content|campaign)\b/,
    /\b(performance|metrics|engagement|reach|likes)\b/,
    /\b(platform|instagram|linkedin|facebook|twitter)\b/,
    /\b(month|week|day|date|time)\b/,
    /\b(best|worst|top|highest|lowest)\b/,
    /\b(compare|comparison|vs|versus)\b/,
    /\b(trend|pattern|over time)\b/,
    /\b(recommend|suggest|strategy|improve)\b/
  ];

  const requiresData = needsRAG.some(pattern => pattern.test(lowerQuery));

  return {
    requiresData,
    queryType: requiresData ? 'data_query' : 'general_query',
    suggestedChain: requiresData ? 'RAG' : 'Simple QA'
  };
}

export default {
  createRAGChain,
  processQuery,
  simpleQAChain,
  batchProcessQueries,
  streamQuery,
  classifyQuery
};
