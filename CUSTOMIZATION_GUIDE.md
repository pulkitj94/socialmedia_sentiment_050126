# 🎨 Customization Guide

This guide shows you exactly how to customize your Social Media Analytics Platform (including both the Command Center and Sentiment Dashboard) for your specific needs.

---

## 🎯 Quick Customization Index

| What to Change | File to Edit | Difficulty |
|---------------|--------------|------------|
| AI Personality | `/server/langchain/config.js` | ⭐ Easy |
| Sample Queries | `/client/src/config.js` | ⭐ Easy |
| App Title/Branding | `/client/src/config.js` | ⭐ Easy |
| UI Colors | `/client/tailwind.config.js` | ⭐ Easy |
| Platform Names | `/server/langchain/config.js` | ⭐⭐ Medium |
| Response Format | `/server/langchain/config.js` | ⭐⭐ Medium |
| RAG Retrieval | `/server/langchain/config.js` | ⭐⭐⭐ Advanced |
| Metadata System | `/server/langchain/metadata.js` | ⭐⭐⭐ Advanced |
| Sentiment Thresholds | `/scripts/sentiment_engine.py` | ⭐⭐ Medium |
| Simulation Scenarios | `/scripts/mock_streamer.py` | ⭐⭐ Medium |
| Auto-Refresh Interval | `/client/src/components/SentimentDashboard.jsx` | ⭐ Easy |

---

## 1️⃣ Change AI Personality & Behavior

### File: `/server/langchain/config.js`

**Find this section (Line ~15):**
```javascript
systemPrompt: `You are an expert Social Media Intelligence Analyst...`
```

**Example Customizations:**

**Make it more casual:**
```javascript
systemPrompt: `Hey! I'm your social media buddy 🎉

I help you understand what's working (and what's not) on Instagram, LinkedIn, Facebook, and Twitter.

WHAT I DO:
- Show you which posts are crushing it
- Compare platforms to find your sweet spot
- Recommend content that'll actually perform
- Give you real numbers, not fluff

STYLE:
- Keep it friendly and conversational
- Use emojis when it makes sense
- Explain things simply (no jargon unless needed)
- Always back claims with actual data

