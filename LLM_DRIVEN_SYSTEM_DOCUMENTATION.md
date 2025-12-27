# LLM-Driven Dynamic Filter System Documentation

## Overview

The Social Command Center has been upgraded to use an **LLM-driven dynamic filtering system** that eliminates regex patterns and uses two-stage LLM processing for intelligent query understanding and response generation.

---

## System Architecture

### **Flow Diagram**

```
User Query
    ↓
┌─────────────────────────────────────────────┐
│  1. METADATA EXTRACTION (Cached)            │
│  → Automatic schema detection               │
│  → Column type inference                    │
│  → Unique value extraction                  │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  2. LLM CALL #1: FILTER GENERATION          │
│  → Receives: User query + Metadata          │
│  → Generates: JSON filter specification     │
│  → Includes: Complex AND/OR logic           │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  3. FILTER VALIDATION                       │
│  → Validates column existence               │
│  → Checks operator validity                 │
│  → Type checking                            │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  4. DATA PROCESSING (Node.js)               │
│  → Apply filters to CSV data                │
│  → Group and aggregate                      │
│  → Sort and limit results                   │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  5. LLM CALL #2: RESPONSE FRAMING           │
│  → Receives: Original query + Processed data│
│  → Generates: Natural language insights     │
│  → Includes: Specific numbers & comparisons │
└─────────────────────────────────────────────┘
    ↓
Natural Language Response
```

---

## Key Features

### ✅ **No Regex Patterns**
- Zero hardcoded regex patterns
- LLM understands natural language variations
- Handles typos, synonyms, and complex queries

### ✅ **Two-Stage LLM Processing**
1. **Stage 1**: Generate structured filter specifications
2. **Stage 2**: Frame human-readable responses

### ✅ **Automatic Metadata Detection**
- Auto-detects column types (numeric, text, date, categorical)
- Extracts unique values for categorical columns
- Provides numeric ranges for continuous variables
- No manual configuration needed

### ✅ **Complex Filter Support**
- AND/OR logic natively supported
- Nested conditions
- Multiple operators per query

### ✅ **Intelligent Query Understanding**
- Understands date references ("last month", "November", "Q4")
- Handles comparative queries ("Facebook vs Instagram")
- Supports complex filters ("videos with >5% engagement")

---

## File Structure

### **New Files Created**

```
server/
├── llm/
│   ├── queryProcessor.js          # Main orchestrator
│   ├── filterGenerator.js         # LLM Call #1
│   └── responseFramer.js          # LLM Call #2
├── utils/
│   ├── metadataExtractor.js       # Schema detection
│   ├── filterValidator.js         # Validation logic
│   └── dataProcessor.js           # Filter application
```

### **Modified Files**

```
server/
└── routes/
    └── chat.js                    # Updated to use new system
```

---

## Component Details

### **1. MetadataExtractor** (`server/utils/metadataExtractor.js`)

**Purpose**: Automatically extract schema and metadata from CSV files

**Features**:
- Scans all CSV files on startup
- Detects column types (numeric, text, date, categorical)
- Extracts unique values for categorical columns
- Provides numeric ranges (min, max, avg)
- Caches metadata for performance

**Output Example**:
```json
{
  "columns": ["platform", "engagement_rate", "posted_date", ...],
  "columnTypes": {
    "platform": "text",
    "engagement_rate": "numeric",
    "posted_date": "date"
  },
  "uniqueValues": {
    "platform": ["Instagram", "Facebook", "LinkedIn", "Twitter"],
    "engagement_rate": { "min": 0.5, "max": 15.2, "avg": 6.8 }
  },
  "dateColumns": ["posted_date", "start_date", "end_date"],
  "numericColumns": ["likes", "shares", "engagement_rate", ...]
}
```

---

### **2. FilterGenerator** (`server/llm/filterGenerator.js`)

**Purpose**: LLM Call #1 - Generate filter specifications from natural language

**Input**:
- User query: `"Which platform performed best in November?"`
- Dataset metadata

