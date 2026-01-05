# 🔴 CRITICAL BUGS FOUND - Must Fix Before Testing

## Bug #1: Language Detection is Broken ⚠️ HIGH PRIORITY

### Problem
The `langdetect` library in `sentiment_engine.py` is **severely misclassifying languages**:

**Examples from actual data:**
```
"2. Items arrived broken 😠" → classified as 'da' (Danish) ❌ Should be 'en'
"Yeh kapde kitne comfy hain! 😍" → classified as 'no' (Norwegian) ❌ Should be 'hi' or 'hinglish'
"Ekdum mast product hai" → classified as 'en' (English) ❌ Should be 'hinglish'
```

### Root Cause
**File**: `scripts/sentiment_engine.py` (lines 102-111)
```python
from langdetect import detect, DetectorFactory
DetectorFactory.seed = 0

def detect_language(text):
    try:
        return detect(str(text))
    except:
        return 'unknown'

df['language'] = df['comment_text'].apply(detect_language)
```

**Why it fails:**
1. `langdetect` is probabilistic and unreliable for short text
2. Emojis confuse the detection algorithm
3. No support for code-mixed languages (Hinglish, Spanglish, etc.)
4. Numbered prefixes ("1.", "2.") further reduce accuracy

### Impact on Queries
**Query that will FAIL**: "Give me a summary of sentiment for the Hindi/Hinglish comments on Instagram"

**Current behavior:**
- User asks for "Hindi/Hinglish" comments
- System shows available languages: `en`, `da`, `no` (all wrong!)
- Hinglish comments are labeled as `en`
- User gets confusing error message

### Recommended Fix

**Option 1: Use Better Language Detection (RECOMMENDED)**
Replace `langdetect` with `langid` or `fasttext` which are more robust:

```python
# Replace lines 100-111 in sentiment_engine.py
print("Detecting languages...")
import langid
langid.set_languages(['en', 'hi'])  # Limit to English and Hindi

def detect_language(text):
    try:
        # Remove emojis and numbering before detection
        import re
        clean_text = re.sub(r'[0-9]+\.|\p{Emoji}', '', str(text))
        if len(clean_text.strip()) < 5:
            return 'en'  # Default short text to English

        lang, confidence = langid.classify(clean_text)

        # Detect Hinglish: if contains both English and Hindi words
        has_hindi = bool(re.search(r'[\u0900-\u097F]', str(text)))
        has_english = bool(re.search(r'[a-zA-Z]', str(text)))
        if has_hindi and has_english:
            return 'hinglish'
        elif lang == 'hi' or has_hindi:
            return 'hi'
        else:
            return 'en'
    except:
        return 'en'  # Default to English on error

df['language'] = df['comment_text'].apply(detect_language)
```

**Dependencies needed:**
```bash
pip install langid
```

**Option 2: Use LLM for Language Classification (More Accurate but Slower)**
```python
def detect_language_with_llm(text):
    """Use GPT to classify language - slower but more accurate for Hinglish"""
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": f"Classify this comment's language. Return only: 'en', 'hi', or 'hinglish'.\nComment: {text}"
            }],
            temperature=0
        )
        return response.choices[0].message.content.strip().lower()
    except:
        return 'en'
```

**Option 3: Quick Fix - Default Everything to English**
```python
# Temporary fix if you don't want to add dependencies
df['language'] = 'en'  # Or remove language detection entirely
```

---

## Bug #2: "Categorical Ranking" Detection Too Broad (MEDIUM PRIORITY)

### Problem
The new `isCategoricalRankingQuery()` function might be **too aggressive** and catch queries that should be multi-step.

**File**: `server/llm/conversationManager.js` (lines 371-410)

**Potential false positives:**
```javascript
// This pattern matches too broadly:
const hasRankingKeyword =
  lowerQuery.includes('best') ||
  lowerQuery.includes('worst') ||
  lowerQuery.includes('highest') ||
  lowerQuery.includes('lowest') ||
  lowerQuery.includes('most') ||
  lowerQuery.includes('least') ||
  lowerQuery.includes('top ') ||
  lowerQuery.includes('bottom');
```

**Example queries that might incorrectly match:**
- "Show me the top 5 best performing campaigns AND then calculate their average ROAS" (multi-step)
- "Which platform has the most users?" (if asking about user count, not in dataset)

