# 🎨 Customization Guide

This guide shows you exactly how to customize your Social Media Command Center for your specific needs.

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

Happy customizing! 🎨✨