**Output**:
```json
{
  "filters": [
    {
      "column": "posted_date",
      "operator": "contains",
      "value": "11-2025",
      "reason": "November = month 11"
    }
  ],
  "groupBy": ["platform"],
  "aggregate": {
    "engagement_rate": "mean",
    "likes": "sum",
    "reach": "sum"
  },
  "sortBy": {
    "column": "engagement_rate",
    "order": "desc"
  },
  "limit": 5,
  "interpretation": "User wants to compare platforms based on November performance"
}
```

**Supported Operators**:
- `equals`, `not_equals`
- `greater_than`, `less_than`, `greater_than_or_equal`, `less_than_or_equal`
- `contains`, `not_contains`, `starts_with`, `ends_with`
- `in`, `not_in`, `between`
- `after`, `before` (for dates)

**Complex Filters**:
```json
{
  "type": "or",
  "conditions": [
    { "column": "platform", "operator": "equals", "value": "Instagram" },
    { "column": "platform", "operator": "equals", "value": "Facebook" }
  ]
}
```

---

### **3. FilterValidator** (`server/utils/filterValidator.js`)

**Purpose**: Validate LLM-generated filters before applying to data

**Checks**:
- ✅ Column names exist in metadata
- ✅ Operators are valid
- ✅ Value types match column types
- ✅ Array operators (`in`, `between`) receive arrays
- ✅ Numeric operators receive numbers
- ⚠️  Warns if categorical values don't match known values

**Error Example**:
```
Filter validation failed:
- Filter [0]: Column "engagment_rate" does not exist in dataset
  (Did you mean "engagement_rate"?)
- Filter [1]: Operator "between" requires exactly 2 values [min, max]
```

---

### **4. DataProcessor** (`server/utils/dataProcessor.js`)

**Purpose**: Apply filters and process data using Node.js

**Capabilities**:
- ✅ Load and cache CSV data
- ✅ Apply complex filters (AND/OR logic)
- ✅ Group by multiple columns
- ✅ Aggregate metrics (sum, mean, median, min, max, count, std)
- ✅ Sort results
- ✅ Limit output

**Processing Pipeline**:
1. Load all CSV files → Single dataset
2. Apply filters → Filtered records
3. Group data → Grouped records
4. Aggregate metrics → Summary statistics
5. Sort → Ordered results
6. Limit → Final output

**Example Output**:
```json
{
  "data": [
    {
      "platform": "Instagram",
      "engagement_rate_mean": 8.5,
      "likes_sum": 50234,
      "reach_sum": 425000,
      "_count": 45
    },
    ...
  ],
  "summary": {
    "originalRecords": 200,
    "filteredRecords": 156,
    "resultCount": 5,
    "processingTimeMs": 45
  }
}
```

---

### **5. ResponseFramer** (`server/llm/responseFramer.js`)

**Purpose**: LLM Call #2 - Convert processed data into natural language insights

**Input**:
- Original user query
- Processed data from DataProcessor
- Filter specification applied

**Output**:
```
Based on November 2025 data, **Instagram was the best performing platform** with the following metrics:

**Top Performer: Instagram**
- Average Engagement Rate: 8.5%
- Total Likes: 50,234
- Total Posts: 45
- Average Reach per Post: 9,444

**Performance Comparison:**
- Instagram outperformed Facebook by 37% in engagement rate
- Instagram had 107% higher engagement than LinkedIn
- Instagram received 2.2x more likes than Facebook

**Rankings:**
1. **Instagram**: 8.5% engagement (45 posts)
2. **Facebook**: 6.2% engagement (38 posts)
3. **LinkedIn**: 4.1% engagement (28 posts)
4. **Twitter**: 3.8% engagement (35 posts)

**Recommendation:** Focus more resources on Instagram content creation.
```

---

### **6. QueryProcessor** (`server/llm/queryProcessor.js`)

**Purpose**: Main orchestrator that coordinates all steps