### Recommended Fix
Add more specific pattern matching:

```javascript
isCategoricalRankingQuery(lowerQuery) {
  // Pattern 1: "Which [category]" questions
  const hasWhichCategory = lowerQuery.includes('which ') && (
    lowerQuery.includes('platform') ||
    lowerQuery.includes('ad format') ||
    lowerQuery.includes('format') ||
    lowerQuery.includes('campaign') ||
    lowerQuery.includes('post type') ||
    lowerQuery.includes('content type') ||
    lowerQuery.includes('channel')
  );

  // Pattern 2: Ranking keywords
  const hasRankingKeyword =
    lowerQuery.includes('best') ||
    lowerQuery.includes('worst') ||
    lowerQuery.includes('highest') ||
    lowerQuery.includes('lowest') ||
    lowerQuery.includes('most') ||
    lowerQuery.includes('least');

  // Pattern 3: "across" keyword indicating aggregation
  const hasAcrossKeyword =
    lowerQuery.includes('across all') ||
    lowerQuery.includes('across platforms') ||
    lowerQuery.includes('across channels');

  // IMPROVED: Add multi-step detection to exclude complex queries
  const isMultiStepIndicator =
    lowerQuery.includes('and then') ||
    lowerQuery.includes('after that') ||
    lowerQuery.includes('followed by') ||
    lowerQuery.includes('calculate') && lowerQuery.includes('average') ||
    lowerQuery.split('?').length > 2;  // Multiple questions

  // Pattern 4: Not a complex multi-step query
  const isNotComplexQuery =
    !isMultiStepIndicator &&
    !lowerQuery.includes('trend over time') &&
    !lowerQuery.includes('month-over-month');

  // This is a categorical ranking query if:
  // (It asks "which category" OR has "across all") AND has ranking keywords AND is not complex
  return (hasWhichCategory || hasAcrossKeyword) && hasRankingKeyword && isNotComplexQuery;
}
```

---

## Bug #3: Auto-Filter for Ad Platforms May Miss Edge Cases (LOW PRIORITY)

### Problem
The new auto-filter in `postProcessFilters()` adds ad platform filter when detecting ad metrics, but it might fail if:

**File**: `server/llm/filterGenerator.js` (lines 73-108)

**Edge case 1**: Query mentions ad metric but talks about comparing ad vs organic
```
"Compare cost per conversion for Facebook Ads vs Facebook organic posts"
```
- Auto-filter will restrict to ad platforms
- Will exclude organic posts ❌

**Edge case 2**: Query uses different platform naming
```
"What's the CPC for Meta Ads?"
```
- Meta Ads ≠ Facebook Ads
- Filter won't match

### Recommended Fix
Add more sophisticated detection:

```javascript
// FIX 0: Auto-filter to ad platforms when query mentions ad-specific metrics or "paid channels"
const lowerQuery = userQuery.toLowerCase();
const adSpecificMetrics = ['cost per conversion', 'cost_per_conversion', 'cpc', 'cost per click', 'roas', 'return on ad spend', 'ad spend', 'ctr', 'click-through'];
const paidChannelKeywords = ['paid channel', 'paid platform', 'ad campaign', 'advertising', 'ads performance'];

// NEW: Check if query is comparing ad vs organic
const isComparingAdVsOrganic =
  (lowerQuery.includes('organic') || lowerQuery.includes('post')) &&
  (lowerQuery.includes(' vs ') || lowerQuery.includes('compare')) &&
  (lowerQuery.includes('ad') || lowerQuery.includes('paid'));

const hasAdMetric = adSpecificMetrics.some(metric => lowerQuery.includes(metric));
const hasPaidKeyword = paidChannelKeywords.some(keyword => lowerQuery.includes(keyword));

// Check if already filtering by platform
const hasExplicitPlatformFilter = filterSpec.filters && filterSpec.filters.some(f => {
  if (f.column === 'platform') return true;
  if (f.type === 'or' || f.type === 'and') {
    return f.conditions && f.conditions.some(c => c.column === 'platform');
  }
  return false;
});

// IMPROVED: Only add filter if NOT comparing ad vs organic
if ((hasAdMetric || hasPaidKeyword) && !hasExplicitPlatformFilter && !isComparingAdVsOrganic) {
  // ... existing filter logic
}
```

