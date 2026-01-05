/**
 * Automated Query Testing Script
 * Tests all 45+ queries and generates a comprehensive report
 */

import fetch from 'node-fetch';
import fs from 'fs';

const SERVER_URL = 'http://localhost:3001';
const OUTPUT_FILE = 'query_test_results.json';
const REPORT_FILE = 'QUERY_TEST_REPORT.md';

// All test queries from your list
const TEST_QUERIES = [
  // Simple Ranking/Filtering
  { id: 1, query: "Which is the worst performing post type and on which platform?", category: "ranking", expected: "success" },
  { id: 2, query: "Content on which platform performed better in Q3?", category: "ranking", expected: "success" },
  { id: 3, query: "Which platform would you not recommend for social media posting and why?", category: "ranking", expected: "success" },
  { id: 4, query: "Most liked post on Instagram for the month of November?", category: "ranking", expected: "success" },
  { id: 5, query: "Highest engagement on Twitter", category: "ranking", expected: "success" },
  { id: 6, query: "Which was the best Twitter post from November?", category: "ranking", expected: "success" },

  // Ad Campaign Queries
  { id: 7, query: "Compare the total ROAS (Return on Ad Spend) across Facebook, Instagram, and Google Ads for the last quarter. Which platform is most profitable?", category: "ads", expected: "success" },
  { id: 8, query: "What is start date and end date of google ad campaign Brand Awareness - Green Living - Sep2025?", category: "ads", expected: "success" },
  { id: 9, query: "How many google ads campaigns with type Brand Awareness are there?", category: "ads", expected: "success" },
  { id: 10, query: "How many google ads with Objective as Engagement", category: "ads", expected: "success" },
  { id: 11, query: "Which ad format (Carousel, Stories, Single Image, or Collection) has the lowest Cost Per Conversion across all paid channels?", category: "ads", expected: "success" },

  // Comparison Queries
  { id: 12, query: "On Instagram, how does the average engagement rate of organic posts compare to the engagement rate of paid Stories campaigns?", category: "comparison", expected: "success" },
  { id: 13, query: "Analyze campaigns with the objective 'Traffic' vs. 'Conversions'. Which objective delivered a better 'Cost per Conversion' for the 'Sustainable Clothing' product line?", category: "comparison", expected: "success" },
  { id: 14, query: "How are my Facebook Ads performing compared to Instagram?", category: "comparison", expected: "success" },
  { id: 15, query: "Compare Instagram vs LinkedIn performance this quarter", category: "comparison", expected: "success" },

  // Exact Value Queries
  { id: 16, query: "Twitter posts with 25 shares?", category: "exact", expected: "success" },
  { id: 17, query: "Number of facebook posts with 139 comments", category: "exact", expected: "success" },

  // Time-Based Queries (Should Return Clarification)
  { id: 18, query: "Are there more engagements during the week or weekends?", category: "time", expected: "clarification" },
  { id: 19, query: "What is the best time to post image on facebook?", category: "time", expected: "clarification" },
  { id: 20, query: "Which duration in a day gets most engagement?", category: "time", expected: "clarification" },
  { id: 21, query: "When do we have the most engagement?", category: "time", expected: "clarification" },
  { id: 22, query: "Which week was best?", category: "time", expected: "clarification" },

  // Platform Queries
  { id: 23, query: "Which platform has the best ROI?", category: "platform", expected: "success" },
  { id: 24, query: "Which posts underperformed in November?", category: "platform", expected: "success" },
  { id: 25, query: "Which platform is best for revenue vs volume vs efficiency?", category: "platform", expected: "success" },

  // Sentiment Queries
  { id: 26, query: "Based on the sentiment scores, which 3 posts should I reply to first?", category: "sentiment", expected: "success" },
  { id: 27, query: "What's the sentiment of comments?", category: "sentiment", expected: "success" },
  { id: 28, query: "Give me a summary of sentiment for the Hindi/Hinglish comments on Instagram.", category: "sentiment", expected: "success" },
  { id: 29, query: "Which platform has the most negative feedback, and what are people complaining about?", category: "sentiment", expected: "clarification" },

  // Out of Scope (Should Be Rejected)
  { id: 30, query: "Show me TikTok performance", category: "out-of-scope", expected: "rejected" },
  { id: 31, query: "What's the weather like today?", category: "out-of-scope", expected: "rejected" },
  { id: 32, query: "What's the click-through rate on organic posts?", category: "out-of-scope", expected: "rejected" },

  // Complex Analytical Queries
  { id: 33, query: "Which campaigns have high spend but low return?", category: "analytical", expected: "success" },
  { id: 34, query: "Which content formats are underperforming and why?", category: "analytical", expected: "success" },
  { id: 35, query: "What type of posts should we stop publishing?", category: "analytical", expected: "success" },
  { id: 36, query: "Which ad campaign should be scaled immediately and which should be paused?", category: "analytical", expected: "success" },

  // Complex Queries (May Need Clarification)
  { id: 37, query: "Compare the performance of 'Eco-conscious Millennials' vs. 'Gen Z, Urban Areas' in terms of conversion rate and revenue. Which group should we allocate more budget to?", category: "complex", expected: "success" },
  { id: 38, query: "Based on the organic content, which 3 hashtags or keywords are associated with the highest number of 'Saves' and 'Shares' on Instagram and LinkedIn?", category: "complex", expected: "clarification" },
  { id: 39, query: "What are the top 3 time slots (hours of the day) that yield the highest engagement rate for Facebook organic posts?", category: "complex", expected: "clarification" },
  { id: 40, query: "Does 'Video' content drive significantly higher reach than 'Image' content on Twitter and LinkedIn? Show the percentage difference.", category: "complex", expected: "success" },
  { id: 41, query: "Identify organic posts that had below-average impressions but above-average engagement rates. What was the content of these 'hidden gems'?", category: "complex", expected: "clarification" },
  { id: 42, query: "List the top 5 ad campaigns by Revenue. What common attributes (Ad Format, Platform, Target Audience) do they share?", category: "complex", expected: "success" },
  { id: 43, query: "How has the average organic reach on Facebook changed month-over-month from September to November 2025? Is there a downward trend we should worry about?", category: "complex", expected: "success" },
  { id: 44, query: "Generate a summary of the 'Festive Campaign' across all platforms, highlighting total spend, total revenue generated, and the best-performing creative format used.", category: "complex", expected: "success" },
];

