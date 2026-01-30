import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Plus, X, Save, Trash2, Database, Clock, DollarSign, Calendar, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Activities from './Activities';

// --- MAIN PAGE COMPONENT ---
export default function Accounts() {
    const { profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate(); // Hook
    const [accounts, setAccounts] = useState([]);
    const [editingAccount, setEditingAccount] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Track if we've already handled the auto-open for this nav
    const processedRef = useRef(false);

    const handleEditClick = (acc) => {
        setEditingAccount(acc);
        setSelectedAccount(null); // Close dashboard
        setIsModalOpen(true);     // Open Form
    };


    const [loading, setLoading] = useState(true);
    const [ownerFilter, setOwnerFilter] = useState('All');

    const uniqueOwners = useMemo(() => {
        const owners = accounts.map(a => a.created_by_initials).filter(Boolean);
        return [...new Set(owners)].sort();
    }, [accounts]);

    const filteredAccounts = accounts.filter(acc => {
        // STRICT FRONTEND FILTER
        // If not admin, ONLY show accounts matching their initials
        if (profile && !profile.is_admin) {
            return acc.created_by_initials === profile.initials;
        }

        // Admin Filter Logic
        if (ownerFilter === 'All') return true;
        return acc.created_by_initials === ownerFilter;
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Auto-open account if passed in state
    useEffect(() => {
        if (accounts.length > 0 && location.state?.openAccountName && !processedRef.current) {
            const target = accounts.find(a => a.name === location.state.openAccountName);
            if (target) {
                if (location.state.openSetup) {
                    handleEditClick(target);
                } else {
                    setSelectedAccount(target);
                }

                // Mark processed to prevent loop
                processedRef.current = true;

                // Clear state properly
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [accounts, location.state, location.pathname, navigate]);

    const fetchAccounts = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('accounts_master').select('*, created_by_initials').order('name');
        if (error) console.error('Error fetching accounts:', error);
        else setAccounts(data || []);
        setLoading(false);
    };

    const handleAccountClick = (acc) => {
        setSelectedAccount(acc);
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '20px', paddingBottom: '100px' }}>

            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div className="breadcrumb">Home / Accounts</div>
                    <h1 className="page-title">Accounts Overview</h1>
                </div>

                {profile?.is_admin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Filter by Owner:</span>
                        <select
                            className="form-input"
                            style={{ width: '150px', padding: '8px' }}
                            value={ownerFilter}
                            onChange={e => setOwnerFilter(e.target.value)}
                        >
                            <option value="All">All Owners</option>
                            {uniqueOwners.map(owner => (
                                <option key={owner} value={owner}>{owner}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* TOP GRID: Account Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '40px'
            }}>
                {/* 1. Add New Card */}
                <div className="glass-card" style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    border: '1px dashed var(--text-muted)',
                    cursor: 'pointer',
                    height: '140px',
                    background: 'rgba(255,255,255,0.02)'
                }}
                    onClick={() => setIsModalOpen(true)}
                >
                    <div style={{ padding: '12px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)' }}>
                        <Plus size={24} color="var(--primary)" />
                    </div>
                    <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Add New Account</div>
                </div>

                {/* 2. Account List Cards */}
                {filteredAccounts.map(acc => (
                    <div key={acc.id} className={`glass-card ${selectedAccount?.id === acc.id ? 'highlight-card' : ''}`} style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        borderLeft: `4px solid ${stringToColor(acc.name)}`,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        height: '140px',
                        position: 'relative',
                        boxShadow: selectedAccount?.id === acc.id ? '0 0 0 2px var(--primary)' : 'none'
                    }}
                        onClick={() => handleAccountClick(acc)}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
                                <Users size={20} color="var(--text-main)" />
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={acc.name}>
                                {acc.name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Owner: {acc.created_by_initials || 'Unknown'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL: Account Dashboard */}
            {selectedAccount && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000
                }} onClick={() => setSelectedAccount(null)}>
                    <div style={{
                        background: 'var(--bg-main)', padding: '30px', borderRadius: '16px', // Theme Background
                        width: '95%', maxWidth: '1200px', maxHeight: '95vh', overflowY: 'auto',
                        border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }} onClick={e => e.stopPropagation()}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
                            <div>
                                <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-main)' }}>{selectedAccount.name}</h2>
                                <span style={{ color: 'var(--text-muted)' }}>
                                    Account Dashboard • Managed by {selectedAccount.created_by_initials || 'System'}
                                </span>
                            </div>
                            <button onClick={() => setSelectedAccount(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '10px' }}>
                                <X size={28} />
                            </button>
                        </div>

                        <AccountDetailsDashboard
                            account={selectedAccount}
                            onEdit={handleEditClick}
                        />
                    </div>
                </div>
            )}

            {/* MODAL: Add / Setup Account */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000
                }} onClick={() => { setIsModalOpen(false); setEditingAccount(null); }}>
                    <div style={{
                        background: '#1e293b', padding: '30px', borderRadius: '16px',
                        width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
                        border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }} onClick={e => e.stopPropagation()}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>{editingAccount ? 'Edit Account' : 'Add New Account'}</h2>
                            <button onClick={() => { setIsModalOpen(false); setEditingAccount(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <MastersSetupForm
                            profile={profile}
                            editingAccount={editingAccount}
                            onClose={() => {
                                setIsModalOpen(false);
                                setEditingAccount(null);
                                fetchAccounts(); // Refresh list
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUB-COMPONENT: Account Details Dashboard (KPIs + Graph + Pricing Editor) ---
function AccountDetailsDashboard({ account, onEdit }) {
    const { showToast } = useToast();
    const [metrics, setMetrics] = useState({
        totalQty: 0,
        totalSales: 0,
        totalSalesWithVat: 0,
        totalPaid: 0,
        dueAmount: 0,
        overdueAmount: 0,
        currentAmount: 0,
        totalGP: 0,
        marginPct: 0,
        lastPaymentAmt: 0,
        lastPaymentDate: '-'
    });
    const [chartData, setChartData] = useState([]);
    const [recentPayments, setRecentPayments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pricing Editor State
    const [productRows, setProductRows] = useState([{ productName: '', price: 0 }]);
    const [savingPricing, setSavingPricing] = useState(false);

    useEffect(() => {
        if (account) {
            fetchDetails();
            fetchPricing();
        }
    }, [account]);

    const fetchDetails = async () => {
        setLoading(true);

        // 1. Fetch Sales (View already has total_with_vat)
        const { data: sales, error: salesError } = await supabase
            .from('view_sales_ledger')
            .select('*')
            .eq('account_name', account.name)
            .order('transaction_date', { ascending: true });

        // 2. Fetch Payments
        const { data: payments, error: payError } = await supabase
            .from('payments_ledger')
            .select('*')
            .eq('account_name', account.name)
            .order('payment_date', { ascending: false }); // Newest first

        if (salesError) console.error('Sales Error', salesError);

        const rows = sales || [];
        const payRows = payments || [];

        // --- CALCULATIONS ---
        const totalQty = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
        const totalSalesWithVat = rows.reduce((sum, r) => sum + (Number(r.total_with_vat) || 0), 0);
        const totalSalesNet = rows.reduce((sum, r) => sum + (Number(r.total_sales) || 0), 0);
        const totalPaid = payRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const dueAmount = totalSalesWithVat - totalPaid;

        // GP & Margin
        // We use the view's gross_profit or calculate manually: (Qty * UnitPrice) - (Qty * UnitCOGS)
        // Note: total_sales in view is (Qty * UnitPrice).
        const totalGP = rows.reduce((sum, r) => sum + (Number(r.gross_profit) || 0), 0);
        const marginPct = totalSalesNet > 0 ? (totalGP / totalSalesNet) * 100 : 0;

        const lastPay = payRows.length > 0 ? payRows[0] : null;

        // FIFO Calculation for Due Days & Aging Buckets dynamically based on account terms
        // 1. Total Paid pays off oldest invoices first.
        let dueDays = 0;
        let overdueAmount = 0; // Amount older than credit_days
        let currentAmount = 0; // Amount within credit_days

        const creditDaysLimit = account.credit_days || 0;
        let remainingPaid = totalPaid;

        // Sort oldest first
        const sortedSales = [...rows].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

        // Iterate to find unpaid portions
        for (const sale of sortedSales) {
            const saleAmt = Number(sale.total_with_vat) || 0;
            let unpaidPortion = 0;

            if (remainingPaid >= saleAmt) {
                remainingPaid -= saleAmt; // Fully paid
                unpaidPortion = 0;
            } else {
                unpaidPortion = saleAmt - remainingPaid;
                remainingPaid = 0; // Exhausted payment
            }

            if (unpaidPortion > 0) {
                const txnDate = new Date(sale.transaction_date);
                let age = 0;
                if (!isNaN(txnDate.getTime())) {
                    const diffTime = Math.abs(new Date() - txnDate);
                    age = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                // If this is the FIRST item encountered with unpaid balance, it's the oldest.
                if (dueDays === 0) dueDays = age;

                if (age > creditDaysLimit) {
                    overdueAmount += unpaidPortion;
                } else {
                    currentAmount += unpaidPortion;
                }
            }
        }

        setMetrics({
            totalQty,
            totalSales: totalSalesNet,
            totalSalesWithVat,
            totalPaid,
            dueAmount,
            dueDays,
            overdueAmount,
            currentAmount,
            totalGP,
            marginPct,
            lastPaymentAmt: lastPay ? lastPay.amount : 0,
            lastPaymentDate: lastPay ? lastPay.payment_date : '-'
        });

        setRecentPayments(payRows); // Show all payments

        // Prepare Chart Data
        const grouped = rows.reduce((acc, curr) => {
            const d = new Date(curr.transaction_date);
            if (isNaN(d.getTime())) return acc;
            const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;

            if (!acc[key]) acc[key] = { name: key, qty: 0, sales: 0, sortDate: d };
            acc[key].qty += (Number(curr.quantity) || 0);
            acc[key].sales += (Number(curr.total_sales) || 0);
            return acc;
        }, {});

        const graphData = Object.values(grouped).sort((a, b) => a.sortDate - b.sortDate);
        setChartData(graphData);
        setLoading(false);
    };

    const fetchPricing = async () => {
        const { data: prices, error } = await supabase
            .from('client_pricing')
            .select('*')
            .eq('account_name', account.name);

        if (prices && prices.length > 0) {
            setProductRows(prices.map(p => ({ productName: p.product_name, price: p.agreed_price })));
        } else {
            setProductRows([{ productName: '', price: 0 }]);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm(`Delete account "${account.name}"? This is irreversible.`)) return;
        const { error } = await supabase.from('accounts_master').delete().eq('id', account.id);
        if (error) showToast('Error deleting: ' + error.message, 'error');
        else {
            window.location.reload();
        }
    };

    // Pricing Editor Handlers
    const handleAddRow = () => setProductRows([...productRows, { productName: '', price: 0 }]);
    const handleRemoveRow = (i) => {
        const rows = [...productRows];
        rows.splice(i, 1);
        setProductRows(rows);
    }
    const handleChange = (i, field, val) => {
        const rows = [...productRows];
        rows[i][field] = val;
        setProductRows(rows);
    }

    const handleSavePricing = async () => {
        setSavingPricing(true);
        try {
            for (const row of productRows) {
                if (!row.productName.trim()) continue;
                const { data: existingProd } = await supabase.from('products_master').select('id').eq('name', row.productName).single();
                if (!existingProd) await supabase.from('products_master').insert([{ name: row.productName, default_price: 0 }]);

                await supabase.from('client_pricing').upsert({
                    account_name: account.name,
                    product_name: row.productName,
                    agreed_price: parseFloat(row.price)
                }, { onConflict: 'account_name, product_name' });
            }
            const currentProductNames = productRows.map(r => r.productName).filter(n => n);
            if (currentProductNames.length > 0) {
                await supabase.from('client_pricing')
                    .delete()
                    .eq('account_name', account.name)
                    .not('product_name', 'in', `(${currentProductNames.map(n => `"${n}"`).join(',')})`);
            }
            showToast('Pricing Setup Updated Successfully', 'success');
        } catch (e) {
            showToast('Error saving pricing: ' + e.message, 'error');
        } finally {
            setSavingPricing(false);
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading Account Data...</div>;

    return (
        <div>
            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px', gap: '10px' }}>
                <button
                    onClick={() => onEdit(account)}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                >
                    <Settings size={16} /> Edit Account
                </button>
                <button
                    onClick={handleDeleteAccount}
                    className="btn-danger"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                >
                    <Trash2 size={16} /> Delete Account
                </button>
            </div>

            {/* 0. Account Info Header */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Category</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{account.account_family || '-'}</div>
                </div>
                <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Payment Type</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{account.payment_type || '-'}</div>
                </div>
                {account.payment_type === 'Credit Customer' && (
                    <>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Credit Limit</div>
                            <div style={{ fontWeight: 'bold', color: '#93c5fd' }}>
                                {Number(account.credit_limit || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })}
                            </div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Credit Days</div>
                            <div style={{ fontWeight: 'bold', color: '#93c5fd' }}>{account.credit_days || 0} Days</div>
                        </div>
                    </>
                )}
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>

                {/* 1. Sales Stats */}
                <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>TOTAL SALES (Inc. VAT)</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                        {metrics.totalSalesWithVat.toLocaleString('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '10px' }}>TOTAL QUANTITY</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#93c5fd' }}>
                        {metrics.totalQty.toLocaleString()}
                    </div>
                </div>

                {/* 2. Profitability Stats (New) */}
                <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #ec4899', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>GROSS PROFIT</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fda4af' }}>
                        {metrics.totalGP.toLocaleString('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })}
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '10px', paddingTop: '10px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>MARGIN %</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: metrics.marginPct >= 0 ? '#10b981' : '#ef4444' }}>
                            {metrics.marginPct.toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* 2. Payment Stats */}
                <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>TOTAL PAID</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10b981' }}>
                        {metrics.totalPaid.toLocaleString('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })}
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '10px', paddingTop: '10px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>LAST PAYMENT</div>
                        <div style={{ fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {metrics.lastPaymentAmt > 0 ? (
                                <>
                                    <span style={{ fontWeight: 'bold' }}>{Number(metrics.lastPaymentAmt).toLocaleString()} SAR</span>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{metrics.lastPaymentDate}</span>
                                </>
                            ) : 'No Payments'}
                        </div>
                    </div>
                </div>

                {/* 3. Due Amount & Aging Breakdown */}
                <div className="glass-card" style={{ padding: '15px', borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}>
                    <div style={{ color: '#fcd34d', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>OUTSTANDING AMOUNT</div>

                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '15px' }}>
                        {metrics.dueAmount.toLocaleString('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })}
                    </div>

                    {/* Aging Breakdown - Vertical Stack */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(251, 191, 36, 0.3)' }}>

                        {/* Current Portion */}
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(251, 191, 36, 0.8)', marginBottom: '2px' }}>Under {account.credit_days || 0} Days</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#fcd34d' }}>
                                {metrics.currentAmount.toLocaleString('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })}
                            </div>
                        </div>

                        {/* Overdue Portion */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Over {account.credit_days || 0} Days</div>

                                {/* Status Badge */}
                                {account.payment_type === 'Credit Customer' && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        color: metrics.overdueAmount > account.credit_limit ? '#ef4444' : '#10b981',
                                        background: metrics.overdueAmount > account.credit_limit ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                                        padding: '1px 5px',
                                        borderRadius: '3px'
                                    }}>
                                        {metrics.overdueAmount > account.credit_limit ? 'Over Limit' : 'Within Limit'}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#ef4444' }}>
                                    {metrics.overdueAmount.toLocaleString('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })}
                                </div>
                                {metrics.dueDays > (account.credit_days || 0) && (
                                    <span style={{ fontSize: '0.75rem', background: '#ef4444', color: 'white', padding: '1px 5px', borderRadius: '3px' }}>
                                        {metrics.dueDays} Days Old
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Performance Over Time</h3>
                <div style={{ height: '350px', width: '100%' }}>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                <XAxis dataKey="name" fontSize={12} stroke="var(--text-muted)" />
                                <YAxis yAxisId="left" fontSize={12} stroke="#3b82f6" orientation="left" />
                                <YAxis yAxisId="right" fontSize={12} stroke="#10b981" orientation="right" tickFormatter={(val) => `SAR ${val / 1000}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="qty" name="Quantity" fill="#3b82f6" barSize={30} radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="sales" name="Sales (SAR)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No Sales History Found
                        </div>
                    )}
                </div>
            </div>

            {/* Payment History List */}
            <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <DollarSign size={20} color="#10b981" /> Payment History (All Time)
                </h3>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-main)', zIndex: 1 }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Amount</th>
                                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>Reference / Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No payments found.</td>
                                </tr>
                            ) : (
                                recentPayments.map((p, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '12px', color: 'var(--text-main)' }}>{p.payment_date}</td>
                                        <td style={{ padding: '12px', color: '#10b981', fontWeight: 'bold' }}>
                                            {Number(p.amount).toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{p.notes || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PRODUCT PRICING EDITOR SECTION */}
            <div className="glass-card" style={{ padding: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                    Assigned Products & Prices
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {productRows.map((row, i) => (
                        <div key={i} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{ flex: 2 }}>
                                <input
                                    className="form-input"
                                    placeholder="Product Name"
                                    value={row.productName}
                                    onChange={e => handleChange(i, 'productName', e.target.value)}
                                />
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    className="form-input"
                                    placeholder="Price"
                                    type="number"
                                    value={row.price}
                                    onChange={e => handleChange(i, 'price', e.target.value)}
                                />
                                <button
                                    onClick={() => handleRemoveRow(i)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}
                                    title="Remove Product"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={handleAddRow} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Add Another Product
                    </button>

                    <button
                        onClick={handleSavePricing}
                        className="btn-primary"
                        disabled={savingPricing}
                        style={{ padding: '10px 30px', backgroundColor: '#3b82f6' }}
                    >
                        {savingPricing ? 'Saving...' : <><Save size={18} /> Save Setup</>}
                    </button>
                </div>
            </div>

            {/* ACTIVITY LOG SECTION (New) */}
            <div className="glass-card" style={{ padding: '30px', marginTop: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Activities embeddedAccount={account} />
            </div>
        </div >
    );
}

// --- SUB-COMPONENT: MastersSetupForm (Modal) ---
function MastersSetupForm({ onClose, profile, editingAccount }) {
    const { showToast } = useToast();
    const [clientName, setClientName] = useState('');
    const [formData, setFormData] = useState({
        account_family: '',
        payment_type: '',
        credit_limit: '',
        credit_days: ''
    });
    const [productRows, setProductRows] = useState([{ productName: '', price: 0 }]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingAccount) {
            setClientName(editingAccount.name);
            setFormData({
                account_family: editingAccount.account_family || '',
                payment_type: editingAccount.payment_type || '',
                credit_limit: editingAccount.credit_limit || '',
                credit_days: editingAccount.credit_days || ''
            });
            fetchPricing(editingAccount.name);
        }
    }, [editingAccount]);

    const fetchPricing = async (accName) => {
        const { data: prices } = await supabase.from('client_pricing').select('*').eq('account_name', accName);
        if (prices && prices.length > 0) {
            setProductRows(prices.map(p => ({ productName: p.product_name, price: p.agreed_price })));
        }
    };

    const handleAddRow = () => setProductRows([...productRows, { productName: '', price: 0 }]);
    const handleRemoveRow = (i) => {
        const rows = [...productRows];
        rows.splice(i, 1);
        setProductRows(rows);
    }
    const handleChange = (i, field, val) => {
        const rows = [...productRows];
        rows[i][field] = val;
        setProductRows(rows);
    }

    const handleSave = async () => {
        if (!clientName.trim()) { showToast('Name required', 'error'); return; }
        setLoading(true);
        try {
            // 1. Upsert Account
            const accData = {
                name: clientName,
                account_family: formData.account_family,
                payment_type: formData.payment_type,
                credit_limit: formData.payment_type === 'Credit Customer' ? parseFloat(formData.credit_limit || 0) : 0,
                credit_days: formData.payment_type === 'Credit Customer' ? parseInt(formData.credit_days || 0) : 0,
                created_by_initials: editingAccount ? editingAccount.created_by_initials : profile?.initials
            };

            if (editingAccount) {
                const { error } = await supabase.from('accounts_master').update(accData).eq('id', editingAccount.id);
                if (error) throw error;
            } else {
                const { data: existingAcc } = await supabase.from('accounts_master').select('id').eq('name', clientName).single();
                if (!existingAcc) {
                    const { error } = await supabase.from('accounts_master').insert([accData]);
                    if (error) throw error;
                }
            }

            // 2. Process Pricing
            for (const row of productRows) {
                if (!row.productName.trim()) continue;
                // Ensure Product
                const { data: existingProd } = await supabase.from('products_master').select('id').eq('name', row.productName).single();
                if (!existingProd) {
                    await supabase.from('products_master').insert([{ name: row.productName, default_price: 0 }]);
                }
                // Upsert Pricing
                await supabase.from('client_pricing').upsert({
                    account_name: clientName,
                    product_name: row.productName,
                    agreed_price: parseFloat(row.price)
                }, { onConflict: 'account_name, product_name' });
            }

            showToast('Account Created Successfully', 'success');
            onClose(); // Close Modal
        } catch (e) {
            showToast('Error: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Account Name</label>
                    <input
                        className="form-input"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        placeholder="e.g. New Customer LLC"
                    />
                </div>
                <div>
                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Account Category</label>
                    <select
                        className="form-input"
                        value={formData.account_family}
                        onChange={e => setFormData({ ...formData, account_family: e.target.value })}
                    >
                        <option value="">Select Category...</option>
                        <option value="Readymix">Readymix</option>
                        <option value="Precast">Precast</option>
                        <option value="Contractor">Contractor</option>
                        <option value="Applicator">Applicator</option>
                    </select>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Payment Type</label>
                <select
                    className="form-input"
                    value={formData.payment_type}
                    onChange={e => setFormData({ ...formData, payment_type: e.target.value })}
                >
                    <option value="">Select Type...</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Customer">Credit Customer</option>
                    <option value="Intercompany">Intercompany</option>
                </select>
            </div>

            {formData.payment_type === 'Credit Customer' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <div>
                        <label className="form-label" style={{ color: '#93c5fd' }}>Credit Limit (SAR)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.credit_limit}
                            onChange={e => setFormData({ ...formData, credit_limit: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="form-label" style={{ color: '#93c5fd' }}>Credit Days</label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.credit_days}
                            onChange={e => setFormData({ ...formData, credit_days: e.target.value })}
                            placeholder="e.g. 30"
                        />
                    </div>
                </div>
            )}

            <h3 style={{ fontSize: '1rem', color: 'white', marginBottom: '10px' }}>Products & Pricing</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '10px' }}>
                {productRows.map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input
                            className="form-input" placeholder="Product" style={{ flex: 2 }}
                            value={row.productName} onChange={e => handleChange(i, 'productName', e.target.value)}
                        />
                        <input
                            className="form-input" placeholder="Price" type="number" style={{ flex: 1 }}
                            value={row.price} onChange={e => handleChange(i, 'price', e.target.value)}
                        />
                        <button onClick={() => handleRemoveRow(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
            <button onClick={handleAddRow} className="btn-secondary" style={{ marginTop: '10px' }}><Plus size={16} /> Add Product</button>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <button onClick={handleSave} className="btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Account'}
                </button>
            </div>
        </div>
    );
}

// Helper
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 60%, 50%)`;
}
