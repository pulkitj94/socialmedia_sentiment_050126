/**
 * Export utilities for exporting data to various formats
 */

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Filename without extension
 */
export function exportToCSV(data, filename = 'export') {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get all unique columns
  const columns = Array.from(
    new Set(data.flatMap(row => Object.keys(row)))
  ).filter(col => !col.startsWith('_')); // Exclude internal columns

  // Build CSV content
  const csvRows = [];

  // Header row
  csvRows.push(columns.join(','));

  // Data rows
  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col];

      // Handle different types
      if (value === null || value === undefined) {
        return '';
      }

      // Escape quotes and wrap in quotes if contains comma/newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    });

    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

/**
 * Export data to JSON format
 * @param {Object} data - Data object to export
 * @param {string} filename - Filename without extension
 */
export function exportToJSON(data, filename = 'export') {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

/**
 * Export complete response (data + insights + narrative)
 * @param {Object} responseData - Complete API response
 * @param {string} query - Original query
 */
export function exportCompleteResponse(responseData, query) {
  const exportData = {
    query: query,
    timestamp: new Date().toISOString(),
    data: responseData.data,
    insights: responseData.insights,
    narrative: responseData.narrative,
    metadata: responseData.metadata,
    summary: responseData.summary
  };

  exportToJSON(exportData, `query-result-${Date.now()}`);
}

/**
 * Copy data to clipboard as formatted text
 * @param {Array} data - Array of objects to copy
 */
export async function copyToClipboard(data) {
  if (!data || data.length === 0) {
    alert('No data to copy');
    return;
  }

  // Format as tab-separated values
  const columns = Object.keys(data[0]).filter(col => !col.startsWith('_'));

  const rows = [
    columns.join('\t'), // Header
    ...data.map(row =>
      columns.map(col => row[col] ?? '').join('\t')
    )
  ];

  const text = rows.join('\n');

  try {
    await navigator.clipboard.writeText(text);
    alert('Data copied to clipboard! You can paste it into Excel or Google Sheets.');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);

    // Fallback: Create a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      alert('Data copied to clipboard!');
    } catch (err) {
      alert('Failed to copy data. Please try again.');
    }

    document.body.removeChild(textarea);
  }
}

/**
 * Generate shareable link with query parameters
 * @param {string} query - Query to share
 * @returns {string} Shareable URL
 */
export function generateShareableLink(query) {
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({ q: query });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Copy shareable link to clipboard
 * @param {string} query - Query to share
 */
export async function shareQuery(query) {
  const link = generateShareableLink(query);

  try {
    await navigator.clipboard.writeText(link);
    alert('Link copied to clipboard! Share it with others.');
  } catch (error) {
    console.error('Failed to copy link:', error);
    alert('Failed to copy link. Please try again.');
  }
}

/**
 * Helper: Download file to user's computer
 * @param {string} content - File content
 * @param {string} filename - Filename with extension
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format data for Excel-compatible export
 * Handles numbers, dates, and special characters properly
 * @param {Array} data - Array of objects
 * @returns {string} TSV content (Tab-Separated Values for Excel)
 */
export function exportToExcel(data, filename = 'export') {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const columns = Object.keys(data[0]).filter(col => !col.startsWith('_'));

  const rows = [
    columns.join('\t'), // Header
    ...data.map(row =>
      columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';

        // Preserve numbers as numbers
        if (typeof value === 'number') return value;

        // Handle strings with special characters
        const stringValue = String(value);
        if (stringValue.includes('\t') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      }).join('\t')
    )
  ];

  const tsvContent = rows.join('\n');
  downloadFile(tsvContent, `${filename}.xls`, 'application/vnd.ms-excel');
}

/**
 * Print data as formatted table
 * @param {Array} data - Array of objects to print
 * @param {string} title - Print title
 */
export function printData(data, title = 'Data Export') {
  if (!data || data.length === 0) {
    alert('No data to print');
    return;
  }

  const columns = Object.keys(data[0]).filter(col => !col.startsWith('_'));

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .timestamp {
            color: #666;
            font-size: 12px;
            margin-top: 10px;
          }
          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${columns.map(col => `<td>${row[col] ?? ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(html);
  printWindow.document.close();
}

export default {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportCompleteResponse,
  copyToClipboard,
  shareQuery,
  generateShareableLink,
  printData
};
