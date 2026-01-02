import { useState } from 'react';
import { exportToCSV, exportToJSON, exportToExcel, copyToClipboard, printData } from '../utils/exportUtils';

/**
 * Component to display structured data with Progressive Disclosure
 * - Always shows narrative/answer first
 * - Auto-expands data table for complex queries (>5 rows)
 * - Collapsible sections instead of tabs
 * - Export always accessible
 */
function StructuredDataDisplay({ data, insights, narrative, metadata }) {
  // Smart defaults: auto-expand data table if complex query
  const shouldAutoExpandData = data && data.length > 5;
  const shouldAutoExpandInsights = insights && (
    (insights.statistics && Object.keys(insights.statistics).length > 2) ||
    (insights.topResults && insights.topResults.length > 0)
  );

  const [isDataExpanded, setIsDataExpanded] = useState(shouldAutoExpandData);
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(shouldAutoExpandInsights);
  const [showExportMenu, setShowExportMenu] = useState(false);

  if (!data && !insights && !narrative) {
    return null;
  }

  const handleExport = (format) => {
    setShowExportMenu(false);

    const filename = `social-data-${Date.now()}`;

    switch (format) {
      case 'csv':
        exportToCSV(data, filename);
        break;
      case 'excel':
        exportToExcel(data, filename);
        break;
      case 'json':
        exportToJSON({ data, insights, metadata }, filename);
        break;
      case 'copy':
        copyToClipboard(data);
        break;
      case 'print':
        printData(data, 'Social Media Analytics');
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Always show narrative first (the answer) */}
      {narrative && (
        <div className="prose prose-sm max-w-none">
          <NarrativeContent content={narrative} />
        </div>
      )}

      {/* Collapsible Data Section */}
      {data && data.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setIsDataExpanded(!isDataExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                📋 Data Table ({data.length} {data.length === 1 ? 'record' : 'records'})
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${isDataExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isDataExpanded && (
            <div className="p-4 bg-white">
              <DataTable data={data} />
            </div>
          )}
        </div>
      )}

      {/* Collapsible Insights Section */}
      {insights && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setIsInsightsExpanded(!isInsightsExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                💡 Insights & Statistics
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${isInsightsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isInsightsExpanded && (
            <div className="p-4 bg-white">
              <InsightsPanel insights={insights} />
            </div>
          )}
        </div>
      )}

      {/* Export Button - Always Prominent */}
      {data && data.length > 0 && (
        <div className="flex justify-end">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              📥 Export Data
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Export Menu Dropdown */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    📄 Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    📊 Export as Excel
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    🔧 Export as JSON
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => handleExport('copy')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    📋 Copy to Clipboard
                  </button>
                  <button
                    onClick={() => handleExport('print')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    🖨️ Print
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Narrative content with markdown formatting
 */
function NarrativeContent({ content }) {
  const formatText = (text) => {
    return text
      .split('\n')
      .map((line) => {
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Headers
        if (line.startsWith('###')) {
          return `<h3 class="text-base font-semibold mt-3 mb-1">${line.replace('###', '').trim()}</h3>`;
        }
        if (line.startsWith('##')) {
          return `<h2 class="text-lg font-semibold mt-4 mb-2">${line.replace('##', '').trim()}</h2>`;
        }
        // Lists
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return `<li class="ml-4">${line.replace(/^[•\-]\s*/, '')}</li>`;
        }
        return `<p class="my-1">${line}</p>`;
      })
      .join('');
  };

  return (
    <div
      dangerouslySetInnerHTML={{ __html: formatText(content) }}
      className="text-sm leading-relaxed"
    />
  );
}

/**
 * Data table component
 */
function DataTable({ data }) {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]).filter(key => !key.startsWith('_'));
  const [showAll, setShowAll] = useState(false);
  const displayData = showAll ? data : data.slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col} className="px-4 py-3 whitespace-nowrap">
                    {formatCellValue(row[col], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 10 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Show all {data.length} records →
        </button>
      )}

      {showAll && data.length > 10 && (
        <button
          onClick={() => setShowAll(false)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Show less
        </button>
      )}
    </div>
  );
}

/**
 * Insights panel with statistics and key findings
 */
function InsightsPanel({ insights }) {
  return (
    <div className="space-y-4">
      {/* Query Type Badge */}
      {insights.type && (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
          {insights.type === 'comparison' ? '📊 Comparison Query' : '📋 Individual Items Query'}
        </div>
      )}

      {/* Key Findings */}
      {insights.keyFindings && insights.keyFindings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">🔍 Key Findings</h4>
          <ul className="space-y-1">
            {insights.keyFindings.map((finding, idx) => (
              <li key={idx} className="text-sm text-blue-800">• {finding}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Statistics - Smart Display */}
      {insights.statistics && Object.keys(insights.statistics).length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-900 mb-3">📈 Statistics</h4>
          <div className="space-y-3">
            {Object.entries(insights.statistics).map(([key, stats]) => {
              // Check if all values are the same (single record case)
              const isSingleRecord = stats.count === 1 ||
                (stats.min === stats.max && stats.max === stats.average);

              return (
                <div key={key} className="bg-white rounded p-3">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                    {key.replace(/_/g, ' ')}
                  </div>

                  {isSingleRecord ? (
                    // For single record, show only the value (not min/max/avg)
                    <div className="text-lg font-semibold text-gray-900">
                      {formatNumber(stats.average || stats.total || stats.min)}
                    </div>
                  ) : (
                    // For multiple records, show the full breakdown
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {/* Only show min/max if they're different */}
                      {stats.min !== undefined && stats.min !== stats.max && (
                        <div>
                          <span className="text-gray-600">Min:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {formatNumber(stats.min)}
                          </span>
                        </div>
                      )}
                      {stats.max !== undefined && stats.min !== stats.max && (
                        <div>
                          <span className="text-gray-600">Max:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {formatNumber(stats.max)}
                          </span>
                        </div>
                      )}
                      {stats.average !== undefined && (
                        <div>
                          <span className="text-gray-600">Avg:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {formatNumber(stats.average)}
                          </span>
                        </div>
                      )}
                      {stats.total !== undefined && (
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {formatNumber(stats.total)}
                          </span>
                        </div>
                      )}
                      {stats.count !== undefined && stats.count > 1 && (
                        <div>
                          <span className="text-gray-600">Count:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {stats.count}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Results */}
      {insights.topResults && insights.topResults.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-purple-900 mb-3">🏆 Top Results</h4>
          <DataTable data={insights.topResults} />
        </div>
      )}

      {/* Filter Info */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        {insights.filtersApplied !== undefined && (
          <div className="bg-gray-50 rounded p-3">
            <div className="text-gray-600">Filters Applied</div>
            <div className="text-lg font-semibold text-gray-900">{insights.filtersApplied}</div>
          </div>
        )}
        {insights.sortedBy && (
          <div className="bg-gray-50 rounded p-3">
            <div className="text-gray-600">Sorted By</div>
            <div className="text-sm font-semibold text-gray-900">{insights.sortedBy}</div>
          </div>
        )}
        {insights.groupedBy && insights.groupedBy.length > 0 && (
          <div className="bg-gray-50 rounded p-3">
            <div className="text-gray-600">Grouped By</div>
            <div className="text-sm font-semibold text-gray-900">
              {insights.groupedBy.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format cell values for display
 */
function formatCellValue(value, columnName) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">-</span>;
  }

  // Check if it's a numeric value
  const num = parseFloat(value);
  if (!isNaN(num) && value !== '') {
    // Format numbers with commas
    if (columnName.includes('rate') || columnName.includes('percentage')) {
      return <span className="font-medium text-gray-900">{num.toFixed(2)}%</span>;
    }
    if (Number.isInteger(num) && num > 999) {
      return <span className="font-medium text-gray-900">{num.toLocaleString()}</span>;
    }
    if (!Number.isInteger(num)) {
      return <span className="font-medium text-gray-900">{num.toFixed(2)}</span>;
    }
  }

  // Format platform names with badges
  if (columnName === 'platform') {
    const colors = {
      instagram: 'bg-pink-100 text-pink-800',
      facebook: 'bg-blue-100 text-blue-800',
      twitter: 'bg-sky-100 text-sky-800',
      linkedin: 'bg-indigo-100 text-indigo-800',
      tiktok: 'bg-purple-100 text-purple-800',
    };
    const color = colors[value.toLowerCase()] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {value}
      </span>
    );
  }

  return <span className="text-gray-900">{value}</span>;
}

/**
 * Format numbers with commas and appropriate precision
 */
function formatNumber(value) {
  if (value === null || value === undefined) return '-';

  const num = parseFloat(value);
  if (isNaN(num)) return value;

  if (Number.isInteger(num)) {
    return num.toLocaleString();
  }

  return num.toFixed(2);
}

export default StructuredDataDisplay;