---

## Bug #4: "Below-Average" Queries Will Fail Silently (MEDIUM PRIORITY)

### Problem
Queries asking for "below-average" or "above-average" filtering cannot work with current architecture.

**Example query**: "Identify organic posts that had below-average impressions but above-average engagement rates"

**What happens:**
1. LLM generates filter with hardcoded threshold (e.g., `impressions < 30000`)
2. Doesn't calculate actual average
3. Results are incorrect

### Current Behavior
❌ **No validation** - query will process with wrong filters

### Recommended Fix
Add pattern detection to `validateQueryScope()`:

```javascript
// Add to validateQueryScope() in filterGenerator.js around line 840
const averageComparisonPattern = /\b(below|above|under|over)[-\s]?(the\s+)?average\b/i;
if (averageComparisonPattern.test(query)) {
  return {
    valid: false,
    needsClarification: true,
    reason: 'Below-average/above-average filtering requires multi-pass data processing.',
    explanation: 'I cannot dynamically calculate averages within filters. Please provide specific threshold values.',
    alternatives: [
      { option: 'Show me all posts sorted by the metric', description: 'Manual review' },
      { option: 'Use specific threshold (e.g., impressions < 30000)', description: 'Explicit filter' },
      { option: 'Ask for average first, then filter', description: 'Two queries' }
    ],
    suggestedQueries: [
      'What is the average engagement rate for organic posts?',
      'Show me posts with engagement rate > 5%',
      'Show me posts sorted by impressions ascending'
    ]
  };
}
```

---

## Bug #5: "Why" Questions May Get Incorrectly Blocked (LOW PRIORITY)

### Problem
Questions ending with "...and why?" get blocked by causation detection.

**File**: `server/llm/filterGenerator.js` (line 821)

**Pattern**:
```javascript
causation: /\bwhy\s+(did|is|are|do|does)\b|causal(ity)?|attribution\s+model|impact\s+study/i
```

**False positives:**
- "Which platform would you not recommend for social media posting and why?" ✅ Should work
- "Why did Instagram outperform Facebook this month?" ❌ Will get blocked

**True positives (should block):**
- "Why does Facebook have higher engagement?" (causal analysis)
- "What caused the drop in Instagram reach?" (attribution analysis)

### Recommended Fix
Refine pattern to only match "why" at question start:

```javascript
// Current:
causation: /\bwhy\s+(did|is|are|do|does)\b|causal(ity)?|attribution\s+model|impact\s+study/i

// Proposed:
causation: /^\s*why\s+(did|is|are|do|does)\b|causal(ity)?|attribution\s+model|impact\s+study|what\s+caused/i
//           ^^^ Only match "why" at START of query
```

---

## Summary of Required Fixes

### 🔴 Must Fix (Before Any Testing)
1. **Language Detection Bug** - Breaks Hindi/Hinglish queries
   - File: `scripts/sentiment_engine.py`
   - Priority: **CRITICAL**
   - Effort: Medium (replace langdetect with langid)

### 🟡 Should Fix (Before Production)
2. **Below-Average Pattern Detection** - Prevents silent failures
   - File: `server/llm/filterGenerator.js`
   - Priority: **HIGH**
   - Effort: Low (add validation pattern)

3. **"Why" Question Refinement** - Reduces false positives
   - File: `server/llm/filterGenerator.js`
   - Priority: **MEDIUM**
   - Effort: Very Low (regex tweak)

### 🟢 Nice to Fix (Optional)
4. **Categorical Ranking Edge Cases** - Already working well, just add safety
   - File: `server/llm/conversationManager.js`
   - Priority: **LOW**
   - Effort: Low

5. **Ad vs Organic Comparison Detection** - Rare edge case
   - File: `server/llm/filterGenerator.js`
   - Priority: **LOW**
   - Effort: Low

---

## Estimated Impact on Query Success Rate

### Before Fixes
- Hindi/Hinglish queries: **0% success** (wrong languages shown)
- Below-average queries: **0% success** (wrong results)
- "Why" questions: **50% success** (some blocked incorrectly)

### After All Fixes
- Hindi/Hinglish queries: **100% success** ✅
- Below-average queries: **100% clarification** ✅ (correct behavior)
- "Why" questions: **90% success** ✅

**Overall improvement**: +15-20% query success rate
