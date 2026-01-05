import React, { useEffect, useState } from 'react';
import GaugeChart from 'react-gauge-chart';
import SentimentTrend from './SentimentTrend';
import ReplyModal from './ReplyModal';

const SentimentDashboard = () => {
    const [sentimentData, setSentimentData] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [isSimulating, setIsSimulating] = useState(false);
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [currentReply, setCurrentReply] = useState({ reply: '', comment: '', platform: '' });

    // Fetch all dashboard data from Node.js API
    const fetchData = async (keepLoadingState = false) => {
        try {
            console.log('🔄 Fetching data... keepLoadingState:', keepLoadingState);
            if (!keepLoadingState) {
                setLoading(true);
            }

            const resSummary = await fetch('http://localhost:3001/api/sentiment/summary');
            const summary = await resSummary.json();
            setSentimentData(summary);
            console.log('📊 Summary updated:', summary);

            const resAlerts = await fetch('http://localhost:3001/api/sentiment/negative-alerts');
            const alertData = await resAlerts.json();
            setAlerts(alertData);

            const resHistory = await fetch('http://localhost:3001/api/sentiment/history');
            const history = await resHistory.json();
            setHistoryData(history);

            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
            console.log('✅ Data fetch complete. Loading state:', false);
        } catch (err) {
            console.error("Fetch Error:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(false);

        // 🚀 LIVE POLLING: Refresh UI every 2 mins to sync with updated background loop
        const interval = setInterval(() => {
            fetchData(true); // Keep loading state off for background polls
        }, 120000); // Changed to 120000ms (2 mins) to match mock_streamer.py

        return () => clearInterval(interval);
    }, []);

    // Manual Scenario Trigger (Normal, Crisis, or Viral)
    const triggerSimulation = async (scenarioType) => {
        try {
            console.log(`🚀 Triggering ${scenarioType} scenario...`);
            setIsSimulating(true);
            setLoading(true);

            const res = await fetch('http://localhost:3001/api/simulate/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario: scenarioType })
            });

            const data = await res.json();
            console.log('Server response:', data);

            if (data.success) {
                console.log('⏳ Waiting 6 seconds for AI processing...');
                // Wait 6 seconds for Python to finish AI labeling and file saving
                setTimeout(() => {
                    console.log('🔄 Refreshing dashboard data...');
                    fetchData(false); // Explicitly pass false to show we're done
                    setIsSimulating(false);
                }, 6000);
            } else {
                setIsSimulating(false);
                setLoading(false);
            }
        } catch (err) {
            console.error("Simulation failed", err);
            setIsSimulating(false);
            setLoading(false);
            alert("Failed to trigger simulation. Please try again.");
        }
    };

    const handleRefresh = async () => {
        try {
            setLoading(true);
            await fetch('http://localhost:3001/api/sentiment/refresh', { method: 'POST' });
            setTimeout(() => fetchData(false), 6000);
        } catch (err) {
            console.error("Refresh failed", err);
            setLoading(false);
            alert("Failed to refresh. Please try again.");
        }
    };

    const generateAIReply = async (comment, platform) => {
        try {
            const res = await fetch('http://localhost:3001/api/sentiment/generate-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment, platform })
            });
            const data = await res.json();
            setCurrentReply({ reply: data.reply, comment, platform });
            setReplyModalOpen(true);
        } catch (err) {
            alert("Failed to generate reply. Please try again.");
        }
    };

    if (loading && sentimentData.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ display: 'inline-block' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
                    <div style={{ fontSize: '18px', color: '#666' }}>Loading AI Insights...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
            <ReplyModal
                isOpen={replyModalOpen}
                onClose={() => setReplyModalOpen(false)}
                reply={currentReply.reply}
                comment={currentReply.comment}
                platform={currentReply.platform}
            />

            {/* Loading Overlay */}
            {loading && sentimentData.length > 0 && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '40px 60px',
                        borderRadius: '20px',
                        textAlign: 'center',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            border: '6px solid #f3f3f3',
                            borderTop: '6px solid #007bff',
                            borderRadius: '50%',
                            margin: '0 auto 20px',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>
                            🤖 AI is Processing...
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                            Analyzing sentiment and updating dashboard
                        </div>
                    </div>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}

            {/* --- HEADER & SIMULATION CONTROLS --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ color: '#1a1a1a', margin: 0 }}>🌍 Platform Sentiment Health</h2>
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Last Sync: {lastUpdated}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => triggerSimulation('normal')}
                        disabled={isSimulating}
                        style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', opacity: isSimulating ? 0.6 : 1 }}
                    >
                        📈 Normal Growth
                    </button>

                    {/* NEW: Viral Growth Button */}
                    <button
                        onClick={() => triggerSimulation('viral')}
                        disabled={isSimulating}
                        style={{ padding: '10px 15px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', opacity: isSimulating ? 0.6 : 1 }}
                    >
                        🚀 Viral Growth
                    </button>

                    <button
                        onClick={() => triggerSimulation('crisis')}
                        disabled={isSimulating}
                        style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', opacity: isSimulating ? 0.6 : 1 }}
                    >
                        🚨 Trigger Crisis
                    </button>
                    <button
                        onClick={handleRefresh}
                        style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        🔄 Refresh AI
                    </button>
                </div>
            </div>

            {/* --- SECTION 1: GAUGE GRID --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {sentimentData.map((platform) => (
                    <div key={platform.platform} style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                        <h3 style={{ textTransform: 'capitalize', marginBottom: '15px', fontSize: '18px' }}>{platform.platform}</h3>
                        <GaugeChart
                            id={`gauge-${platform.platform}`}
                            nrOfLevels={20}
                            percent={platform.health_score / 100}
                            colors={["#FF5F6D", "#FFC371", "#2ecc71"]}
                            arcWidth={0.3}
                            textColor="#333"
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px', fontSize: '12px' }}>
                            <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>Pos: {platform.distribution.positive}%</span>
                            <span style={{ color: '#FF5F6D', fontWeight: 'bold' }}>Neg: {platform.distribution.negative}%</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- SECTION 2: TREND CHART --- */}
            <div style={{ marginBottom: '30px' }}>
                <SentimentTrend data={historyData} />
            </div>

            {/* --- SECTION 3: ACTION CENTER --- */}
            <div style={{ background: '#fff', padding: '25px', borderRadius: '15px', border: '1px solid #ffebee', textAlign: 'left', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h3 style={{ color: '#d32f2f', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    ⚠️ Urgent Attention Required
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alerts.length > 0 ? alerts.map((alert, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #f9f9f9', background: '#fcfcfc', borderRadius: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>{alert.platform}</span>
                                <p style={{ margin: '5px 0', fontSize: '14px', color: '#333', fontWeight: '500' }}>"{alert.comment_text}"</p>
                                <small style={{ color: '#888' }}>User: {alert.user_handle}</small>
                            </div>
                            <button
                                onClick={() => generateAIReply(alert.comment_text, alert.platform)}
                                style={{ marginLeft: '20px', padding: '8px 16px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                            >
                                Draft Reply
                            </button>
                        </div>
                    )) : (
                        <p style={{ color: '#666', fontSize: '14px' }}>✅ All comments are healthy. No urgent actions needed.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SentimentDashboard;