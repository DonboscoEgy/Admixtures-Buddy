
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    ComposedChart, Line, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import {
    Printer, Calendar, TrendingUp, TrendingDown, Users, Package,
    DollarSign, Activity, PieChart as PieIcon, Filter, Layers
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

export default function ReportView() {
    const { user, profile } = useAuth();
    const [salesData, setSalesData] = useState([]);
    const [accountsData, setAccountsData] = useState([]);
    const [paymentsData, setPaymentsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'weekly'

    // Filters
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
    const [salesRepFilter, setSalesRepFilter] = useState('All');
    const [uniqueReps, setUniqueReps] = useState([]);

    useEffect(() => {
        fetchData();
    }, [yearFilter, salesRepFilter, profile]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Sales Data (View already has basic calcs)
            let query = supabase
                .from('view_sales_ledger')
                .select('*')
                .order('transaction_date', { ascending: true });

            // Apply Rep Filter if needed
            if (profile && !profile.is_admin && profile.initials) {
                query = query.eq('sales_rep', profile.initials);
            } else if (profile?.is_admin && salesRepFilter !== 'All') {
                query = query.eq('sales_rep', salesRepFilter);
            }

            const { data: sales, error: salesError } = await query;
            if (salesError) throw salesError;

            // 2. Fetch Accounts Data (for Categories)
            const { data: accounts, error: accError } = await supabase
                .from('accounts_master')
                .select('name, account_family');

            // 3. Fetch Payments Data
            const { data: payments, error: payError } = await supabase
                .from('payments_ledger')
                .select('*')
                .order('payment_date', { ascending: true });

            // 3. Admin Rep List
            if (profile?.is_admin) {
                const { data: repData } = await supabase.from('orders').select('sales_rep');
                if (repData) {
                    const reps = [...new Set(repData.map(r => r.sales_rep).filter(Boolean))].sort();
                    setUniqueReps(reps);
                }
            }

            setSalesData(sales || []);
            setAccountsData(accounts || []);
            setPaymentsData(payments || []);
        } catch (err) {
            console.error('Error fetching reports:', err);
        } finally {
            setLoading(false);
        }
    };

    // --- AGGREGATION LOGIC ---
    const metrics = useMemo(() => {
        if (!salesData.length) return null;

        // Filter Sales by Year
        const filteredSales = salesData.filter(d => {
            const date = new Date(d.transaction_date);
            return date.getFullYear() === Number(yearFilter);
        });

        // Metrics Helpers
        const relevantAccounts = new Set(filteredSales.map(s => s.account_name));

        const filteredPayments = paymentsData.filter(p => {
            const date = new Date(p.payment_date);
            if (date.getFullYear() !== Number(yearFilter)) return false;

            if (salesRepFilter !== 'All' || (!profile?.is_admin)) {
                return relevantAccounts.has(p.account_name);
            }
            return true;
        });


        // Totals
        const totalSalesNet = filteredSales.reduce((sum, r) => sum + (Number(r.total_sales) || 0), 0);
        const totalSalesGross = filteredSales.reduce((sum, r) => sum + (Number(r.total_with_vat) || 0), 0);
        const totalGP = filteredSales.reduce((sum, r) => sum + (Number(r.gross_profit) || 0), 0);
        const totalQty = filteredSales.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
        const totalCollections = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const marginPct = totalSalesNet > 0 ? (totalGP / totalSalesNet) * 100 : 0;

        // --- WEEKLY REPORT LOGIC (Moved before return) ---

        // Match 'New Customers' logic: First order date ever is in the selected year
        const firstDates = {};
        salesData.forEach(r => {
            const name = r.account_name;
            if (!name) return;
            const d = new Date(r.transaction_date).getTime();
            if (!firstDates[name] || d < firstDates[name]) {
                firstDates[name] = d;
            }
        });
        const newCustomerNames = [];
        Object.keys(firstDates).forEach(name => {
            const y = new Date(firstDates[name]).getFullYear();
            if (y === Number(yearFilter)) newCustomerNames.push(name);
        });

        // Monthly Stats & Growth
        const now = new Date();
        let targetMonthIndex = now.getMonth();
        if (Number(yearFilter) !== now.getFullYear()) targetMonthIndex = 11; // Dec if past year

        const currentMonthSales = filteredSales.filter(r => new Date(r.transaction_date).getMonth() === targetMonthIndex);
        const prevMonthSales = filteredSales.filter(r => new Date(r.transaction_date).getMonth() === (targetMonthIndex - 1));

        const calcSet = (dataset) => ({
            vol: dataset.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0),
            sales: dataset.reduce((sum, r) => sum + (Number(r.total_with_vat) || 0), 0),
            netSales: dataset.reduce((sum, r) => sum + (Number(r.total_sales) || 0), 0),
            gp: dataset.reduce((sum, r) => sum + (Number(r.gross_profit) || 0), 0)
        });

        const currM = calcSet(currentMonthSales);
        const prevM = calcSet(prevMonthSales);

        const currentMonthPay = filteredPayments.filter(p => new Date(p.payment_date).getMonth() === targetMonthIndex);
        const prevMonthPay = filteredPayments.filter(p => new Date(p.payment_date).getMonth() === (targetMonthIndex - 1));

        const currCol = currentMonthPay.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const prevCol = prevMonthPay.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const growth = {
            vol: prevM.vol ? ((currM.vol - prevM.vol) / prevM.vol) * 100 : 0,
            sales: prevM.sales ? ((currM.sales - prevM.sales) / prevM.sales) * 100 : 0,
            col: prevCol ? ((currCol - prevCol) / prevCol) * 100 : 0
        };

        const avSellingPrice = currM.vol > 0 ? (currM.netSales / currM.vol) : 0;
        const avGrossMargin = currM.netSales > 0 ? (currM.gp / currM.netSales) * 100 : 0;
        const contributedCustomers = new Set(currentMonthSales.map(r => r.account_name)).size;


        // --- GLOBAL YEARLY STATS (Ignore Filters) ---
        const calcYearStats = (year) => {
            const yearSales = salesData.filter(d => new Date(d.transaction_date).getFullYear() === year);
            const net = yearSales.reduce((sum, r) => sum + (Number(r.total_sales) || 0), 0);
            const gp = yearSales.reduce((sum, r) => sum + (Number(r.gross_profit) || 0), 0);
            return net > 0 ? (gp / net) * 100 : 0;
        };
        const margin2025 = calcYearStats(2025);
        const margin2026 = calcYearStats(2026);





        // 1. Monthly Trend
        const months = {};
        filteredSales.forEach(r => {
            const d = new Date(r.transaction_date);
            const key = d.toLocaleString('default', { month: 'short' });
            const monthIdx = d.getMonth();

            if (!months[key]) months[key] = { name: key, idx: monthIdx, Sales: 0, GP: 0, Volume: 0 };
            months[key].Sales += (Number(r.total_with_vat) || 0);
            months[key].GP += (Number(r.gross_profit) || 0);
            months[key].Volume += (Number(r.quantity) || 0);
        });
        const monthlyData = Object.values(months).sort((a, b) => a.idx - b.idx);

        // 2. Category Share (Pie)
        const accountMap = {};
        (accountsData || []).forEach(a => accountMap[a.name] = a.account_family || 'Uncategorized');

        const catStats = {};
        filteredSales.forEach(r => {
            const cat = accountMap[r.account_name] || 'Uncategorized';
            if (!catStats[cat]) catStats[cat] = 0;
            catStats[cat] += (Number(r.total_with_vat) || 0);
        });
        const categoryData = Object.keys(catStats).map(k => ({ name: k, value: catStats[k] }));

        // 3. Top Customers
        const custStats = {};
        filteredSales.forEach(r => {
            const name = r.account_name || 'Unknown';
            if (!custStats[name]) custStats[name] = 0;
            custStats[name] += (Number(r.total_with_vat) || 0);
        });
        const topCustomers = Object.keys(custStats)
            .map(k => ({ name: k, value: custStats[k] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // 4. Top Products
        const prodStats = {};
        filteredSales.forEach(r => {
            const name = r.product_name || 'Unknown';
            if (!prodStats[name]) prodStats[name] = 0;
            prodStats[name] += (Number(r.quantity) || 0);
        });
        const topProducts = Object.keys(prodStats)
            .map(k => ({ name: k, value: prodStats[k] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);


        return {
            totalSalesGross,
            totalGP,
            totalQty,
            totalCollections,
            marginPct,
            monthlyData,
            categoryData,
            topCustomers,
            topProducts,
            weekly: {
                currentMonthName: new Date(Number(yearFilter), targetMonthIndex).toLocaleString('default', { month: 'long', year: 'numeric' }),
                currM,
                currCol,
                growth,
                avSellingPrice,
                avGrossMargin,
                margin2025,
                margin2026,
                contributedCustomers,
                newCustomerNames: newCustomerNames.slice(0, 5)
            }
        };

    }, [salesData, accountsData, paymentsData, yearFilter, profile, salesRepFilter]);

    if (loading) return <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Report Data...</div>;
    if (!metrics) return null;

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '20px', paddingBottom: '100px', background: 'var(--bg-main)', color: 'white' }}>


            {/* Header */}
            <div className="flex-responsive-header" style={{ marginBottom: '30px' }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity color="var(--primary)" size={28} /> Performance Overview
                    </h1>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Comprehensive sales and profitability analysis</div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {/* Year Filter */}
                    <div style={{ position: 'relative' }}>
                        <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <select
                            className="form-input"
                            style={{ paddingLeft: '35px', width: '100px' }}
                            value={yearFilter}
                            onChange={e => setYearFilter(e.target.value)}
                        >
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    {/* Admin Rep Filter */}
                    {profile?.is_admin && (
                        <div style={{ position: 'relative' }}>
                            <Users size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <select
                                className="form-input"
                                style={{ paddingLeft: '35px', width: '150px' }}
                                value={salesRepFilter}
                                onChange={e => setSalesRepFilter(e.target.value)}
                            >
                                <option value="All">All Reps</option>
                                {uniqueReps.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    )}

                    {/* View Toggle */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', marginLeft: '10px' }}>
                        <button
                            onClick={() => setViewMode('dashboard')}
                            style={{
                                padding: '6px 12px', border: 'none', borderRadius: '6px',
                                background: viewMode === 'dashboard' ? 'var(--primary)' : 'transparent',
                                color: viewMode === 'dashboard' ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer', fontSize: '0.85rem'
                            }}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setViewMode('weekly')}
                            style={{
                                padding: '6px 12px', border: 'none', borderRadius: '6px',
                                background: viewMode === 'weekly' ? 'white' : 'transparent',
                                color: viewMode === 'weekly' ? '#1e293b' : 'var(--text-muted)',
                                cursor: 'pointer', fontSize: '0.85rem'
                            }}
                        >
                            Weekly Report
                        </button>
                    </div>

                    <button className="btn-secondary" onClick={() => window.print()}>
                        <Printer size={18} />
                    </button>
                </div>
            </div>

            {viewMode === 'weekly' ? (
                <WeeklyReport metrics={metrics} year={yearFilter} />
            ) : (
                <>

                    {/* KPI GRID */}
                    <div className="grid-responsive-4" style={{ marginBottom: '30px' }}>

                        <KpiCard
                            title="TOTAL SALES (Inc. VAT)"
                            value={metrics.totalSalesGross}
                            icon={<DollarSign size={24} color="#3b82f6" />}
                            color="#3b82f6"
                            subValue={`${metrics.totalQty.toLocaleString()} Units`}
                        />

                        <KpiCard
                            title="GROSS PROFIT"
                            value={metrics.totalGP}
                            icon={<TrendingUp size={24} color="#ec4899" />}
                            color="#ec4899"
                            subValue="Profit before expenses"
                        />

                        <KpiCard
                            title="NET MARGIN"
                            value={`${metrics.marginPct.toFixed(1)}%`}
                            isCurrency={false}
                            icon={<PieIcon size={24} color={metrics.marginPct > 15 ? "#10b981" : "#f59e0b"} />}
                            color={metrics.marginPct > 15 ? "#10b981" : "#f59e0b"}
                            subValue="Average Performance"
                        />

                        <KpiCard
                            title="TOTAL COLLECTIONS"
                            value={metrics.totalCollections}
                            icon={<Layers size={24} color="#10b981" />}
                            color="#10b981"
                            subValue="Payments Received"
                        />
                    </div>


                    {/* CHARTS ROW 1 */}
                    <div className="grid-responsive-2-1" style={{ marginBottom: '30px' }}>

                        {/* Monthly Trend */}
                        <div className="glass-card" style={{ padding: '20px', height: '400px' }}>
                            <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '20px' }}>Monthly Sales & Profit Trend</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <ComposedChart data={metrics.monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={val => `${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                        itemStyle={{ color: 'white' }}
                                        formatter={(val) => val.toLocaleString()}
                                    />
                                    <Legend />
                                    <Bar dataKey="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                    <Line type="monotone" dataKey="GP" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Category Pie */}
                        <div className="glass-card" style={{ padding: '20px', height: '400px' }}>
                            <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '20px' }}>Sales by Category</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <PieChart>
                                    <Pie
                                        data={metrics.categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {metrics.categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                        formatter={(val) => val.toLocaleString()}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>


                    {/* CHARTS ROW 2: TOPS */}
                    <div className="grid-responsive-2">

                        {/* Top Customers */}
                        <div className="glass-card" style={{ padding: '20px', height: '350px' }}>
                            <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '20px' }}>Top 5 Customers</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={metrics.topCustomers} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} stroke="var(--text-muted)" fontSize={11} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                        formatter={(val) => val.toLocaleString()}
                                    />
                                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top Products */}
                        <div className="glass-card" style={{ padding: '20px', height: '350px' }}>
                            <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '20px' }}>Top 5 Products (Volume)</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={metrics.topProducts} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} stroke="var(--text-muted)" fontSize={11} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                        formatter={(val) => val.toLocaleString()}
                                    />
                                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}

function KpiCard({ title, value, icon, color, subValue, isCurrency = true }) {
    return (
        <div className="glass-card" style={{ padding: '20px', borderLeft: `4px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '10px', top: '10px', opacity: 0.1 }}>
                {icon}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>{title}</div>
            </div>

            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', marginBottom: '5px' }}>
                {isCurrency && typeof value === 'number'
                    ? value.toLocaleString('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })
                    : value
                }
            </div>

            <div style={{ fontSize: '0.85rem', color: color, opacity: 0.9 }}>
                {subValue}
            </div>
        </div>
    );
}

function WeeklyReport({ metrics, year }) {
    const { totalQty, totalSalesGross, totalCollections, weekly } = metrics;
    const { currM, currCol, growth, avSellingPrice, avGrossMargin, contributedCustomers, newCustomerNames, currentMonthName } = weekly;

    // Helper formatting
    const num = (v) => v.toLocaleString();
    const curr = (v) => (v || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 });
    const currDecimal = (v) => (v || 0).toLocaleString('en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const growthColor = (v) => v > 0 ? '#10b981' : (v < 0 ? '#ef4444' : '#64748b');

    return (
        <div style={{ paddingBottom: '50px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Weekly Progress Report
                </h2>
                <span style={{
                    display: 'inline-block', padding: '6px 16px', borderRadius: '20px',
                    background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa',
                    fontWeight: 'bold', marginTop: '10px', border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                    {currentMonthName} {year}
                </span>
            </div>

            {/* ROW 1: YTD Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px', textTransform: 'uppercase' }}>YTD VOLUME</div>
                    <div style={{ color: 'white', fontSize: '2rem', fontWeight: 800 }}>{num(totalQty)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Ltr</span></div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px', textTransform: 'uppercase' }}>YTD SALES</div>
                    <div style={{ color: 'white', fontSize: '2rem', fontWeight: 800 }}>{curr(totalSalesGross)}</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px', textTransform: 'uppercase' }}>YTD COLLECTION</div>
                    <div style={{ color: 'white', fontSize: '2rem', fontWeight: 800 }}>{curr(totalCollections)}</div>
                </div>
            </div>

            {/* ROW 2: Monthly Breakdown */}
            <div className="glass-card" style={{
                display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0',
                padding: '20px 0', marginBottom: '30px'
            }}>
                <MetricBox title="Monthly Volume" value={`${num(currM.vol)} L`} growth={growth.vol} />
                <MetricBox title="Monthly Sales" value={curr(currM.sales)} growth={growth.sales} />
                <MetricBox title="Monthly Collection" value={curr(currCol)} growth={growth.col} />
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Av. Selling Price</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginTop: '5px' }}>{currDecimal(avSellingPrice)}</div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Av. Selling Price</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginTop: '5px' }}>{currDecimal(avSellingPrice)}</div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Margin 2025</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#94a3b8', marginTop: '5px' }}>{weekly.margin2025.toFixed(1)}%</div>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>Margin 2026</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '5px' }}>{weekly.margin2026.toFixed(1)}%</div>
                </div>
            </div>

            {/* ROW 3: Charts & Customers */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>YTD Volume vs Sales Trend</h3>
                    <ResponsiveContainer width="100%" height={150}>
                        <ComposedChart data={metrics.monthlyData}>
                            <XAxis dataKey="name" fontSize={10} stroke="rgba(255,255,255,0.3)" />
                            <YAxis yAxisId="left" fontSize={10} hide />
                            <YAxis yAxisId="right" orientation="right" fontSize={10} hide />
                            <Line yAxisId="left" type="monotone" dataKey="Sales" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                            <Line yAxisId="right" type="monotone" dataKey="Volume" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                itemStyle={{ fontSize: '12px' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card" style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}># Contributed Customers</div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'white' }}>{contributedCustomers}</div>
                </div>

                <div className="glass-card" style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>New Customers</div>
                    {newCustomerNames.length > 0 ? (
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981', marginTop: '10px', textShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}>
                            {newCustomerNames.map(n => <div key={n}>{n}</div>)}
                        </div>
                    ) : (
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-muted)' }}>-</div>
                    )}
                </div>
            </div>

            {/* ROW 4: All Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '20px', height: '350px' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>Current Month Sales by Customer</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.topCustomers} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.1)" />
                            <XAxis type="number" fontSize={10} stroke="rgba(255,255,255,0.3)" />
                            <YAxis dataKey="name" type="category" width={80} fontSize={10} stroke="rgba(255,255,255,0.3)" />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card" style={{ padding: '20px', height: '350px' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>Lifetime Sales by Customer</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.topCustomers} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.1)" />
                            <XAxis type="number" fontSize={10} stroke="rgba(255,255,255,0.3)" />
                            <YAxis dataKey="name" type="category" width={80} fontSize={10} stroke="rgba(255,255,255,0.3)" />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
                            />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function MetricBox({ title, value, growth }) {
    const isPos = growth >= 0;
    return (
        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', marginTop: '5px' }}>{value}</div>
            {growth !== undefined && (
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isPos ? '#4ade80' : '#f87171', marginTop: '2px' }}>
                    {isPos ? '+' : ''}{growth.toFixed(0)}% vs prev
                </div>
            )}
        </div>
    );
}
