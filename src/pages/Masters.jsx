import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Plus, Trash2, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Masters() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState('new_client'); // 'new_client' or 'view_data'

    // Form State
    const [clientName, setClientName] = useState('');
    const [productRows, setProductRows] = useState([{ productName: '', price: 0 }]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null); // ID of account being edited

    // Data for View Tab
    const [masterData, setMasterData] = useState({ accounts: [], products: [], pricing: [] });

    useEffect(() => {
        if (activeTab === 'view_data') {
            fetchMasterData();
        }
    }, [activeTab]);

    const fetchMasterData = async () => {
        const [accs, prods, prices] = await Promise.all([
            supabase.from('accounts_master').select('*'),
            supabase.from('products_master').select('*'),
            supabase.from('client_pricing').select('*')
        ]);
        setMasterData({
            accounts: accs.data || [],
            products: prods.data || [],
            pricing: prices.data || []
        });
    };

    const handleAddProductRow = () => {
        setProductRows([...productRows, { productName: '', price: 0 }]);
    };

    const handleRemoveProductRow = (index) => {
        const newRows = [...productRows];
        newRows.splice(index, 1);
        setProductRows(newRows);
    };

    const handleProductChange = (index, field, value) => {
        const newRows = [...productRows];
        newRows[index][field] = value;
        setProductRows(newRows);
    };

    const handleResetForm = () => {
        setClientName('');
        setProductRows([{ productName: '', price: 0 }]);
        setEditingId(null);
        setActiveTab('new_client');
        setStatusMsg('');
    };

    const handleEditAccount = async (account) => {
        setLoading(true);
        setStatusMsg(`Loading ${account.name}...`);
        try {
            // Fetch pricing 
            const { data: prices, error } = await supabase
                .from('client_pricing')
                .select('*')
                .eq('account_name', account.name);

            if (error) throw error;

            setClientName(account.name);
            if (prices && prices.length > 0) {
                setProductRows(prices.map(p => ({ productName: p.product_name, price: p.agreed_price })));
                setStatusMsg(`Editing ${account.name} (Found ${prices.length} pricing rules)`);
            } else {
                setProductRows([{ productName: '', price: 0 }]);
                setStatusMsg(`Editing ${account.name} (No pricing rules found - please add products)`);
            }

            setEditingId(account.id);
            setActiveTab('new_client');
        } catch (error) {
            console.error('Error loading account:', error);
            setStatusMsg('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!clientName.trim()) {
            alert('Please enter a Client Name');
            return;
        }

        setLoading(true);
        setStatusMsg('Saving...');
        try {
            // CHECK FOR RENAME
            if (editingId) {
                // Find original name to see if it changed
                const originalAccount = masterData.accounts.find(a => a.id === editingId);
                if (originalAccount && originalAccount.name !== clientName) {
                    // Name changed! Perform Cascade Update
                    const { error: renameError } = await supabase.rpc('rename_account_cascade', {
                        old_account_name: originalAccount.name,
                        new_account_name: clientName
                    });
                    if (renameError) {
                        console.warn('RPC failed, trying manual update', renameError);
                        alert('Error Renaming: ' + renameError.message + '. Please run rename_account.sql');
                        throw renameError;
                    }
                }
            }

            // 1. Ensure Account Exists (if new or just renamed)
            // If renamed, the previous step handled it. If new, we insert.
            if (!editingId) {
                const { data: existingAcc } = await supabase.from('accounts_master').select('id').eq('name', clientName).single();
                if (!existingAcc) {
                    const { error: accError } = await supabase.from('accounts_master').insert([
                        {
                            name: clientName,
                            created_by_initials: profile?.initials
                        }
                    ]);
                    if (accError) throw accError;
                }
            }

            // 2. Process Products and Pricing
            // Sync current rows to DB
            for (const row of productRows) {
                if (!row.productName.trim()) continue;

                // Ensure Product Exists
                const { data: existingProd } = await supabase.from('products_master').select('id').eq('name', row.productName).single();
                if (!existingProd) {
                    await supabase.from('products_master').insert([{ name: row.productName, default_price: 0 }]); // Default 0
                }

                // Upsert Pricing
                const { error: priceError } = await supabase.from('client_pricing').upsert({
                    account_name: clientName, // Use Current Name
                    product_name: row.productName,
                    agreed_price: parseFloat(row.price)
                }, { onConflict: 'account_name, product_name' });

                if (priceError) throw priceError;
            }

            // 3. Clean up deleted rows
            const currentProductNames = productRows.map(r => r.productName).filter(n => n);
            if (currentProductNames.length > 0) {
                await supabase.from('client_pricing')
                    .delete()
                    .eq('account_name', clientName)
                    .not('product_name', 'in', `(${currentProductNames.map(n => `"${n}"`).join(',')})`);
            }

            setStatusMsg('Saved Successfully!');
            alert('Client and Pricing Saved Successfully!');

            await fetchMasterData();
            handleResetForm();

        } catch (error) {
            console.error('Error saving data:', error);
            setStatusMsg('Error: ' + error.message);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const [statusMsg, setStatusMsg] = useState('');

    const handleImportFromLedger = async () => {
        if (!window.confirm('This will scan your Sales Ledger and register any missing Accounts and Products into the Masters list. Continue?')) return;

        setLoading(true);
        setStatusMsg('Scanning orders...');
        try {
            // 1. Get Distinct Names from Orders
            const { data: orders, error } = await supabase.from('orders').select('account_name, product_name');
            if (error) {
                setStatusMsg('Error fetching orders: ' + error.message);
                throw error;
            }

            const uniqueAccounts = [...new Set(orders.map(o => o.account_name?.trim()))].filter(n => n && n !== 'Unknown');
            const uniqueProducts = [...new Set(orders.map(o => o.product_name?.trim()))].filter(n => n && n !== 'Unknown');

            setStatusMsg(`Found ${uniqueAccounts.length} unique accounts and ${uniqueProducts.length} unique products. Syncing...`);

            // 2. Upsert Accounts
            if (uniqueAccounts.length > 0) {
                const { error: accError } = await supabase
                    .from('accounts_master')
                    .upsert(uniqueAccounts.map(name => ({ name })), { onConflict: 'name', ignoreDuplicates: true });
                if (accError) {
                    setStatusMsg('Error syncing accounts: ' + accError.message);
                    throw accError;
                }
            }

            // 3. Upsert Products
            if (uniqueProducts.length > 0) {
                const { error: prodError } = await supabase
                    .from('products_master')
                    .upsert(uniqueProducts.map(name => ({ name })), { onConflict: 'name', ignoreDuplicates: true });
                if (prodError) {
                    setStatusMsg('Error syncing products: ' + prodError.message);
                    throw prodError;
                }
            }

            setStatusMsg(`Sync Complete! Scanned ${orders.length} orders. Registered ${uniqueAccounts.length} Accounts and ${uniqueProducts.length} Products.`);
            fetchMasterData(); // Refresh View
        } catch (error) {
            console.error('Import Error:', error);
            setStatusMsg('Import Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 className="page-title" style={{ margin: 0 }}>Masters & Pricing Setup</h1>
                <div>
                    {statusMsg && <span style={{ marginRight: '15px', color: 'var(--primary)', fontWeight: 'bold' }}>{statusMsg}</span>}
                    <button onClick={handleImportFromLedger} className="btn-secondary" style={{ gap: '8px' }}>
                        <Database size={16} /> Sync from Ledger
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                    className={`btn-secondary ${activeTab === 'new_client' ? 'active-tab' : ''}`}
                    style={activeTab === 'new_client' ? { borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 'bold' } : {}}
                    onClick={handleResetForm}
                >
                    <Plus size={16} /> Setup New Client
                </button>
                <button
                    className={`btn-secondary ${activeTab === 'view_data' ? 'active-tab' : ''}`}
                    style={activeTab === 'view_data' ? { borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 'bold' } : {}}
                    onClick={() => setActiveTab('view_data')}
                >
                    <Database size={16} /> View Master Data
                </button>
            </div>

            {/* CONTENT: New Client Setup */}
            {activeTab === 'new_client' && (
                <div className="card" style={{ maxWidth: '800px' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        Client & Product Pricing
                    </h2>

                    {/* Client Name Input */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label className="form-label">Client / Account Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter Client Name (e.g. Al-Futtaim)"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            style={{ fontSize: '1.1rem', padding: '10px' }}
                        />
                    </div>

                    {/* Products Grid */}
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Assigned Products & Prices</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {productRows.map((row, index) => (
                            <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ flex: 2 }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Product Name"
                                        value={row.productName}
                                        onChange={(e) => handleProductChange(index, 'productName', e.target.value)}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Price"
                                        value={row.price}
                                        onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => handleRemoveProductRow(index)}
                                    style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                    title="Remove Row"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <button onClick={handleAddProductRow} className="btn-secondary" style={{ fontSize: '0.9rem' }}>
                            <Plus size={16} /> Add Another Product
                        </button>
                    </div>

                    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleSave}
                            className="btn-primary"
                            style={{ padding: '10px 30px', fontSize: '1rem' }}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : <><Save size={18} /> Save Setup</>}
                        </button>
                    </div>
                </div>
            )}

            {/* CONTENT: View Data */}
            {activeTab === 'view_data' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="card">
                        <h3>Registered Accounts</h3>
                        <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)' }}>
                            {masterData.accounts.map(a => (
                                <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                                    <span>{a.name}</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleEditAccount(a)}
                                            style={{ fontSize: '0.8rem', padding: '4px 8px', cursor: 'pointer', background: 'var(--bg-main)', border: '1px solid #ccc', borderRadius: '4px' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm(`Delete account "${a.name}"? This will NOT delete sales history, but will remove it from future selections.`)) return;
                                                const { error } = await supabase.from('accounts_master').delete().eq('id', a.id);
                                                if (error) alert(error.message);
                                                else fetchMasterData();
                                            }}
                                            style={{ fontSize: '0.8rem', padding: '4px 8px', cursor: 'pointer', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '4px' }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="card">
                        <h3>Registered Products</h3>
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {masterData.products.map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                                    <span>{p.name}</span>
                                    <button
                                        onClick={async () => {
                                            if (!window.confirm(`Delete product "${p.name}"?`)) return;
                                            const { error } = await supabase.from('products_master').delete().eq('id', p.id);
                                            if (error) alert(error.message);
                                            else fetchMasterData();
                                        }}
                                        style={{ fontSize: '0.8rem', padding: '4px 8px', cursor: 'pointer', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '4px' }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
