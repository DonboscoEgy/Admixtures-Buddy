import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';

const EditOrder = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        transaction_date: '',
        account_name: '',
        product_name: '',
        quantity: 0,
        unit_price: 0,
        credit_days: 90,
        notes: ''
    });

    const [masterData, setMasterData] = useState({ accounts: [], products: [], pricing: [] });
    const [status, setStatus] = useState({ type: '', message: '' });

    // Load Initial Data
    useEffect(() => {
        const loadAllData = async () => {
            try {
                setLoading(true);
                // Parallel Fetch: Order Details + Master Data
                const [orderRes, accountsRes, productsRes, pricingRes] = await Promise.all([
                    supabase.from('orders').select('*').eq('id', id).single(),
                    supabase.from('accounts_master').select('*').order('name'),
                    supabase.from('products_master').select('*').order('name'),
                    supabase.from('client_pricing').select('*')
                ]);

                if (orderRes.error) throw orderRes.error;

                setFormData(orderRes.data);
                setMasterData({
                    accounts: accountsRes.data || [],
                    products: productsRes.data || [],
                    pricing: pricingRes.data || []
                });

            } catch (err) {
                console.error('Error loading data:', err);
                setStatus({ type: 'error', message: 'Failed to load order details.' });
            } finally {
                setLoading(false);
            }
        };

        if (id) loadAllData();
    }, [id]);

    const handleFieldChange = (field, value) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };

            // Auto-Price Logic on Change
            if (field === 'account_name' || field === 'product_name') {
                const acct = field === 'account_name' ? value : prev.account_name;
                const prod = field === 'product_name' ? value : prev.product_name;

                if (acct && prod) {
                    const agreed = masterData.pricing.find(p => p.account_name === acct && p.product_name === prod);
                    if (agreed) {
                        newState.unit_price = agreed.agreed_price;
                    } else if (field === 'product_name') {
                        // Fallback default
                        const pMaster = masterData.products.find(p => p.name === prod);
                        if (pMaster) newState.unit_price = pMaster.default_price;
                    }
                }
            }
            return newState;
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus({ type: '', message: '' });

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    transaction_date: formData.transaction_date,
                    account_name: formData.account_name,
                    product_name: formData.product_name,
                    quantity: parseFloat(formData.quantity),
                    unit_price: parseFloat(formData.unit_price),
                    credit_days: parseInt(formData.credit_days),
                    notes: formData.notes
                })
                .eq('id', id);

            if (error) throw error;

            setStatus({ type: 'success', message: 'Order updated successfully!' });
            setTimeout(() => navigate('/'), 1000); // Back to Ledger

        } catch (err) {
            console.error('Error updating order:', err);
            setStatus({ type: 'error', message: 'Failed to update order: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this order?')) return;

        try {
            const { error } = await supabase.from('orders').delete().eq('id', id);
            if (error) throw error;
            navigate('/');
        } catch (err) {
            alert('Error deleting: ' + err.message);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Back to Ledger
            </button>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 className="page-title" style={{ margin: 0 }}>Edit Order</h1>
                    <button onClick={handleDelete} className="btn-danger icon-btn" style={{ padding: '8px 12px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <Trash2 size={18} /> Delete
                    </button>
                </div>

                {status.message && (
                    <div className={`status-message ${status.type}`} style={{ marginBottom: '1rem', padding: '10px', borderRadius: '4px', background: status.type === 'error' ? '#fee2e2' : '#dcfce7', color: status.type === 'error' ? '#991b1b' : '#166534' }}>
                        {status.message}
                    </div>
                )}

                <form onSubmit={handleSave} className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.transaction_date}
                            onChange={e => handleFieldChange('transaction_date', e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="form-label">Credit Days</label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.credit_days}
                            onChange={e => handleFieldChange('credit_days', e.target.value)}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Account</label>
                        <select
                            className="form-input"
                            value={formData.account_name}
                            onChange={e => handleFieldChange('account_name', e.target.value)}
                            required
                        >
                            <option value="">Select Account</option>
                            {masterData.accounts.map(a => (
                                <option key={a.id} value={a.name}>{a.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Product</label>
                        <select
                            className="form-input"
                            value={formData.product_name}
                            onChange={e => handleFieldChange('product_name', e.target.value)}
                            required
                        >
                            <option value="">Select Product</option>
                            {masterData.products.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Quantity</label>
                        <input
                            type="number"
                            className="form-input"
                            step="0.01"
                            value={formData.quantity}
                            onChange={e => handleFieldChange('quantity', e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="form-label">Unit Price (SAR)</label>
                        <input
                            type="number"
                            className="form-input"
                            step="0.01"
                            value={formData.unit_price}
                            onChange={e => handleFieldChange('unit_price', e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                        <label className="form-label">Notes</label>
                        <textarea
                            className="form-input"
                            rows="2"
                            value={formData.notes || ''}
                            onChange={e => handleFieldChange('notes', e.target.value)}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Update Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditOrder;