**Initialization** (on server startup):
```javascript
const queryProcessor = getQueryProcessor();
await queryProcessor.initialize(); // Extracts metadata once
```

**Processing Flow**:
```javascript
const result = await queryProcessor.processQuery(userQuery);
// Returns: { success, response, metadata, debug }
```

**Response Metadata**:
```json
{
  "processingTimeMs": 3200,
  "dataProcessingTimeMs": 45,
  "filtersApplied": [...],
  "interpretation": "...",
  "recordsAnalyzed": 156,
  "recordsTotal": 200,
  "resultsReturned": 5,
  "llmCalls": 2
}
```

---

## API Endpoints

### **POST** `/api/chat`

**Request**:
```json
{
  "message": "Which platform performed best in November?"
}
```

**Response**:
```json
{
  "success": true,
  "response": "Based on November 2025 data, Instagram was the best performing...",
  "metadata": {
    "processingTimeMs": 3200,
    "llmCalls": 2,
    "filtersApplied": [...],
    "recordsAnalyzed": 156
  },
  "debug": {
    "filterSpec": {...},
    "processedData": [...]
  }
}
```

### **GET** `/api/chat/health`

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "mode": "llm-driven",
  "features": [
    "LLM-Driven Dynamic Filter Generation ✨ NEW",
    "Intelligent Query Understanding ✨ NEW",
    "Two-Stage LLM Processing ✨ NEW",
    "No Regex Patterns"
  ],
  "systemInfo": {
    "llmModel": "gpt-4o-mini",
    "llmCalls": 2,
    "filteringEngine": "LLM + Node.js",
    "noRegexPatterns": true
  }
}
```

### **GET** `/api/chat/metadata`

**Response**:
```json
{
  "success": true,
  "metadata": {
    "totalFiles": 7,
    "totalColumns": 33,
    "categoricalColumns": ["platform", "campaign_type", "media_type", ...],
    "numericColumns": ["likes", "engagement_rate", "reach", ...],
    "dateColumns": ["posted_date", "start_date", "end_date"],
    "availableFilters": [...]
  }
}
```

---

## Example Queries

### **Simple Query**
```
Query: "Show me Instagram posts from November"

LLM generates:
{
  "filters": [
    { "column": "platform", "operator": "equals", "value": "Instagram" },
    { "column": "posted_date", "operator": "contains", "value": "11-2025" }
  ]
}

Response: "Found 45 Instagram posts from November 2025..."
```

### **Complex Query**
```
Query: "Compare videos vs images that got more than 5% engagement on Facebook or Instagram last month"

LLM generates:
{
  "filters": [
    {
      "type": "or",
      "conditions": [
        { "column": "platform", "operator": "equals", "value": "Facebook" },
        { "column": "platform", "operator": "equals", "value": "Instagram" }
      ]
    },
    { "column": "engagement_rate", "operator": "greater_than", "value": 5 },
    { "column": "posted_date", "operator": "contains", "value": "11-2025" }
  ],
  "groupBy": ["media_type"],
  "aggregate": { "engagement_rate": "mean", "likes": "sum" }
}

Response: "Video content significantly outperformed images..."
```

### **Aggregation Query**
```
Query: "What's the average engagement rate per platform?"

LLM generates:
{
  "filters": [],
  "groupBy": ["platform"],
  "aggregate": { "engagement_rate": "mean" },
  "sortBy": { "column": "engagement_rate", "order": "desc" }
}

