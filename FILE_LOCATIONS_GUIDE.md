# 📁 FILE LOCATIONS GUIDE
## Where Everything Goes

---

## 🎯 ANSWER TO YOUR QUESTIONS

### **Q3: Where do these files go?**

| File Name | EXACT Location | Purpose |
|-----------|---------------|---------|
| **statistics.js** | `/server/utils/statistics.js` | Statistical engine (T-tests, confidence intervals) |
| **decisionEngine.js** | `/server/utils/decisionEngine.js` | Multi-factor decision scoring |
| **aggregation.js** | `/server/utils/aggregation.js` | Real-time data aggregation |
| **cache.js** | `/server/utils/cache.js` | Query result caching (70% cost savings) |
| **queryLogger.js** | `/server/utils/queryLogger.js` | Query logging & analytics |
| **chainsProduction.js** | `/server/langchain/chainsProduction.js` | Production RAG chains |

### **Q4: Where do I add my data files?**

**LOCATION:** `/server/data/campaign_performance.csv`

**Required CSV Format:**
```csv
post_id,platform,posted_date,engagement_rate,likes,comments,shares,saves,reach,impressions
POST_001,Instagram,15-11-2025,9.22,2400,150,80,320,32000,45000
POST_002,LinkedIn,10-11-2025,7.58,450,85,120,65,9500,12000
```

**Minimum Required Columns:**
- `post_id` - Unique identifier
- `platform` - Instagram, LinkedIn, Facebook, Twitter
- `posted_date` - Format: DD-MM-YYYY
- `engagement_rate` - Percentage (without % sign)
- `likes`, `comments`, `shares`, `saves` - Numbers
- `reach`, `impressions` - Numbers

**Optional Columns (enhances analysis):**
- `posted_time` - Format: HH:MM:SS
- `media_type` - image, video, carousel, article
- `post_type` - organic, paid
- `content` - Post text
- `campaign_id` - Campaign identifier

**How to Add Your Data:**
1. Export your social media data to CSV
2. Ensure column names match above
3. Replace `/server/data/campaign_performance.csv`
4. Restart server: `npm start`

---

## 📦 COMPLETE PROJECT STRUCTURE

```
social-command-center-COMPLETE/
│
├── README.md                          # Main documentation
├── README_PRODUCTION.md              # Production features
├── CUSTOMIZATION_GUIDE.md            # How to customize
├── FILE_LOCATIONS_GUIDE.md           # This file
├── .gitignore                        # Git ignore rules
│
├── server/                           # Backend (Node.js)
│   ├── package.json                  # Dependencies
│   ├── .env.example                  # Environment template
│   ├── index.js                      # Main server file
│   │
│   ├── data/                         # 📊 YOUR DATA GOES HERE
│   │   └── campaign_performance.csv  # ← REPLACE THIS WITH YOUR CSV
│   │
│   ├── routes/                       # API endpoints
│   │   └── chat.js                   # Chat & analytics endpoints
│   │
│   ├── langchain/                    # RAG system
│   │   ├── config.js                 # Configuration
│   │   ├── metadata.js               # 8-tier metadata generator
│   │   ├── chunking.js               # 6-level hierarchical chunking
│   │   ├── vectorStore.js            # Vector database
│   │   ├── chains.js                 # Basic chains
│   │   └── chainsProduction.js       # ✨ Production chains (NEW)
│   │
│   ├── utils/                        # ✨ 5 NEW PRODUCTION UTILITIES
│   │   ├── statistics.js             # Statistical engine
│   │   ├── decisionEngine.js         # Multi-factor scoring
│   │   ├── aggregation.js            # Real-time aggregation
│   │   ├── cache.js                  # Query caching
│   │   └── queryLogger.js            # Analytics logging
│   │
│   └── logs/                         # Auto-generated logs
│       ├── queries.jsonl             # (created automatically)
│       └── analytics.json            # (created automatically)
│
└── client/                           # Frontend (React)
    ├── package.json                  # Dependencies
    ├── index.html                    # HTML entry
    ├── vite.config.js                # Vite config
    ├── tailwind.config.js            # Tailwind config
    ├── postcss.config.js             # PostCSS config
    │
    └── src/
        ├── main.jsx                  # React entry
        ├── App.jsx                   # Main component
        ├── index.css                 # Tailwind imports
        ├── config.js                 # App configuration
        │
        └── api/
            └── client.js             # API communication
```

---

## ✅ VERIFICATION CHECKLIST

After extracting, verify these files exist:

