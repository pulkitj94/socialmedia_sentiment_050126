# Multi-Step Query Support Guide

**Version:** 2.1
**Feature Status:** ✅ Production Ready
**Last Updated:** December 25, 2024

---

## 🎯 Overview

The Social Command Center now supports **multi-step queries** with conversation context! This allows you to:

- Break down complex questions into sequential steps
- Reference previous results in follow-up queries
- Build on conversation history naturally
- Chain queries together for advanced analysis

---

## ✨ Key Features

### 1. **Multi-Step Query Processing**
Automatically breaks down complex queries into manageable sub-queries and processes them sequentially.

### 2. **Conversation Context & Memory**
Maintains conversation history to understand follow-up questions and pronouns like "that", "those", "them".

### 3. **Intermediate Result Storage**
Stores results from each step for reference in subsequent steps.

### 4. **Intelligent Query Analysis**
Uses LLM to detect multi-step patterns and context dependencies automatically.

---

## 📖 How It Works

### Architecture

```
User Query
    ↓
Query Analysis (LLM)
    ↓
Multi-Step? ──No──> Single Query Processing
    │                      ↓
   Yes                 Return Result
    ↓
Step 1 → Store Result
    ↓
Step 2 → Store Result
    ↓
Step N → Combine Results
    ↓
Return Final Response
```

### Conversation Flow

```javascript
Session Storage:
{
  messages: [
    { role: 'user', content: 'Show Instagram posts' },
    { role: 'assistant', content: 'Found 48 posts...' },
    { role: 'user', content: 'Now filter those by engagement > 5%' }
  ],
  intermediateResults: [
    { data: [...], summary: '48 records' }
  ]
}
```

---

## 🚀 Usage Examples

### Example 1: Sequential Multi-Step Query

**Query:**
```
Show me top Instagram posts, then compare their engagement rates
```

**What Happens:**
1. **Step 1**: "Show me top Instagram posts sorted by engagement"
   - Returns top Instagram posts
2. **Step 2**: "Compare engagement rates of the top Instagram posts from step 1"
   - Analyzes engagement rates from previous results

**Response Format:**
```json
{
  "success": true,
  "isMultiStep": true,
  "narrative": "I processed your multi-step query in 2 step(s):\n\n✅ **Step 1**: Get top Instagram posts\n   Found 20 result(s)\n\n✅ **Step 2**: Compare engagement rates\n   Found 20 result(s)\n\n**Final Results:**\n1. platform: Instagram, engagement_rate: 8.5, likes: 1234\n...",
  "data": [...],
  "metadata": {
    "totalSteps": 2,
    "successfulSteps": 2,
    "steps": [
      { "stepNumber": 1, "description": "Get top Instagram posts", "success": true },
      { "stepNumber": 2, "description": "Compare engagement rates", "success": true }
    ]
  }
}
```

---

### Example 2: Context-Dependent Follow-Up

**Conversation:**

**First Query:**
```
What are the top Facebook posts from November?
```

**Response:**
```
Found 15 Facebook posts from November...
[Shows data]
```

**Follow-Up Query:**
```
What about Instagram?
```

**What Happens:**
- System detects context reference
- Rewrites query as: "What are the top Instagram posts from November?"
- Maintains same query pattern from conversation history

---

### Example 3: Refinement Query

**Conversation:**

**First Query:**
```
Show all Instagram posts
```

**Response:**
```
Found 48 Instagram posts...
```

**Follow-Up Query:**
```
Now filter those by engagement > 5% and show me the top 10
```

**What Happens:**
- Detects "those" refers to previous query
- Rewrites as: "Show Instagram posts with engagement rate > 5%, sorted by engagement, limit 10"
- Applies filters to match user intent

---

### Example 4: Complex Multi-Step Analysis

**Query:**
```
First show Instagram posts from November, then find which ones have engagement above average, and finally show me the top 5
```

**What Happens:**
1. **Step 1**: Get Instagram posts from November
2. **Step 2**: Calculate average engagement and filter above average
3. **Step 3**: Sort and limit to top 5

---

## 🔧 API Usage

### Basic Request (No Session)

```javascript
POST http://localhost:3001/api/chat

{
  "message": "Show top Instagram posts, then compare their engagement"
}
```

### With Session ID (Recommended for Multi-Query)

