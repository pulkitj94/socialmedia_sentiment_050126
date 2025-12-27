/**
 * Data normalization utilities
 * Handles case normalization, platform names, date formats, etc.
 */

/**
 * Platform name mappings (case-insensitive)
 */
const PLATFORM_MAPPINGS = {
  'instagram': 'Instagram',
  'facebook': 'Facebook',
  'twitter': 'Twitter',
  'linkedin': 'LinkedIn',
  'tiktok': 'TikTok',
  'youtube': 'YouTube',
  'pinterest': 'Pinterest',
  'snapchat': 'Snapchat',
  'reddit': 'Reddit',
  'facebook ads': 'Facebook Ads',
  'google ads': 'Google Ads',
  'instagram ads': 'Instagram Ads',
  'linkedin ads': 'LinkedIn Ads',
  'twitter ads': 'Twitter Ads',
  'tiktok ads': 'TikTok Ads'
};

/**
 * Normalize platform name to standard format
 * @param {string} platform - Platform name in any case
 * @returns {string} Normalized platform name
 */
export function normalizePlatform(platform) {
  if (!platform) return platform;

  const lower = platform.toLowerCase().trim();
  return PLATFORM_MAPPINGS[lower] || platform;
}

/**
 * Get all known platform values (for metadata extraction)
 * @returns {Array<string>} List of normalized platform names
 */
export function getKnownPlatforms() {
  return [...new Set(Object.values(PLATFORM_MAPPINGS))];
}

/**
 * Check if a value is a known platform
 * @param {string} value - Value to check
 * @returns {boolean} True if value is a known platform
 */
export function isKnownPlatform(value) {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower in PLATFORM_MAPPINGS;
}

/**
 * Normalize column name to standard format
 * Common variations: post_id, postId, PostID -> post_id
 */
const COLUMN_MAPPINGS = {
  'postid': 'post_id',
  'postdate': 'post_date',
  'campaignid': 'campaign_id',
  'campaignname': 'campaign_name',
  'adspend': 'ad_spend',
  'engagementrate': 'engagement_rate'
};

/**
 * Normalize column name to standard format
 * @param {string} column - Column name
 * @returns {string} Normalized column name
 */
export function normalizeColumnName(column) {
  if (!column) return column;

  // Convert to lowercase and remove spaces
  const cleaned = column.toLowerCase().trim().replace(/\s+/g, '_');

  // Check if there's a specific mapping
  if (COLUMN_MAPPINGS[cleaned]) {
    return COLUMN_MAPPINGS[cleaned];
  }

  return cleaned;
}

/**
 * Normalize date string to consistent format
 * Handles: DD-MM-YYYY, YYYY-MM-DD, MM/DD/YYYY, relative dates, natural language
 */
export function normalizeDate(dateStr) {
  if (!dateStr) return dateStr;

  // Handle relative dates
  const relativeDateResult = parseRelativeDate(dateStr);
  if (relativeDateResult) {
    return relativeDateResult;
  }

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Try other formats
      const parts = dateStr.split(/[-\/]/);
      if (parts.length === 3) {
        // Try DD-MM-YYYY
        const [day, month, year] = parts;
        const attempt = new Date(`${year}-${month}-${day}`);
        if (!isNaN(attempt.getTime())) {
          return attempt.toISOString().split('T')[0]; // YYYY-MM-DD
        }
      }
      return dateStr; // Return original if can't parse
    }
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch (error) {
    return dateStr;
  }
}

/**
 * Parse relative date strings like "yesterday", "last week", "2 days ago"
 * @param {string} dateStr - Date string to parse
 * @returns {string|null} ISO date string or null if not a relative date
 */
