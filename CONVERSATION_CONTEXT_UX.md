# Conversation Context UX Issue

## Problem Statement

**User Question**: "How would a user know that the system has conversation chaining and responses to the next query are based on the chained conversation or a fresh query?"

**Current State**:
- The system DOES maintain conversation context per sessionId
- Users have NO indication that context exists
- Users don't know when a query is interpreted in context vs standalone
- No way to clear context or start fresh

---

## Why This Matters

### Example Scenario:
1. User asks: "What is the best time to post on Facebook?"
2. System returns: Clarification needed (missing time_category)
3. User clicks: "Analyze by date"
4. System interprets this IN CONTEXT of #1 and processes it correctly ✅

BUT:

5. User asks a completely different question: "Show me Instagram engagement"
6. System might STILL be using context from #1-4
7. Result could be confusing if context affects interpretation ❌

---

## Current Implementation

### How Context Works:
```javascript
// conversationManager.js
class ConversationManager {
  getSession(sessionId) {
    // Each sessionId maintains:
    return {
      messages: [],              // Last 10 messages
      intermediateResults: [],   // Last 3 results
      createdAt: Date.now()
    };
  }
}
```

### When Context Is Used:
1. **Query decomposition** - LLM analyzes if query needs context from previous queries
2. **Multi-step queries** - Results from step 1 inform step 2
3. **Follow-up questions** - "Show me more details" refers to previous result

### When Context Should Be CLEARED:
- User changes topic completely
- User explicitly wants a fresh start
- Context is causing confusion
- Session has been idle for too long

---

## Proposed Solutions

### Solution 1: Visual Indicator (Recommended - Quick Win)

Add visual indicators in the UI to show when context is active:

```javascript
// In response object
{
  "success": true,
  "data": [...],
  "narrative": "...",
  "contextInfo": {
    "hasContext": true,
    "contextSummary": "Following up on: 'Best time to post on Facebook'",
    "messageCount": 5,
    "canClear": true
  }
}
```

**UI Display**:
```
┌────────────────────────────────────────────┐
│ 💬 Conversation Context Active             │
│ Following up on: "Best time to post..."    │
│ [Clear Context] button                     │
└────────────────────────────────────────────┘
```

**Benefits**:
- ✅ User knows context exists
- ✅ User sees what context is being used
- ✅ User can clear context when needed
- ✅ Non-intrusive for single queries

---

### Solution 2: Explicit Context Control

Add commands for users to control context:

**Clear Context**:
- Command: `/new` or `/clear` or "Start fresh"
- Action: Clears session, starts new conversation

**Show Context**:
- Command: `/context` or "What do you remember?"
- Action: Shows conversation history summary

**Use Context**:
- Command: "Following up on that..." or "Regarding the previous query..."
- Action: Explicitly signals intent to use context

**Implementation**:
```javascript
// In queryProcessor.js
quickValidate(query) {
  // Check for context control commands
  if (/^\/new|^\/clear|start fresh|new conversation/i.test(query)) {
    conversationManager.clearSession(sessionId);
    return {
      valid: false,
      clarification: {
        question: 'Starting a new conversation',
        explanation: 'Previous context has been cleared. Ask me anything!',
        alternatives: []
      }
    };
  }
}
```

---

### Solution 3: Smart Context Detection (Best UX, More Complex)

System automatically detects when user is changing topics:

```javascript
analyzeQuery(userQuery, sessionId) {
  const context = this.getContext(sessionId);
  const previousTopics = this.extractTopics(context.messages);
  const currentTopic = this.extractTopic(userQuery);

  // If topic changed significantly, ask user
  if (this.topicsAreDifferent(previousTopics, currentTopic)) {
    return {
      needsClarification: true,
      clarification: {
        question: "I notice you're asking about a different topic. Should I:",
        alternatives: [
          {
            option: "Use previous context",
            description: "This query relates to what we discussed before"
          },
          {
            option: "Start fresh",
            description: "This is a new, unrelated question"
          }
        ]
      }
    };
  }
}
```

**Benefits**:
- ✅ No user action needed for simple cases
- ✅ Asks for clarification only when ambiguous
- ✅ Prevents context from causing confusion

**Drawbacks**:
- ⚠️ Requires LLM call to detect topic change
- ⚠️ May be overly cautious and ask too often

---

### Solution 4: Session Timeout

Automatically clear context after inactivity:

```javascript
// In conversationManager.js
getSession(sessionId) {
  const session = this.sessions.get(sessionId);

  // Check if session expired (e.g., 30 minutes)
  if (session && Date.now() - session.lastActivity > 1800000) {
    console.log(`Session ${sessionId} expired - clearing context`);
    this.sessions.delete(sessionId);
    return this.createNewSession(sessionId);
  }

  // Update last activity
  if (session) {
    session.lastActivity = Date.now();
  }

  return session || this.createNewSession(sessionId);
}
```