```javascript
POST http://localhost:3001/api/chat

{
  "message": "Show Instagram posts from November",
  "sessionId": "user-12345"
}

// Follow-up query with same sessionId
POST http://localhost:3001/api/chat

{
  "message": "Now show me Facebook posts from the same period",
  "sessionId": "user-12345"
}
```

### Session Management

**Clear Conversation:**
```javascript
POST http://localhost:3001/api/chat/conversation/clear

{
  "sessionId": "user-12345"
}
```

**Get Conversation Stats:**
```javascript
GET http://localhost:3001/api/chat/conversation/stats

Response:
{
  "success": true,
  "stats": {
    "activeSessions": 3,
    "totalMessages": 45
  }
}
```

---

## 📊 Query Patterns Detected

### Multi-Step Indicators

The system automatically detects these patterns:

**Sequential Keywords:**
- "then", "after that", "next", "followed by"
- "first X, then Y"
- "compare those results"
- "use that data"

**Example:**
```
✅ "Show posts, then filter by engagement"
✅ "First get Instagram data, then compare to Facebook"
✅ "Find top posts, next analyze their engagement"
```

### Context-Dependent Indicators

**Reference Pronouns:**
- "that", "those", "them" (referring to previous results)
- "also", "additionally", "what about"
- "same", "similar"

**Example:**
```
✅ "What about Instagram?" (after asking about Facebook)
✅ "Show me those with high engagement" (referring to previous results)
✅ "Filter that by date" (referring to previous query)
```

---

## 🎨 Response Structure

### Single-Step Response

```json
{
  "success": true,
  "data": [...],
  "narrative": "Found 48 Instagram posts...",
  "insights": {...},
  "metadata": {
    "processingTimeMs": 2500,
    "llmCalls": 3
  }
}
```

### Multi-Step Response

```json
{
  "success": true,
  "isMultiStep": true,
  "data": [...],  // Final step data
  "narrative": "I processed your multi-step query...",
  "insights": {...},
  "metadata": {
    "processingTimeMs": 8500,
    "totalSteps": 3,
    "successfulSteps": 3,
    "steps": [
      { "stepNumber": 1, "description": "...", "success": true, "resultCount": 48 },
      { "stepNumber": 2, "description": "...", "success": true, "resultCount": 20 },
      { "stepNumber": 3, "description": "...", "success": true, "resultCount": 5 }
    ],
    "llmCalls": 7  // Analysis + each step
  },
  "stepResults": [...]  // Detailed results for each step
}
```

---

## ⚙️ Configuration

### Session Settings

```javascript
// In conversationManager.js
class ConversationManager {
  constructor() {
    this.maxConversationAge = 3600000;  // 1 hour
    this.maxMessagesPerConversation = 20;  // Last 20 messages
  }
}
```

### Customize Session TTL

```javascript
// Edit server/llm/conversationManager.js
this.maxConversationAge = 7200000;  // 2 hours
```

---

## 🧪 Testing Examples

### Test 1: Basic Multi-Step

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show Instagram posts, then filter by engagement > 5%"}'
```

### Test 2: Conversation Context

```bash
# First query
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the top Facebook posts?", "sessionId": "test-123"}'

# Follow-up query
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What about Instagram?", "sessionId": "test-123"}'
```

### Test 3: Complex Multi-Step

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "First show November posts, then filter by platform=Instagram, then show top 5 by engagement"}'
```

---

## 💡 Best Practices

### 1. **Use Session IDs for Conversations**
```javascript
// Good - maintains context
{ message: "Show posts", sessionId: "user-123" }
{ message: "Filter those", sessionId: "user-123" }

// Less Good - no context
{ message: "Show posts" }
{ message: "Filter Instagram posts with..." }  // Have to restate
```

### 2. **Clear Sessions When Done**
```javascript
// After completing analysis
POST /api/chat/conversation/clear
{ "sessionId": "user-123" }
```

### 3. **Be Specific in Multi-Step Queries**
```javascript
// Good
"Show Instagram posts, then compare their average engagement to Facebook"

// Better
"First, get Instagram posts from November. Then calculate average engagement. Finally, compare to Facebook posts from same period."
```

### 4. **Use Natural Language**
```javascript
// Works well
"What about Instagram?" (after asking about Facebook)
"Show me the top 10 from those results"
"Filter that by engagement > 5%"
```