Let's make your social media awesome! 🚀`
```

**Make it more corporate/professional:**
```javascript
systemPrompt: `I am a professional Social Media Analytics Platform.

CAPABILITIES:
- Comprehensive multi-platform performance analysis
- Data-driven content strategy recommendations
- Competitive benchmarking and trend identification
- Executive-level reporting and insights

RESPONSE PROTOCOL:
1. Executive Summary (key finding)
2. Supporting Data (metrics and evidence)
3. Strategic Recommendations (actionable steps)
4. Expected Outcomes (projected impact)

All analyses are data-driven and statistically validated.`
```

---

## 2️⃣ Customize Sample Queries

### File: `/client/src/config.js`

**Find this section (Line ~25):**
```javascript
sampleQueries: [
  {
    category: 'Performance Insights',
    icon: '📊',
    queries: [...]
  }
]
```

**Add your own category:**
```javascript
sampleQueries: [
  {
    category: 'Performance Insights',
    icon: '📊',
    queries: [
      'Most liked post on Instagram for the month of November?',
      'Which platform performed better in Q4?',
      // ... existing queries
    ]
  },
  {
    category: 'Your Custom Category',  // ⬅️ ADD THIS
    icon: '🎯',
    queries: [
      'Your specific question here?',
      'Another custom query?',
      'What about this metric?'
    ]
  },
  // ... other categories
]
```

**Industry-Specific Examples:**

**E-commerce:**
```javascript
{
  category: 'Sales & Conversions',
  icon: '💰',
  queries: [
    'Which posts drove the most saves? (purchase intent)',
    'Product posts vs lifestyle posts performance?',
    'Best performing product categories this month?',
    'Posts with highest engagement during sale periods?'
  ]
}
```

**B2B/SaaS:**
```javascript
{
  category: 'Lead Generation',
  icon: '🎯',
  queries: [
    'LinkedIn vs Twitter for thought leadership?',
    'Which educational content performs best?',
    'Best time to post for B2B audience?',
    'Case study vs tip posts - which converts better?'
  ]
}
```

---

## 3️⃣ Change App Title & Branding

### File: `/client/src/config.js`

**Find this section (Line ~15):**
```javascript
appName: 'Social Command Center',
appTagline: 'AI-Powered Social Media Intelligence',
```

**Customize for your brand:**
```javascript
appName: 'YourBrand Analytics', // ⬅️ Your company/project name
appTagline: 'Smart Social Insights, Powered by AI',
appDescription: 'Ask anything about your social performance',
```

**Also update:** `/client/index.html` (Line 7)
```html
<title>YourBrand Analytics - AI Social Media Intelligence</title>
```

---

## 4️⃣ Customize UI Colors

### File: `/client/tailwind.config.js`

**Find the colors section (Line ~10):**
```javascript
colors: {
  primary: {
    DEFAULT: '#7c3aed', // Purple
    // ... shades
  },
  accent: {
    DEFAULT: '#ec4899', // Pink
    // ... shades
  }
}
```

**Change to your brand colors:**

**Example: Blue & Orange theme:**
```javascript
colors: {
  primary: {
    DEFAULT: '#3b82f6', // Blue
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  accent: {
    DEFAULT: '#f97316', // Orange
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
  },
  success: {
    DEFAULT: '#10b981', // Green
  },
  warning: {
    DEFAULT: '#ef4444', // Red
  }
}
```

**Example: Corporate/Professional (Grey & Blue):**
```javascript
colors: {
  primary: {
    DEFAULT: '#1e3a8a', // Dark Blue
    600: '#1e3a8a',
    700: '#1e40af',
  },
  accent: {
    DEFAULT: '#6b7280', // Grey
    600: '#4b5563',
  }
}
```

---

## 5️⃣ Add New Platforms

### File: `/server/langchain/config.js`

**Find this section (Line ~48):**
```javascript
domain: {
  platforms: ['Instagram', 'LinkedIn', 'Facebook', 'Twitter'],
  // ...
}
```

**Add new platforms:**
```javascript
domain: {
  platforms: ['Instagram', 'LinkedIn', 'Facebook', 'Twitter', 'TikTok', 'YouTube'], // ⬅️ ADD HERE
  // ...
}
```

**Also update metadata extraction (Line ~210):**
```javascript
platforms: {
  instagram: ['instagram', 'ig', 'insta'],
  linkedin: ['linkedin', 'li'],
  facebook: ['facebook', 'fb', 'meta'],
  twitter: ['twitter', 'tweet', 'x.com'],
  tiktok: ['tiktok', 'tt'],        // ⬅️ ADD THESE
  youtube: ['youtube', 'yt', 'video']  // ⬅️ ADD THESE
}
```

**Update your CSV data** to include the new platforms in the `platform` column.

---

## 6️⃣ Modify Response Structure

### File: `/server/langchain/config.js`

**Find this section (Line ~22):**
```javascript
RESPONSE STRUCTURE (use this for analytical queries):
1. **Key Insight** - The main takeaway
2. **Data Evidence** - Specific metrics
3. **Analysis** - Why this is happening
4. **Recommendation** - Actionable next steps
5. **Context** - How this compares
```

**Customize the structure:**

**Simpler format:**
```javascript
RESPONSE STRUCTURE:
- Quick Answer (1-2 sentences)
- Key Numbers (most important metrics)
- What to Do (1-3 action items)
```

**Executive format:**
```javascript
RESPONSE STRUCTURE:
1. Executive Summary (bottom line up front)
2. Key Performance Indicators (3-5 metrics)
3. Trend Analysis (what's changing)
4. Strategic Recommendations (prioritized)
5. Expected ROI (quantified outcomes)
```

---

## 7️⃣ Adjust RAG Retrieval Settings

### File: `/server/langchain/config.js`

**Find this section (Line ~65):**
```javascript
retrieval: {
  topK: 15,                  // ⬅️ Number of chunks to retrieve
  similarityThreshold: 0.3,  // ⬅️ Minimum similarity (0-1)
  maxChunksToLLM: 20,        // ⬅️ Max chunks sent to LLM
}
```

**Tune for performance:**

**Faster responses (less thorough):**
```javascript
retrieval: {
  topK: 8,                   // Retrieve fewer chunks
  similarityThreshold: 0.5,  // More selective
  maxChunksToLLM: 10,
}
```

**More comprehensive (slower):**
```javascript
retrieval: {
  topK: 25,                  // Retrieve more chunks
  similarityThreshold: 0.2,  // Less selective
  maxChunksToLLM: 30,
}
```

---

## 8️⃣ Add Custom Metrics

### File: `/server/langchain/config.js`

**Find this section (Line ~50):**
```javascript
primaryMetrics: [
  'engagement_rate',
  'likes',
  // ... existing metrics
]
```

**Add your metrics:**
```javascript
primaryMetrics: [
  'engagement_rate',
  'likes',
  'comments',
  'shares',
  'saves',
  'reach',
  'impressions',
  'click_through_rate',    // ⬅️ ADD CUSTOM METRICS
  'conversion_rate',       // ⬅️ ADD THESE IF IN YOUR DATA
  'video_views',          // ⬅️ ADD THESE TOO
]
```

**Note:** Ensure these columns exist in your CSV!

---

## 9️⃣ Modify Welcome Message

### File: `/client/src/config.js`

**Find this section (Line ~72):**
```javascript
welcomeMessage: {
  show: true,
  title: 'Welcome to Social Command Center! 👋',
  content: `I'm your AI-powered social media analyst...`
}
```

**Customize:**
```javascript
welcomeMessage: {
  show: true,
  title: 'Hey there! 👋',
  content: `Welcome to [Your Company] Analytics!

I can help you:
• Track what's working across all platforms
• Find your best content ideas
• Get recommendations to boost engagement

Just ask me anything about your social media performance!`,
}
```

**Disable welcome message:**
```javascript
welcomeMessage: {
  show: false,  // ⬅️ Set to false
}
```

---

## 🔟 Change LLM Model

### File: `/server/langchain/config.js`

**Find this section (Line ~100):**
```javascript
llm: {
  modelName: 'gpt-4o-mini',  // ⬅️ Current model
  temperature: 0.1,
  maxTokens: 2000,
}
```

**Use different model:**

**More powerful (GPT-4):**
```javascript
llm: {
  modelName: 'gpt-4o',       // More expensive but better
  temperature: 0.1,
  maxTokens: 3000,
}
```

**More creative:**
```javascript
llm: {
  modelName: 'gpt-4o-mini',
  temperature: 0.7,           // Higher = more creative
  maxTokens: 2000,
}
```

**More factual:**
```javascript
llm: {
  modelName: 'gpt-4o-mini',
  temperature: 0.0,           // Lower = more deterministic
  maxTokens: 2000,
}
```

---

## 🔧 Advanced: Custom Metadata

### File: `/server/langchain/metadata.js`

**Add custom metadata fields:**

Find Tier 4 function (Line ~150):
```javascript
export function generateTier4Metadata(post) {
  // ... existing code ...
  
  return {
    content_length: contentLength,
    // ... existing fields ...
    
    // ⬅️ ADD YOUR CUSTOM FIELDS HERE:
    custom_campaign_id: post.campaign_id || null,
    custom_target_audience: post.audience || 'general',
    custom_product_category: extractProductCategory(post.content),
  };
}

// Helper function
function extractProductCategory(content) {
  if (/shoe|footwear|sneaker/i.test(content)) return 'footwear';
  if (/shirt|clothing|apparel/i.test(content)) return 'clothing';
  return 'other';
}
```

---

## 📊 Testing Your Customizations

After making changes:

1. **Restart the server:**
```bash
cd server
npm start
```

2. **Test with a query** to ensure changes work

3. **Check logs** for any errors

4. **Iterate** based on results

---

## 🎯 Common Customization Patterns

### Pattern 1: Industry-Specific Terminology

**Location:** `/server/langchain/config.js` - systemPrompt

Replace generic terms with industry-specific ones:
- E-commerce: "engagement" → "product interest", "saves" → "cart adds"
- B2B: "likes" → "professional endorsements", "shares" → "thought leadership reach"

### Pattern 2: Company Voice

**Location:** `/server/langchain/config.js` - systemPrompt

Add voice guidelines:
```javascript
TONE & VOICE:
- Use "we" not "I" (team approach)
- Be encouraging, never critical
- Celebrate wins, learn from underperformance
- Data first, opinions second
```

### Pattern 3: Custom KPIs

**Location:** `/server/langchain/config.js` - primaryMetrics

Focus on what matters to your business:
```javascript
primaryMetrics: [
  'conversion_rate',        // Most important
  'cost_per_engagement',   // Second priority
  'engagement_rate',       // Nice to have
]
```

---

## 🆘 Customization Troubleshooting

**"Changes not reflected"**
- Restart server after config changes
- Hard refresh browser (Cmd/Ctrl + Shift + R)
- Check for syntax errors in files

**"Server won't start after changes"**
- Check for missing commas, brackets
- Review recent changes
- Revert to last working state

**"Queries return errors"**
- Ensure added metrics exist in CSV
- Validate metadata field names
- Check LangChain config syntax

---

## 💡 Pro Tips

1. **Start small**: Change one thing at a time
2. **Test frequently**: After each change, test a query
3. **Keep backups**: Copy files before major changes
4. **Use comments**: Mark your customizations with `// CUSTOM:`
5. **Document**: Note why you made changes

---

## 📝 Customization Checklist

Before demoing your project:

- [ ] Changed app name and tagline
- [ ] Updated sample queries for your use case
- [ ] Customized AI personality
- [ ] Adjusted UI colors (optional)
- [ ] Added custom metrics (if needed)
- [ ] Modified welcome message
- [ ] Tested all customizations
- [ ] Documented changes made

---

## 1️⃣1️⃣ Customize Sentiment Health Thresholds

### File: `/scripts/sentiment_engine.py`

**Find the health score calculation section:**
```python
def calculate_health_score(positive, negative, neutral):
    total = positive + negative + neutral
    if total == 0:
        return 50.0

    # Health score = (positive - negative) / total * 100
    score = ((positive - negative) / total) * 100
    return max(0, min(100, score))
```

**Customize thresholds:**

**Give more weight to positives:**
```python
def calculate_health_score(positive, negative, neutral):
    total = positive + negative + neutral
    if total == 0:
        return 50.0

    # Weight positives more heavily
    weighted_score = ((positive * 1.5 - negative) / total) * 100
    return max(0, min(100, weighted_score))
```

**Penalize negatives more harshly:**
```python
def calculate_health_score(positive, negative, neutral):
    total = positive + negative + neutral
    if total == 0:
        return 50.0

    # Negatives count double
    score = ((positive - negative * 2) / total) * 100
    return max(0, min(100, score))
```

**Change gauge color thresholds:**

Edit `/client/src/components/SentimentSection.jsx`:

```javascript
// Find the color mapping function
const getScoreColor = (score) => {
  if (score >= 70) return '#10b981';  // Green - Good
  if (score >= 50) return '#f59e0b';  // Yellow - Warning
  return '#ef4444';                   // Red - Crisis
};
```

**Make it more sensitive:**
```javascript
const getScoreColor = (score) => {
  if (score >= 80) return '#10b981';  // Green - Excellent
  if (score >= 60) return '#f59e0b';  // Yellow - Needs attention
  return '#ef4444';                   // Red - Critical
};
```

---

## 1️⃣2️⃣ Customize Simulation Scenarios

### File: `/scripts/mock_streamer.py`

**Find scenario definitions:**
```python
SCENARIO_CONFIGS = {
    "normal": {
        "positive_ratio": 0.7,
        "negative_ratio": 0.1,
        "neutral_ratio": 0.2,
        "comment_count": 50
    },
    "crisis": {
        "positive_ratio": 0.2,
        "negative_ratio": 0.6,
        "neutral_ratio": 0.2,
        "comment_count": 100
    },
    "viral": {
        "positive_ratio": 0.8,
        "negative_ratio": 0.05,
        "neutral_ratio": 0.15,
        "comment_count": 200
    }
}
```

**Add custom scenario:**
```python
SCENARIO_CONFIGS = {
    # ... existing scenarios ...
    "mixed": {
        "positive_ratio": 0.5,
        "negative_ratio": 0.3,
        "neutral_ratio": 0.2,
        "comment_count": 75
    },
    "controversy": {
        "positive_ratio": 0.4,
        "negative_ratio": 0.5,
        "neutral_ratio": 0.1,
        "comment_count": 150
    }
}
```

**Add UI button in `/client/src/components/SentimentDashboard.jsx`:**

Find the simulation buttons section and add:
```javascript
<button
  onClick={() => triggerSimulation('mixed')}
  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
>
  Mixed Response
</button>
```

---

## 1️⃣3️⃣ Adjust Auto-Refresh Interval

### File: `/client/src/components/SentimentDashboard.jsx`

**Find the polling interval:**
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    fetchSentimentData();
  }, 120000); // 2 minutes = 120000ms

  return () => clearInterval(interval);
}, []);
```

**Change refresh rate:**

**More frequent (30 seconds):**
```javascript
const interval = setInterval(() => {
  fetchSentimentData();
}, 30000); // 30 seconds
```

**Less frequent (5 minutes):**
```javascript
const interval = setInterval(() => {
  fetchSentimentData();
}, 300000); // 5 minutes
```

**Disable auto-refresh:**
```javascript
// Comment out or remove the entire useEffect interval
// Users will need to manually refresh
```

---

## 1️⃣4️⃣ Customize AI Reply Generation

### File: `/server/index.js`

**Find the reply generation endpoint:**
```javascript
app.post('/api/sentiment/generate-reply', async (req, res) => {
  const { comment, platform } = req.body;

  const prompt = `Generate a professional, empathetic response to this ${platform} comment: "${comment}"`;
  // ... OpenAI call
});
```

**Customize reply tone:**

**More casual/friendly:**
```javascript
const prompt = `Generate a friendly, warm response to this ${platform} comment.
Be conversational and show genuine care: "${comment}"

Style: Casual, friendly, use emojis if appropriate`;
```

**More corporate:**
```javascript
const prompt = `Generate a professional corporate response to this ${platform} comment.
Maintain brand professionalism and offer solutions: "${comment}"

Style: Professional, solution-focused, acknowledge concern`;
```

**Platform-specific responses:**
```javascript
const toneGuide = {
  Instagram: "casual, friendly, use emojis",
  LinkedIn: "professional, business-focused",
  Facebook: "warm, community-oriented",
  Twitter: "concise, direct, under 280 characters"
};

