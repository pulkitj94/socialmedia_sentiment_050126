import React, { useEffect, useState } from 'react';
import GaugeChart from 'react-gauge-chart';

const SentimentSection = () => {
    const [summary, setSummary] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetching the JSON summary from your newly created Node route
        fetch('http://localhost:3001/api/sentiment/summary')
            .then(res => res.json())
            .then(data => setSummary(data))
            .catch(err => setError("Could not load sentiment data."));
    }, []);

    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '15px' }}>
            <h2 style={{ marginBottom: '20px' }}>Platform Sentiment Health</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                {summary.map((item) => (
                    <div key={item.platform} style={{
                        background: 'white', padding: '20px', borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '280px', textAlign: 'center'
                    }}>
                        <h3 style={{ textTransform: 'capitalize' }}>{item.platform}</h3>

                        <GaugeChart
                            id={`gauge-${item.platform}`}
                            nrOfLevels={20}
                            percent={item.health_score / 100}
                            colors={["#FF5F6D", "#FFC371", "#2ecc71"]} // Red -> Yellow -> Green
                            arcWidth={0.3}
                            textColor="#333"
                        />

                        <div style={{ marginTop: '10px', fontSize: '14px', display: 'flex', justifyContent: 'space-around' }}>
                            <span style={{ color: '#2ecc71' }}>Pos: {item.distribution.positive}%</span>
                            <span style={{ color: '#FF5F6D' }}>Neg: {item.distribution.negative}%</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
                            Based on {item.total_comments} comments
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SentimentSection;