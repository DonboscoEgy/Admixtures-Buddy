import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { supabase } from '../supabaseClient';
import { Plus, Edit2, X, Save, Package } from 'lucide-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Products() {
    const { isAdmin } = useAuth();
    const { theme } = useTheme();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null); // null for new, object for edit
    const [selectedRows, setSelectedRows] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // ... (rest of state and fetchProducts)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        product_family: 'SNF',
        default_price: 0,
        cogs: 0
    });

    const productFamilies = [
        "SNF",
        "PCE Readymix",
        "PCE Precast",
        "Normal Retarder",
        "PCE Retarder",
        "Special Admixtures"
    ];

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products_master')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error loading products:', error);
        } else {
            // Assign Serial Numbers (1-based index)
            // Filter by search term if needed (client-side simple filter for now)
            let filteredData = data || [];
            if (searchTerm) {
                filteredData = filteredData.filter(p =>
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (p.product_family && p.product_family.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            }

            const productsWithIds = filteredData.map((item, index) => ({
                ...item,
                serial_number: index + 1
            }));
            setProducts(productsWithIds);
        }
        setLoading(false);
    };

    // Re-fetch when search changes
    useEffect(() => {
        fetchProducts();
    }, [searchTerm]);

    const handleDeleteSelected = async () => {
        if (!isAdmin) return;
        if (!selectedRows.length) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} product(s)?`)) return;

        const idsToDelete = selectedRows.map(r => r.id);
        const { error } = await supabase
            .from('products_master')
            .delete()
            .in('id', idsToDelete);

        if (error) {
            alert('Error deleting products: ' + error.message);
        } else {
            fetchProducts();
            setSelectedRows([]);
        }
    };

    const handleOpenModal = (product = null) => {
        if (!isAdmin) return; // Restrict modal opening

        if (product) {
            setCurrentProduct(product);
            setFormData({
                name: product.name,
                product_family: product.product_family || 'SNF',
                default_price: product.default_price || 0,
                cogs: product.cogs || 0
            });
        } else {
            setCurrentProduct(null);
            setFormData({
                name: '',
                product_family: 'SNF',
                default_price: 0,
                cogs: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            console.log('Attempting save with data:', formData);
            if (currentProduct) {
                console.log('Updating product ID:', currentProduct.id);
                // Update
                const { data, error } = await supabase
                    .from('products_master')
                    .update({
                        name: formData.name,
                        product_family: formData.product_family,
                        default_price: formData.default_price,
                        cogs: formData.cogs
                    })
                    .eq('id', currentProduct.id)
                    .select();

                if (error) {
                    console.error('Supabase Update Error:', error);
                    throw error;
                }
                console.log('Update success, data:', data);
            } else {
                console.log('Inserting new product');
                // Insert
                const { data, error } = await supabase
                    .from('products_master')
                    .insert([{
                        name: formData.name,
                        product_family: formData.product_family,
                        default_price: formData.default_price,
                        cogs: formData.cogs
                    }])
                    .select();

                if (error) {
                    console.error('Supabase Insert Error:', error);
                    throw error;
                }
                console.log('Insert success, data:', data);
            }
            setIsModalOpen(false);
            fetchProducts();
        } catch (error) {
            console.error('Catch Block Error:', error);
            alert('Error saving product: ' + (error.message || JSON.stringify(error)));
        }
    };

    // Grid Definitions
    const columnDefs = useMemo(() => {
        const cols = [
            {
                headerName: '#',
                field: 'serial_number',
                width: 80,
                checkboxSelection: isAdmin,
                headerCheckboxSelection: isAdmin,
                cellStyle: {
                    display: 'flex',
                    alignItems: 'center',
                    color: isAdmin ? '#60a5fa' : 'inherit',
                    fontWeight: '600',
                    cursor: isAdmin ? 'pointer' : 'default'
                },
                onCellClicked: (params) => isAdmin && handleOpenModal(params.data)
            },
            {
                field: 'name',
                headerName: 'Product Name',
                flex: 2,
                filter: true,
                sortable: true,
                cellStyle: { color: theme === 'dark' ? '#e2e8f0' : '#1e293b', fontWeight: '500' }
            },
            {
                field: 'product_family',
                headerName: 'Family',
                flex: 1.5,
                filter: true,
                sortable: true,
                cellStyle: { color: theme === 'dark' ? '#94a3b8' : '#475569' }
            },
            {
                field: 'default_price',
                headerName: 'Default Price',
                flex: 1,
                valueFormatter: p => p.value ? Number(p.value).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) : 'SAR 0.00',
                type: 'numericColumn',
                cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: theme === 'dark' ? '#cbd5e1' : '#334155' }
            }
        ];

        if (isAdmin) {
            cols.push({
                field: 'cogs',
                headerName: 'COGS',
                flex: 1,
                valueFormatter: p => p.value ? Number(p.value).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) : 'SAR 0.00',
                type: 'numericColumn',
                cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: theme === 'dark' ? '#cbd5e1' : '#334155' }
            });
        }

        return cols;
    }, [isAdmin, theme]);

    const themeClass = theme === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz';

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Products Management</h1>
                    <p className="subtitle">Manage product catalog, families, and pricing</p>
                </div>
            </div>
            <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label className="form-label" style={{ color: 'var(--text-muted)' }}>Product Search</label>
                        <input
                            type="text" placeholder="Search products..." className="form-input"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {isAdmin && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-primary" onClick={() => handleOpenModal(null)}>
                            <Plus size={18} /> Add Product
                        </button>

                        {selectedRows.length === 1 && (
                            <button onClick={() => handleOpenModal(selectedRows[0])} className="btn-secondary">
                                Edit Selected
                            </button>
                        )}

                        {selectedRows.length > 0 && (
                            <button onClick={handleDeleteSelected} className="btn-danger">
                                Delete ({selectedRows.length})
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', transition: 'all 0.3s ease' }}>
                <div className={themeClass} style={{
                    flex: isModalOpen && isAdmin ? '0 0 70%' : '1 1 100%',
                    width: isModalOpen && isAdmin ? '70%' : '100%',
                    transition: 'all 0.3s ease'
                }}>
                    <style>
                        {`
                        /* Dark Mode Styles */
                        .ag-theme-quartz-dark {
                            --ag-selected-row-background-color: rgba(16, 185, 129, 0.2) !important;
                            --ag-row-hover-color: rgba(255, 255, 255, 0.05) !important;
                            --ag-checkbox-checked-color: #10b981 !important;
                        }
                        .ag-theme-quartz-dark .ag-row-selected {
                            background-color: rgba(16, 185, 129, 0.2) !important;
                            border-bottom: 1px solid rgba(16, 185, 129, 0.3) !important;
                        }
                        .ag-theme-quartz-dark .ag-cell {
                            display: flex;
                            align-items: center;
                        }

                        /* Light Mode Styles */
                        .ag-theme-quartz {
                            --ag-background-color: transparent !important;
                            --ag-header-background-color: rgba(241, 245, 249, 0.5) !important;
                            --ag-row-hover-color: rgba(16, 185, 129, 0.1) !important;
                            --ag-selected-row-background-color: rgba(16, 185, 129, 0.15) !important;
                            --ag-checkbox-checked-color: #10b981 !important;
                            --ag-header-foreground-color: #475569 !important;
                            --ag-foreground-color: #1e293b !important;
                        }
                        .ag-theme-quartz .ag-header {
                            border-bottom: 1px solid #e2e8f0 !important;
                        }
                        .ag-theme-quartz .ag-row {
                            border-bottom: 1px solid #f1f5f9 !important;
                        }
                        .ag-theme-quartz .ag-cell {
                            display: flex;
                            align-items: center;
                        }
                    `}
                    </style>
                    <AgGridReact
                        rowData={products}
                        columnDefs={columnDefs}
                        animateRows={true}
                        rowHeight={35}
                        domLayout='autoHeight'
                        pagination={true}
                        paginationPageSize={20}
                        rowSelection="multiple"
                        suppressRowClickSelection={true}
                        onSelectionChanged={(event) => setSelectedRows(event.api.getSelectedRows())}
                    />
                </div>

                {/* Side Panel Form (Replaces Modal) */}
                {isModalOpen && isAdmin && (
                    <div style={{
                        flex: '0 0 30%',
                        maxWidth: '30%',
                        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'sticky',
                        top: '20px'
                    }}>
                        <div className="card" style={{ overflowY: 'auto' }}>
                            <div className="modal-header">
                                <h2>{currentProduct ? 'Edit Product' : 'Add New Product'}</h2>
                                <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label className="form-label">Product Name</label>
                                    <input
                                        className="form-input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Product Family</label>
                                    <select
                                        className="form-input"
                                        value={formData.product_family}
                                        onChange={e => setFormData({ ...formData, product_family: e.target.value })}
                                    >
                                        {productFamilies.map(fam => (
                                            <option key={fam} value={fam}>{fam}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label className="form-label">Default Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={formData.default_price}
                                            onChange={e => setFormData({ ...formData, default_price: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">COGS</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={formData.cogs}
                                            onChange={e => setFormData({ ...formData, cogs: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="modal-actions" style={{ marginTop: '20px' }}>
                                    <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary">
                                        <Save size={18} /> Save Product
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
