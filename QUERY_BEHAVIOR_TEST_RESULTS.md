# Query Behavior Test Results

## Test Date: 2026-01-04

This document shows ACTUAL behavior of the system when testing critical edge-case queries, compared to EXPECTED behavior.

---

## Test 1: Engagement Rate Comparison (Organic vs Paid)

**Query**: "On Instagram, how does the average engagement rate of organic posts compare to the engagement rate of paid Stories campaigns?"

**Expected Behavior**:
- Should return CLARIFICATION explaining that ad campaigns don't have `engagement_rate` column
- Should suggest alternative metrics like impressions, clicks, conversions, CTR, ROAS

**Actual Behavior**: ✅ PARTIAL PASS
```json
{
  "success": false,
  "needsClarification": true,
  "clarification": {
    "question": "Comparing organic posts to specific ad formats requires multiple filters.",
    "explanation": "I can compare organic posts to ads, but filtering by specific ad format (Stories, Carousel, etc.) needs clarification."
  }
}
```

**Analysis**:
- ✅ Good: Returns clarification instead of failing silently
- ⚠️ Issue: Clarification message is about "filtering by ad format" not about missing `engagement_rate` column
- ❌ Problem: User might not understand that ad campaigns don't have engagement_rate at all
- 💡 Improvement needed: Clarification should explicitly state:
  - "Ad campaigns track different metrics than organic posts"
  - "Engagement rate is only available for organic posts"
  - "For ad campaigns, use: CTR (click-through rate), conversion rate, or ROAS"

---

## Test 2: Time-of-Day Query

**Query**: "What is the best time to post image on facebook?"

**Expected Behavior**:
- Should return CLARIFICATION explaining that `time_category` or `time_period` column is missing
- Should explain that posts have `posted_time` but no categorical grouping
- Should suggest alternatives like "Show me posts with posted_time and engagement rate"

**Actual Behavior**: ❌ FAIL
```json
{
  "success": true,
  "isMultiStep": true,
  "narrative": "I processed your multi-step query in 3 step(s):\n\n✅ Step 1: Gather data on recent Facebook posts...\n   Found 1 result(s)\n\n✅ Step 2: Analyze the engagement data to determine times...\n   Found 10 result(s)\n\n✅ Step 3: Perform comparison analysis of posts at various times...\n   Found 0 result(s)\n",
  "data": []
}
```

**Analysis**:
- ❌ CRITICAL ISSUE: Does NOT return clarification
- ❌ Processes as multi-step query instead
- ❌ Returns 0 results in final step (silent failure)
- ❌ User receives confusing multi-step narrative with no actual answer
- 💡 Root cause: Time-of-day validation is being bypassed by multi-step query classification
- 💡 Fix needed: Validation must run BEFORE multi-step detection, not after

---

## Test 3: Weekday/Weekend Query

**Query**: "Are there more engagements during the week or weekends?"

**Expected Behavior**:
- Should return CLARIFICATION explaining that `day_of_week` or `weekday` column is missing
- Should explain that posts have `posted_date` but no day-of-week extraction
- Should suggest: "Show me engagement grouped by date" for manual analysis

**Actual Behavior**: ⏱️ TIMEOUT (query took >30 seconds)

**Analysis**:
- ❌ CRITICAL ISSUE: Query processing is stuck or taking extremely long
- ❌ May be attempting complex multi-step processing
- ❌ No clarification returned
- 💡 Root cause: Similar to Test 2 - validation bypassed by multi-step classification
- 💡 Fix needed: Add early validation before any LLM processing

---

## Summary of Issues Found

### Issue #1: Clarification Messages Not Specific Enough
**Query Type**: Organic vs Paid comparison with incompatible metrics
**Current**: Returns generic "filtering requires clarification" message
**Needed**: Explicit explanation about metric availability differences

**Recommended Fix**:
```javascript
// In validateQuery(), add check for organic vs paid metric mismatches
if (queryMentions('engagement rate') && queryMentions('ad|campaign|paid')) {
  return {
    needsClarification: true,
    reason: 'Engagement rate is not available for ad campaigns.',
    explanation: 'Ad campaigns and organic posts track different metrics:\n' +
                 '- Organic posts: engagement_rate, likes, comments, shares, saves\n' +
                 '- Ad campaigns: CTR, CPC, conversion_rate, ROAS, conversions',
    alternatives: [
      { option: 'Compare using CTR for ads vs engagement_rate for organic' },
      { option: 'Compare reach and impressions (available in both)' },
      { option: 'Show me ad campaign performance metrics separately' }
    ]
  };
}
```

---

### Issue #2: Time-of-Day Validation Bypassed
**Query Type**: Time-of-day analysis
**Current**: Processes as multi-step query, returns 0 results
**Needed**: Return clarification BEFORE attempting multi-step processing

**Root Cause**:
```javascript
// conversationManager.js analyzes query first
analyzeQuery() → detects as multi-step → processes steps
// validateQuery() never runs or runs too late
```

