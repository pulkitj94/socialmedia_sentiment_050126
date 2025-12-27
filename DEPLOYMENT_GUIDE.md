# Deployment Guide - Social Command Center

**Version:** 2.0
**Last Updated:** December 25, 2024
**Status:** Production Ready

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
- **Git:** For version control

### Required Accounts

- **OpenAI API Key:** Required for LLM functionality
  - Get from: https://platform.openai.com/api-keys
  - Minimum tier: Pay-as-you-go
  - Recommended model: gpt-4o-mini (cost-effective)

### System Requirements

**Development:**
- RAM: 4GB minimum, 8GB recommended
- Storage: 500MB free space
- OS: Windows, macOS, or Linux

**Production:**
- RAM: 2GB minimum, 4GB recommended
- Storage: 1GB free space
- CPU: 1 core minimum, 2 cores recommended

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
```

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
    campaign_performance.csv    # Your social media data
    instagram_posts.csv          # Optional: Additional data
    facebook_ads.csv             # Optional: Ad performance
```

**Required CSV Columns (minimum):**
- `platform` - Platform name (Instagram, Facebook, etc.)
- `posted_date` or `date` - Date in DD-MM-YYYY format
- Numeric metrics: `likes`, `engagement_rate`, `reach`, etc.

**Example CSV Structure:**
```csv
platform,posted_date,likes,reach,engagement_rate,media_type
Instagram,15-11-2025,1234,5678,4.5,video
Facebook,16-11-2025,890,3456,3.2,image
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

Test API:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the top Instagram posts?"}'
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

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone repository
git clone https://github.com/yourusername/social-command-center.git
cd social-command-center
```

#### Step 2: Configure Environment

```bash
cd server
nano .env
# Add your OPENAI_API_KEY and other config

# Install dependencies
npm install --production
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

#### Step 5: Start with PM2

```bash
cd server
pm2 start index.js --name social-command-center
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

#### Step 6: Configure Nginx (Optional but Recommended)

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

#### Step 7: SSL Certificate (Let's Encrypt)

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
pm2 logs social-command-center

# Monitor resources
pm2 monit

# Restart
pm2 restart social-command-center

# View status
pm2 status
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

#### 5. High Memory Usage

**Symptoms:** Server crashes or slows down

**Solution:**
```bash
# Reduce cache sizes in .env
FILTER_CACHE_SIZE=100
DATA_CACHE_TTL=1800000

# Or increase server memory
pm2 delete social-command-center
pm2 start index.js --name social-command-center --max-memory-restart 1G
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
- `server/data/` - CSV files
- `server/.env` - Environment config
- Query logs (if enabled)

**Automated backup script:**

```bash
#!/bin/bash
BACKUP_DIR="/backup/social-command-center"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" \
  server/data/ \
  server/.env

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

# Restart
pm2 restart social-command-center
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

**VPS Options:**
- **DigitalOcean Droplet:** $12/month (2GB RAM)
- **AWS EC2 t3.small:** ~$15/month
- **Linode:** $10/month (2GB RAM)

**Total Monthly Cost (10,000 queries):**
- Server: $10-15
- OpenAI API: $5
- **Total: $15-20/month**

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Check logs, performance, errors
2. **User testing** - Have team members test common queries
3. **Optimize** - Adjust cache settings based on usage patterns
4. **Documentation** - Document common queries for users
5. **Feedback** - Collect user feedback for improvements

---

## Support & Resources

**Documentation:**
- Main README: `README.md`
- Implementation Summary: `FINAL_IMPLEMENTATION_SUMMARY.md`
- Current Limitations: `CURRENT_LIMITATIONS.md`

**Getting Help:**
- GitHub Issues: [Repository URL]
- OpenAI Documentation: https://platform.openai.com/docs
- LangChain Docs: https://docs.langchain.com

---

**Last Updated:** December 25, 2024
**Version:** 2.0
**Status:** Production Ready ✅