async function testQuery(testCase) {
  try {
    const response = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: testCase.query,
        sessionId: `test-${testCase.id}`
      })
    });

    const result = await response.json();

    // Determine actual outcome
    let actual = 'unknown';
    if (result.needsClarification) {
      actual = 'clarification';
    } else if (result.outOfScope || (result.success === false && result.message?.includes('not available'))) {
      actual = 'rejected';
    } else if (result.success && result.data) {
      actual = 'success';
    } else if (result.success === false) {
      actual = 'error';
    }

    // Check if matches expectation
    const passed = actual === testCase.expected;

    return {
      ...testCase,
      actual,
      passed,
      dataCount: result.data?.length || 0,
      message: result.narrative || result.message || result.clarification?.question || 'No message',
      processingTime: result.metadata?.processingTimeMs || 0,
      error: result.error || null
    };
  } catch (error) {
    return {
      ...testCase,
      actual: 'error',
      passed: false,
      error: error.message,
      message: error.message
    };
  }
}

async function runAllTests() {
  console.log('🧪 Starting Automated Query Testing...\n');
  console.log(`Total Queries: ${TEST_QUERIES.length}\n`);

  const results = [];
  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const testCase = TEST_QUERIES[i];
    process.stdout.write(`[${i + 1}/${TEST_QUERIES.length}] Testing: ${testCase.query.substring(0, 60)}... `);

    const result = await testQuery(testCase);
    results.push(result);

    if (result.passed) {
      passCount++;
      console.log('✅ PASS');
    } else {
      failCount++;
      console.log(`❌ FAIL (expected: ${testCase.expected}, got: ${result.actual})`);
    }

    // Small delay to avoid overwhelming server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Save raw results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n📊 Results saved to: ${OUTPUT_FILE}`);

  // Generate report
  generateReport(results, passCount, failCount);

  return { results, passCount, failCount };
}

function generateReport(results, passCount, failCount) {
  const total = results.length;
  const successRate = ((passCount / total) * 100).toFixed(1);

  let report = `# Query Testing Report\n\n`;
  report += `**Date**: ${new Date().toISOString()}\n`;
  report += `**Total Queries**: ${total}\n`;
  report += `**Passed**: ${passCount} ✅\n`;
  report += `**Failed**: ${failCount} ❌\n`;
  report += `**Success Rate**: ${successRate}%\n\n`;

  report += `---\n\n`;

  // Summary by category
  report += `## Summary by Category\n\n`;
  const categories = {};
  results.forEach(r => {
    if (!categories[r.category]) {
      categories[r.category] = { total: 0, passed: 0 };
    }
    categories[r.category].total++;
    if (r.passed) categories[r.category].passed++;
  });

  report += `| Category | Total | Passed | Failed | Success Rate |\n`;
  report += `|----------|-------|--------|--------|-------------|\n`;
  Object.entries(categories).forEach(([cat, stats]) => {
    const rate = ((stats.passed / stats.total) * 100).toFixed(0);
    report += `| ${cat} | ${stats.total} | ${stats.passed} | ${stats.total - stats.passed} | ${rate}% |\n`;
  });

  report += `\n---\n\n`;

  // Failed queries
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    report += `## ❌ Failed Queries (${failures.length})\n\n`;
    failures.forEach(f => {
      report += `### ${f.id}. ${f.query}\n\n`;
      report += `- **Category**: ${f.category}\n`;
      report += `- **Expected**: ${f.expected}\n`;
      report += `- **Actual**: ${f.actual}\n`;
      report += `- **Message**: ${f.message.substring(0, 200)}${f.message.length > 200 ? '...' : ''}\n`;
      if (f.error) report += `- **Error**: ${f.error}\n`;
      report += `\n`;
    });
  }

  report += `---\n\n`;

  // Passed queries summary
  report += `## ✅ Passed Queries (${passCount})\n\n`;
  const passed = results.filter(r => r.passed);
  const passedByCategory = {};
  passed.forEach(p => {
    if (!passedByCategory[p.category]) passedByCategory[p.category] = [];
    passedByCategory[p.category].push(p);
  });

  Object.entries(passedByCategory).forEach(([cat, queries]) => {
    report += `### ${cat} (${queries.length})\n`;
    queries.forEach(q => {
      report += `- ✅ ${q.query.substring(0, 80)}${q.query.length > 80 ? '...' : ''}\n`;
    });
    report += `\n`;
  });

  fs.writeFileSync(REPORT_FILE, report);
  console.log(`📄 Report saved to: ${REPORT_FILE}\n`);
}

// Run tests
runAllTests().then(({ passCount, failCount }) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ PASSED: ${passCount}`);
  console.log(`❌ FAILED: ${failCount}`);
  console.log(`📊 SUCCESS RATE: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(60)}\n`);

  process.exit(failCount > 0 ? 1 : 0);
});
