/**
 * Validates LLM-generated filter specifications
 * Ensures filters are safe and valid before applying to data
 */
class FilterValidator {
  constructor(metadata) {
    this.metadata = metadata;
    this.validOperators = [
      'equals', 'not_equals',
      'greater_than', 'less_than',
      'greater_than_or_equal', 'less_than_or_equal',
      'contains', 'not_contains',
      'in', 'not_in',
      'between',
      'after', 'before',
      'starts_with', 'ends_with'
    ];
    this.validAggregations = ['sum', 'mean', 'median', 'count', 'min', 'max', 'std'];
  }

  /**
   * Validate complete filter specification
   * @param {Object} filterSpec - The filter specification from LLM
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate(filterSpec) {
    const errors = [];

    // Validate structure
    if (!filterSpec || typeof filterSpec !== 'object') {
      return { valid: false, errors: ['Filter specification must be an object'] };
    }

    // Validate filters array
    if (filterSpec.filters) {
      if (!Array.isArray(filterSpec.filters)) {
        errors.push('filters must be an array');
      } else {
        filterSpec.filters.forEach((filter, index) => {
          const filterErrors = this.validateFilter(filter, index);
          errors.push(...filterErrors);
        });
      }
    }

    // Validate groupBy
    if (filterSpec.groupBy) {
      if (!Array.isArray(filterSpec.groupBy)) {
        errors.push('groupBy must be an array');
      } else {
        filterSpec.groupBy.forEach(col => {
          if (!this.metadata.columns.includes(col)) {
            errors.push(`groupBy column "${col}" does not exist in dataset`);
          }
        });
      }
    }

    // Validate aggregate
    if (filterSpec.aggregate) {
      if (typeof filterSpec.aggregate !== 'object') {
        errors.push('aggregate must be an object');
      } else {
        for (const [col, method] of Object.entries(filterSpec.aggregate)) {
          if (!this.metadata.columns.includes(col)) {
            errors.push(`aggregate column "${col}" does not exist in dataset`);
          }
          if (!this.validAggregations.includes(method)) {
            errors.push(`aggregate method "${method}" is not valid. Use: ${this.validAggregations.join(', ')}`);
          }
        }
      }
    }

    // Validate sortBy
    if (filterSpec.sortBy) {
      if (typeof filterSpec.sortBy !== 'object') {
        errors.push('sortBy must be an object');
      } else {
        if (!filterSpec.sortBy.column) {
          errors.push('sortBy must have a column property');
        } else if (!this.metadata.columns.includes(filterSpec.sortBy.column)) {
          // Allow sorting by aggregated columns
          if (filterSpec.aggregate && !filterSpec.aggregate[filterSpec.sortBy.column]) {
            errors.push(`sortBy column "${filterSpec.sortBy.column}" does not exist in dataset or aggregates`);
          }
        }
        if (filterSpec.sortBy.order && !['asc', 'desc'].includes(filterSpec.sortBy.order)) {
          errors.push('sortBy order must be "asc" or "desc"');
        }
      }
    }

    // Validate limit
    if (filterSpec.limit !== undefined) {
      if (typeof filterSpec.limit !== 'number' || filterSpec.limit < 1) {
        errors.push('limit must be a positive number');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual filter
   */
  validateFilter(filter, index) {
    const errors = [];
    const prefix = `Filter [${index}]`;

    // Check for complex filter (AND/OR)
    if (filter.type && (filter.type === 'and' || filter.type === 'or')) {
      if (!Array.isArray(filter.conditions)) {
        errors.push(`${prefix}: Complex filter must have conditions array`);
      } else {
        filter.conditions.forEach((cond, condIndex) => {
          const condErrors = this.validateFilter(cond, `${index}.${condIndex}`);
          errors.push(...condErrors);
        });
      }
      return errors;
    }

    // Validate column exists
    if (!filter.column) {
      errors.push(`${prefix}: Missing column property`);
      return errors;
    }

    if (!this.metadata.columns.includes(filter.column)) {
      errors.push(`${prefix}: Column "${filter.column}" does not exist in dataset`);
      return errors;
    }

    // Validate operator
    if (!filter.operator) {
      errors.push(`${prefix}: Missing operator property`);
    } else if (!this.validOperators.includes(filter.operator)) {
      errors.push(`${prefix}: Invalid operator "${filter.operator}". Valid operators: ${this.validOperators.join(', ')}`);
    }

    // Validate value exists
    if (filter.value === undefined || filter.value === null) {
      errors.push(`${prefix}: Missing value property`);
      return errors;
    }

    // Validate value type based on column type
    const columnType = this.metadata.columnTypes[filter.column];
    const valueErrors = this.validateValue(filter.value, filter.operator, columnType, filter.column);
    if (valueErrors.length > 0) {
      errors.push(`${prefix}: ${valueErrors.join(', ')}`);
    }

    return errors;
  }

  /**
   * Validate filter value matches expected type
   */
  validateValue(value, operator, columnType, columnName) {
    const errors = [];

    // Operators that require arrays
    if (['in', 'not_in', 'between'].includes(operator)) {
      if (!Array.isArray(value)) {
        errors.push(`Operator "${operator}" requires an array value`);
        return errors;
      }
      if (operator === 'between' && value.length !== 2) {
        errors.push(`Operator "between" requires exactly 2 values [min, max]`);
      }
    }

    // Numeric columns
    if (columnType === 'numeric') {
      if (['greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'equals'].includes(operator)) {
        if (typeof value !== 'number' && isNaN(parseFloat(value))) {
          errors.push(`Numeric column "${columnName}" requires numeric value, got: ${typeof value}`);
        }
      }
      if (operator === 'between') {
        if (!Array.isArray(value) || value.some(v => typeof v !== 'number' && isNaN(parseFloat(v)))) {
          errors.push(`Numeric column "${columnName}" with "between" requires array of numbers`);
        }
      }
    }

    // Categorical columns - validate against possible values
    if (this.metadata.uniqueValues[columnName] && Array.isArray(this.metadata.uniqueValues[columnName])) {
      const possibleValues = this.metadata.uniqueValues[columnName].map(v => v.toLowerCase());
      if (operator === 'equals' || operator === 'not_equals') {
        if (!possibleValues.includes(value.toLowerCase())) {
          // Warning, not error - allow flexibility for variations
          console.warn(`Value "${value}" not in known values for "${columnName}". Known: ${possibleValues.join(', ')}`);
        }
      }
      if (operator === 'in' || operator === 'not_in') {
        value.forEach(v => {
          if (!possibleValues.includes(v.toLowerCase())) {
            console.warn(`Value "${v}" not in known values for "${columnName}"`);
          }
        });
      }
    }

    return errors;
  }

  /**
   * Sanitize filter specification (remove unsafe elements)
   */
  sanitize(filterSpec) {
    // Remove any functions or dangerous properties
    const sanitized = JSON.parse(JSON.stringify(filterSpec));

    // Ensure limit is reasonable
    if (sanitized.limit && sanitized.limit > 1000) {
      sanitized.limit = 1000;
    }

    return sanitized;
  }
}

export default FilterValidator;
