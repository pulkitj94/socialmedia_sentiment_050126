# Deployment Guide - Social Media Analytics Platform

**Version:** 3.0
**Last Updated:** January 4, 2026
**Status:** Production Ready with Sentiment Analysis

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running Locally](#running-locally)
6. [Production Deployment](#production-deployment)
7. [Deployment Options](#deployment-options)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Performance Optimization](#performance-optimization)

---

## Prerequisites

### Required Software

- **Node.js:** v18.x or higher (v20.x recommended)
- **npm:** v9.x or higher (comes with Node.js)
- **Python:** v3.8 or higher (for sentiment analysis)
- **pip:** Python package manager
- **Git:** For version control

### Required Accounts

- **OpenAI API Key:** Required for LLM functionality
  - Get from: https://platform.openai.com/api-keys
  - Minimum tier: Pay-as-you-go
  - Recommended model: gpt-4o-mini (cost-effective)

### System Requirements

**Development:**
- RAM: 4GB minimum, 8GB recommended
- Storage: 1GB free space (for ML models)
- OS: Windows, macOS, or Linux

**Production:**
- RAM: 4GB minimum, 8GB recommended (for ML models)
- Storage: 2GB free space (for ML models and data)
- CPU: 2 cores minimum, 4 cores recommended

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/social-command-center.git
cd social-command-center
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Install Python dependencies for sentiment analysis
cd ../scripts
pip install pandas transformers torch openai python-dotenv
# Note: torch is required for transformers models
```

**Python Dependencies:**
- `pandas`: Data processing
- `transformers`: Hugging Face ML models for sentiment analysis
- `torch`: PyTorch (required by transformers)
- `openai`: OpenAI API for reply generation
- `python-dotenv`: Environment variable management

---

## Configuration

### 1. Server Configuration

Create `.env` file in the `server` directory:

```bash
cd server
touch .env
```

Add the following environment variables:

```env
# REQUIRED
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OPTIONAL
PORT=3001
NODE_ENV=production

# LLM Configuration (optional)
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=2000

# Cache Configuration (optional)
FILTER_CACHE_SIZE=500
FILTER_CACHE_TTL=3600000
DATA_CACHE_TTL=3600000

# File Watch (optional)
DATA_DIR=./data
```

### 2. Data Setup

Place your CSV files in the `server/data` directory:

```bash
server/
  data/
    # Organic Post Data
    instagram_organic_posts.csv
    facebook_organic_posts.csv
    linkedin_organic_posts.csv
    twitter_organic_posts.csv

    # Ad Campaign Data
    instagram_ads_ad_campaigns.csv
    facebook_ads_ad_campaigns.csv
    google_ads_ad_campaigns.csv

    # Sentiment Data
    synthetic_comments_data.csv           # Input: Raw comments
    enriched_comments_sentiment.csv       # Output: AI-processed
    sentiment_history.csv                 # Output: Historical trends
    platform_sentiment_summary.json       # Output: Latest scores
```

**Required CSV Columns for Post Data:**
- `platform` - Platform name (Instagram, Facebook, etc.)
- `posted_date` or `date` - Date in DD-MM-YYYY format
- Numeric metrics: `likes`, `engagement_rate`, `reach`, etc.

**Required CSV Columns for Comment Data:**
- `comment_id` - Unique identifier
- `platform` - Platform name
- `comment_text` - The comment content
- `timestamp` - When comment was posted

**Example Post CSV Structure:**
```csv
platform,posted_date,likes,reach,engagement_rate,media_type
Instagram,15-11-2025,1234,5678,4.5,video
Facebook,16-11-2025,890,3456,3.2,image
```

**Example Comment CSV Structure:**
```csv
comment_id,platform,comment_text,timestamp
1,Instagram,Love this product!,2025-01-04 10:30
2,Facebook,Terrible service,2025-01-04 11:15
```

### 3. Client Configuration (Optional)

Edit `client/src/config.js` if needed:

```javascript
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
```

For production, create `.env` in `client` directory:

```env
REACT_APP_API_URL=https://your-api-domain.com
```

---

## Running Locally

### Development Mode

**Option 1: Run Both Services Separately**

Terminal 1 (Server):
```bash
cd server
npm run dev
```

Terminal 2 (Client):
```bash
cd client
npm run dev
```

Access application at: http://localhost:5173

**Option 2: Run Server Only (for API testing)**

```bash
cd server
npm start
```

**Option 3: Initialize Sentiment Analysis**

Before running the server, initialize sentiment data:

```bash
cd scripts
python3 sentiment_engine.py
```

This will:
- Load comments from `synthetic_comments_data.csv`
- Analyze sentiment using transformers
- Generate `enriched_comments_sentiment.csv`
- Create `platform_sentiment_summary.json`
- Build `sentiment_history.csv`

**Test APIs:**

```bash
# Test query API
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the top Instagram posts?"}'

# Test sentiment summary
curl http://localhost:3001/api/sentiment/summary

# Test simulation
curl -X POST http://localhost:3001/api/simulate/trigger \
  -H "Content-Type: application/json" \
  -d '{"scenario": "crisis"}'
```

### Production Build

```bash
# Build client
cd client
npm run build

# The built files will be in client/dist/
# Serve these with the Express server or any static file server
```

---

## Production Deployment

### Option 1: Traditional VPS Deployment (Recommended)

**Services:** AWS EC2, DigitalOcean Droplet, Linode, etc.

#### Step 1: Server Setup

```bash
# SSH into your server
ssh user@your-server-ip

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3 and pip
sudo apt-get install -y python3 python3-pip python3-venv

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone repository
git clone https://github.com/yourusername/social-media-analytics-platform.git
cd social-media-analytics-platform
```

#### Step 2: Configure Environment

```bash
cd server
nano .env
# Add your OPENAI_API_KEY and other config

# Install Node dependencies
npm install --production

# Install Python dependencies
cd ../scripts
pip3 install pandas transformers torch openai python-dotenv
cd ../server
```

#### Step 3: Build Client

```bash
cd ../client
npm install
npm run build
```

#### Step 4: Serve Static Files with Express

Modify `server/index.js` to serve the built client:

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// All other routes return React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

#### Step 5: Initialize Sentiment Data

```bash
cd ../scripts
python3 sentiment_engine.py
cd ../server
```

#### Step 6: Start with PM2

```bash
cd server
pm2 start index.js --name social-analytics-platform
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

**Note:** The server includes an hourly cron job that runs sentiment simulations automatically. To disable, comment out the cron.schedule block in `server/index.js`.

#### Step 7: Configure Nginx (Optional but Recommended)

```bash
sudo apt install nginx

sudo nano /etc/nginx/sites-available/social-command-center
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/social-command-center /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 8: SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### Option 2: Docker Deployment

Create `Dockerfile` in root:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN cd server && npm install --production
RUN cd client && npm install

# Copy source code
COPY server ./server
COPY client ./client

# Build client
RUN cd client && npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server/index.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  social-command-center:
    build: .
    ports:
      - "3001:3001"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - NODE_ENV=production
    volumes:
      - ./server/data:/app/server/data
    restart: unless-stopped
```

Deploy:

```bash
docker-compose up -d
```

---

### Option 3: Serverless Deployment (Advanced)

**Platforms:** Vercel, Netlify, AWS Lambda

**Note:** LangChain and real-time file watching may have limitations in serverless environments.

**Vercel Deployment:**

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Configure `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    { "src": "server/index.js", "use": "@vercel/node" },
    { "src": "client/package.json", "use": "@vercel/static-build" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "server/index.js" },
    { "src": "/(.*)", "dest": "client/dist/$1" }
  ],
  "env": {
    "OPENAI_API_KEY": "@openai-api-key"
  }
}
```

3. Deploy:
```bash
vercel --prod
```

---

## Monitoring & Maintenance

### Health Checks

The application exposes health check endpoints:

```bash
# Server health
curl http://localhost:3001/health

# API health
curl http://localhost:3001/api/chat/health
```

### Monitoring with PM2

```bash
# View logs
pm2 logs social-analytics-platform

# Monitor resources
pm2 monit

# Restart
pm2 restart social-analytics-platform

# View status
pm2 status

# Check sentiment processing
tail -f ../scripts/sentiment_engine.log  # If logging is enabled
```

### Log Management

Logs are written to:
- **Console output** - Captured by PM2
- **PM2 logs** - `~/.pm2/logs/`

To centralize logs:

```bash
# Install PM2 log rotation
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Performance Monitoring

Monitor these metrics:

1. **Response Time** - Check metadata in API responses
2. **Cache Hit Rate** - Logged in console
3. **Memory Usage** - `pm2 monit`
4. **CPU Usage** - `pm2 monit`

---

## Troubleshooting

### Common Issues

#### 1. "OPENAI_API_KEY is required" Error

**Solution:**
```bash
cd server
nano .env
# Add: OPENAI_API_KEY=your_key_here
pm2 restart social-command-center
```

#### 2. "Cannot find module" Errors

**Solution:**
```bash
cd server
rm -rf node_modules package-lock.json
npm install
pm2 restart social-command-center
```

#### 3. Port Already in Use

**Solution:**
```bash
# Find process on port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port in .env
echo "PORT=3002" >> server/.env
```

#### 4. CSV File Not Found

**Solution:**
```bash
# Ensure data directory exists
mkdir -p server/data

# Check file permissions
ls -la server/data/

# Place CSV files
cp your_data.csv server/data/
```

#### 4a. Python/Sentiment Analysis Errors

**Error: "ModuleNotFoundError: No module named 'transformers'"**

**Solution:**
```bash
pip3 install --upgrade pip
pip3 install transformers torch pandas openai python-dotenv
```

**Error: "Model download fails"**

**Solution:**
```bash
# Ensure internet connection
# Transformers downloads models from HuggingFace on first run
# Models are ~500MB, may take time

# Pre-download model (optional)
python3 -c "from transformers import AutoTokenizer, AutoModelForSequenceClassification; AutoTokenizer.from_pretrained('cardiffnlp/twitter-xlm-roberta-base-sentiment'); AutoModelForSequenceClassification.from_pretrained('cardiffnlp/twitter-xlm-roberta-base-sentiment')"
```

**Error: "sentiment_engine.py takes too long"**

**Solution:**
```bash
# First run downloads ML models (~500MB)
# Subsequent runs are faster
# Use GPU if available for faster processing
```

#### 5. High Memory Usage

**Symptoms:** Server crashes or slows down

**Solution:**
```bash
# Reduce cache sizes in .env
FILTER_CACHE_SIZE=100
DATA_CACHE_TTL=1800000

# Or increase server memory
pm2 delete social-analytics-platform
pm2 start index.js --name social-analytics-platform --max-memory-restart 2G

# For sentiment processing, ML models need ~1-2GB RAM
# Consider upgrading server if running sentiment analysis
```

#### 6. Slow Query Performance

**Solution:**
- Check cache hit rates in logs
- Reduce dataset size by filtering CSV files
- Consider upgrading LLM model to gpt-4o (faster)

---

## Performance Optimization

### 1. Cache Configuration

Adjust cache settings for your workload:

```env
# For high-traffic (more repeated queries)
FILTER_CACHE_SIZE=1000
FILTER_CACHE_TTL=7200000  # 2 hours

# For frequently changing data
DATA_CACHE_TTL=600000  # 10 minutes
```

### 2. LLM Optimization

```env
# Faster model (recommended)
LLM_MODEL=gpt-4o-mini

# Reduce tokens for faster responses
LLM_MAX_TOKENS=1500
```

### 3. Data Optimization

- **Remove unused columns** from CSV files
- **Filter data** to only relevant time periods
- **Split large files** into separate CSVs by platform/date
- **Compress CSVs** (gzip) if storage is limited

### 4. Frontend Optimization

```bash
# Enable Vite build optimizations
cd client
npm run build -- --mode production
```

### 5. Database Consideration

For datasets > 100,000 records, consider migrating to a database:

- **SQLite** - Simple, file-based
- **PostgreSQL** - Production-grade
- **MongoDB** - Flexible schema

---

## Security Checklist

Before deploying to production:

- [ ] **Environment variables** - Never commit `.env` files
- [ ] **API key rotation** - Rotate OpenAI API keys regularly
- [ ] **HTTPS enabled** - Use SSL certificates
- [ ] **CORS configured** - Restrict allowed origins
- [ ] **Rate limiting** - Add API rate limiting (future improvement)
- [ ] **Input validation** - All user input is validated
- [ ] **Error messages** - Don't expose sensitive info in errors
- [ ] **Firewall** - Configure server firewall rules
- [ ] **Updates** - Keep dependencies up to date
- [ ] **Backups** - Regular backups of data directory

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer** - Nginx or AWS ELB
2. **Multiple Instances** - Run multiple PM2 instances
3. **Shared Cache** - Use Redis for distributed cache
4. **Database** - Move from CSV to PostgreSQL

### Vertical Scaling

- Increase server RAM to 8GB+
- Use faster CPU
- SSD storage for data files

---

## Backup & Recovery

### Backup Strategy

**What to backup:**
- `server/data/` - All CSV files (posts, ads, sentiment data)
- `server/.env` - Environment config
- Query logs (if enabled)
- ML model cache (optional, can be re-downloaded)

**Automated backup script:**

```bash
#!/bin/bash
BACKUP_DIR="/backup/social-analytics-platform"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" \
  server/data/ \
  server/.env \
  scripts/

# Keep only last 7 days
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### Recovery

```bash
# Extract backup
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz

# Restore files
cp -r server/data/* /app/server/data/
cp server/.env /app/server/.env
cp -r scripts/* /app/scripts/

# Reinitialize sentiment data (optional)
cd /app/scripts
python3 sentiment_engine.py

# Restart
cd /app/server
pm2 restart social-analytics-platform
```

---

## Cost Estimation

### OpenAI API Costs

**Model:** gpt-4o-mini
**Input:** $0.15 / 1M tokens
**Output:** $0.60 / 1M tokens

**Average query:**
- Input: ~1,500 tokens (metadata + prompt)
- Output: ~500 tokens (filter spec + narrative)
- **Cost per query:** ~$0.0005 (0.05 cents)

**Monthly estimates:**
- 1,000 queries: ~$0.50
- 10,000 queries: ~$5.00
- 100,000 queries: ~$50.00

### Server Costs

**VPS Options (with ML model support):**
- **DigitalOcean Droplet:** $24/month (4GB RAM - recommended for ML)
- **AWS EC2 t3.medium:** ~$30/month (4GB RAM)
- **Linode:** $24/month (4GB RAM)

**Or lightweight option (without local sentiment analysis):**
- **DigitalOcean Droplet:** $12/month (2GB RAM)
- Use OpenAI API for sentiment instead of local transformers

**Total Monthly Cost (10,000 queries with sentiment):**
- Server (4GB): $24-30
- OpenAI API: $5
- **Total: $29-35/month**

**Budget Option (2GB, API-based sentiment):**
- Server (2GB): $10-15
- OpenAI API (queries + sentiment): $10-15
- **Total: $20-30/month**

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Check logs, performance, errors
2. **User testing** - Have team members test common queries and sentiment dashboard
3. **Test sentiment simulations** - Verify crisis, viral, and normal scenarios work
4. **Optimize** - Adjust cache settings and sentiment thresholds based on usage
5. **Documentation** - Document common queries and sentiment alert procedures
6. **Feedback** - Collect user feedback for improvements
7. **Schedule sentiment runs** - Configure cron job frequency for your needs

---

## Support & Resources

**Documentation:**
- Main README: `README.md`
- Customization Guide: `CUSTOMIZATION_GUIDE.md`
- Deployment Guide: `DEPLOYMENT_GUIDE.md` (this file)

**Getting Help:**
- GitHub Issues: [Repository URL]
- OpenAI Documentation: https://platform.openai.com/docs
- LangChain Docs: https://docs.langchain.com
- Hugging Face Transformers: https://huggingface.co/docs/transformers

**Key Features in Production:**
- ✅ AI-powered query interface
- ✅ Real-time sentiment monitoring
- ✅ Multi-platform analytics (Instagram, Facebook, LinkedIn, Twitter)
- ✅ Automated sentiment simulations
- ✅ AI reply generation for crisis management
- ✅ Historical trend tracking
- ✅ Hourly automated data updates

---

**Last Updated:** January 4, 2026
**Version:** 3.0
**Status:** Production Ready with Sentiment Analysis ✅
