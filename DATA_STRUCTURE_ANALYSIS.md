# Comprehensive Data Structure Analysis

## CSV Files Overview

### 1. Organic Posts (Facebook, Instagram, Twitter)
**Files**: `facebook_organic_posts.csv`, `instagram_organic_posts.csv`, `twitter_organic_posts.csv`

**Columns**:
- `post_id` - Unique identifier
- `platform` - Platform name (Facebook, Instagram, Twitter)
- `post_type` - Always "organic"
- `content` - Post text content
- `media_type` - image, video, carousel
- `posted_date` - Date in DD-MM-YYYY format
- `posted_time` - Time in HH:MM:SS format
- `impressions` - Number of impressions
- `reach` - Reach count
- `likes` - Like count
- `comments` - Comment count
- `shares` - Share count
- `saves` - Save count
- `engagement_rate` - Engagement percentage

**CRITICAL MISSING COLUMNS**:
- ❌ No `time_category` or `time_period` (morning/afternoon/evening)
- ❌ No `day_of_week` or `weekday` column
- ❌ No `week_number` column
- ❌ No `hashtags` column (hashtags are embedded in content text)
- ❌ No `keywords` column
- ❌ No `ROI` column
- ❌ No `CTR` (click-through rate) column
- ❌ No `revenue` column

### 2. Ad Campaigns (Facebook Ads, Instagram Ads, Google Ads)
**Files**: `facebook_ads_ad_campaigns.csv`, `instagram_ads_ad_campaigns.csv`, `google_ads_ad_campaigns.csv`

**Columns**:
- `campaign_id` - Unique identifier
- `campaign_name` - Campaign name
- `platform` - Platform name with " Ads" suffix (Facebook Ads, Instagram Ads, Google Ads)
- `campaign_type` - Flash Sale, Product Launch, Influencer Collaboration, Festive Campaign, Brand Awareness
- `objective` - Traffic, Conversions, Engagement, Brand Awareness
- `start_date` - Start date in YYYY-MM-DD format
- `end_date` - End date in YYYY-MM-DD format
- `status` - Active, Completed
- `daily_budget` - Daily budget amount
- `total_spend` - Total spend amount
- `impressions` - Impression count
- `clicks` - Click count
- `ctr` - Click-through rate percentage
- `cpc` - Cost per click
- `conversions` - Conversion count
- `conversion_rate` - Conversion rate percentage
- `cost_per_conversion` - Cost per conversion
- `revenue` - Revenue generated
- `roas` - Return on ad spend
- `target_audience` - Target audience description
- `ad_format` - Carousel, Stories, Single Image, Collection, Video

**CRITICAL MISSING COLUMNS**:
- ❌ No `engagement_rate` column
- ❌ No `likes`, `comments`, `shares`, `saves` columns
- ❌ No `posted_time` column (only start_date/end_date)
- ❌ No `ROI` column (has ROAS instead)

### 3. Sentiment Data
**File**: `enriched_comments_sentiment.csv`

**Columns**:
- `comment_id` - Unique identifier
- `post_id` - Associated post
- `user_handle` - Username
- `comment_text` - Comment content
- `timestamp` - Comment timestamp
- `label` - Sentiment label (positive, negative, neutral)
- `score` - Sentiment score
- `platform` - Platform name
- `language` - Language code (en, hi, hinglish)

### 4. Sentiment History
**File**: `sentiment_history.csv`

**Columns**:
- `timestamp` - Date and time
- `platform` - Platform name
- `health_score` - Sentiment health score percentage

---

## Query Analysis - Critical Issues Found

### ✅ QUERIES THAT SHOULD WORK (30 queries)

1. ✅ **"Which is the worst performing post type and on which platform?"**
   - Uses: `post_type`, `platform`, `engagement_rate`
   - Status: Should work with organic posts

2. ✅ **"Content on which platform performed better in Q3?"**
   - Uses: `platform`, `posted_date`, `engagement_rate`
   - Status: Should work, needs Q3 date filtering

3. ✅ **"Most liked post on Instagram for the month of November?"**
   - Uses: `platform`, `posted_date`, `likes`
   - Status: Should work with date filtering

4. ✅ **"Compare ROAS across Facebook, Instagram, and Google Ads for last quarter"**
   - Uses: `platform`, `roas`, `start_date`
   - Status: Should work with Q4 filtering and start_date column

5. ✅ **"Twitter posts with 25 shares?"**
   - Uses: `platform`, `shares`
   - Status: Should work with exact match

