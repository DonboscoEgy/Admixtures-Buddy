import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, LogIn } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    redirectTo: window.location.origin + '/dashboard'
                },
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            background: '#0f172a', // Dark Base
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden'
        }}>

            {/* LEFT SIDE - BRANDING */}
            <div style={{
                flex: 1,
                background: '#0b0f19',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                borderRight: '1px solid #1e293b'
            }}>
                {/* Decoration Circles */}
                <div style={{ position: 'absolute', top: '20%', left: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(34, 197, 94, 0.05) 0%, transparent 70%)', borderRadius: '50%' }}></div>

                <div style={{ position: 'absolute', top: '40px', left: '40px', fontWeight: 'bold', letterSpacing: '1px', color: '#22c55e' }}>
                    PLEKO SYSTEMS
                </div>

                <div style={{ textAlign: 'center', zIndex: 10 }}>
                    <img src="/pleko_logo.png" alt="Pleko Logo" style={{ width: '150px', marginBottom: '30px', opacity: 0.9 }} />

                    <h2 style={{ marginTop: '30px', fontSize: '1.8rem', color: '#22c55e', fontWeight: 600 }}>
                        Admixtures Buddy
                    </h2>
                </div>
            </div>

            {/* RIGHT SIDE - AUTH FORM */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#111827', // Slightly lighter
                position: 'relative'
            }}>
                <button onClick={() => navigate('/')} style={{
                    position: 'absolute', top: '40px', right: '40px',
                    background: 'transparent', border: 'none', color: '#94a3b8',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '0.9rem'
                }}>
                    <ArrowLeft size={18} /> Back
                </button>

                <div style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>

                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{
                            width: '48px', height: '48px',
                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            borderRadius: '12px', margin: '0 auto 20px auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.4)'
                        }}>
                            <LogIn color="white" size={24} />
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: 'white', marginBottom: '10px' }}>Welcome Back</h2>
                        <p style={{ color: '#94a3b8' }}>Sign in to access your dashboard</p>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5',
                            padding: '12px', borderRadius: '8px', marginBottom: '20px',
                            fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        style={{
                            width: '100%',
                            padding: '14px', borderRadius: '12px',
                            background: 'white', color: '#1e293b', fontWeight: 600, fontSize: '1rem',
                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            transition: 'all 0.2s',
                            marginBottom: '25px'
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: '22px', height: '22px' }} />
                        Sign in with Google
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#64748b', fontSize: '0.85rem', marginBottom: '25px' }}>
                        <div style={{ flex: 1, height: '1px', background: '#334155' }}></div>
                        OR
                        <div style={{ flex: 1, height: '1px', background: '#334155' }}></div>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#cbd5e1', marginBottom: '8px' }}>Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                                    border: '1px solid #334155',
                                    background: '#1e293b',
                                    color: 'white', outline: 'none', transition: 'border 0.2s',
                                    fontSize: '1rem'
                                }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = '#334155'}
                                placeholder="name@company.com"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#cbd5e1', marginBottom: '8px' }}>Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                                    border: '1px solid #334155',
                                    background: '#1e293b',
                                    color: 'white', outline: 'none', transition: 'border 0.2s',
                                    fontSize: '1rem'
                                }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = '#334155'}
                                placeholder="••••••••"
                            />
                        </div>

                        <button type="submit" style={{
                            marginTop: '10px', padding: '14px', borderRadius: '12px',
                            background: '#3b82f6', color: 'white', fontWeight: 600, fontSize: '1rem',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
                        }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
                        Don't have an account? <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>Request Access</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