const prompt = `Generate a ${toneGuide[platform]} response to: "${comment}"`;
```

---

## 1️⃣5️⃣ Customize Negative Alert Criteria

### File: `/scripts/sentiment_engine.py`

**Find the negative alert section:**
```python
# Filter for negative comments
negative_alerts = df[df['sentiment_label'] == 'Negative'].head(10)
```

**Customize criteria:**

**Only show very negative (high confidence):**
```python
# Assuming you have a confidence score
negative_alerts = df[
    (df['sentiment_label'] == 'Negative') &
    (df['confidence'] > 0.8)
].head(10)
```

**Show more alerts:**
```python
negative_alerts = df[df['sentiment_label'] == 'Negative'].head(25)
```

**Filter by keywords:**
```python
priority_keywords = ['terrible', 'worst', 'scam', 'fraud', 'refund']

def is_priority_negative(text):
    return any(keyword in text.lower() for keyword in priority_keywords)

df['is_priority'] = df['comment_text'].apply(is_priority_negative)
negative_alerts = df[
    (df['sentiment_label'] == 'Negative') &
    (df['is_priority'] == True)
].head(15)
```

---

## 1️⃣6️⃣ Change Sentiment Model

### File: `/scripts/sentiment_engine.py`

**Current model:**
```python
model_name = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)
```

**Use different model:**

**Better multilingual support:**
```python
model_name = "nlptown/bert-base-multilingual-uncased-sentiment"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)
```

**Faster but less accurate:**
```python
model_name = "distilbert-base-uncased-finetuned-sst-2-english"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)
```

---

## 1️⃣7️⃣ Customize Trend Chart Display

### File: `/client/src/components/SentimentTrend.jsx`

**Find the chart configuration:**
```javascript
<LineChart data={data}>
  <XAxis dataKey="timestamp" />
  <YAxis domain={[0, 100]} />
  <Line type="monotone" dataKey="Instagram" stroke="#E1306C" />
  // ... other platforms