**Benefits**:
- ✅ Prevents stale context from affecting queries
- ✅ Automatic, no user action needed
- ✅ Aligns with user expectations (new session = fresh start)

---

## Recommended Approach (Hybrid)

Implement multiple solutions together:

### Phase 1: Quick Wins (Low Effort)
1. ✅ **Solution 4**: Session timeout (30 min)
2. ✅ **Solution 1**: Add context indicator to responses
3. ✅ **Generic clarification options** (already done above)

### Phase 2: Enhanced Control (Medium Effort)
4. **Solution 2**: Add `/clear` and `/new` commands
5. Add "Clear Context" button in UI

### Phase 3: Smart Detection (High Effort)
6. **Solution 3**: Automatic topic change detection

---

## Implementation Plan

### Immediate (Today - Already Done):
✅ Made clarification options more generic ("Analyze by date" instead of "Filter by time range")
✅ Made validation patterns more specific (won't trigger on "time range")

### Short Term (This Week):

**1. Add Session Timeout** (30 minutes)
```javascript
// File: server/llm/conversationManager.js
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

getSession(sessionId) {
  const session = this.sessions.get(sessionId);

  if (session) {
    const age = Date.now() - session.lastActivity;
    if (age > SESSION_TIMEOUT) {
      console.log(`♻️  Session ${sessionId} expired (${Math.floor(age / 1000)}s old) - clearing context`);
      this.sessions.delete(sessionId);
      return this.createNewSession(sessionId);
    }
    session.lastActivity = Date.now();
  }

  return session || this.createNewSession(sessionId);
}

createNewSession(sessionId) {
  const session = {
    messages: [],
    intermediateResults: [],
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  this.sessions.set(sessionId, session);
  return session;
}
```

**2. Add Context Info to Responses**
```javascript
// File: server/llm/queryProcessor.js
async processQuery(userQuery, sessionId = 'default') {
  const context = conversationManager.getContext(sessionId);

  // ... process query ...

  return {
    success: true,
    data: results,
    narrative: narrative,
    contextInfo: {
      hasContext: context.messages.length > 1,
      messageCount: context.messages.length,
      canClear: true,
      summary: context.messages.length > 1
        ? `Following up on: "${context.messages[context.messages.length - 2].content.substring(0, 50)}..."`
        : null
    }
  };
}
```

**3. Add Clear Context Command**
```javascript
// File: server/llm/queryProcessor.js
quickValidate(query) {
  // Check for context control commands
  if (/^\/clear|^\/new|start fresh|new conversation/i.test(query)) {
    conversationManager.clearSession(sessionId);
    return {
      valid: false,
      clarification: {
        question: '✨ Starting a new conversation',
        explanation: 'Previous context has been cleared. I\'m ready for a fresh start!',
        alternatives: [{
          option: 'Got it, let me ask my question',
          description: 'Continue with a new query'
        }],
        suggestedQueries: [
          'Show me top performing posts',
          'What is the sentiment on Instagram?',
          'Which ad campaigns have the best ROAS?'
        ]
      }
    };
  }

  // ... rest of validation
}
```

### Medium Term (Next Sprint):

**4. UI Integration**
- Add "Clear Context" button to client
- Show context indicator when active
- Display conversation history panel (collapsible)

**5. Smart Topic Detection**
- Use LLM to detect topic changes
- Ask user for clarification when topic shifts

---

## Testing Plan

### Test Scenarios:

1. **Single Query** (No Context)
   - User asks one question
   - Response should show: "No previous context"
   - Clear context button should be disabled/hidden

2. **Follow-up Query** (With Context)
   - User asks question 1
   - User asks related question 2
   - Response should show: "Following up on: [question 1]"
   - Clear context button should be active

3. **Topic Change** (Context Confusion)
   - User asks about Facebook posts
   - User asks about Instagram sentiment
   - System should ideally detect topic change or timeout should clear context

4. **Clarification Response**
   - User asks impossible query
   - User clicks clarification option
   - Option text should NOT trigger validation again ✅ (Already fixed)

5. **Session Timeout**
   - User asks question
   - Wait 30 minutes
   - User asks new question
   - Context should be cleared automatically

6. **Clear Command**
   - User types "/clear" or "start fresh"
   - Context should be cleared
   - System confirms with message

---

## Success Criteria

✅ **Users understand when context is active**
   - Context indicator shows in UI when applicable

✅ **Users can control context**
   - Clear button or `/clear` command works

✅ **Context doesn't cause confusion**
   - Session timeout prevents stale context
   - Generic clarification options don't retrigger validation

✅ **Follow-up queries work naturally**
   - System correctly interprets context when appropriate

---

## Current Status

✅ **Completed Today**:
1. Fixed validation patterns to not match generic phrases
2. Made clarification options more generic
3. Documented the issue and solutions

⏳ **Pending** (Documented for implementation):
1. Session timeout (30 min)
2. Context info in responses
3. Clear context command
4. UI integration

**Estimated Effort**: 2-3 hours for items 1-3, additional time for UI integration
