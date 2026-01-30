import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Save, Trash2, User, Building2, Phone, Users, MapPin, Briefcase } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Activities({ embeddedAccount = null }) {
    const { profile, user } = useAuth();
    const { showToast } = useToast();

    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);

    // We store the generic "target" ID here, and figure out the type on save
    const [selectedTargetId, setSelectedTargetId] = useState('');

    const [newActivity, setNewActivity] = useState({
        activity_type: 'Visit', // Default
        activity_date: new Date().toISOString().split('T')[0], // Default Today
        outcome: ''
    });

    // Master Data
    const [accounts, setAccounts] = useState([]);
    const [opportunities, setOpportunities] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        targetId: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        // Debounce or just fetch on change
        fetchActivities();
    }, [filters, embeddedAccount]); // Refetch when filters change

    useEffect(() => {
        if (!embeddedAccount) {
            fetchTargets();
        } else {
            // If embedded, pre-select for the *form*
            setSelectedTargetId(`ACC_${embeddedAccount.id}`);
        }
    }, [embeddedAccount]); // Run when embeddedAccount changes

    const fetchTargets = async () => {
        const { data: accs } = await supabase.from('accounts_master').select('id, name').order('name');
        const { data: opps } = await supabase.from('opportunities').select('id, account_name, stage').neq('stage', 'Won').neq('stage', 'Lost');

        setAccounts(accs || []);
        setOpportunities(opps || []);
    };

    const fetchActivities = async () => {
        setLoading(true);
        let query = supabase
            .from('mac_account_activities')
            .select(`
                *,
                accounts_master (name),
                opportunities (account_name)
            `)
            .order('activity_date', { ascending: false })
            .order('created_at', { ascending: false });

        // 1. Embedded Mode (Force Filter)
        if (embeddedAccount) {
            query = query.eq('account_id', embeddedAccount.id);
        }
        // 2. Global Mode Filters
        else {
            if (filters.targetId) {
                if (filters.targetId.startsWith('ACC_')) {
                    query = query.eq('account_id', filters.targetId.replace('ACC_', ''));
                } else if (filters.targetId.startsWith('OPP_')) {
                    query = query.eq('opportunity_id', filters.targetId.replace('OPP_', ''));
                }
            }
        }

        // 3. Date Filters (Apply to both modes)
        if (filters.startDate) {
            query = query.gte('activity_date', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('activity_date', filters.endDate);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching activities:', error);
        } else {
            setActivities(data || []);
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Decide ID based on prefix
        let payload = {
            ...newActivity,
            created_by: profile?.initials || user?.email
        };

        if (embeddedAccount) {
            payload.account_id = embeddedAccount.id;
        } else {
            if (!selectedTargetId) {
                showToast('Please select a target', 'error');
                return;
            }

            if (selectedTargetId.startsWith('ACC_')) {
                payload.account_id = selectedTargetId.replace('ACC_', '');
                payload.opportunity_id = null; // explicit null
            } else if (selectedTargetId.startsWith('OPP_')) {
                payload.opportunity_id = selectedTargetId.replace('OPP_', '');
                payload.account_id = null; // explicit null
            }
        }

        try {
            const { error } = await supabase.from('mac_account_activities').insert([payload]);

            if (error) throw error;

            showToast('Activity Logged!', 'success');
            setIsFormOpen(false);
            setNewActivity(prev => ({
                ...prev,
                outcome: '',
                activity_type: 'Visit',
                activity_date: new Date().toISOString().split('T')[0]
            }));

            // Keep selection if not embedded mode, user might add another
            if (!embeddedAccount) setSelectedTargetId('');

            fetchActivities();

        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this activity log?')) return;
        const { error } = await supabase.from('mac_account_activities').delete().eq('id', id);
        if (!error) {
            fetchActivities();
            showToast('Deleted successfully', 'success');
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Call': return <Phone size={16} color="#3b82f6" />;
            case 'Meeting': return <Users size={16} color="#8b5cf6" />;
            case 'Visit': return <MapPin size={16} color="#f59e0b" />;
            default: return <Calendar size={16} />;
        }
    };

    const getDisplayName = (act) => {
        if (act.accounts_master?.name) return act.accounts_master.name;
        if (act.opportunities?.account_name) return `${act.opportunities.account_name} (Pipeline)`;
        return 'Unknown';
    };

    return (
        <div style={{ height: embeddedAccount ? 'auto' : '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Header (Only if Global Page) */}
            {!embeddedAccount && (
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                        <div>
                            <div className="breadcrumb">Home / Activities</div>
                            <h1 className="page-title">Activity Log</h1>
                        </div>
                        <button onClick={() => setIsFormOpen(true)} className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
                            <Plus size={18} /> Log Activity
                        </button>
                    </div>

                    {/* FILTER BAR */}
                    <div className="glass-card" style={{ padding: '15px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>

                        {/* Account Filter */}
                        <div style={{ flex: 2, minWidth: '200px' }}>
                            <select
                                className="form-input"
                                style={{ margin: 0 }}
                                value={filters.targetId}
                                onChange={e => setFilters({ ...filters, targetId: e.target.value })}
                            >
                                <option value="">All Accounts & Opportunities</option>
                                <optgroup label="Existing Accounts">
                                    {accounts.map(a => (
                                        <option key={`ACC_${a.id}`} value={`ACC_${a.id}`}>{a.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Pipeline Opportunities">
                                    {opportunities.map(o => (
                                        <option key={`OPP_${o.id}`} value={`OPP_${o.id}`}>{o.account_name} ({o.stage})</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        {/* Date Start */}
                        <div style={{ flex: 1, minWidth: '140px' }}>
                            <input
                                type="date"
                                className="form-input"
                                style={{ margin: 0 }}
                                placeholder="Start Date"
                                value={filters.startDate}
                                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>

                        {/* Date End */}
                        <div style={{ flex: 1, minWidth: '140px' }}>
                            <input
                                type="date"
                                className="form-input"
                                style={{ margin: 0 }}
                                placeholder="End Date"
                                value={filters.endDate}
                                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>

                        {/* Reset */}
                        {(filters.targetId || filters.startDate || filters.endDate) && (
                            <button
                                onClick={() => setFilters({ targetId: '', startDate: '', endDate: '' })}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Embedded Header/Control */}
            {embeddedAccount && (
                <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#94a3b8', margin: 0, display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Calendar size={20} /> Recent Activities
                    </h3>
                    <button onClick={() => setIsFormOpen(true)} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                        + Log New
                    </button>
                </div>
            )}

            {/* FORM MODAL (or Inline) */}
            {isFormOpen && (
                <div style={{
                    marginBottom: '20px', padding: '20px',
                    background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>

                            {/* Target Select (Hidden if embedded) */}
                            {!embeddedAccount && (
                                <div>
                                    <label className="form-label">Client / Prospect</label>
                                    <select
                                        className="form-input"
                                        value={selectedTargetId}
                                        onChange={e => setSelectedTargetId(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Target...</option>

                                        <optgroup label="Existing Accounts">
                                            {accounts.map(a => (
                                                <option key={`ACC_${a.id}`} value={`ACC_${a.id}`}>{a.name}</option>
                                            ))}
                                        </optgroup>

                                        <optgroup label="Pipeline Opportunities">
                                            {opportunities.map(o => (
                                                <option key={`OPP_${o.id}`} value={`OPP_${o.id}`}>{o.account_name} ({o.stage})</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="form-label">Type</label>
                                <select
                                    className="form-input"
                                    value={newActivity.activity_type}
                                    onChange={e => setNewActivity({ ...newActivity, activity_type: e.target.value })}
                                >
                                    <option value="Visit">Visit</option>
                                    <option value="Meeting">Meeting</option>
                                    <option value="Call">Call</option>
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={newActivity.activity_date}
                                    onChange={e => setNewActivity({ ...newActivity, activity_date: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label className="form-label">Outcome / Notes</label>
                            <textarea
                                className="form-input"
                                rows="3"
                                placeholder="What happened? Next steps?"
                                value={newActivity.outcome}
                                onChange={e => setNewActivity({ ...newActivity, outcome: e.target.value })}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">Cancel</button>
                            <button type="submit" className="btn-primary">Save Activity</button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="card" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                ) : activities.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No activities found.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {activities.map((act, i) => (
                            <div key={act.id} style={{
                                display: 'flex', gap: '15px', padding: '15px',
                                borderBottom: '1px solid var(--border-color)', // Theme Border
                                alignItems: 'flex-start'
                            }}>
                                {/* Date Box */}
                                <div style={{
                                    width: '60px', flexShrink: 0, textAlign: 'center',
                                    background: 'var(--bg-main)', borderRadius: '8px', padding: '8px 5px', // Theme BG
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                        {new Date(act.activity_date).toLocaleString('default', { month: 'short' })}
                                    </div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}> {/* Theme Text */}
                                        {new Date(act.activity_date).getDate()}
                                    </div>
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            {!embeddedAccount && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {act.opportunity_id ? <Briefcase size={14} color="#f472b6" /> : <Building2 size={14} color="#60a5fa" />}
                                                    <span style={{ fontWeight: 'bold', color: act.opportunity_id ? '#f472b6' : '#60a5fa' }}>
                                                        {getDisplayName(act)}
                                                    </span>
                                                </div>
                                            )}
                                            <span style={{
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                fontSize: '0.85rem', padding: '2px 8px', borderRadius: '4px',
                                                background: 'var(--bg-main)', color: 'var(--text-main)', // Theme badges
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                {getTypeIcon(act.activity_type)} {act.activity_type}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Logged by {act.created_by}
                                        </div>
                                    </div>

                                    <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}> {/* readable text */}
                                        {act.outcome}
                                    </p>
                                </div>

                                {/* Actions */}
                                <button
                                    onClick={() => handleDelete(act.id)}
                                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', opacity: 0.5 }}
                                    className="hover-danger"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
