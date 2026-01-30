import React from 'react';
import { Bell, Check, ExternalLink, Trash2, AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function NotificationDropdown({ notifications, onClose, onMarkRead }) {
    const navigate = useNavigate();

    const handleClick = async (notif) => {
        onMarkRead(notif.id);
        if (notif.link) {
            navigate(notif.link);
            onClose();
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertTriangle size={18} color="#f59e0b" />;
            case 'error': return <XCircle size={18} color="#ef4444" />;
            case 'success': return <CheckCircle size={18} color="#10b981" />;
            default: return <Info size={18} color="#3b82f6" />;
        }
    };

    const clearAll = async () => {
        // Optimistic clear handled by parent reload usually, or we just close
        const { error } = await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        onClose();
        // Trigger generic reload if needed
        window.location.reload();
    };

    return (
        <div style={{
            position: 'absolute', top: '60px', right: '80px', width: '350px',
            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000,
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Notifications</h3>
                {notifications.length > 0 && (
                    <button onClick={clearAll} style={{ fontSize: '0.8rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Clear All
                    </button>
                )}
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        <Bell size={24} style={{ marginBottom: '10px', opacity: 0.5 }} />
                        <div>No new notifications</div>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div
                            key={n.id}
                            onClick={() => handleClick(n)}
                            style={{
                                padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer', transition: 'background 0.2s',
                                background: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)'
                            }}
                            className="hover-bg-dark"
                        >
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <div style={{ marginTop: '2px' }}>{getIcon(n.type)}</div>
                                <div>
                                    <div style={{ fontWeight: n.is_read ? 400 : 700, color: 'white', fontSize: '0.9rem', marginBottom: '4px' }}>
                                        {n.title}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>
                                        {n.message}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>
                                        {new Date(n.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
