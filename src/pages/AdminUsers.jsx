import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CheckCircle, XCircle, Search, User, Shield } from 'lucide-react';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all, pending, approved

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
            alert('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const toggleApproval = async (userId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_approved: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, is_approved: !currentStatus } : u));
        } catch (err) {
            alert('Error updating status: ' + err.message);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all'
            ? true
            : filter === 'pending' ? !user.is_approved
                : user.is_approved;

        return matchesSearch && matchesFilter;
    });

    return (
        <div style={{ padding: '20px' }}>
            <header style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>User Management</h1>
                <p style={{ color: 'var(--text-muted)' }}>Approve or block user access to the system.</p>
            </header>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="glass-card"
                        style={{ width: '100%', paddingLeft: '40px', height: '45px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                    />
                </div>

                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    {['all', 'pending', 'approved'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: filter === f ? 'var(--primary)' : 'transparent',
                                color: filter === f ? 'white' : 'var(--text-muted)',
                                fontWeight: 500, textTransform: 'capitalize'
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div>Loading users...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {filteredUsers.map(user => (
                        <div key={user.id} className="glass-card" style={{
                            padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)',
                            background: 'rgba(30, 41, 59, 0.4)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                <img
                                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}`}
                                    alt="Avatar"
                                    style={{ width: '50px', height: '50px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)' }}
                                />
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {user.full_name || 'Unknown Name'}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {user.email}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {user.is_admin && <span title="Admin" style={{ color: '#f59e0b' }}><Shield size={18} /></span>}
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                                        background: user.is_approved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                        color: user.is_approved ? '#4ade80' : '#facc15'
                                    }}>
                                        {user.is_approved ? 'Active' : 'Pending'}
                                    </span>
                                </div>

                                <button
                                    onClick={() => toggleApproval(user.id, user.is_approved)}
                                    style={{
                                        padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                        background: user.is_approved ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                        color: user.is_approved ? '#fca5a5' : '#86efac',
                                        fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    {user.is_approved ? (
                                        <>Desactivate <XCircle size={16} /></>
                                    ) : (
                                        <>Approve <CheckCircle size={16} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
