import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Calendar, Trophy, AlertTriangle, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { profile, user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Data States
    const [agenda, setAgenda] = useState([]);
    const [wins, setWins] = useState([]);
    const [risks, setRisks] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const myId = profile?.initials || user?.email;

        try {
            // 1. Agenda (Today's Activities)
            // Note: We look for activities scheduled for Today or Future? 
            // Usually "Agenda" means future or today. Let's show Today + Future (Limit 5)
            const { data: agendaData } = await supabase
                .from('mac_account_activities')
                .select(`
                    id, activity_type, activity_date, outcome,
                    accounts_master (id, name),
                    opportunities (id, account_name)
                `)
                .eq('created_by', myId)
                .gte('activity_date', today)
                .order('activity_date', { ascending: true })
                .limit(5);
            setAgenda(agendaData || []);

            // 2. Recent Wins (Last 7 Days) - Team Wide
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: winsData } = await supabase
                .from('opportunities')
                .select('id, account_name, monthly_production, close_date, owner_initials')
                .eq('stage', 'Won')
                .gte('close_date', sevenDaysAgo.toISOString().split('T')[0])
                .order('close_date', { ascending: false })
                .limit(5);
            setWins(winsData || []);

            // 3. At Risk Accounts (AI Sentiment = Risk) - Team Wide (or filter by territory if we had it)
            const { data: riskData } = await supabase
                .from('accounts_master')
                .select('id, name, ai_last_updated, ai_summary')
                .eq('ai_sentiment', 'Risk')
                .limit(5);
            setRisks(riskData || []);

        } catch (error) {
            console.error('Dashboard Load Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDisplayName = (act) => act.accounts_master?.name || act.opportunities?.account_name || 'Unknown';

    if (loading) return <div className="p-10 text-center text-gray-500">Loading Dashboard...</div>;

    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* Valid Greeting */}
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
                    Good Morning, {profile?.full_name?.split(' ')[0] || 'Team'}! ☀️
                </h1>
                <p style={{ color: '#94a3b8' }}>Here is what's happening at Pleko today.</p>
            </div>

            {/* Widget Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>

                {/* 1. MY AGENDA */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', gap: '10px', alignItems: 'center', color: '#60a5fa' }}>
                            <Calendar size={20} /> My Agenda
                        </h3>
                        <Link to="/activities" style={{ fontSize: '0.9rem', color: '#94a3b8', textDecoration: 'none' }}>View All &rarr;</Link>
                    </div>

                    {agenda.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontStyle: 'italic' }}>
                            Nothing scheduled today. Time to prospect! 🚀
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {agenda.map(item => (
                                <div key={item.id} style={{
                                    padding: '12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '8px',
                                    borderLeft: '3px solid #60a5fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'white' }}>{getDisplayName(item)}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                            {item.activity_type} • {new Date(item.activity_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    {item.outcome ? <CheckCircle size={16} color="#4ade80" /> : <Clock size={16} color="#facc15" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. RECENT WINS */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', gap: '10px', alignItems: 'center', color: '#facc15' }}>
                            <Trophy size={20} /> Recent Wins
                        </h3>
                        <Link to="/pipeline" style={{ fontSize: '0.9rem', color: '#94a3b8', textDecoration: 'none' }}>Pipeline &rarr;</Link>
                    </div>

                    {wins.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontStyle: 'italic' }}>
                            No wins in the last 7 days. Push harder! 💪
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {wins.map(deal => (
                                <div key={deal.id} style={{
                                    padding: '12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '8px',
                                    borderLeft: '3px solid #facc15'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ fontWeight: 600, color: 'white' }}>{deal.account_name}</div>
                                        <div style={{ fontWeight: 700, color: '#facc15' }}>{deal.monthly_production?.toLocaleString()} L</div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                                        Closed by {deal.owner_initials} on {new Date(deal.close_date).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. AT RISK ACCOUNTS */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', gap: '10px', alignItems: 'center', color: '#ef4444' }}>
                            <AlertTriangle size={20} /> At Risk
                        </h3>
                        <Link to="/accounts" style={{ fontSize: '0.9rem', color: '#94a3b8', textDecoration: 'none' }}>View All &rarr;</Link>
                    </div>

                    {risks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontStyle: 'italic' }}>
                            All clear! No accounts flagged as Risk. ✅
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {risks.map(acc => (
                                <Link to={`/accounts`} key={acc.id} style={{ textDecoration: 'none' }}>
                                    <div style={{
                                        padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px',
                                        border: '1px solid rgba(239, 68, 68, 0.3)', transition: 'transform 0.2s'
                                    }} className="hover:scale-105">
                                        <div style={{ fontWeight: 600, color: '#fca5a5' }}>{acc.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '5px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {acc.ai_summary || 'No summary available.'}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
