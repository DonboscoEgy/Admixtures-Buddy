import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Calendar, DollarSign, User, FileText, CheckCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Payments() {
    const { user, profile } = useAuth();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [accounts, setAccounts] = useState([]);
    const [formData, setFormData] = useState({
        account_name: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [recentPayments, setRecentPayments] = useState([]);

    const [selectedPayment, setSelectedPayment] = useState(null); // For Edit Mode

    // ... (rest of imports and state)

    // Admin Filter
    const [ownerFilter, setOwnerFilter] = useState('All');
    const [uniqueOwners, setUniqueOwners] = useState([]);

    useEffect(() => {
        if (profile) {
            fetchAccountsAndPayments();
        }
    }, [profile, ownerFilter]);

    const fetchAccountsAndPayments = async () => {
        // ... (fetch logic remains same)
        // 1. Fetch Accounts (with Owner info)
        const { data: allAccounts } = await supabase
            .from('accounts_master')
            .select('name, created_by_initials')
            .order('name');

        if (!allAccounts) return;

        // 2. Derive Unique Owners for Admin Dropdown
        if (profile?.is_admin) {
            const owners = [...new Set(allAccounts.map(a => a.created_by_initials).filter(Boolean))].sort();
            setUniqueOwners(owners);
        }

        // 3. Determine "Relevant Accounts" based on Role & Filter
        let relevantAccounts = allAccounts;

        if (!profile?.is_admin) {
            relevantAccounts = allAccounts.filter(a => a.created_by_initials === profile.initials);
        } else if (ownerFilter !== 'All') {
            relevantAccounts = allAccounts.filter(a => a.created_by_initials === ownerFilter);
        }

        setAccounts(relevantAccounts);

        // 4. Fetch Payments
        const accountNames = relevantAccounts.map(a => a.name);

        let paymentQuery = supabase
            .from('payments_ledger')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (accountNames.length > 0) {
            paymentQuery = paymentQuery.in('account_name', accountNames);
        } else {
            setRecentPayments([]);
            return;
        }

        const { data: payData } = await paymentQuery;
        setRecentPayments(payData || []);
    };

    const handleEdit = (payment) => {
        setSelectedPayment(payment);
        setFormData({
            account_name: payment.account_name,
            amount: payment.amount,
            payment_date: payment.payment_date,
            notes: payment.notes || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
    };

    const handleCancelEdit = () => {
        setSelectedPayment(null);
        setFormData({
            account_name: '',
            amount: '',
            payment_date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.account_name || !formData.amount) {
            showToast('Please fill in Account and Amount', 'error');
            return;
        }

        setLoading(true);
        try {
            if (selectedPayment) {
                // UPDATE Logic
                const { error } = await supabase
                    .from('payments_ledger')
                    .update({
                        account_name: formData.account_name,
                        amount: parseFloat(formData.amount),
                        payment_date: formData.payment_date,
                        notes: formData.notes
                    })
                    .eq('id', selectedPayment.id);

                if (error) throw error;
                showToast('Payment Updated Successfully', 'success');
            } else {
                // INSERT Logic
                const { error } = await supabase.from('payments_ledger').insert([{
                    account_name: formData.account_name,
                    amount: parseFloat(formData.amount),
                    payment_date: formData.payment_date,
                    notes: formData.notes
                }]);

                if (error) throw error;
                showToast('Payment Recorded Successfully', 'success');
            }

            handleCancelEdit(); // Reset form and mode
            fetchAccountsAndPayments();
        } catch (error) {
            console.error('Error saving payment:', error);
            showToast('Error: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px' }}>
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div className="breadcrumb">Home / Payments</div>
                    <h1 className="page-title">{selectedPayment ? 'Edit Payment' : 'Record Payment'}</h1>
                </div>

                {/* ADMIN FILTER */}
                {profile?.is_admin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Filter by Owner:</span>
                        <select
                            className="form-input"
                            style={{ padding: '8px', minWidth: '150px' }}
                            value={ownerFilter}
                            onChange={e => setOwnerFilter(e.target.value)}
                        >
                            <option value="All">All Owners</option>
                            {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="grid-responsive-2">

                {/* LEFT: Entry Form */}
                <div className="glass-card" style={{ padding: '30px', border: selectedPayment ? '1px solid #3b82f6' : '1px solid var(--card-border)' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <DollarSign color={selectedPayment ? "#3b82f6" : "#10b981"} />
                        {selectedPayment ? 'Edit Payment Details' : 'New Payment Entry'}
                    </h2>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        <div>
                            <label className="form-label" style={{ color: 'var(--text-muted)' }}>Account Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 10, pointerEvents: 'none' }} />
                                <select
                                    className="form-input"
                                    style={{ paddingLeft: '55px', textIndent: '35px' }}
                                    value={formData.account_name}
                                    onChange={e => setFormData({ ...formData, account_name: e.target.value })}
                                    disabled={!!selectedPayment} // Optional: Lock account on edit if desired, usually safer
                                >
                                    <option value="">Select Account...</option>
                                    {accounts.map(a => (
                                        <option key={a.name} value={a.name}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Amount (SAR)</label>
                                <div style={{ position: 'relative' }}>
                                    <DollarSign size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 10, pointerEvents: 'none' }} />
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ paddingLeft: '50px' }}
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Payment Date</label>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 10, pointerEvents: 'none' }} />
                                    <input
                                        type="date"
                                        className="form-input"
                                        style={{ paddingLeft: '50px' }}
                                        value={formData.payment_date}
                                        onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="form-label" style={{ color: 'var(--text-muted)' }}>Notes / Reference</label>
                            <div style={{ position: 'relative' }}>
                                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: '#64748b' }} />
                                <textarea
                                    className="form-input"
                                    style={{ paddingLeft: '40px', height: '100px' }}
                                    placeholder="Check #, Bank Transfer Ref, etc."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            {selectedPayment && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="btn-secondary"
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    gap: '10px',
                                    background: selectedPayment ? '#3b82f6' : '#10b981', // Blue for Update, Green for Add
                                    boxShadow: selectedPayment ? '0 0 15px rgba(59, 130, 246, 0.5)' : '0 0 15px rgba(16, 185, 129, 0.2)'
                                }}
                            >
                                {loading ? 'Processing...' : (
                                    <>
                                        {selectedPayment ? <Save size={20} /> : <CheckCircle size={20} />}
                                        {selectedPayment ? 'Update Payment' : 'Record Payment'}
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </div>

                {/* RIGHT: Recent List */}
                <div className="glass-card" style={{ padding: '30px', background: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', border: theme === 'dark' ? '1px solid var(--card-border)' : '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-muted)' }}>Recent Payments</h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '15px' }}>Click on a payment to edit.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {recentPayments.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No payments recorded yet.</span>}
                        {recentPayments.map(p => (
                            <div
                                key={p.id}
                                onClick={() => handleEdit(p)}
                                style={{
                                    padding: '15px',
                                    background: selectedPayment?.id === p.id
                                        ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)')
                                        : (theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'white'),
                                    borderRadius: '8px',
                                    borderLeft: `3px solid ${selectedPayment?.id === p.id ? '#3b82f6' : '#10b981'}`,
                                    border: selectedPayment?.id !== p.id ? (theme === 'dark' ? '1px solid transparent' : '1px solid #e2e8f0') : '',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{p.account_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.payment_date} • {p.notes || 'No Ref'}</div>
                                </div>
                                <div style={{ fontWeight: 'bold', color: selectedPayment?.id === p.id ? '#3b82f6' : '#10b981', fontSize: '1.1rem' }}>
                                    SAR {parseFloat(p.amount).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}