---

## 🔍 Troubleshooting

### Issue 1: Context Not Working

**Problem:** Follow-up query doesn't use previous context

**Solution:** Ensure you're using the same `sessionId`:
```javascript
// All requests should use same sessionId
{ message: "Query 1", sessionId: "user-123" }
{ message: "Query 2", sessionId: "user-123" }  // Same ID
```

### Issue 2: Multi-Step Not Detected

**Problem:** Query processed as single-step even though it has "then"

**Solution:** Make steps more explicit:
```javascript
// Less Clear
"Show posts and compare engagement"

// More Clear
"Show posts, then compare their engagement rates"
```

### Issue 3: Step Fails Mid-Way

**Problem:** One step fails, entire query fails

**Response:**
```json
{
  "success": true,
  "metadata": {
    "totalSteps": 3,
    "successfulSteps": 2,  // Step 3 failed
    "steps": [
      { "stepNumber": 1, "success": true },
      { "stepNumber": 2, "success": true },
      { "stepNumber": 3, "success": false, "error": "..." }
    ]
  }
}
```

**Solution:** Returns results from last successful step. Check error message and rephrase failing step.

---

## 📈 Performance Considerations

### LLM Calls

**Single-Step Query:**
- 1 call for query analysis
- 1 call for filter generation
- 1 call for response framing
- **Total: 3 LLM calls**

**Multi-Step Query (3 steps):**
- 1 call for query analysis
- 3 × (1 filter generation + 1 response framing)
- **Total: 7 LLM calls**

### Processing Time

**Single-Step:** 2-4 seconds
**Multi-Step (2 steps):** 5-8 seconds
**Multi-Step (3 steps):** 8-12 seconds

### Cost Implications

**Per Multi-Step Query (3 steps):**
- Input: ~10,000 tokens
- Output: ~3,000 tokens
- **Cost**: ~$0.002 (0.2 cents)

---

## 🎓 Advanced Usage

### Custom Session Management

```javascript
// Create session per user
const userId = req.user.id;
const sessionId = `user-${userId}`;

await fetch('http://localhost:3001/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: userQuery,
    sessionId: sessionId
  })
});
```

### Conversation History Export

```javascript
// Get conversation stats
const stats = await fetch('http://localhost:3001/api/chat/conversation/stats')
  .then(r => r.json());

console.log(`Active sessions: ${stats.stats.activeSessions}`);
console.log(`Total messages: ${stats.stats.totalMessages}`);
```

---

## 📝 Examples by Use Case

### Marketing Analysis

```
Query: "Show Instagram posts from November, then calculate average engagement by content type, then identify top performing types"

Steps:
1. Filter Instagram posts from November
2. Group by content_type, calculate avg engagement
3. Sort by engagement, return top types
```

### Performance Comparison

```
Query: "Compare Facebook and Instagram engagement in Q4 2025"

Steps:
1. Get Facebook data from Q4 2025
2. Get Instagram data from Q4 2025
3. Compare average engagement rates
```

### Trend Analysis

```
Query: "Show monthly Instagram post count, then identify the month with highest activity"

Steps:
1. Group Instagram posts by month, count posts
2. Sort by count, return top month
```

---

## 🔐 Security Notes

1. **Session Isolation**: Each session is isolated, cannot access other sessions
2. **Auto-Expiration**: Sessions expire after 1 hour of inactivity
3. **Memory Limits**: Max 20 messages per conversation
4. **Auto-Cleanup**: Old sessions cleaned up automatically

---

## 🚀 Future Enhancements

Potential future improvements:

- ✨ Parallel step execution (when steps don't depend on each other)
- ✨ Step rollback and retry
- ✨ Conversation export/import
- ✨ Visual query builder for multi-step queries
- ✨ Query templates for common multi-step patterns

---

## 📞 Support

**Documentation:**
- [Main README](README.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Implementation Summary](FINAL_IMPLEMENTATION_SUMMARY.md)

**API Health Check:**
```
GET http://localhost:3001/api/chat/health
```

**Conversation Stats:**
```
GET http://localhost:3001/api/chat/conversation/stats
```

---

**Last Updated:** December 25, 2024
**Version:** 2.1
**Feature Status:** Production Ready ✅
