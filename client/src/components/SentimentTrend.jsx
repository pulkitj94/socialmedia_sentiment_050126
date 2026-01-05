import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SentimentTrend = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch('http://localhost:3001/api/sentiment/history');
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error("Trend Chart Error:", err);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', marginTop: '30px', textAlign: 'left' }}>
            <div style={{ marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#1a1a1a' }}>📈 Brand Sentiment Velocity</h3>
                <p style={{ fontSize: '13px', color: '#666', marginTop: '5px', marginBottom: 0 }}>
                    Track how sentiment health scores change over time. Data captured on each refresh or simulation.
                </p>
            </div>
            <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis
                            dataKey="timestamp"
                            stroke="#888"
                            fontSize={11}
                            angle={-20}
                            textAnchor="end"
                            height={60}
                            tickFormatter={(value) => {
                                // Format timestamp to show only time (HH:MM)
                                const parts = value.split(' ');
                                if (parts.length === 2) {
                                    const time = parts[1].substring(0, 5); // Get HH:MM
                                    return time;
                                }
                                return value;
                            }}
                        />
                        <YAxis domain={[0, 100]} stroke="#888" fontSize={12} label={{ value: 'Health Score (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#666' } }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value) => `${value}%`}
                            labelFormatter={(label) => `Time: ${label}`}
                        />
                        <Legend verticalAlign="top" align="right" height={36} />
                        <Line type="monotone" dataKey="Twitter" stroke="#1DA1F2" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="Instagram" stroke="#E1306C" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Facebook" stroke="#4267B2" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Linkedin" stroke="#0077B5" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SentimentTrend;