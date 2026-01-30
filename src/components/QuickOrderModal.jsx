import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function QuickOrderModal({ onClose, onSuccess, editOrder = null }) {
    const { profile } = useAuth();
    const isEditMode = !!editOrder;

    // Header State
    const [date, setDate] = useState(editOrder?.transaction_date || new Date().toISOString().split('T')[0]);
    const [account, setAccount] = useState(editOrder?.account_name || '');

    // Items State
    const [items, setItems] = useState([
        {
            id: Date.now(),
            product: editOrder?.product_name || '',
            qty: editOrder?.quantity || '',
            price: editOrder?.unit_price || '',
            transport: editOrder?.transport_cost || '',
            setup: editOrder?.setup_cost || ''
        }
    ]);

    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmailPreview, setShowEmailPreview] = useState(false);

    // Master Data
    const [masterData, setMasterData] = useState({ accounts: [], products: [] });
    const [loadingData, setLoadingData] = useState(true);

    // Load Master Data
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const { data: accs } = await supabase.from('accounts_master').select('*').order('name');
                const { data: prods } = await supabase.from('products_master').select('*').order('name');

                setMasterData({
                    accounts: accs || [],
                    products: prods || []
                });
            } catch (err) {
                console.error('Error loading masters', err);
                setStatus({ type: 'error', message: 'Failed to load master data' });
            } finally {
                setLoadingData(false);
            }
        };
        loadMasters();
    }, []);

    // Helper: Fetch Price for a specific row
    const fetchPriceForRow = async (productName, index) => {
        if (!account || !productName) return;

        // Check Client Pricing first
        const { data: clientPrice } = await supabase
            .from('client_pricing')
            .select('agreed_price')
            .eq('account_name', account)
            .eq('product_name', productName)
            .single();

        let finalPrice = 0;

        if (clientPrice) {
            finalPrice = clientPrice.agreed_price;
        } else {
            // Fallback to Product Default
            const { data: prodDef } = await supabase
                .from('products_master')
                .select('default_price')
                .eq('name', productName)
                .single();
            finalPrice = prodDef?.default_price || 0;
        }

        updateItem(index, 'price', finalPrice);
    };

    const addItem = () => {
        setItems(prev => [...prev, { id: Date.now(), product: '', qty: '', price: '', transport: '', setup: '' }]);
    };

    const removeItem = (index) => {
        if (items.length > 1) {
            setItems(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index, field, value) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });

        // Trigger Price Fetch if Product changes
        if (field === 'product') {
            fetchPriceForRow(value, index);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        if (!account) {
            setStatus({ type: 'error', message: 'Please select an account.' });
            setIsSubmitting(false);
            return;
        }

        // Validate items
        const validItems = items.filter(i => i.product && i.qty);
        if (validItems.length === 0) {
            setStatus({ type: 'error', message: 'Please add at least one valid product.' });
            setIsSubmitting(false);
            return;
        }

        try {
            const ordersToInsert = validItems.map(item => ({
                transaction_date: date,
                account_name: account,
                product_name: item.product,
                quantity: parseFloat(item.qty),
                unit_price: parseFloat(item.price),
                unit_cogs: 0,
                transport_cost: parseFloat(item.transport || 0), // New
                setup_cost: parseFloat(item.setup || 0),       // New
                credit_days: 90,
                notes: 'Quick Order',
                sales_rep: profile?.initials || 'MH'
            }));

            const { error } = await supabase.from('orders').insert(ordersToInsert);

            if (error) throw error;

            setStatus({ type: 'success', message: `Successfully added ${validItems.length} orders!` });

            // Email automation removed by user request (IT Block). Manual Copy button added instead.

            // Trigger success callback
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 1000);

        } catch (error) {
            console.error('Error submitting:', error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="glass-card" style={{
                width: '800px', maxHeight: '90vh', overflowY: 'auto',
                padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
                position: 'relative', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.5rem', marginBottom: '0.2rem' }}>
                        <Zap size={24} fill="#eab308" color="#eab308" />
                        {isEditMode ? 'Edit Order' : 'Quick Order'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{isEditMode ? 'Update order details.' : 'Fast track data entry.'}</p>

                    {status.message && (
                        <div style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            background: status.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: status.type === 'success' ? '#34d399' : '#f87171',
                            border: status.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '0.9rem'
                        }}>
                            {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {status.message}
                        </div>
                    )}
                </div>

                {loadingData ? (
                    <div style={{ padding: 50, textAlign: 'center' }}><Loader2 className="animate-spin" /> Loading masters...</div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Header Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Transaction Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                    className="form-input"
                                    style={{ width: '100%', padding: '0.75rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Account Name</label>
                                <select
                                    value={account}
                                    onChange={(e) => setAccount(e.target.value)}
                                    required
                                    className="form-input"
                                    style={{ width: '100%', padding: '0.75rem' }}
                                    autoFocus
                                >
                                    <option value="">Select Account...</option>
                                    {masterData.accounts.map(acc => (
                                        <option key={acc.id} value={acc.name}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }}></div>

                        {/* Items Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            <label style={{ display: 'block', fontWeight: 500, color: 'var(--primary)' }}>Order Items</label>

                            {items.map((item, index) => (
                                <div key={item.id} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2.5fr 0.8fr 0.8fr 0.8fr 0.8fr 40px', // Adjusted for 2 new cols
                                    gap: '8px',
                                    alignItems: 'end',
                                    animation: 'slideIn 0.3s ease-out'
                                }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: index === 0 ? 'block' : 'none' }}>Product</label>
                                        <select
                                            value={item.product}
                                            onChange={(e) => updateItem(index, 'product', e.target.value)}
                                            required
                                            className="form-input"
                                            style={{ width: '100%', padding: '0.5rem' }}
                                        >
                                            <option value="">Select...</option>
                                            {masterData.products.map(prod => (
                                                <option key={prod.id} value={prod.name}>{prod.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: index === 0 ? 'block' : 'none' }}>Qty</label>
                                        <input
                                            type="number"
                                            value={item.qty}
                                            onChange={(e) => updateItem(index, 'qty', e.target.value)}
                                            placeholder="0"
                                            required
                                            className="form-input"
                                            style={{ width: '100%', padding: '0.5rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: index === 0 ? 'block' : 'none' }}>Price</label>
                                        <input
                                            type="number" step="0.01"
                                            value={item.price}
                                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                                            placeholder="0.00"
                                            required
                                            className="form-input"
                                            style={{ width: '100%', padding: '0.5rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: index === 0 ? 'block' : 'none' }}>Trans. (Per L)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number" step="0.01"
                                                value={item.transport}
                                                onChange={(e) => updateItem(index, 'transport', e.target.value)}
                                                placeholder="0.00"
                                                className="form-input"
                                                style={{ width: '100%', padding: '0.5rem', borderColor: item.transport ? '#f59e0b' : '' }}
                                            />
                                            {item.qty && item.transport && (
                                                <div style={{ position: 'absolute', right: 0, bottom: '-18px', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>
                                                    {(item.qty * item.transport).toLocaleString()} SAR
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: index === 0 ? 'block' : 'none' }}>Setup (Per L)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number" step="0.01"
                                                value={item.setup}
                                                onChange={(e) => updateItem(index, 'setup', e.target.value)}
                                                placeholder="0.00"
                                                className="form-input"
                                                style={{ width: '100%', padding: '0.5rem', borderColor: item.setup ? '#f59e0b' : '' }}
                                            />
                                            {item.qty && item.setup && (
                                                <div style={{ position: 'absolute', right: 0, bottom: '-18px', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>
                                                    {(item.qty * item.setup).toLocaleString()} SAR
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        disabled={items.length === 1 || isEditMode}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#fca5a5',
                                            border: 'none',
                                            borderRadius: '8px',
                                            height: '42px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: (items.length === 1 || isEditMode) ? 'not-allowed' : 'pointer',
                                            opacity: (items.length === 1 || isEditMode) ? 0.5 : 1
                                        }}
                                    >
                                        <AlertCircle size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {!isEditMode && (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <button type="button" onClick={addItem} style={{
                                    background: 'transparent',
                                    border: '1px dashed var(--primary)',
                                    color: 'var(--primary)',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    marginTop: '10px'
                                }}>
                                    <Zap size={16} /> Add Another Product
                                </button>
                            </div>
                        )}

                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="checkbox"
                                    id="sendEmail"
                                    checked={sendEmail}
                                    onChange={(e) => setSendEmail(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailPreview(true)}
                                        className="btn"
                                        style={{ flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', justifyContent: 'center' }}
                                    >
                                        📋 Copy Email Draft
                                    </button>

                                    <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 2, padding: '1rem', justifyContent: 'center', fontSize: '1.1rem' }}>
                                        {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Saving Order...</> : 'Save All Orders'}
                                    </button>
                                </div>

                            </form>
                )}
                        </div>

                        {/* Email Preview Modal */}
                        {showEmailPreview && (
                            <div style={{
                                position: 'fixed', inset: 0, zIndex: 110,
                                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }} onClick={() => setShowEmailPreview(false)}>
                                <div onClick={e => e.stopPropagation()} className="glass-card" style={{
                                    width: '500px', background: '#fff', color: '#333',
                                    padding: '2rem', borderRadius: '12px', position: 'relative'
                                }}>
                                    <h3 style={{ marginTop: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📧 Email Draft
                                    </h3>

                                    <div
                                        id="email-content"
                                        style={{
                                            background: '#f9fafb', padding: '15px', borderRadius: '8px',
                                            border: '1px solid #e5e7eb', margin: '15px 0',
                                            fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.5',
                                            color: '#374151'
                                        }}
                                    >
                                        <p style={{ margin: '0 0 10px 0' }}>Dear <b>Sales Coordinator</b>,</p>
                                        <p style={{ margin: '0 0 10px 0' }}>Good day.</p>
                                        <p style={{ margin: '0 0 10px 0' }}>Please find below the new Sales Order details for <b>{account || '[Account Name]'}</b>:</p>

                                        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                                            {items.filter(i => i.product && i.qty).length > 0 ? (
                                                items.filter(i => i.product && i.qty).map((item, idx) => (
                                                    <li key={idx} style={{ marginBottom: '4px' }}>
                                                        <b>{item.product}</b>: {item.qty} units
                                                    </li>
                                                ))
                                            ) : (
                                                <li>(No items added yet)</li>
                                            )}
                                        </ul>

                                        <p style={{ margin: '10px 0' }}>For KCG it will be the same as Inshaa Precast, an intercompany account, and the payment is processed through offsetting.</p>

                                        <p style={{ margin: 0 }}>Thanks & Regards.</p>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => setShowEmailPreview(false)}
                                            style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => {
                                                const content = document.getElementById('email-content');
                                                const range = document.createRange();
                                                range.selectNode(content);
                                                window.getSelection().removeAllRanges();
                                                window.getSelection().addRange(range);
                                                document.execCommand('copy');
                                                window.getSelection().removeAllRanges();
                                                alert('Copied to clipboard! You can paste it into Outlook.');
                                                setShowEmailPreview(false);
                                            }}
                                            style={{
                                                padding: '8px 20px', background: '#22c55e', color: 'white',
                                                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
                                            }}
                                        >
                                            Copy Text
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
        </div>
            );
}
            );
}
