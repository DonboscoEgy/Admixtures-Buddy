
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SalesLedger from './pages/SalesLedger';
import ReportView from './components/ReportView';
import TestPage from './pages/TestPage';
import Masters from './pages/Masters';
import Accounts from './pages/Accounts';
import Products from './pages/Products';
import Payments from './pages/Payments';
import Pipeline from './pages/Pipeline';
import Dashboard from './pages/Dashboard'; // New

// Auth Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ApprovalPending from './pages/ApprovalPending';
import AdminUsers from './pages/AdminUsers';

import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pending-approval" element={<ApprovalPending />} />

            {/* Protected Routes */}
            <Route element={<AuthGuard />}>
              <Route element={<Layout />}>
                {/* Redirect root of internal layout to dashboard */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sales-ledger" element={<SalesLedger />} />

                <Route path="/reports" element={<ReportView />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/products" element={<Products />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/masters" element={<Masters />} />

                <Route path="/admin/users" element={<AdminUsers />} />

                <Route path="/test" element={<TestPage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<div style={{ padding: '20px', color: 'white', background: '#0f172a', height: '100vh' }}><h2>404: Page Not Found</h2></div>} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
