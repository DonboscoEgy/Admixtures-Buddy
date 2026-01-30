import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName)}&background=random`
                    }
                }
            });

            if (error) throw error;

            // On success, we can redirect to login or show a message
            alert('Registration Successful! Please wait for admin approval.');
            navigate('/login');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #172554 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>

            <button onClick={() => navigate('/')} style={{
                position: 'absolute', top: '40px', left: '40px',
                background: 'transparent', border: 'none', color: '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
                <ArrowLeft size={20} /> Back to Home
            </button>

            <div className="glass-card" style={{
                width: '100%', maxWidth: '420px',
                background: 'rgba(30, 41, 59, 0.4)',
                backdropFilter: 'blur(20px)',
                padding: '40px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '50px', height: '50px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderRadius: '12px', margin: '0 auto 20px auto',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <UserPlus color="white" size={24} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '10px' }}>Request Access</h2>
                    <p style={{ color: '#94a3b8' }}>Create an account to join the team</p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5',
                        padding: '12px', borderRadius: '8px', marginBottom: '20px',
                        fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '8px' }}>Full Name</label>
                        <input
                            type="text"
                            required
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white', outline: 'none'
                            }}
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '8px' }}>Email Address</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white', outline: 'none'
                            }}
                            placeholder="name@company.com"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '8px' }}>Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white', outline: 'none'
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" style={{
                        marginTop: '10px', padding: '14px', borderRadius: '12px',
                        background: '#10b981', color: 'white', fontWeight: 600,
                        border: 'none', cursor: 'pointer', transition: 'background 0.2s'
                    }}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
                    Already have an account? <Link to="/login" style={{ color: '#10b981', textDecoration: 'none' }}>Sign In</Link>
                </div>
            </div>
        </div>
    );
}
