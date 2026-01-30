import React, { useState, useEffect } from 'react';
import { Save, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function QuickOrder() {
    const { profile } = useAuth();
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        account: '',
        product: '',
        qty: '',
        price: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Master Data
    const [masterData, setMasterData] = useState({ accounts: [], products: [] });
    const [loadingData, setLoadingData] = useState(true);

    // Load Master Data
    useEffect(() => {
        const loadMasters = async () => {

            try {
                const { data: accs, error: accError } = await supabase.from('accounts_master').select('*');
                const { data: prods, error: prodError } = await supabase.from('products_master').select('*');



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

    // Auto-Pricing Logic
    useEffect(() => {
        const fetchPrice = async () => {
            if (formData.account && formData.product) {
                // Check Client Pricing first
                const { data: clientPrice } = await supabase
                    .from('client_pricing')
                    .select('agreed_price')
                    .eq('account_name', formData.account)
                    .eq('product_name', formData.product)
                    .single();

                if (clientPrice) {
                    setFormData(prev => ({ ...prev, price: clientPrice.agreed_price }));
                    return;
                }

                // Fallback to Product Default
                const { data: prodDef } = await supabase
                    .from('products_master')
                    .select('default_price')
                    .eq('name', formData.product)
                    .single();

                if (prodDef) {
                    setFormData(prev => ({ ...prev, price: prodDef.default_price || 0 }));
                } else {
                    setFormData(prev => ({ ...prev, price: 0 }));
                }
            }
        };

        // Debounce slightly or just run
        // For simplicity in React 18 strict mode handled by useEffect usually fine, 
        // but let's check inputs are valid strings
        if (formData.account && formData.product) {
            fetchPrice();
        }
    }, [formData.account, formData.product]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        try {
            const { error } = await supabase.from('orders').insert([
                {
                    transaction_date: formData.date,
                    account_name: formData.account,
                    product_name: formData.product,
                    quantity: parseFloat(formData.qty),
                    unit_price: parseFloat(formData.price),
                    // Defaults
                    unit_cogs: 0,
                    credit_days: 90,
                    notes: 'Quick Order',
                    sales_rep: profile?.initials || 'MH' // Auto-tag with initials OR default logic
                }
            ]);

            if (error) throw error;

            setStatus({ type: 'success', message: 'Order added successfully!' });

            // Reset only order fields, keep date
            setFormData(prev => ({
                ...prev,
                // keep date and account (often users add multiple for same account)
                product: '',
                qty: '',
                price: ''
            }));

            // Auto hide success after 3s
            setTimeout(() => setStatus({ type: '', message: '' }), 3000);

        } catch (error) {
            console.error('Error submitting:', error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingData) return <div style={{ padding: 50, textAlign: 'center' }}><Loader2 className="animate-spin" /> Loading masters...</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    <Zap size={32} fill="#eab308" color="#eab308" />
                    Quick Order
                </h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Fast track data entry for simple sales.</p>

                {status.message && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: status.type === 'success' ? '#dcfce7' : '#fee2e2',
                        color: status.type === 'success' ? '#166534' : '#991b1b',
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500
                    }}>
                        {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        {status.message}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Transaction Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="form-input" style={{ width: '100%', padding: '0.75rem' }} />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Account Name</label>
                    <select
                        name="account"
                        value={formData.account}
                        onChange={handleChange}
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

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Product Name</label>
                    <select
                        name="product"
                        value={formData.product}
                        onChange={handleChange}
                        required
                        className="form-input"
                        style={{ width: '100%', padding: '0.75rem' }}
                    >
                        <option value="">Select Product...</option>
                        {masterData.products.map(prod => (
                            <option key={prod.id} value={prod.name}>{prod.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Quantity</label>
                        <input type="number" name="qty" value={formData.qty} onChange={handleChange} placeholder="0" required className="form-input" style={{ width: '100%', padding: '0.75rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Selling Price</label>
                        <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" required className="form-input" style={{ width: '100%', padding: '0.75rem' }} />
                    </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ marginTop: '1rem', padding: '1rem', justifyContent: 'center', fontSize: '1.1rem' }}>
                    {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Saving...</> : 'Add Order'}
                </button>

            </form>
        </div>
    );
}