export function parseRelativeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const lower = dateStr.toLowerCase().trim();
  const now = new Date();

  // Today, yesterday, tomorrow
  if (lower === 'today') {
    return formatDate(now);
  }
  if (lower === 'yesterday') {
    return formatDate(addDays(now, -1));
  }
  if (lower === 'tomorrow') {
    return formatDate(addDays(now, 1));
  }

  // Last/this/next week/month/year
  if (lower === 'last week') {
    return formatDate(addDays(now, -7));
  }
  if (lower === 'this week') {
    return formatDate(getStartOfWeek(now));
  }
  if (lower === 'last month') {
    return formatDate(addMonths(now, -1));
  }
  if (lower === 'this month') {
    return formatDate(getStartOfMonth(now));
  }
  if (lower === 'last year') {
    return formatDate(addYears(now, -1));
  }
  if (lower === 'this year') {
    return formatDate(getStartOfYear(now));
  }

  // X days/weeks/months ago
  const daysAgoMatch = lower.match(/^(\d+)\s+days?\s+ago$/);
  if (daysAgoMatch) {
    return formatDate(addDays(now, -parseInt(daysAgoMatch[1])));
  }

  const weeksAgoMatch = lower.match(/^(\d+)\s+weeks?\s+ago$/);
  if (weeksAgoMatch) {
    return formatDate(addDays(now, -parseInt(weeksAgoMatch[1]) * 7));
  }

  const monthsAgoMatch = lower.match(/^(\d+)\s+months?\s+ago$/);
  if (monthsAgoMatch) {
    return formatDate(addMonths(now, -parseInt(monthsAgoMatch[1])));
  }

  // Quarter dates (Q1, Q2, Q3, Q4)
  const quarterMatch = lower.match(/^q([1-4])\s*(\d{4})?$/);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = quarterMatch[2] ? parseInt(quarterMatch[2]) : now.getFullYear();
    return formatDate(getQuarterStart(year, quarter));
  }

  // Month names (January, Feb, etc.)
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                     'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  for (let i = 0; i < monthNames.length; i++) {
    if (lower.includes(monthNames[i]) || lower.includes(monthAbbr[i])) {
      // Extract year if present
      const yearMatch = lower.match(/\d{4}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : now.getFullYear();
      return formatDate(new Date(year, i, 1));
    }
  }

  // Early/mid/late month
  const earlyMonthMatch = lower.match(/^early\s+(\w+)(\s+\d{4})?$/);
  if (earlyMonthMatch) {
    const monthIdx = getMonthIndex(earlyMonthMatch[1]);
    if (monthIdx !== -1) {
      const year = earlyMonthMatch[2] ? parseInt(earlyMonthMatch[2].trim()) : now.getFullYear();
      return formatDate(new Date(year, monthIdx, 5)); // 5th of month
    }
  }

  const midMonthMatch = lower.match(/^mid\s+(\w+)(\s+\d{4})?$/);
  if (midMonthMatch) {
    const monthIdx = getMonthIndex(midMonthMatch[1]);
    if (monthIdx !== -1) {
      const year = midMonthMatch[2] ? parseInt(midMonthMatch[2].trim()) : now.getFullYear();
      return formatDate(new Date(year, monthIdx, 15)); // 15th of month
    }
  }

  const lateMonthMatch = lower.match(/^late\s+(\w+)(\s+\d{4})?$/);
  if (lateMonthMatch) {
    const monthIdx = getMonthIndex(lateMonthMatch[1]);
    if (monthIdx !== -1) {
      const year = lateMonthMatch[2] ? parseInt(lateMonthMatch[2].trim()) : now.getFullYear();
      return formatDate(new Date(year, monthIdx, 25)); // 25th of month
    }
  }

  return null;
}

/**
 * Helper: Format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Helper: Add days to date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Helper: Add months to date
 */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Helper: Add years to date
 */
function addYears(date, years) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Helper: Get start of week (Monday)
 */
function getStartOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  result.setDate(diff);
  return result;
}

/**
 * Helper: Get start of month
 */
function getStartOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Helper: Get start of year
 */
function getStartOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

/**
 * Helper: Get quarter start date
 */
function getQuarterStart(year, quarter) {
  const month = (quarter - 1) * 3;
  return new Date(year, month, 1);
}

/**
 * Helper: Get month index from name
 */
function getMonthIndex(monthStr) {
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                     'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const lower = monthStr.toLowerCase();
  let idx = monthNames.indexOf(lower);
  if (idx === -1) {
    idx = monthAbbr.indexOf(lower);
  }
  return idx;
}

/**
 * Get date range from relative date string
 * @param {string} rangeStr - Range string like "last 7 days", "last month"
 * @returns {Object|null} {start: 'YYYY-MM-DD', end: 'YYYY-MM-DD'} or null
 */