6. ✅ **"Number of facebook posts with 139 comments"**
   - Uses: `platform`, `comments`
   - Status: Should work with exact match

7. ✅ **"What is start date and end date of google ad campaign Brand Awareness - Green Living - Sep2025?"**
   - Uses: `campaign_name`, `start_date`, `end_date`
   - Status: Should work with exact campaign name match

8. ✅ **"How many google ads campaigns with type Brand Awareness are there?"**
   - Uses: `platform`, `campaign_type`
   - Status: Should work with count aggregation

9. ✅ **"How many google ads with Objective as Engagement"**
   - Uses: `platform`, `objective`
   - Status: Should work with count aggregation

10. ✅ **"Highest engagement on Twitter"**
    - Uses: `platform`, `engagement_rate`
    - Status: Should work with sorting

11. ✅ **"Which was the best Twitter post from November?"**
    - Uses: `platform`, `posted_date`, `engagement_rate`
    - Status: Should work with date filtering

12. ✅ **"Which posts underperformed in November?"**
    - Uses: `posted_date`, `engagement_rate`
    - Status: Should work with date filtering and sorting

13. ✅ **"Which campaigns have high spend but low return?"**
    - Uses: `total_spend`, `roas` or `revenue`
    - Status: Should work with threshold-based filtering

14. ✅ **"Which ad format has the lowest Cost Per Conversion across all paid channels?"**
    - Uses: `ad_format`, `cost_per_conversion`, `platform`
    - Status: Should work with groupBy and aggregate

15. ✅ **"Analyze campaigns with objective 'Traffic' vs. 'Conversions'"**
    - Uses: `objective`, `cost_per_conversion`, `campaign_name`
    - Status: Should work with filtering and comparison

16. ✅ **"How are my Facebook Ads performing compared to Instagram?"**
    - Uses: `platform`, various metrics
    - Status: Should work with platform comparison

17. ✅ **"Compare Instagram vs LinkedIn performance this quarter"**
    - Note: No LinkedIn data exists
    - Status: Should return "out of scope" or 0 results

18. ✅ **"Compare performance of 'Eco-conscious Millennials' vs. 'Gen Z, Urban Areas'"**
    - Uses: `target_audience`, `conversion_rate`, `revenue`
    - Status: Should work with audience filtering

19. ✅ **"Does 'Video' content drive higher reach than 'Image' on Twitter?"**
    - Uses: `media_type`, `reach`, `platform`
    - Status: Should work with media type comparison

20. ✅ **"List top 5 ad campaigns by Revenue"**
    - Uses: `revenue`, sorting and limit
    - Status: Should work with sorting and aggregation

21. ✅ **"How has average organic reach on Facebook changed month-over-month Sep to Nov 2025?"**
    - Uses: `platform`, `posted_date`, `reach`
    - Status: Should work with date grouping

22. ✅ **"Generate summary of 'Festive Campaign' across all platforms"**
    - Uses: `campaign_type`, `total_spend`, `revenue`, `ad_format`
    - Status: Should work with campaign type filtering

23. ✅ **"What's the sentiment of comments?"**
    - Uses: `label`, `score` from sentiment data
    - Status: Should work with sentiment aggregation

24. ✅ **"Based on sentiment scores, which 3 posts should I reply to first?"**
    - Uses: `post_id`, `label`, `score`
    - Status: Should work sorting by negative sentiment

25. ✅ **"Give me summary of sentiment for Hindi/Hinglish comments on Instagram"**
    - Uses: `language`, `platform`, `label`
    - Status: Should work with language filtering

26. ✅ **"On Instagram, how does average engagement rate of organic posts compare to paid Stories campaigns?"**
    - Issue: Organic posts have `engagement_rate`, ad campaigns DO NOT
    - Status: ❌ WILL FAIL - ad campaigns missing engagement_rate column

27. ✅ **"Which content formats are underperforming and why?"**
    - Uses: `media_type` or `ad_format`, performance metrics
    - Status: Should work but "why" requires interpretation

28. ✅ **"What type of posts should we stop publishing?"**
    - Uses: `post_type` or `media_type`, performance metrics
    - Status: Should work with filtering and analysis

29. ✅ **"Which ad campaign should be scaled immediately and which should be paused?"**
    - Uses: `campaign_id`, `roas`, `total_spend`
    - Status: Should work with performance analysis

30. ✅ **"Show me TikTok performance"**
    - Status: Should return "out of scope" (no TikTok data)

---

