```javascript
import React, { useState, useEffect } from 'react';
import { Save, PlusCircle, Calculator, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function DataEntryForm() {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        account: '',
        product: '',
        qty: '',
        price: '',
        cogs: '',
        credit_days: '90',
        notes: ''
    });
  
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [calcs, setCalcs] = useState({
        totalSales: 0,
        vatAmount: 0,
        totalWithVat: 0,
        grossProfit: 0,
        grossMargin: 0
    });

    // Auto-calculate on change
    useEffect(() => {
        const qty = parseFloat(formData.qty) || 0;
        const price = parseFloat(formData.price) || 0;
        const cogs = parseFloat(formData.cogs) || 0;

        const totalSales = qty * price;
        const vatAmount = totalSales * 0.15;
        const totalWithVat = totalSales + vatAmount;
        const totalCogs = qty * cogs;
        const grossProfit = totalSales - totalCogs;
        const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

        setCalcs({
            totalSales,
            vatAmount,
            totalWithVat,
            grossProfit,
            grossMargin
        });
    }, [formData.qty, formData.price, formData.cogs]);

  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
                unit_cogs: parseFloat(formData.cogs),
                credit_days: parseInt(formData.credit_days),
                notes: formData.notes
            }
        ]);

        if (error) throw error;

        setStatus({ type: 'success', message: 'Order saved successfully!' });
        
        // Reset Form
        setFormData({
            date: new Date().toISOString().split('T')[0],
            account: '',
            product: '',
            qty: '',
            price: '',
            cogs: '',
            credit_days: '90',
            notes: ''
        });

    } catch (error) {
        console.error('Error submitting:', error);
        setStatus({ type: 'error', message: 'Failed to save order: ' + error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          New Order Entry
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
            Log new sales orders. Financials are calculated automatically.
        </p>
        
        {status.message && (
            <div style={{ 
                marginTop: '1.5rem', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                background: status.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: status.type === 'success' ? '#166534' : '#991b1b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 500
            }}>
                {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {status.message}
            </div>
        )}
      </header>

            <div className="glass-card" style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

                {/* Left Column: Inputs */}
                <form id="entryForm" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label>Account / Client Name</label>
                        <input
                            type="text"
                            name="account"
                            value={formData.account}
                            onChange={handleChange}
                            placeholder="e.g. Aamal RM"
                            autoFocus
                            required
                            style={{ fontWeight: 600 }}
                        />
                    </div>

                    <div>
                        <label>Date</label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label>Credit Days</label>
                        <input
                            type="number"
                            name="credit_days"
                            value={formData.credit_days}
                            onChange={handleChange}
                            placeholder="90"
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label>Product</label>
                        <input
                            type="text"
                            name="product"
                            value={formData.product}
                            onChange={handleChange}
                            placeholder="e.g. PlekoCrete U420"
                            required
                        />
                    </div>

                    {/* Quantity & Price Row */}
                    <div>
                        <label>Quantity</label>
                        <input
                            type="number"
                            name="qty"
                            value={formData.qty}
                            onChange={handleChange}
                            placeholder="0"
                            required
                        />
                    </div>

                    <div>
                        <label>Selling Price (Unit)</label>
                        <input
                            type="number"
                            step="0.01"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    {/* COGS */}
                    <div>
                        <label>COGS (Unit Cost)</label>
                        <input
                            type="number"
                            step="0.01"
                            name="cogs"
                            value={formData.cogs}
                            onChange={handleChange}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label>Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={2}
                            placeholder="Optional notes..."
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2', paddingTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ width: '100%', padding: '0.875rem', opacity: isSubmitting ? 0.7 : 1 }}>
                            <Save size={18} />
                            {isSubmitting ? 'Saving...' : 'Save Order'}
                        </button>
                    </div>
                </form>

                {/* Right Column: Live Preview */}
                <div style={{
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    border: '1px solid var(--color-border)',
                    height: 'fit-content'
                }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                        <Calculator size={20} />
                        Live Financials
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <SummaryRow label="Total Sales (Ex. VAT)" value={calcs.totalSales} isBold />
                        <SummaryRow label="VAT (15%)" value={calcs.vatAmount} />
                        <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }} />
                        <SummaryRow label="Total w/ VAT" value={calcs.totalWithVat} isBold color="var(--color-primary)" size="1.25rem" />

                        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px dashed var(--color-border)' }}>
                            <SummaryRow label="Gross Profit" value={calcs.grossProfit} isBold color={calcs.grossProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Margin %</span>
                                <span style={{ fontWeight: 600, color: calcs.grossMargin >= 20 ? 'var(--color-success)' : 'orange' }}>
                                    {calcs.grossMargin.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function SummaryRow({ label, value, isBold = false, color = 'inherit', size = '1rem' }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{label}</span>
            <span style={{
                fontWeight: isBold ? 700 : 500,
                color: color,
                fontSize: size,
                fontFamily: 'monospace' // ensures numbers align better
            }}>
                {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        </div>
    )
}
