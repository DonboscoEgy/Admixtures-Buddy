import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ApprovalPending from '../pages/ApprovalPending';

export default function AuthGuard() {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
                Verifying Credentials...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check Approval Status (Wait until profile is loaded or failed)
    // If user exists but profile is missing, it might be a lag, but we can assume pending/blocked for safety.
    if (profile && !profile.is_approved) {
        return <ApprovalPending />;
    }

    return <Outlet />;
}