</LineChart>
```

**Show more data points:**
```javascript
// In parent component SentimentDashboard.jsx
const chartData = historyData.slice(-30); // Show last 30 instead of 15
```

**Change Y-axis range (focus on variation):**
```javascript
<YAxis domain={[40, 100]} /> // Only show 40-100 range
```

**Add smoothing to lines:**
```javascript
<Line type="monotone" dataKey="Instagram" stroke="#E1306C" strokeWidth={2} dot={false} />
```

---

## 1️⃣8️⃣ Customize Hourly Cron Job

### File: `/server/index.js`

**Find the cron schedule:**
```javascript
cron.schedule('0 * * * *', () => {
  runSimulationScenario("normal");
});
```

**Change frequency:**

**Every 30 minutes:**
```javascript
cron.schedule('*/30 * * * *', () => {
  runSimulationScenario("normal");
});
```

**Every 6 hours:**
```javascript
cron.schedule('0 */6 * * *', () => {
  runSimulationScenario("normal");
});
```

**Daily at 9 AM:**
```javascript
cron.schedule('0 9 * * *', () => {
  runSimulationScenario("normal");
});
```

**Disable automatic simulation:**
```javascript
// Comment out the entire cron.schedule block
// Run simulations manually via API only
```

---

## 📊 Testing Your Sentiment Customizations

After making changes:

1. **Restart Python scripts:**
```bash
cd scripts
python3 sentiment_engine.py
```

2. **Restart the server:**
```bash
cd server
npm start
```

3. **Test simulation scenarios** from the UI

4. **Check sentiment calculations** in generated files:
   - `enriched_comments_sentiment.csv`
   - `platform_sentiment_summary.json`

5. **Verify UI updates** on the Sentiment Health page

---

Happy customizing! 🎨✨
