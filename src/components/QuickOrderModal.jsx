import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function QuickOrderModal({ onClose, onSuccess }) {
    const { profile } = useAuth();

    // Header State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [account, setAccount] = useState('');

    // Items State
    const [items, setItems] = useState([
        { id: Date.now(), product: '', qty: '', price: '', transport: '', setup: '' }
    ]);

    // ... (rest of state)

    const addItem = () => {
        setItems(prev => [...prev, { id: Date.now(), product: '', qty: '', price: '', transport: '', setup: '' }]);
    };

    // ... (rest of helper functions, modify handleSubmit later)

    // ... (inside JSX return)

    {
        items.map((item, index) => (
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
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: index === 0 ? 'block' : 'none' }}>Trans.</label>
                    <input
                        type="number" step="0.01"
                        value={item.transport}
                        onChange={(e) => updateItem(index, 'transport', e.target.value)}
                        placeholder="0.00"
                        className="form-input"
                        style={{ width: '100%', padding: '0.5rem', borderColor: item.transport ? '#f59e0b' : '' }}
                    />
                </div>

                <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: index === 0 ? 'block' : 'none' }}>Setup</label>
                    <input
                        type="number" step="0.01"
                        value={item.setup}
                        onChange={(e) => updateItem(index, 'setup', e.target.value)}
                        placeholder="0.00"
                        className="form-input"
                        style={{ width: '100%', padding: '0.5rem', borderColor: item.setup ? '#f59e0b' : '' }}
                    />
                </div>

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

                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', padding: '1rem', justifyContent: 'center', fontSize: '1.1rem' }}>
                        {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Saving Order...</> : 'Save All Orders'}
                    </button>
                </div>

            </form>
        )}
            </div >
        </div >
    );
}
