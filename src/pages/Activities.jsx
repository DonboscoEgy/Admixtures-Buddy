import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Save, Trash2, User, Building2, Phone, Users, MapPin } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Activities({ embeddedAccount = null }) {
    const { profile, user } = useAuth();
    const { showToast } = useToast();

    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [newActivity, setNewActivity] = useState({
        account_id: embeddedAccount?.id || '',
        activity_type: 'Visit', // Default
        activity_date: new Date().toISOString().split('T')[0], // Default Today
        outcome: ''
    });

    // Master Data for Dropdown (Only needed if Global Mode)
    const [accounts, setAccounts] = useState([]);

    useEffect(() => {
        fetchActivities();
        if (!embeddedAccount) {
            fetchAccounts();
        } else {
            // If embedded, ensure account_id is set
            setNewActivity(prev => ({ ...prev, account_id: embeddedAccount.id }));
        }
    }, [embeddedAccount]);

    const fetchAccounts = async () => {
        const { data } = await supabase.from('accounts_master').select('id, name').order('name');
        setAccounts(data || []);
    };

    const fetchActivities = async () => {
        setLoading(true);
        let query = supabase
            .from('mac_account_activities')
            .select(`
                *,
                accounts_master (name)
            `)
            .order('activity_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (embeddedAccount) {
            query = query.eq('account_id', embeddedAccount.id);
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

        if (!newActivity.account_id) {
            showToast('Please select an account', 'error');
            return;
        }

        try {
            const { error } = await supabase.from('mac_account_activities').insert([{
                ...newActivity,
                created_by: profile?.initials || user?.email
            }]);

            if (error) throw error;

            showToast('Activity Logged!', 'success');
            setIsFormOpen(false);
            setNewActivity(prev => ({
                ...prev,
                outcome: '',
                activity_type: 'Visit',
                activity_date: new Date().toISOString().split('T')[0]
            })); // Reset form but keep account if embedded

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

    return (
        <div style={{ height: embeddedAccount ? 'auto' : '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Header (Only if Global Page) */}
            {!embeddedAccount && (
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <div className="breadcrumb">Home / Activities</div>
                        <h1 className="page-title">Activity Log</h1>
                    </div>
                    <button onClick={() => setIsFormOpen(true)} className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
                        <Plus size={18} /> Log Activity
                    </button>
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

                            {/* Account Select (Hidden if embedded) */}
                            {!embeddedAccount && (
                                <div>
                                    <label className="form-label">Account</label>
                                    <select
                                        className="form-input"
                                        value={newActivity.account_id}
                                        onChange={e => setNewActivity({ ...newActivity, account_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Account...</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                alignItems: 'flex-start'
                            }}>
                                {/* Date Box */}
                                <div style={{
                                    width: '60px', flexShrink: 0, textAlign: 'center',
                                    background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 5px'
                                }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                                        {new Date(act.activity_date).toLocaleString('default', { month: 'short' })}
                                    </div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                                        {new Date(act.activity_date).getDate()}
                                    </div>
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            {!embeddedAccount && (
                                                <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>{act.accounts_master?.name}</span>
                                            )}
                                            <span style={{
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                fontSize: '0.85rem', padding: '2px 8px', borderRadius: '4px',
                                                background: 'rgba(255,255,255,0.05)', color: 'white'
                                            }}>
                                                {getTypeIcon(act.activity_type)} {act.activity_type}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Logged by {act.created_by}
                                        </div>
                                    </div>

                                    <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
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
