import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import SalesDataGrid from '../components/SalesDataGrid';

const SalesLedger = () => {
    const { isAdmin, user, profile } = useAuth();
    const [rowData, setRowData] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Filters - Default to 2025 where data exists
    const [filters, setFilters] = useState({
        customer: '',
        product: '',
        salesman: '',
        dateFrom: '',
        dateTo: ''
    });
    // Mobile Filter Toggle State
    const [filtersVisible, setFiltersVisible] = useState(window.innerWidth > 768);

    const [masterData, setMasterData] = useState({ accounts: [], products: [], salesReps: [] });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Parallel Fetch
            const [ledgerRes, accountsRes, productsRes, profilesRes, legacyRepsRes] = await Promise.all([
                (async () => {
                    let query = supabase.from('view_sales_ledger').select('*').order('transaction_date', { ascending: false });
                    if (filters.customer) query = query.ilike('account_name', `%${filters.customer}%`);
                    if (filters.product) query = query.ilike('product_name', `%${filters.product}%`);
                    if (filters.salesman) query = query.ilike('sales_rep', `%${filters.salesman}%`);
                    if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
                    if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);
                    return query;
                })(),
                supabase.from('accounts_master').select('name, id'),
                supabase.from('products_master').select('name, id'),
                supabase.from('profiles').select('id, full_name, email, initials'),
                supabase.from('orders').select('sales_rep') // Legacy Data
            ]);

            if (ledgerRes.error) throw ledgerRes.error;

            // Compute Serial Numbers: 1 is the Oldest.
            // 1. Sort by Date Ascending (Oldest First)
            let rawData = ledgerRes.data || [];

            // FRONTEND SECURITY FALLBACK:
            // Ensure only relevant orders are shown if RLS fails or View permissions are loose
            if (profile && !profile.is_admin && profile.initials) {
                console.log(`Enforcing Frontend Filter for ${profile.initials}`);
                rawData = rawData.filter(row => row.sales_rep === profile.initials);
            }

            const sortedByDateAsc = [...rawData].sort((a, b) =>
                new Date(a.transaction_date) - new Date(b.transaction_date)
            );

            // 2. Assign Serial Number
            const dataWithSerials = sortedByDateAsc.map((row, index) => ({
                ...row,
                serial_number: index + 1 // 1-based index
            }));

            // 3. Sort back to Descending (Newest First) for display
            dataWithSerials.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

            // -- Prepare Salesman Dropdown --
            // 1. Get standardized names from Profiles (System Users)
            let fetchedProfiles = profilesRes.data || [];
            // Fallback: If no profiles found (RLS or empty), use current user context if available
            if (fetchedProfiles.length === 0 && user && profile) {
                fetchedProfiles = [profile];
            }

            const profileOptions = fetchedProfiles.map(p => ({
                id: p.id,
                name: p.full_name || p.email,
                isProfile: true
            }));

            // 2. Get unique raw strings from ALL orders (Legacy Data) from the separate legacyRepsRes query
            const allLegacyReps = (legacyRepsRes.data || [])
                .map(r => r.sales_rep)
                .filter(Boolean);

            const uniqueLegacyReps = [...new Set(allLegacyReps)];

            // 3. Merge: Only add legacy rep if it DOESN'T fuzzy match a Profile Name
            const profileNames = new Set(profileOptions.map(p => p.name));

            const legacyOptions = uniqueLegacyReps
                .filter(name => !profileNames.has(name))
                .map(name => ({ id: name, name: name, isProfile: false }));

            // 4. Combine and Sort
            const finalSalesReps = [...profileOptions, ...legacyOptions].sort((a, b) => a.name.localeCompare(b.name));

            setRowData(dataWithSerials);
            setMasterData({
                accounts: accountsRes.data || [],
                products: productsRes.data || [],
                salesReps: finalSalesReps
            });

        } catch (error) {
            console.error('Error fetching data:', error);
            // Non-blocking alert or toast could go here
        } finally {
            setLoading(false);
        }
    }, [filters, user, profile]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handlers
    const handleEditSelected = () => {
        if (selectedRows.length !== 1) return;
        const id = selectedRows[0].id; // Ensure view_sales_ledger has 'id'
        navigate(`/sales-ledger/edit/${id}`);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedRows.length} orders?`)) return;

        try {
            const ids = selectedRows.map(r => r.id);
            const { error } = await supabase.from('orders').delete().in('id', ids);
            if (error) throw error;

            fetchData(); // Refresh
            setSelectedRows([]);
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const handleClearData = async () => {
        if (!confirm('EXTREME WARNING: This will delete ALL orders. Are you sure?')) return;
        const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (!error) fetchData();
    };

    // Calculate Totals - Dynamic
    const activeTotals = rowData.reduce((acc, row) => ({
        qty: acc.qty + (Number(row.quantity) || 0),
        amount: acc.amount + ((Number(row.quantity) || 0) * (Number(row.unit_price) || 0))
    }), { qty: 0, amount: 0 });


    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header */}
            <div>
                <div className="breadcrumb">Home / Sales / Sales Ledger</div>
                <h1 className="page-title">Sales Ledger</h1>
            </div>

            {/* Controls */}
            <div className="card">

                {/* Mobile Filter Toggle */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }} className="mobile-only-filter-btn">
                    <button
                        className="btn-secondary"
                        onClick={() => setFiltersVisible(!filtersVisible)}
                        style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                    >
                        {filtersVisible ? 'Hide Filters' : 'Show Filters'}
                    </button>
                </div>

                {filtersVisible && (
                    <div className="filter-grid" style={{ marginBottom: '1rem' }}>

                        {/* Customer Search */}
                        <div>
                            <label className="form-label" style={{ color: 'var(--text-muted)' }}>Account</label>
                            <input
                                type="text" placeholder="Search account..." className="form-input"
                                value={filters.customer} onChange={e => setFilters({ ...filters, customer: e.target.value })}
                            />
                        </div>

                        {/* Product Search */}
                        <div>
                            <label className="form-label" style={{ color: 'var(--text-muted)' }}>Product</label>
                            <input
                                type="text" placeholder="Search product..." className="form-input"
                                value={filters.product} onChange={e => setFilters({ ...filters, product: e.target.value })}
                            />
                        </div>

                        {/* Salesman Search - Admin Only */}
                        {isAdmin && (
                            <div>
                                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Salesman</label>
                                <select
                                    className="form-input"
                                    value={filters.salesman}
                                    onChange={e => setFilters({ ...filters, salesman: e.target.value })}
                                >
                                    <option value="">All Salesmen</option>
                                    {masterData.salesReps.map(rep => (
                                        <option key={rep.id} value={rep.name}>
                                            {rep.initials ? `${rep.initials} - ${rep.name}` : rep.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date From */}
                        <div>
                            <label className="form-label" style={{ color: 'var(--text-muted)' }}>From Date</label>
                            <input
                                type="date" className="form-input"
                                value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="form-label" style={{ color: 'var(--text-muted)' }}>To Date</label>
                            <input
                                type="date" className="form-input"
                                value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                            />
                        </div>

                        {/* Action */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                            <button className="btn-primary" onClick={fetchData} style={{ flex: 1 }}>
                                Apply Filters
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => setFilters({ customer: '', product: '', salesman: '', dateFrom: '', dateTo: '' })}
                                style={{ width: 'auto' }}
                                title="Reset all filters"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/quick-order')} className="btn-primary" style={{ backgroundColor: '#10B981', color: 'black' }}>
                        + New Order
                    </button>

                    {selectedRows.length === 1 && (
                        <button onClick={handleEditSelected} className="btn-secondary">
                            Edit Selected
                        </button>
                    )}

                    {selectedRows.length > 0 && (
                        <button onClick={handleBulkDelete} className="btn-danger">
                            Delete ({selectedRows.length})
                        </button>
                    )}

                    <button onClick={handleClearData} className="btn-danger" style={{ marginLeft: 'auto' }}>
                        Clear All Data
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="card" style={{ flex: 1, minHeight: 0, padding: 0 }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
                ) : (
                    <SalesDataGrid
                        rowData={rowData}
                        masterData={masterData}
                        onSelectionChanged={setSelectedRows}
                    />
                )}
            </div>

            {/* Footer Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', paddingBottom: '10px' }}>
                <div className="glass-card" style={{ padding: '15px 25px', minWidth: '150px', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Total Quantity</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>
                        {activeTotals.qty.toLocaleString()}
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '15px 25px', minWidth: '200px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Total Sales</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10B981' }}>
                        {activeTotals.amount.toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesLedger;
