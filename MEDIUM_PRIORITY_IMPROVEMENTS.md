# Medium Priority Improvements

**Date**: 2026-01-05
**Status**: 📋 DOCUMENTED FOR FUTURE IMPLEMENTATION

These are UX/presentation improvements that don't affect core functionality but would enhance the user experience.

---

## Issue #1: Incorrect Record Count in Narratives

### Problem
When users query sentiment data, the system reports "Total records in dataset: 470" which includes:
- ~154 organic posts
- ~50 ad campaigns
- ~104 comments
- Other CSV files

For a sentiment query, users expect to see only comment counts, not all records from all CSV files combined.

### Example
**Query**: "Give me a summary of sentiment for Hinglish comments on Instagram"

**Current Response**:
```
Total records in dataset: 470
Records after filtering: 2
Results returned: 1
```

**Expected Response**:
```
Total comments in dataset: 104
Hinglish comments on Instagram: 2
Results returned: 1
```

### Root Cause
**File**: [server/utils/dataProcessor.js](server/utils/dataProcessor.js:99)

```javascript
processData(filterSpec) {
  let data = this.loadAllData();  // ← Loads ALL CSV files indiscriminately
  const originalCount = data.length;  // ← Counts everything (posts + ads + comments)

  return {
    summary: {
      originalRecords: originalCount,  // ← Reports wrong count
      ...
    }
  };
}
```

The `loadAllData()` method (line 28) loads every CSV file without considering query type.

### Proposed Solution

**Option 1: Smart Data Loading** (Recommended)
Add query-type detection and selective loading:

```javascript
processData(filterSpec, queryContext = {}) {
  // Determine which data sources to load based on query type
  let data;
  if (queryContext.isSentimentQuery) {
    data = this.loadSentimentData();  // Only load comment CSVs
  } else if (queryContext.isAdQuery) {
    data = this.loadAdData();  // Only load ad campaign CSVs
  } else if (queryContext.isOrganicQuery) {
    data = this.loadOrganicData();  // Only load organic post CSVs
  } else {
    data = this.loadAllData();  // Fallback to all data
  }

  const originalCount = data.length;  // Now counts only relevant records
  ...
}
```

Add methods to load specific data types:
```javascript
loadSentimentData() {
  return this.loadSpecificFiles(['enriched_comments_sentiment.csv', 'sentiment_history.csv']);
}

loadAdData() {
  return this.loadSpecificFiles(['facebook_ads_ad_campaigns.csv', 'instagram_ads_ad_campaigns.csv', 'google_ads_ad_campaigns.csv']);
}

loadOrganicData() {
  return this.loadSpecificFiles(['facebook_organic_posts.csv', 'instagram_organic_posts.csv', 'twitter_organic_posts.csv']);
}

loadSpecificFiles(fileNames) {
  const allData = [];
  for (const fileName of fileNames) {
    const filePath = path.join(this.dataDir, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });
      records.forEach(record => {
        record._source_file = fileName;
        if (record.platform) {
          record.platform = normalizePlatform(record.platform);
        }
        allData.push(record);
      });
    }
  }
  return allData;
}
```

**Option 2: Post-process Count Correction** (Simpler, but less efficient)
Keep loading all data, but correct the count in the narrative:

```javascript
// In responseFramer.js, detect query type and report correct counts
if (isSentimentQuery) {
  const sentimentRecords = allRecords.filter(r => r.comment_id || r.label);
  narrative = narrative.replace(/Total records in dataset: \d+/, `Total comments in dataset: ${sentimentRecords.length}`);
}
```