### ❌ QUERIES REQUIRING CLARIFICATION (14 queries)

31. ❌ **"What is the best time to post image on facebook?"**
    - Missing: `time_category` or `time_period` column
    - Has: `posted_time` but no categorical grouping
    - Status: NEEDS CLARIFICATION - missing time category column

32. ❌ **"Which duration in a day gets most engagement?"**
    - Missing: `time_category` column
    - Status: NEEDS CLARIFICATION - missing time period grouping

33. ❌ **"When do we have the most engagement?"**
    - Ambiguous: Could mean time of day, day of week, or date
    - Missing: Time category columns
    - Status: NEEDS CLARIFICATION - ambiguous temporal reference

34. ❌ **"Which week was best?"**
    - Missing: `week_number` column
    - Has: `posted_date` but no week grouping
    - Status: NEEDS CLARIFICATION - missing week categorization

35. ❌ **"Are there more engagements during the week or weekends?"**
    - Missing: `day_of_week` or `weekday` column
    - Has: `posted_date` but no day-of-week categorization
    - Status: NEEDS CLARIFICATION - missing weekday categorization

36. ❌ **"Which platform would you not recommend for social media posting and why?"**
    - Requires: Causal reasoning ("why")
    - Status: NEEDS CLARIFICATION - requires interpretive analysis beyond data

37. ❌ **"Which platform has the best ROI?"**
    - Missing: `ROI` column in organic posts
    - Has: `roas` in ad campaigns (different metric)
    - Status: NEEDS CLARIFICATION - ROI not directly available

38. ❌ **"Which platform is best for revenue vs volume vs efficiency?"**
    - Complex multi-dimensional comparison
    - "Efficiency" not clearly defined
    - Status: NEEDS CLARIFICATION - ambiguous metrics

39. ❌ **"Why did Instagram outperform Facebook this month?"**
    - Requires: Causal analysis (starts with "Why")
    - Status: NEEDS CLARIFICATION - requires interpretive reasoning

40. ❌ **"Based on organic content, which 3 hashtags are associated with highest Saves and Shares on Instagram and LinkedIn?"**
    - Missing: `hashtags` column (hashtags embedded in content text)
    - Missing: LinkedIn data
    - Status: NEEDS CLARIFICATION - requires text extraction, LinkedIn unavailable

41. ❌ **"What are the top 3 time slots (hours of day) that yield highest engagement for Facebook organic posts?"**
    - Missing: `time_category` or hourly grouping column
    - Has: `posted_time` but no categorical grouping
    - Status: NEEDS CLARIFICATION - missing time slot categorization

42. ❌ **"Identify organic posts with below-average impressions but above-average engagement rates"**
    - Requires: Multi-pass processing (calculate averages first, then filter)
    - Status: NEEDS CLARIFICATION - below-average pattern requires two-step processing

43. ❌ **"Which platform has the most negative feedback, and what are people complaining about?"**
    - First part works: `platform`, `label` from sentiment
    - Second part requires: Text analysis of comment content ("what are they complaining about")
    - Status: NEEDS CLARIFICATION - "what are they complaining about" requires NLP/topic extraction

44. ❌ **"Which hashtags correlate with high engagement?"**
    - Missing: `hashtags` column
    - Requires: Correlation analysis
    - Status: NEEDS CLARIFICATION - missing hashtags column, requires statistical correlation

---

### 🚫 OUT OF SCOPE QUERIES (8 queries)

45. 🚫 **"What's the weather like today?"**
    - Status: OUT OF SCOPE - not related to social media analytics

46. 🚫 **"What's the click-through rate on organic posts?"**
    - Missing: `ctr` column in organic posts (only exists in ad campaigns)
    - Status: OUT OF SCOPE - CTR not available for organic posts

47. 🚫 **"Why did our engagement drop 30% last week?"**
    - Requires: Causal analysis, week categorization
    - Status: OUT OF SCOPE - requires root cause analysis beyond data

48. 🚫 **"Draft 5 post ideas for our product launch"**
    - Requires: Creative content generation
    - Status: OUT OF SCOPE - generative task, not analytical

49. 🚫 **"Top 3 performing content themes this month"**
    - Missing: `themes` or `content_category` column
    - Requires: Text classification/topic modeling
    - Status: OUT OF SCOPE - requires NLP theme extraction

50. 🚫 **"Generate weekly performance summary for CMO"**
    - Requires: Report generation, multi-metric aggregation
    - Status: OUT OF SCOPE - generative summary task