**Recommended Fix**:
```javascript
// In queryProcessor.js, run validation BEFORE conversation manager
async processQuery(message, sessionId) {
  // STEP 1: Validate query feasibility FIRST
  const validation = await filterGenerator.validateQuery(message, metadata);
  if (!validation.valid) {
    return { needsClarification: true, clarification: validation };
  }

  // STEP 2: Only then analyze for multi-step
  const analysis = conversationManager.analyzeQuery(message);
  // ... continue processing
}
```

**Alternative Fix** (if validation can't run first):
```javascript
// In conversationManager.js, detect impossible queries early
analyzeQuery(query) {
  // Before classifying as multi-step, check for known impossible patterns
  if (requiresTimeCategory(query) || requiresDayOfWeek(query)) {
    return {
      isMultiStep: false,
      needsValidation: true, // Signal to run validation
      impossiblePattern: 'time_category_missing'
    };
  }
  // ... continue normal analysis
}
```

---

### Issue #3: Long-Running Queries Causing Timeouts
**Query Type**: Weekday/weekend comparison
**Current**: Query times out after 30+ seconds
**Needed**: Fast clarification response (<1 second)

**Root Cause**:
- Query enters multi-step processing
- Each step calls LLM multiple times
- No early exit for impossible queries

**Recommended Fix**:
```javascript
// Add timeout protection and early validation
async processQuery(message, sessionId, timeout = 30000) {
  const startTime = Date.now();

  // Quick pre-validation (no LLM calls, just pattern matching)
  const quickValidation = this.quickValidate(message);
  if (!quickValidation.valid) {
    return { needsClarification: true, clarification: quickValidation };
  }

  // ... continue with LLM processing
}

quickValidate(query) {
  const lowerQuery = query.toLowerCase();

  // Pattern: weekday/weekend without day_of_week column
  if (/(weekday|weekend)/.test(lowerQuery) && !hasColumn('day_of_week')) {
    return { valid: false, reason: 'Missing day_of_week column' };
  }

  // Pattern: time-of-day without time_category column
  if (/(best time|morning|afternoon|evening)/.test(lowerQuery) && !hasColumn('time_category')) {
    return { valid: false, reason: 'Missing time_category column' };
  }

  return { valid: true };
}
```

---

## Recommended Priority Fixes

### HIGH PRIORITY (Causes Silent Failures)

1. **Move validation before multi-step detection**
   - File: `server/llm/queryProcessor.js`
   - Change: Run `validateQuery()` before `conversationManager.analyzeQuery()`
   - Impact: Prevents impossible queries from being processed as multi-step

2. **Add quick pre-validation**
   - File: `server/llm/queryProcessor.js`
   - Add: `quickValidate()` method with pattern matching (no LLM calls)
   - Impact: Fast clarification responses, prevents timeouts

3. **Improve metric mismatch detection**
   - File: `server/llm/filterGenerator.js`
   - Add: Check for `engagement_rate` on ad campaigns explicitly
   - Impact: Better education for users about metric availability

### MEDIUM PRIORITY (Improves UX)

4. **Enhance clarification messages**
   - File: `server/llm/filterGenerator.js`
   - Improve: Add explicit metric availability tables in clarifications
   - Impact: Users understand what they CAN do, not just what they can't

5. **Add query timeout protection**
   - File: `server/llm/queryProcessor.js`
   - Add: Timeout parameter with early exit
   - Impact: No more hanging queries

### LOW PRIORITY (Nice to Have)

6. **Add query complexity estimation**
   - Estimate: How many LLM calls will this query require?
   - Warn: "This is a complex query that may take 30-60 seconds"
   - Impact: Better user expectations

---

## Next Steps

1. ✅ Document actual behavior (this file)
2. ⬜ Implement HIGH priority fixes
3. ⬜ Re-run test queries to validate fixes
4. ⬜ Run full 52-query test suite
5. ⬜ Generate automated test report
6. ⬜ Document what works vs what needs clarification vs what's out of scope

---

## Query Classification Matrix

Based on testing, here's how queries should be handled:

| Query Pattern | Current Behavior | Expected Behavior | Status |
|--------------|------------------|-------------------|--------|
| Organic vs Paid (incompatible metrics) | Generic clarification | Metric-specific clarification | ⚠️ Partial |
| Time-of-day analysis | Multi-step → 0 results | Clarification (missing time_category) | ❌ Fail |
| Weekday/weekend analysis | Timeout | Clarification (missing day_of_week) | ❌ Fail |
| Below-average pattern | ? (not tested) | Clarification (multi-pass required) | ⬜ Unknown |
| Hashtag extraction | ? (not tested) | Clarification (NLP required) | ⬜ Unknown |
| Ad format + Cost Per Conversion | ? (not tested) | Success (should work) | ⬜ Unknown |
| ROAS Q4 comparison | ? (not tested) | Success (fixed in previous session) | ⬜ Unknown |

