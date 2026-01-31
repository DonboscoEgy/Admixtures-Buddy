import React, { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle, CheckCircle, TrendingUp, Phone, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

export default function RelationshipCard({ account, onRefresh }) {
    const { showToast } = useToast();
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);

    // Parse fallback if columns are null (fresh account)
    const summary = account.ai_summary || "No analysis generated yet. Click refresh to analyze recent activities.";
    const sentiment = account.ai_sentiment || "Unknown"; // Positive, Neutral, Risk
    const nextStep = account.ai_next_step || "-";
    const lastUpdated = account.ai_last_updated ? new Date(account.ai_last_updated).toLocaleString() : 'Never';

    // Mock functionality for now - In Phase 2 this will call the Edge Function
    const handleRefresh = async () => {
        setLoading(true);
        try {
            // Call Edge Function stub
            // const { data, error } = await supabase.functions.invoke('summarize-account', { body: { account_id: account.id } });

            // For now, satisfy the UI demo with a "Not Connected" message or simulate a delay
            await new Promise(r => setTimeout(r, 1500));
            showToast('Logic will be connected in Phase 2 (Edge Function)', 'info');
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error(err);
            showToast('Analysis failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Sentiment Colors
    const getSentimentColor = (s) => {
        switch (s?.toLowerCase()) {
            case 'positive': return '#10b981'; // Green
            case 'risk': return '#ef4444';     // Red
            case 'neutral': return '#f59e0b';  // Orange
            default: return '#94a3b8';         // Grey
        }
    };
    const color = getSentimentColor(sentiment);

    return (
        <div className="glass-card" style={{
            padding: '25px',
            marginBottom: '30px',
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${color}40`,
            boxShadow: `0 0 20px ${color}10`,
            background: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'white'
        }}>
            {/* Glowing Accent Top Border */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${color}, transparent)` }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: `${color}20`, color: color }}>
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Relationship Intelligence</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI-Powered Analysis</div>
                    </div>
                </div>

                {/* Sentiment Badge */}
                <div style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: `${color}20`,
                    color: color,
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    border: `1px solid ${color}40`
                }}>
                    {sentiment === 'Positive' && <TrendingUp size={16} />}
                    {sentiment === 'Risk' && <AlertCircle size={16} />}
                    {sentiment === 'Unknown' && <AlertCircle size={16} />}
                    {sentiment || 'Unknown'}
                </div>
            </div>

            {/* AI Content */}
            <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-main)', margin: '0 0 15px 0' }}>
                    {summary}
                </p>

                {/* Next Step Box */}
                {nextStep && nextStep !== '-' && (
                    <div style={{
                        background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                        padding: '15px',
                        borderRadius: '12px',
                        borderLeft: `4px solid ${color}`
                    }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: 'bold' }}>
                            Suggested Next Step
                        </div>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={18} color={color} />
                            {nextStep}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Metrics & Actions */}
            <div style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>Last analyzed: {lastUpdated}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="btn-secondary"
                        style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                    >
                        <RefreshCw size={14} className={loading ? 'spin-anim' : ''} style={{ marginRight: '6px' }} />
                        {loading ? 'Analyzing...' : 'Refresh Analysis'}
                    </button>
                </div>
            </div>
        </div>
    );
}
