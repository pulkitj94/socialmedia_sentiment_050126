/**
 * LLM Response Validator
 * Validates that LLM-generated narratives don't contain hallucinated numbers
 */

class ResponseValidator {
  /**
   * Validate LLM response against actual data
   * @param {string} narrative - LLM-generated narrative
   * @param {Array} data - Actual data records
   * @param {Object} insights - Calculated insights
   * @returns {Object} Validation result with warnings
   */
  validate(narrative, data, insights) {
    const warnings = [];
    const errors = [];

    // Extract numbers from narrative
    const numbersInNarrative = this.extractNumbers(narrative);

    if (numbersInNarrative.length === 0) {
      // No numbers in narrative - this is actually good for preventing hallucination
      return {
        valid: true,
        warnings: [],
        errors: [],
        confidence: 1.0
      };
    }

    // Get all numbers from actual data
    const numbersInData = this.extractNumbersFromData(data, insights);

    // Check if each number in narrative exists in data
    const unverifiedNumbers = [];
    const verifiedNumbers = [];

    for (const narNum of numbersInNarrative) {
      const found = numbersInData.some(dataNum => {
        // Allow for minor rounding differences (within 1%)
        const diff = Math.abs(narNum - dataNum);
        const tolerance = Math.max(dataNum * 0.01, 1); // 1% or 1, whichever is larger
        return diff <= tolerance;
      });

      if (found) {
        verifiedNumbers.push(narNum);
      } else {
        unverifiedNumbers.push(narNum);
      }
    }

    // Generate warnings for unverified numbers
    if (unverifiedNumbers.length > 0) {
      warnings.push(
        `LLM narrative contains ${unverifiedNumbers.length} number(s) that don't match data: ${unverifiedNumbers.slice(0, 5).join(', ')}${unverifiedNumbers.length > 5 ? '...' : ''}`
      );

      // If more than 30% of numbers are unverified, flag as error
      const unverifiedRatio = unverifiedNumbers.length / numbersInNarrative.length;
      if (unverifiedRatio > 0.3) {
        errors.push(
          `High hallucination risk: ${(unverifiedRatio * 100).toFixed(0)}% of numbers in narrative are not found in data`
        );
      }
    }

    // Calculate confidence score
    const confidence = numbersInNarrative.length === 0
      ? 1.0
      : verifiedNumbers.length / numbersInNarrative.length;

    return {
      valid: errors.length === 0,
      warnings,
      errors,
      confidence,
      stats: {
        totalNumbers: numbersInNarrative.length,
        verifiedNumbers: verifiedNumbers.length,
        unverifiedNumbers: unverifiedNumbers.length
      }
    };
  }

  /**
   * Extract all numbers from text
   * @param {string} text - Text to extract numbers from
   * @returns {Array<number>} List of numbers found
   */
  extractNumbers(text) {
    if (!text) return [];

    // Match numbers with optional commas and decimal points
    // Matches: 123, 1,234, 12.34, 1,234.56
    const numberPattern = /\b\d{1,3}(?:,?\d{3})*(?:\.\d+)?\b/g;
    const matches = text.match(numberPattern) || [];

    return matches
      .map(m => parseFloat(m.replace(/,/g, '')))
      .filter(n => !isNaN(n) && n > 0); // Only positive numbers
  }

  /**
   * Extract all numbers from data and insights
   * @param {Array} data - Data records
   * @param {Object} insights - Calculated insights
   * @returns {Array<number>} List of numbers from data
   */
  extractNumbersFromData(data, insights) {
    const numbers = new Set();

    // Extract from data records
    if (data && Array.isArray(data)) {
      data.forEach(record => {
        Object.values(record).forEach(value => {
          if (value !== null && value !== undefined && value !== '') {
            const num = parseFloat(String(value).replace(/,/g, ''));
            if (!isNaN(num) && num > 0) {
              numbers.add(num);
            }
          }
        });
      });
    }

    // Extract from insights statistics
    if (insights && insights.statistics) {
      Object.values(insights.statistics).forEach(stats => {
        if (typeof stats === 'object') {
          ['min', 'max', 'average', 'total', 'count'].forEach(key => {
            if (stats[key] !== undefined) {
              const num = parseFloat(stats[key]);
              if (!isNaN(num) && num > 0) {
                numbers.add(num);
              }
            }
          });
        }
      });
    }

    // Extract from insights top results
    if (insights && insights.topResults && Array.isArray(insights.topResults)) {
      insights.topResults.forEach(result => {
        Object.values(result).forEach(value => {
          if (value !== null && value !== undefined && value !== '') {
            const num = parseFloat(String(value).replace(/,/g, ''));
            if (!isNaN(num) && num > 0) {
              numbers.add(num);
            }
          }
        });
      });
    }

    return Array.from(numbers);
  }

  /**
   * Check if filter spec returned by LLM is valid JSON
   * @param {string} llmResponse - Raw LLM response
   * @returns {Object} Validation result
   */
  validateFilterJSON(llmResponse) {
    try {
      const parsed = JSON.parse(llmResponse);

      // Check required fields
      const requiredFields = ['filters'];
      const missingFields = requiredFields.filter(field => !(field in parsed));

      if (missingFields.length > 0) {
        return {
          valid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          parsed: null
        };
      }

      return {
        valid: true,
        error: null,
        parsed
      };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid JSON: ${error.message}`,
        parsed: null
      };
    }
  }

  /**
   * Sanitize LLM narrative to remove potentially hallucinated numbers
   * @param {string} narrative - Original narrative
   * @param {Array} verifiedNumbers - Numbers verified to exist in data
   * @returns {string} Sanitized narrative with warnings
   */
  sanitizeNarrative(narrative, verifiedNumbers) {
    // This is a placeholder for future enhancement
    // Could replace unverified numbers with placeholders or add disclaimers
    return narrative;
  }
}

export default ResponseValidator;