export function getDateRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== 'string') return null;

  const lower = rangeStr.toLowerCase().trim();
  const now = new Date();

  // Last X days
  const lastDaysMatch = lower.match(/^last\s+(\d+)\s+days?$/);
  if (lastDaysMatch) {
    const days = parseInt(lastDaysMatch[1]);
    return {
      start: formatDate(addDays(now, -days)),
      end: formatDate(now)
    };
  }

  // Last X weeks
  const lastWeeksMatch = lower.match(/^last\s+(\d+)\s+weeks?$/);
  if (lastWeeksMatch) {
    const weeks = parseInt(lastWeeksMatch[1]);
    return {
      start: formatDate(addDays(now, -weeks * 7)),
      end: formatDate(now)
    };
  }

  // Last X months
  const lastMonthsMatch = lower.match(/^last\s+(\d+)\s+months?$/);
  if (lastMonthsMatch) {
    const months = parseInt(lastMonthsMatch[1]);
    return {
      start: formatDate(addMonths(now, -months)),
      end: formatDate(now)
    };
  }

  // Last week
  if (lower === 'last week') {
    const startOfLastWeek = getStartOfWeek(addDays(now, -7));
    const endOfLastWeek = addDays(startOfLastWeek, 6);
    return {
      start: formatDate(startOfLastWeek),
      end: formatDate(endOfLastWeek)
    };
  }

  // This week
  if (lower === 'this week') {
    const startOfWeek = getStartOfWeek(now);
    return {
      start: formatDate(startOfWeek),
      end: formatDate(now)
    };
  }

  // Last month
  if (lower === 'last month') {
    const lastMonth = addMonths(now, -1);
    const startOfLastMonth = getStartOfMonth(lastMonth);
    const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    return {
      start: formatDate(startOfLastMonth),
      end: formatDate(endOfLastMonth)
    };
  }

  // This month
  if (lower === 'this month') {
    const startOfMonth = getStartOfMonth(now);
    return {
      start: formatDate(startOfMonth),
      end: formatDate(now)
    };
  }

  // This year
  if (lower === 'this year') {
    const startOfYear = getStartOfYear(now);
    return {
      start: formatDate(startOfYear),
      end: formatDate(now)
    };
  }

  // Quarter
  const quarterMatch = lower.match(/^q([1-4])\s*(\d{4})?$/);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = quarterMatch[2] ? parseInt(quarterMatch[2]) : now.getFullYear();
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    return {
      start: formatDate(new Date(year, startMonth, 1)),
      end: formatDate(new Date(year, endMonth + 1, 0))
    };
  }

  return null;
}

/**
 * Normalize numeric value
 * Removes commas, percentage signs, currency symbols
 */
export function normalizeNumeric(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  // Remove commas, dollar signs, percentage signs
  const cleaned = String(value).replace(/[$,%]/g, '').trim();
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : num;
}

/**
 * Normalize boolean value
 */
export function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (!value) return false;

  const str = String(value).toLowerCase().trim();
  return ['true', 'yes', '1', 'y'].includes(str);
}

/**
 * Normalize a data row based on column types
 * @param {Object} row - Data row
 * @param {Object} columnTypes - Map of column names to types
 * @returns {Object} Normalized row
 */
export function normalizeRow(row, columnTypes = {}) {
  const normalized = {};

  for (const [key, value] of Object.entries(row)) {
    const type = columnTypes[key];

    switch (type) {
      case 'platform':
        normalized[key] = normalizePlatform(value);
        break;
      case 'date':
        normalized[key] = normalizeDate(value);
        break;
      case 'number':
        normalized[key] = normalizeNumeric(value);
        break;
      case 'boolean':
        normalized[key] = normalizeBoolean(value);
        break;
      default:
        normalized[key] = value;
    }
  }

  return normalized;
}

/**
 * Detect and normalize column type
 * @param {string} columnName - Column name
 * @returns {string|null} Detected type or null
 */
export function detectColumnType(columnName) {
  const lower = columnName.toLowerCase();

  if (lower.includes('platform')) return 'platform';
  if (lower.includes('date') || lower.includes('time') || lower.includes('created')) return 'date';
  if (lower.includes('count') || lower.includes('rate') || lower.includes('spend') ||
      lower.includes('revenue') || lower.includes('roas') || lower.includes('ctr') ||
      lower.includes('likes') || lower.includes('comments') || lower.includes('shares') ||
      lower.includes('reach') || lower.includes('impressions')) return 'number';
  if (lower.includes('active') || lower.includes('enabled') || lower.includes('is_')) return 'boolean';

  return null;
}

export default {
  normalizePlatform,
  getKnownPlatforms,
  isKnownPlatform,
  normalizeColumnName,
  normalizeDate,
  normalizeNumeric,
  normalizeBoolean,
  normalizeRow,
  detectColumnType
};
