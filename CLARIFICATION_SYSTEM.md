# Query Clarification System

**Version:** 2.2
**Feature:** Intelligent Query Validation & Clarification
**Last Updated:** December 25, 2024

---

## 🎯 Problem Solved

### **Before (The Issue You Encountered):**

**Query:** "How are my Facebook Ads performing compared to Instagram?"

**Incorrect Response:**
```
"Your Facebook Ads have shown strong performance... but we currently
do not have comparative data for Instagram to provide a direct comparison."
```

**Problem:** Instagram Ads data EXISTS but system incorrectly said it doesn't!

---

## ✅ Solution: Query Intent Validation

The system now **validates query intent** against generated filters and **asks for clarification** when:

1. **Missing Platforms**: User asks to compare platforms but filter only includes one
2. **Ambiguous Queries**: Query can be interpreted multiple ways
3. **Data Mismatches**: Generated filters don't match what user asked for

---

## 🚀 How It Works

### **Processing Flow with Validation**

```
User Query: "Compare Facebook Ads and Instagram Ads"
    ↓
Step 1: Generate Filters (LLM)
    ↓
    Filter Generated: platform = "Facebook Ads" only ❌
    ↓
Step 1.5: VALIDATE QUERY INTENT ✨ NEW
    ↓
    Detection: User asked for "Facebook AND Instagram" but filter only has "Facebook"
    ↓
    Issue Type: missing_platforms (HIGH severity)
    ↓
RETURN CLARIFICATION REQUEST instead of proceeding
    ↓
Response to User:
{
  "needsClarification": true,
  "clarification": {
    "question": "I found data for Facebook Ads and Instagram Ads.
                 Would you like me to include Instagram Ads in the comparison?",
    "options": [
      "Yes, compare both Facebook Ads and Instagram Ads",
      "No, just show Facebook Ads performance",
      "Let me rephrase my question"
    ]
  }
}
```

---

## 📊 Validation Checks

### **1. Missing Platforms (HIGH Severity)**

**Trigger:** User mentions multiple platforms but filter only includes one

**Example:**
```
Query: "Compare Facebook and Instagram"
Filter: platform = "Facebook"
Issue: Missing Instagram

Clarification:
"I found data for Facebook Ads and Instagram Ads. Would you like me
to include Instagram in the comparison?"

Options:
- Yes, compare both
- No, just Facebook
- Let me rephrase
```

---

### **2. Comparison with Single Platform (HIGH Severity)**

**Trigger:** User says "compare" but filter only has one platform

**Example:**
```
Query: "Compare my ad performance"
Filter: platform = "Facebook Ads"
Issue: Comparison needs multiple platforms

Clarification:
"You mentioned 'compare' but I only detected one platform.
What would you like to compare?"

Options:
- Compare Facebook Ads to other platforms
- Just show Facebook Ads (no comparison)
- Let me specify platforms
```

---

### **3. No Platform Filter (MEDIUM Severity)**

**Trigger:** User mentions platforms but no platform filter applied

**Example:**
```
Query: "Show Facebook posts from November"
Filter: posted_date contains "11-2025" (missing platform filter!)
Issue: Platform mentioned but not filtered

Clarification:
"You mentioned Facebook, but the filter doesn't include platform.
Should I add a platform filter?"
```

---

### **4. Platform Not Found (WARNING)**

**Trigger:** Requested platform not in dataset

**Example:**
```
Query: "Compare TikTok and Snapchat"
Available: Facebook, Instagram, Twitter, LinkedIn
Issue: TikTok and Snapchat not in data

Clarification:
"I couldn't find data for TikTok or Snapchat. Available platforms are:
Facebook, Instagram, Twitter, LinkedIn. Would you like to compare those instead?"
```

---

## 🎨 Response Structure

### **Clarification Response**

```json
{
  "success": false,
  "needsClarification": true,
  "clarification": {
    "question": "Human-readable clarification question",
    "options": [
      {
        "label": "Option 1 description",
        "action": "include_all_platforms"
      },
      {
        "label": "Option 2 description",
        "action": "show_available_only"
      },
      {
        "label": "Let me rephrase",
        "action": "rephrase"
      }
    ],
    "issue": {
      "type": "missing_platforms",
      "severity": "high",
      "message": "Detailed issue description",
      "missingPlatforms": ["Instagram"],
      "suggestedFix": "Include all platforms: Facebook, Instagram"
    }
  },
  "issues": [...],
  "userIntent": {
    "isComparison": true,
    "platforms": ["Facebook Ads", "Instagram Ads"],
    "isAds": true
  },
  "filterIntent": {
    "platforms": ["Facebook Ads"],
    "hasGroupBy": true,
    "hasAggregate": true
  },
  "message": "This query needs clarification before proceeding",
  "metadata": {
    "processingTimeMs": 1500
  }
}
```

---

## 🔧 Implementation Details

### **Files Created**

1. **`server/llm/queryValidator.js`** (300+ lines)
   - Intent parsing from natural language
   - Filter intent extraction
   - Validation logic
   - Clarification question generation

### **Files Modified**

1. **`server/llm/queryProcessor.js`**
   - Added Step 1.5: Query Intent Validation
   - Returns clarification request if issues detected
   - Integrates QueryValidator