Response: "Average engagement rates by platform: Instagram (8.5%), Facebook (6.2%)..."
```

---

## Comparison: Old vs New System

| Feature | Old (Regex) | New (LLM-Driven) |
|---------|-------------|------------------|
| **Filter Creation** | 40+ hardcoded regex patterns | LLM generates dynamically |
| **Flexibility** | Limited to predefined patterns | Unlimited natural language |
| **Maintenance** | High (update patterns) | Low (just prompts) |
| **Complex Queries** | ❌ Cannot handle nested AND/OR | ✅ Native support |
| **Typo Handling** | ❌ "Nov" works, "novemeber" fails | ✅ LLM corrects |
| **Synonyms** | ❌ "best" ≠ "top" | ✅ Understands both |
| **New Datasets** | ❌ Requires code changes | ✅ Auto-detected |
| **Transparency** | ⚠️ Hidden in code | ✅ JSON shows filters |
| **LLM Calls** | 1 (formatting only) | 2 (filter + response) |
| **Cost** | Lower | Slightly higher |
| **Accuracy** | High (deterministic) | Very High (intelligent) |

---

## Performance Considerations

### **Caching**
- Metadata cached on startup (refreshed only on restart)
- Query results cached for 1 hour
- Data loaded once per request (not cached globally)

### **Processing Times**
- Metadata extraction: ~100ms (one-time)
- LLM Call #1 (Filter): ~1000-2000ms
- Data processing: ~50-200ms
- LLM Call #2 (Response): ~1000-2000ms
- **Total**: ~2500-4500ms per uncached query

### **Cost Optimization**
- Use caching aggressively
- Consider using cheaper models for filter generation
- Batch similar queries
- Monitor token usage

---

## Error Handling

### **Validation Errors**
```json
{
  "success": false,
  "response": "I encountered an issue understanding your query...",
  "error": "Filter validation failed: Column 'engagment_rate' does not exist"
}
```

### **LLM Errors**
```json
{
  "success": false,
  "response": "I had trouble processing your query...",
  "error": "LLM did not return valid JSON"
}
```

### **Data Errors**
```json
{
  "success": true,
  "response": "No data found matching your query. Available platforms are: Instagram, Facebook..."
}
```

---

## Configuration

### **LLM Settings** (`server/langchain/config.js`)
```javascript
llm: {
  modelName: 'gpt-4o-mini',  // Model for both LLM calls
  temperature: 0.1,           // Filter generation (deterministic)
  temperatureResponse: 0.3,   // Response framing (natural)
  maxTokens: 2000
}
```

### **Filter Generation Temperature**
- **0.1** (current): Deterministic, consistent filters
- Higher: More creative but potentially inconsistent

### **Response Framing Temperature**
- **0.3** (current): Natural language, slight variation
- Lower: More formal, consistent
- Higher: More creative, varied

---

## Testing

### **Test Metadata Extraction**
```bash
curl http://localhost:3001/api/chat/metadata
```

### **Test Simple Query**
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Which platform performed best in November?"}'
```

### **Test Complex Query**
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Compare Facebook and Instagram videos with >5% engagement"}'
```

---

## Troubleshooting

### **"OpenAI API key not found"**
- Check `.env` file has valid `OPENAI_API_KEY`
- Ensure `.env` is in `/server` directory
- Restart server after updating

### **"Column does not exist in dataset"**
- Check metadata endpoint: `/api/chat/metadata`
- LLM might have used wrong column name
- Validation should catch this

### **"No data matches filters"**
- Query might be too restrictive
- Check date formats (DD-MM-YYYY)
- Verify categorical values exist

### **Slow responses**
- Enable caching (already enabled by default)
- Check network latency to OpenAI API
- Consider using faster model (gpt-3.5-turbo)

---

## Future Enhancements

### **Planned**
- [ ] Filter suggestion UI
- [ ] Query history with re-run
- [ ] Export filtered data as CSV
- [ ] Custom aggregation functions
- [ ] Multi-dataset joins
- [ ] Real-time data refresh

### **Advanced**
- [ ] Fine-tuned model for filter generation
- [ ] Streaming responses
- [ ] Query templates
- [ ] A/B testing framework

---

## Conclusion

The LLM-driven system provides:
- ✅ **Zero regex maintenance**
- ✅ **Infinite query flexibility**
- ✅ **Automatic dataset adaptation**
- ✅ **Intelligent query understanding**
- ✅ **Natural language responses**

All while maintaining high accuracy and providing transparent, auditable filter specifications.