### Impact
- **Current**: Confusing/misleading record counts
- **After Fix**: Clear, accurate counts relevant to query type
- **Effort**: Medium (requires query context passing through data pipeline)
- **Risk**: Low (doesn't change filtering logic, only data loading)

---

## Issue #2: Overly Technical/Verbose Narratives

### Problem
For simple queries, the LLM-generated narratives are too technical and verbose. Users want quick, actionable insights, not processing details.

### Example
**Query**: "Give me a summary of sentiment for Hinglish comments on Instagram"

**Current Response** (verbose):
```
Sentiment Summary for Hinglish Comments on Instagram

Based on the analysis of Hinglish comments on Instagram, here are the key insights:

Key Metrics:
- Total records in dataset: 470
- Records after filtering: 2
- Results returned: 1
- Sentiment Label: Positive
- Mean Sentiment Score: 0.63
- Count of Comments: 2

Context:
The analysis indicates that out of the total 470 records, only 2 records were filtered
for Hinglish comments on Instagram, resulting in 1 sentiment result. The sentiment
score of 0.63 reflects a predominantly positive sentiment among the comments analyzed.

Recommendations:
- Engage with Positive Feedback: Since the sentiment is positive, consider responding...
- Monitor Future Comments: Continue to track Hinglish comments to gather more data...
- Content Strategy: Given the positive sentiment, explore creating more content...

Limitations:
- The dataset returned only 1 sentiment result, which may not fully represent...
```

**Expected Response** (concise):
```
Hinglish Comments on Instagram: 2 comments found

Sentiment:
• 100% Positive (avg score: 0.63)

Comments:
1. "Ekdum mast product hai! 👌" - Positive (0.68)
2. "Ekdum mast product hai, fast delivery." - Positive (0.58)

Summary: All Hinglish comments on Instagram are positive. Consider creating more
content that resonates with Hinglish-speaking audiences.
```

### Root Cause
**File**: [server/llm/responseFramer.js](server/llm/responseFramer.js)

The response framer generates detailed, formal narratives suitable for executives/reports, but users asking simple questions want concise answers.

### Proposed Solution

**Option 1: Response Templates by Query Type** (Recommended)
Create different narrative styles based on query complexity:

```javascript
frameResponse(query, processedData, filterSpec, queryContext = {}) {
  // Detect query complexity
  const isSimpleQuery = this.isSimpleQuery(query);
  const isSentimentSummary = query.toLowerCase().includes('sentiment') && query.toLowerCase().includes('summary');

  if (isSimpleQuery && isSentimentSummary) {
    return this.generateConciseSentimentSummary(processedData, filterSpec);
  } else if (isSimpleQuery) {
    return this.generateConciseResponse(processedData, filterSpec);
  } else {
    return this.generateDetailedResponse(query, processedData, filterSpec);
  }
}

generateConciseSentimentSummary(data, filterSpec) {
  const sentiments = data.data;
  const totalComments = sentiments.reduce((sum, s) => sum + s._count, 0);

  let response = `Found ${totalComments} comment(s)\n\n`;
  response += `Sentiment Breakdown:\n`;
  sentiments.forEach(s => {
    const percentage = ((s._count / totalComments) * 100).toFixed(0);
    response += `• ${percentage}% ${s.label} (avg score: ${s.score_mean.toFixed(2)})\n`;
  });

  // Show actual comments if available
  if (totalComments <= 5) {
    response += `\nComments:\n`;
    // Fetch and display actual comment text
  }

  return response;
}
```

**Option 2: User Preference Setting**
Allow users to choose narrative style in settings:
- `narrative_style: "concise"` - Brief, bullet-point responses
- `narrative_style: "detailed"` - Current verbose style
- `narrative_style: "technical"` - Include processing stats

**Option 3: Query-based Style Detection**
Use keywords to detect user preference:
- "summary" → concise style
- "analyze" / "detailed" / "report" → verbose style
- "show me" / "what are" → simple list

### Impact
- **Current**: Users scroll through long narratives to find the answer
- **After Fix**: Quick, scannable responses with key info highlighted
- **Effort**: High (requires rewriting response generation logic)
- **Risk**: Medium (changes user-facing output, needs careful testing)

---

## Issue #3: Technical Details in User-Facing Responses

### Problem
Responses include technical processing details that users don't need:

```
Total records in dataset: 470
Records after filtering: 2
Results returned: 1
```

Users don't care about the filtering pipeline - they just want the answer.

### Proposed Solution
**Hide technical details by default**, provide as optional metadata:

```javascript
{
  "success": true,
  "data": [...],
  "narrative": "User-friendly answer here",
  "insights": {
    "keyFindings": ["2 Hinglish comments found", "100% positive sentiment"],
    "visualData": { /* chart-ready data */ }
  },
  "_debug": {  // Only include in debug mode
    "totalRecords": 470,
    "filteredRecords": 2,
    "processingSteps": [...],
    "llmCalls": 3
  }
}
```

---

## Issue #4: Missing Actual Comment Content

### Problem
For sentiment queries, users often want to see **what the comments actually say**, not just aggregate statistics.

**Current**: Only shows aggregated sentiment scores
**Expected**: Shows actual comment text with sentiment labels

### Proposed Solution
When filtering comments, include the actual comment text in results:

```javascript
// In filterGenerator.js, detect sentiment queries requesting content
if (query.includes('sentiment') && query.includes('comments')) {
  // Don't aggregate by default - return individual comments
  return {
    groupBy: null,  // Don't group
    aggregate: null,  // Don't aggregate
    sortBy: { column: 'score', order: 'desc' },
    limit: 10,
    includeColumns: ['comment_text', 'label', 'score', 'platform', 'language']
  };
}
```

Response would show:
```
Hinglish Comments on Instagram (2 found):

1. "Ekdum mast product hai! 👌"
   Sentiment: Positive (score: 0.68)

2. "Ekdum mast product hai, fast delivery."
   Sentiment: Positive (score: 0.58)
```

---

## Implementation Priority

### High Impact, Medium Effort:
1. **Issue #1**: Smart data loading (fixes confusing counts)
2. **Issue #4**: Include actual comment content (highly requested by users)

### High Impact, High Effort:
3. **Issue #2**: Concise narrative templates (requires significant refactoring)

### Medium Impact, Low Effort:
4. **Issue #3**: Hide technical details (easy config change)

---

## Estimated Effort

| Issue | Complexity | Files to Change | Estimated Time | Risk |
|-------|-----------|-----------------|----------------|------|
| #1 Smart Loading | Medium | dataProcessor.js, queryProcessor.js | 2-3 hours | Low |
| #2 Concise Narratives | High | responseFramer.js, templates | 4-6 hours | Medium |
| #3 Hide Debug Info | Low | responseFramer.js | 30 min | Low |
| #4 Show Comments | Medium | filterGenerator.js, responseFramer.js | 1-2 hours | Low |

**Total for all**: 8-12 hours of development + testing

---

## Recommendation

Implement in this order:
1. **Issue #3** (30 min) - Quick win, immediate improvement
2. **Issue #1** (2-3 hours) - Fixes most confusing aspect
3. **Issue #4** (1-2 hours) - High user value
4. **Issue #2** (4-6 hours) - Major UX improvement, do last

This spreads the work into manageable chunks and delivers incremental improvements.

---

## Testing Plan

For each fix:
1. Test sentiment queries (with/without language filter)
2. Test ad campaign queries
3. Test organic post queries
4. Test mixed queries (comparison across types)
5. Verify record counts are accurate
6. Verify narratives are appropriate length

---

## Success Metrics

- **Issue #1**: Record counts in narratives match query type (0% error rate)
- **Issue #2**: Average narrative length < 200 words for simple queries
- **Issue #3**: Users don't see technical processing details
- **Issue #4**: 100% of sentiment queries show actual comment text when < 10 comments