---

## 📝 Example Scenarios

### **Scenario 1: Your Exact Issue**

**Input:**
```
"How are my Facebook Ads performing compared to Instagram?"
```

**OLD Behavior:**
```
✅ Filters generated: platform = "Facebook Ads"
✅ Data processed: 22 Facebook Ads records
❌ Response: "We don't have Instagram data" (WRONG!)
```

**NEW Behavior:**
```
✅ Filters generated: platform = "Facebook Ads"
🔍 Intent validation:
   - User asked for: ["Facebook Ads", "Instagram"]
   - Filter includes: ["Facebook Ads"]
   - Issue: missing_platforms (HIGH)

⚠️ CLARIFICATION NEEDED

Response:
{
  "needsClarification": true,
  "clarification": {
    "question": "I found data for both Facebook Ads (22 records) and
                 Instagram Ads (15 records). Would you like me to include
                 Instagram Ads in the comparison?",
    "options": [
      "Yes, compare both Facebook Ads and Instagram Ads",
      "No, just show Facebook Ads performance",
      "Actually, I meant organic posts, not ads"
    ]
  }
}
```

---

### **Scenario 2: Ambiguous Query**

**Input:**
```
"Show me the best posts"
```

**Validation:**
```
🔍 Intent validation:
   - Issue: "Best" is ambiguous (best by what metric?)
   - Severity: MEDIUM
   - Needs clarification

Response:
"What metric would you like to use to determine 'best'?"

Options:
- Engagement rate
- Total likes
- Total reach
```

---

### **Scenario 3: Platform Not Available**

**Input:**
```
"Compare TikTok and YouTube performance"
```

**Validation:**
```
🔍 Intent validation:
   - Available platforms: Facebook, Instagram, Twitter, LinkedIn
   - Requested: TikTok, YouTube
   - Issue: Platforms not found (WARNING)

Response:
"I couldn't find TikTok or YouTube in the dataset.
Available platforms are: Facebook, Instagram, Twitter, LinkedIn.
Would you like to see data for available platforms instead?"
```

---

## 🎯 Detection Algorithms

### **Platform Detection**

Detects platforms with fuzzy matching:
- Facebook → "facebook", "fb"
- Instagram → "instagram", "ig", "insta"
- Twitter → "twitter", "tweet"
- LinkedIn → "linkedin"
- TikTok → "tiktok", "tik tok"

Also detects **Ads context**:
- "Facebook Ads" if query mentions "ads", "advertising", "campaigns", "paid"

---

### **Comparison Detection**

Keywords that trigger comparison validation:
- "compare", "versus", "vs", "vs."
- "against", "better", "between"

---

## 💡 Best Practices

### **For Frontend Integration**

```javascript
// Send query
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message: userQuery })
});

const result = await response.json();

// Check if clarification needed
if (result.needsClarification) {
  // Show clarification UI to user
  showClarificationDialog({
    question: result.clarification.question,
    options: result.clarification.options,
    onSelect: (option) => {
      if (option.action === 'rephrase') {
        // Let user rephrase
        showInputDialog();
      } else {
        // Resubmit with clarification
        submitWithClarification(option);
      }
    }
  });
} else {
  // Show normal results
  displayResults(result);
}
```

---

## 📊 Impact

### **Accuracy Improvement**

**Before:**
- ❌ False negatives: "No Instagram data" when data exists
- ❌ Wrong comparisons: Single platform when user wanted multiple
- ❌ Misleading results: Data doesn't match user intent

**After:**
- ✅ Catches intent mismatches BEFORE processing
- ✅ Asks for clarification instead of making wrong assumptions
- ✅ User confirms intent before seeing results
- ✅ Higher accuracy, better user experience

---

## 🚀 Future Enhancements

Potential improvements:
- ✨ Learn from user clarifications
- ✨ Suggest alternative queries
- ✨ Auto-fix simple issues (add missing platforms)
- ✨ Context-aware clarification (use conversation history)

---

## 📞 API Usage

### **Check Clarification in Response**

```javascript
POST /api/chat
{
  "message": "Compare Facebook and Instagram ads"
}

Response (if needs clarification):
{
  "success": false,
  "needsClarification": true,
  "clarification": {
    "question": "...",
    "options": [...]
  },
  "userIntent": {...},
  "filterIntent": {...}
}

Response (if no clarification needed):
{
  "success": true,
  "data": [...],
  "narrative": "...",
  ...
}
```

---

## 🎓 Summary

### **What This Fixes**

1. ✅ **Your exact issue:** System no longer says "no Instagram data" when it exists
2. ✅ **Asks for clarification:** Instead of making wrong assumptions
3. ✅ **Validates intent:** Catches filter mismatches before processing
4. ✅ **Better accuracy:** Results match what user actually wanted

### **Key Benefits**

- **Prevents false negatives**: Won't claim data doesn't exist when it does
- **User confirmation**: Asks before proceeding with uncertain interpretation
- **Better UX**: Clear options instead of wrong answers
- **Transparency**: Shows what was detected vs. what was requested

---

**Last Updated:** December 25, 2024
**Status:** ✅ Production Ready
**Addresses:** Issue with "Compare Facebook and Instagram" query