51. 🚫 **"Compare Instagram vs LinkedIn performance this quarter"**
    - Missing: LinkedIn data entirely
    - Status: OUT OF SCOPE - LinkedIn not in dataset

52. 🚫 **"Show me TikTok performance"**
    - Missing: TikTok data entirely
    - Status: OUT OF SCOPE - TikTok not in dataset

---

## Critical Data Structure Issues

### Issue 1: Date Column Mismatch
- **Organic Posts**: Use `posted_date` (DD-MM-YYYY format)
- **Ad Campaigns**: Use `start_date` and `end_date` (YYYY-MM-DD format)
- **Impact**: Queries must detect data type and use correct column name

### Issue 2: Date Format Inconsistency
- **Organic Posts**: DD-MM-YYYY format (e.g., "07-11-2025")
- **Ad Campaigns**: YYYY-MM-DD format (e.g., "2025-11-07")
- **Impact**: Date filtering logic must handle both formats

### Issue 3: Missing Time Categorization
- Posts have `posted_time` but no categorical grouping
- No `time_category`, `time_period`, `hour_of_day` columns
- **Impact**: Time-of-day queries cannot be processed

### Issue 4: Missing Day-of-Week Categorization
- Posts have `posted_date` but no day-of-week extraction
- No `day_of_week`, `weekday`, `is_weekend` columns
- **Impact**: Weekday/weekend queries cannot be processed

### Issue 5: Missing Engagement Rate in Ad Campaigns
- Organic posts have `engagement_rate`
- Ad campaigns DO NOT have `engagement_rate`
- **Impact**: Cannot compare organic vs paid engagement rates directly

### Issue 6: Platform Name Inconsistency
- **Organic**: "Facebook", "Instagram", "Twitter"
- **Ads**: "Facebook Ads", "Instagram Ads", "Google Ads"
- **Impact**: Platform filters must handle " Ads" suffix

### Issue 7: No Hashtag Extraction
- Hashtags embedded in `content` text
- No separate `hashtags` column
- **Impact**: Hashtag analysis requires text parsing

### Issue 8: No ROI Metric
- Ad campaigns have `roas` (Return on Ad Spend)
- Organic posts have no revenue/ROI metric
- **Impact**: ROI queries ambiguous or impossible for organic

---

## Recommended Fixes Priority

### HIGH PRIORITY (Breaking Queries)

1. **Fix Q4 Date Filtering** ✅ DONE
   - Use `start_date` for ad campaigns
   - Use `posted_date` for organic posts
   - Use YYYY-MM format for filtering

2. **Fix Ad Platform Auto-filtering** ✅ DONE
   - Auto-add platform filter for ad-specific metrics
   - Handle " Ads" suffix in platform names

3. **Add Time-of-Day Clarification** ✅ DONE
   - Detect time-of-day queries
   - Return clarification about missing `time_category` column

4. **Add Weekday/Weekend Clarification** ✅ DONE
   - Detect weekday/weekend queries
   - Return clarification about missing `day_of_week` column

5. **Add Below-Average Pattern Detection** ✅ DONE
   - Detect below/above-average patterns
   - Return clarification about multi-pass requirement

### MEDIUM PRIORITY (Incorrect Results)

6. **Fix Engagement Rate Comparison for Organic vs Ads**
   - Detect when comparing organic engagement_rate to ad engagement_rate
   - Return clarification that ad campaigns don't have engagement_rate
   - Suggest alternative: compare impressions, clicks, or conversions

7. **Add Hashtag Extraction Clarification**
   - Detect hashtag queries
   - Return clarification that hashtags need text extraction
   - Suggest: "Show me posts containing #hashtag"

8. **Add ROI vs ROAS Clarification**
   - Detect ROI queries
   - Return clarification about difference between ROI and ROAS
   - Suggest using ROAS for ad campaigns

### LOW PRIORITY (Edge Cases)

9. **Improve "Why" Question Detection**
   - Already detecting "why" at query start
   - Consider adding more causal reasoning patterns

10. **Add Week Number Clarification**
    - Detect "which week" queries
    - Return clarification about missing week categorization

---

## Test Coverage Summary

- **Total Queries**: 52
- **Should Work**: 30 (57.7%)
- **Need Clarification**: 14 (26.9%)
- **Out of Scope**: 8 (15.4%)

### Expected Pass Rate After Fixes
- If all clarifications return correctly: **84.6%** (44/52)
- If clarifications fail: **57.7%** (30/52)
