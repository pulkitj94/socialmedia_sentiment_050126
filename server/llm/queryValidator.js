/**
 * Query Validator
 * Validates that generated filters match user intent
 * Detects when clarification is needed
 */
class QueryValidator {
  /**
   * Validate filter spec against user query and available data
   * @param {string} userQuery - Original user query
   * @param {Object} filterSpec - Generated filter specification
   * @param {Object} metadata - Dataset metadata
   * @returns {Object} Validation result with clarification if needed
   */
  validate(userQuery, filterSpec, metadata) {
    const issues = [];
    const warnings = [];

    // Extract what user asked for
    const userIntent = this.parseUserIntent(userQuery);

    // Extract what filters will actually query
    const filterIntent = this.parseFilterIntent(filterSpec, metadata);

    console.log('🔍 Validating Query Intent:');
    console.log('   User Intent:', userIntent);
    console.log('   Filter Intent:', filterIntent);

    // Check 1: Comparison queries
    if (userIntent.isComparison && userIntent.platforms.length > 1) {
      if (filterIntent.platforms.length < userIntent.platforms.length) {
        const missingPlatforms = userIntent.platforms.filter(
          p => !filterIntent.platforms.includes(p)
        );

        issues.push({
          type: 'missing_platforms',
          severity: 'high',
          message: `User asked to compare ${userIntent.platforms.join(' and ')} but filters only include ${filterIntent.platforms.join(', ')}`,
          missingPlatforms: missingPlatforms,
          suggestedFix: `Include all platforms: ${userIntent.platforms.join(', ')}`,
        });
      }
    }

    // Check 2: Platform mentions in query vs filters
    if (userIntent.platforms.length > 0 && filterIntent.platforms.length === 0) {
      issues.push({
        type: 'no_platform_filter',
        severity: 'medium',
        message: `User mentioned platforms (${userIntent.platforms.join(', ')}) but no platform filter was applied`,
        suggestedFix: 'Add platform filter to match user intent',
      });
    }

    // Check 3: "Compare" keyword with single platform
    if (userIntent.isComparison && filterIntent.platforms.length === 1) {
      issues.push({
        type: 'comparison_single_platform',
        severity: 'high',
        message: `User wants comparison but filter only includes one platform: ${filterIntent.platforms[0]}`,
        suggestedFix: 'Either add more platforms or clarify what to compare',
      });
    }

    // Check 4: Data availability for mentioned platforms
    const availablePlatforms = this.getAvailablePlatforms(metadata);
    const unavailablePlatforms = userIntent.platforms.filter(
      p => !availablePlatforms.some(ap => {
        // Exact match (case-insensitive)
        if (ap.toLowerCase() === p.toLowerCase()) return true;

        // Partial match in both directions
        if (ap.toLowerCase().includes(p.toLowerCase())) return true;
        if (p.toLowerCase().includes(ap.toLowerCase())) return true;

        // Handle "Platform Ads" vs "Platform" (e.g., "Facebook Ads" should match if "Facebook" exists)
        const pBase = p.replace(/\s+ads$/i, '').trim();
        const apBase = ap.replace(/\s+ads$/i, '').trim();
        if (pBase.toLowerCase() === apBase.toLowerCase()) return true;

        return false;
      })
    );

    if (unavailablePlatforms.length > 0) {
      // Make this a HIGH severity issue to trigger clarification
      issues.push({
        type: 'platform_not_found',
        severity: 'high',
        message: `Requested platforms not found in dataset: ${unavailablePlatforms.join(', ')}`,
        unavailablePlatforms: unavailablePlatforms,
        availablePlatforms: availablePlatforms,
        suggestedFix: `Use available platforms: ${availablePlatforms.join(', ')}`,
      });
    }

    // Check 5: Vague queries
    if (this.isVague(userQuery)) {
      warnings.push({
        type: 'vague_query',
        severity: 'low',
        message: 'Query may be too vague, results might not match expectations',
      });
    }

    const needsClarification = issues.filter(i => i.severity === 'high').length > 0;

    return {
      valid: issues.length === 0,
      needsClarification: needsClarification,
      issues: issues,
      warnings: warnings,
      clarificationQuestion: needsClarification ? this.generateClarificationQuestion(issues, metadata) : null,
      userIntent: userIntent,
      filterIntent: filterIntent,
    };
  }

  /**
   * Parse user intent from natural language query
   */
  parseUserIntent(userQuery) {
    const lower = userQuery.toLowerCase();

    // Detect comparison intent
    const isComparison = /\b(compar|versus|vs\.?|against|better|between)\b/.test(lower);

    // Extract platform mentions
    const platforms = [];
    const platformKeywords = [
      { name: 'Facebook', patterns: ['facebook', 'fb'] },
      { name: 'Instagram', patterns: ['instagram', 'ig', 'insta'] },
      { name: 'Twitter', patterns: ['twitter', 'tweet'] },
      { name: 'LinkedIn', patterns: ['linkedin'] },
      { name: 'TikTok', patterns: ['tiktok', 'tik tok'] },
      { name: 'YouTube', patterns: ['youtube', 'yt'] },
      { name: 'Google', patterns: ['google'] },
    ];

    // Check for "Ads" context
    const isAds = /\b(ads?|advertising|campaigns?|paid)\b/i.test(userQuery);

    platformKeywords.forEach(platform => {
      const found = platform.patterns.some(pattern =>
        new RegExp(`\\b${pattern}\\b`, 'i').test(lower)
      );
      if (found) {
        // Add "Ads" suffix if context indicates ads
        platforms.push(isAds ? `${platform.name} Ads` : platform.name);
      }
    });

    return {
      isComparison: isComparison,
      platforms: platforms,
      isAds: isAds,
    };
  }

