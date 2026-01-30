import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function LandingPage() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard');
        }
    }, [user, loading, navigate]);

    const handleLoginClick = () => {
        setIsExiting(true);
        setTimeout(() => {
            navigate('/login');
        }, 500); // 500ms duration matching the CSS transition
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100vw',
            background: '#0f172a', // Dark Navy Base
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            opacity: isExiting ? 0 : 1,
            transform: isExiting ? 'translateY(-20px)' : 'translateY(0)',
            transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out'
        }}>
            {/* Top Branding Text - Optional if logo contains text, keeping for safety */}
            <div style={{
                position: 'absolute',
                top: '40px',
                left: '40px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                color: '#22c55e' // Pleko Green
            }}>
                PLEKO SYSTEMS
            </div>

            {/* Centered Content */}
            <div style={{ textAlign: 'center', marginTop: '-50px' }}>
                <div style={{ marginBottom: '30px' }}>
                    <img
                        src="/pleko_logo.png"
                        alt="Pleko Logo"
                        style={{ width: '180px', height: 'auto', opacity: 0.9 }}
                    />
                </div>

                <h2 style={{
                    marginTop: '20px',
                    fontSize: '2rem',
                    color: '#22c55e',
                    fontWeight: 600
                }}>
                    Admixtures Buddy
                </h2>

                {/* Removed Duplicate Header */}
            </div>

            {/* Bottom Actions */}
            <div style={{
                position: 'absolute',
                bottom: '80px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px'
            }}>
                <button
                    onClick={handleLoginClick}
                    style={{
                        padding: '16px 60px',
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        color: 'white',
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    Log In
                </button>

                <div style={{ fontSize: '0.95rem', color: '#64748b' }}>
                    Don't have an account? <span
                        onClick={() => navigate('/register')}
                        style={{ color: '#22c55e', cursor: 'pointer', fontWeight: '500', textDecoration: 'none' }}
                    >
                        Sign Up
                    </span>
                </div>
            </div>
        </div>
    );
}
