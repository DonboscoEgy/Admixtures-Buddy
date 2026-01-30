import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ApprovalPending() {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div className="glass-card" style={{
                width: '100%', maxWidth: '500px',
                background: 'rgba(30, 41, 59, 0.4)',
                backdropFilter: 'blur(20px)',
                padding: '40px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '80px', height: '80px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    borderRadius: '50%', margin: '0 auto 30px auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <ShieldAlert color="#f59e0b" size={40} />
                </div>

                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '15px' }}>Account Pending Approval</h1>

                <p style={{ color: '#cbd5e1', lineHeight: 1.6, marginBottom: '30px' }}>
                    Hello <span style={{ color: 'white', fontWeight: 600 }}>{user?.email}</span>,<br />
                    Your account has been created successfully but requires administrator approval before you can access the system.
                </p>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '30px', fontSize: '0.9rem', color: '#94a3b8' }}>
                    Please contact the system administrator to activate your access.
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button onClick={handleRefresh} style={{
                        flex: 1, padding: '12px', borderRadius: '12px',
                        background: '#3b82f6', color: 'white', fontWeight: 600,
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                        <RefreshCw size={18} /> Check Status
                    </button>

                    <button onClick={signOut} style={{
                        flex: 1, padding: '12px', borderRadius: '12px',
                        background: 'transparent', color: '#cbd5e1', fontWeight: 600,
                        border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
