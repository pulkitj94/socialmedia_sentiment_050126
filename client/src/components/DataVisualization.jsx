import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#FFEB3B', '#795548'];

/**
 * Data Visualization Component
 * Automatically suggests chart type based on data structure
 * Supports: Bar charts, Line charts, Pie charts
 */
function DataVisualization({ data, insights, metadata }) {
  const [chartType, setChartType] = useState('auto');
  const [selectedMetric, setSelectedMetric] = useState(null);

  // Detect available metrics (numeric columns)
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];
    return Object.keys(firstRow).filter(key => {
      const value = firstRow[key];
      return typeof value === 'number' && !key.endsWith('_count');
    });
  }, [data]);

  // Detect grouping columns (categorical)
  const categoricalColumns = useMemo(() => {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];
    return Object.keys(firstRow).filter(key => {
      const value = firstRow[key];
      return typeof value === 'string' || key.includes('platform') || key.includes('type');
    });
  }, [data]);

  // Auto-select chart type based on data structure
  const suggestedChartType = useMemo(() => {
    if (!data || data.length === 0) return 'bar';

    // If data has date column, suggest line chart (trend)
    const hasDateColumn = categoricalColumns.some(col =>
      col.includes('date') || col.includes('month') || col.includes('week')
    );
    if (hasDateColumn) return 'line';

    // If few rows (< 8) and has categorical column, suggest pie chart
    if (data.length <= 8 && categoricalColumns.length > 0) return 'pie';

    // Default: bar chart for comparisons
    return 'bar';
  }, [data, categoricalColumns]);

  // Auto-select primary metric
  const primaryMetric = useMemo(() => {
    if (selectedMetric) return selectedMetric;

    if (!numericColumns || numericColumns.length === 0) return null;

    // Prioritize engagement-related metrics
    const priorities = [
      'engagement_rate', 'engagement_rate_mean', 'engagement_rate_sum',
      'likes', 'likes_sum', 'likes_mean',
      'reach', 'reach_sum', 'reach_mean',
      'roas', 'roas_mean', 'revenue', 'revenue_sum'
    ];

    for (const priority of priorities) {
      if (numericColumns.includes(priority)) {
        return priority;
      }
    }

    // Default to first numeric column
    return numericColumns[0];
  }, [numericColumns, selectedMetric]);

  // Auto-select label column (X-axis)
  const labelColumn = useMemo(() => {
    if (!categoricalColumns || categoricalColumns.length === 0) return null;

    // Prioritize meaningful categorical columns
    const priorities = ['platform', 'media_type', 'campaign_name', 'post_id'];

    for (const priority of priorities) {
      if (categoricalColumns.includes(priority)) {
        return priority;
      }
    }

    return categoricalColumns[0];
  }, [categoricalColumns]);

  // Format chart data
  const chartData = useMemo(() => {
    if (!data || !labelColumn || !primaryMetric) return [];

    return data.map(row => ({
      name: String(row[labelColumn]).substring(0, 20), // Truncate long labels
      value: row[primaryMetric],
      fullName: row[labelColumn],
      ...row
    }));
  }, [data, labelColumn, primaryMetric]);

  // Format metric name for display
  const formatMetricName = (metric) => {
    if (!metric) return '';
    return metric
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .replace(' Mean', ' (Avg)')
      .replace(' Sum', ' (Total)');
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '14px' }}>
          {data.fullName || data.name}
        </p>
        <p style={{ margin: '0', color: '#4CAF50', fontSize: '16px', fontWeight: 'bold' }}>
          {formatMetricName(primaryMetric)}: {data.value?.toLocaleString()}
        </p>
      </div>
    );
  };

  const activeChartType = chartType === 'auto' ? suggestedChartType : chartType;

  if (!data || data.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#666',
        fontSize: '16px'
      }}>
        No data available for visualization
      </div>
    );
  }

  if (!numericColumns || numericColumns.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#666',
        fontSize: '16px'
      }}>
        No numeric data found for visualization
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Chart Type Selector */}
        <div>
          <label style={{ marginRight: '8px', fontWeight: '500', color: '#333' }}>
            Chart Type:
          </label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="auto">Auto ({suggestedChartType})</option>
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>

        {/* Metric Selector */}
        <div>
          <label style={{ marginRight: '8px', fontWeight: '500', color: '#333' }}>
            Metric:
          </label>
          <select
            value={primaryMetric || ''}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {numericColumns.map(col => (
              <option key={col} value={col}>
                {formatMetricName(col)}
              </option>
            ))}
          </select>
        </div>

        {/* Data Info */}
        <div style={{
          marginLeft: 'auto',
          color: '#666',
          fontSize: '13px'
        }}>
          {chartData.length} data points
        </div>
      </div>

      {/* Chart */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        minHeight: '400px'
      }}>
        <ResponsiveContainer width="100%" height={400}>
          {activeChartType === 'bar' && (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar
                dataKey="value"
                fill="#4CAF50"
                name={formatMetricName(primaryMetric)}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          )}

          {activeChartType === 'line' && (
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2196F3"
                strokeWidth={2}
                name={formatMetricName(primaryMetric)}
                dot={{ fill: '#2196F3', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}

          {activeChartType === 'pie' && (
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={140}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Insights */}
      {insights && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          borderLeft: '4px solid #4CAF50'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>
            📊 Insights
          </h4>
          {insights.topPerformers && insights.topPerformers.length > 0 && (
            <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
              <strong>Top performer:</strong> {insights.topPerformers[0].name}
              ({formatMetricName(primaryMetric)}: {insights.topPerformers[0].value?.toLocaleString()})
            </p>
          )}
          {insights.summary && (
            <p style={{ margin: '5px 0', fontSize: '13px', color: '#555' }}>
              {insights.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default DataVisualization;