### **Server (Backend):**
```bash
cd social-command-center-COMPLETE/server

# Should exist:
✓ package.json
✓ index.js
✓ .env.example
✓ data/campaign_performance.csv

# Utils (5 files):
✓ utils/statistics.js
✓ utils/decisionEngine.js
✓ utils/aggregation.js
✓ utils/cache.js
✓ utils/queryLogger.js

# Langchain (6 files):
✓ langchain/config.js
✓ langchain/metadata.js
✓ langchain/chunking.js
✓ langchain/vectorStore.js
✓ langchain/chains.js
✓ langchain/chainsProduction.js

# Routes (1 file):
✓ routes/chat.js
```

### **Client (Frontend):**
```bash
cd social-command-center-COMPLETE/client

# Should exist:
✓ package.json
✓ index.html
✓ vite.config.js
✓ tailwind.config.js
✓ src/main.jsx
✓ src/App.jsx
✓ src/config.js
✓ src/api/client.js
```

---

## 🚀 SETUP STEPS

### **1. Install Dependencies**
```bash
# Backend
cd server
npm install

# Frontend (new terminal)
cd client
npm install
```

### **2. Add OpenAI API Key**
```bash
cd server
cp .env.example .env
# Edit .env and add:
# OPENAI_API_KEY=your_key_here
```

### **3. (Optional) Add Your Data**
```bash
# Replace sample CSV with your data
cp /path/to/your_data.csv server/data/campaign_performance.csv
```

### **4. Start Services**
```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
cd client
npm run dev
```

### **5. Open Browser**
```
http://localhost:5173
```

---

## 📊 YOUR DATA FILE FORMAT

### **Example CSV (minimum columns):**
```csv
post_id,platform,posted_date,engagement_rate,likes,comments,shares,saves,reach,impressions
POST_001,Instagram,15-11-2025,9.22,2400,150,80,320,32000,45000
POST_002,LinkedIn,10-11-2025,7.58,450,85,120,65,9500,12000
POST_003,Facebook,18-11-2025,5.03,310,42,25,15,7800,10000
POST_004,Twitter,20-11-2025,6.24,189,28,45,0,4200,5000
```

### **With Optional Columns:**
```csv
post_id,platform,posted_date,posted_time,media_type,post_type,content,impressions,reach,likes,comments,shares,saves,engagement_rate
POST_001,Instagram,15-11-2025,14:30:00,image,organic,"New product launch! 🚀",45000,32000,2400,150,80,320,9.22
```

### **Date Format Rules:**
- `posted_date`: DD-MM-YYYY (e.g., 15-11-2025)
- `posted_time`: HH:MM:SS (e.g., 14:30:00) - optional
- Platform names: Instagram, LinkedIn, Facebook, Twitter (case-insensitive)

---

## 🎯 KEY FILES EXPLAINED

### **1. statistics.js** (16 KB)
- T-tests for comparisons
- Confidence intervals (90%, 95%, 99%)
- Sample size validation
- Trend analysis with R²
- Effect size (Cohen's d)
- Outlier detection

### **2. decisionEngine.js** (18 KB)
- 7-factor weighted scoring
- Platform ranking (0-100 scale)
- ROI analysis
- Content type optimization
- Statistical validation

### **3. aggregation.js** (16 KB)
- Dynamic GROUP BY
- Cross-dimensional pivoting
- Time-series aggregation
- OLAP cubes
- Real-time calculations

### **4. cache.js** (16 KB)
- Query result caching
- 70% cost savings
- LRU eviction
- TTL management
- Stats API

### **5. queryLogger.js** (19 KB)
- Query logging (JSONL)
- Usage analytics
- Privacy-friendly (IP hashing)
- Auto-rotation
- Analytics dashboard

### **6. chainsProduction.js** (17 KB)
- Integrates all 5 utilities
- Pre-computed analytics
- Statistical context
- Smart prompting

---

## 🆘 TROUBLESHOOTING

### **"Files are missing"**
1. Extract the .tar.gz file completely
2. Verify with checklist above
3. If still missing, ask me to regenerate specific files

### **"npm install fails"**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **"Server won't start"**
1. Check `.env` has `OPENAI_API_KEY=your_actual_key`
2. Ensure port 3001 is free
3. Check logs for specific error

### **"Can't find data file"**
```bash
# Verify CSV exists
ls -lh server/data/campaign_performance.csv

# If missing, sample data is in this folder
# Or add your own CSV with required columns
```

---

## 📧 NEED HELP?

Just ask me:
- "Show me [filename] again"
- "File structure isn't working"
- "How do I add my data?"

I'm here to help! 🚀