  /**
   * Parse filter intent
   */
  parseFilterIntent(filterSpec, metadata) {
    const platforms = [];

    if (filterSpec.filters) {
      filterSpec.filters.forEach(filter => {
        if (filter.column === 'platform') {
          if (Array.isArray(filter.value)) {
            platforms.push(...filter.value);
          } else if (filter.value) {
            platforms.push(filter.value);
          }
        }

        // Handle OR conditions
        if (filter.type === 'or' && filter.conditions) {
          filter.conditions.forEach(cond => {
            if (cond.column === 'platform') {
              if (Array.isArray(cond.value)) {
                platforms.push(...cond.value);
              } else if (cond.value) {
                platforms.push(cond.value);
              }
            }
          });
        }
      });
    }

    return {
      platforms: [...new Set(platforms)], // Remove duplicates
      hasGroupBy: filterSpec.groupBy && filterSpec.groupBy.length > 0,
      hasAggregate: filterSpec.aggregate && Object.keys(filterSpec.aggregate).length > 0,
    };
  }

  /**
   * Get available platforms from metadata
   */
  getAvailablePlatforms(metadata) {
    if (metadata.uniqueValues && metadata.uniqueValues.platform) {
      return metadata.uniqueValues.platform;
    }
    return [];
  }

  /**
   * Check if query is vague
   */
  isVague(query) {
    const vaguePhrases = [
      /^show\s+(me\s+)?posts?$/i,
      /^what('s| is)? best\??$/i,
      /^compare$/i,
      /^analyze$/i,
    ];

    return vaguePhrases.some(pattern => pattern.test(query.trim()));
  }

  /**
   * Generate clarification question based on issues
   */
  generateClarificationQuestion(issues, metadata) {
    const highPriorityIssue = issues.find(i => i.severity === 'high');

    if (!highPriorityIssue) return null;

    const availablePlatforms = this.getAvailablePlatforms(metadata);

    switch (highPriorityIssue.type) {
      case 'missing_platforms':
        return {
          question: `I found data for ${availablePlatforms.filter(p =>
            highPriorityIssue.missingPlatforms.some(mp =>
              p.toLowerCase().includes(mp.toLowerCase())
            )
          ).join(' and ')}. Would you like me to include ${highPriorityIssue.missingPlatforms.join(' and ')} in the comparison?`,
          options: [
            {
              label: `Yes, compare all: ${[...new Set([...issues[0].message.match(/only include (.+)$/)?.[1]?.split(', ') || [], ...highPriorityIssue.missingPlatforms])].join(', ')}`,
              action: 'include_all_platforms',
            },
            {
              label: `No, just show what's available`,
              action: 'show_available_only',
            },
            {
              label: `Let me rephrase my question`,
              action: 'rephrase',
            },
          ],
          issue: highPriorityIssue,
        };

      case 'comparison_single_platform':
        return {
          question: `You mentioned "compare" but I only detected one platform. What would you like to compare?`,
          options: [
            {
              label: `Compare ${highPriorityIssue.message.match(/platform: (.+)$/)?.[1]} to other platforms`,
              action: 'compare_to_all',
            },
            {
              label: `Just show ${highPriorityIssue.message.match(/platform: (.+)$/)?.[1]} performance (no comparison)`,
              action: 'single_platform_only',
            },
            {
              label: `Let me specify which platforms to compare`,
              action: 'specify_platforms',
            },
          ],
          issue: highPriorityIssue,
        };

      case 'platform_not_found':
        return {
          question: `The requested ${highPriorityIssue.unavailablePlatforms.length > 1 ? 'platforms' : 'platform'} (${highPriorityIssue.unavailablePlatforms.join(', ')}) ${highPriorityIssue.unavailablePlatforms.length > 1 ? 'are' : 'is'} not available in the dataset. Would you like to use available platforms instead?`,
          options: [
            {
              label: `Show all available platforms: ${availablePlatforms.join(', ')}`,
              action: 'use_available_platforms',
            },
            {
              label: `Let me rephrase my question`,
              action: 'rephrase',
            },
          ],
          issue: highPriorityIssue,
        };

      default:
        return {
          question: `I detected a potential issue: ${highPriorityIssue.message}. How would you like to proceed?`,
          options: [
            {
              label: `Proceed with current interpretation`,
              action: 'proceed',
            },
            {
              label: `Let me rephrase my question`,
              action: 'rephrase',
            },
          ],
          issue: highPriorityIssue,
        };
    }
  }
}

export default QueryValidator;
