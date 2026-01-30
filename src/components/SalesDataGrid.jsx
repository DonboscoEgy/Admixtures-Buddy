import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register all community features
ModuleRegistry.registerModules([AllCommunityModule]);

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { useTheme } from '../context/ThemeContext'; // Import Added

const SalesDataGrid = ({ rowData, onSelectionChanged, onGridReady }) => {
    const { theme } = useTheme(); // Hook
    const themeClass = theme === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz';

    const columnDefs = useMemo(() => [
        {
            headerName: '#',
            field: 'serial_number',
            width: 80,
            checkboxSelection: true,
            headerCheckboxSelection: true,
            cellStyle: { display: 'flex', alignItems: 'center', color: '#60a5fa', fontWeight: '600', cursor: 'pointer' },
        },
        {
            field: 'transaction_date',
            headerName: 'Order Date',
            filter: 'agDateColumnFilter',
            width: 130,
            sortable: true,
            cellStyle: { display: 'flex', alignItems: 'center', color: theme === 'dark' ? '#e2e8f0' : '#334155' }, // Dynamic Color
            valueFormatter: (params) => {
                if (!params.value) return '';
                return new Date(params.value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            }
        },
        {
            field: 'account_name',
            headerName: 'Customer',
            filter: true,
            sortable: true,
            flex: 1.5,
            cellStyle: { display: 'flex', alignItems: 'center', fontWeight: '500', color: theme === 'dark' ? '#f8fafc' : '#1e293b' }
        },
        {
            field: 'sales_rep',
            headerName: 'Salesman',
            width: 100,
            cellStyle: { display: 'flex', alignItems: 'center', color: '#94a3b8' }
        },
        {
            field: 'product_name',
            headerName: 'Product',
            filter: true,
            sortable: true,
            flex: 1.5,
            cellStyle: { display: 'flex', alignItems: 'center', color: theme === 'dark' ? '#fff' : '#1e293b' }
        },
        {
            field: 'quantity',
            headerName: 'Qty',
            type: 'numericColumn',
            width: 100,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: theme === 'dark' ? '#cbd5e1' : '#475569' },
            valueFormatter: params => params.value ? Number(params.value).toLocaleString() : ''
        },
        {
            field: 'unit_price',
            headerName: 'Price',
            type: 'numericColumn',
            width: 120,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: theme === 'dark' ? '#cbd5e1' : '#475569' },
            valueFormatter: params => params.value ? Number(params.value).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) : ''
        },
        {
            headerName: 'Total',
            valueGetter: params => (Number(params.data.quantity || 0) * Number(params.data.unit_price || 0)),
            type: 'numericColumn',
            width: 130,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: '600', color: '#10b981' },
            valueFormatter: params => params.value ? Number(params.value).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) : ''
        },
        {
            field: 'notes',
            headerName: 'Notes',
            flex: 1
        }
    ], [theme]);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        filter: true,
        resizable: true,
    }), []);

    return (
        <div className={themeClass} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
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
                    .ag-theme-quartz-dark .ag-row-selected .ag-cell {
                        color: #f0fdf4 !important;
                    }
                    
                    /* Light Mode Styles */
                    .ag-theme-quartz {
                        /* Force transparent BG to blend with card */
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
                `}
            </style>
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onGridReady={onGridReady}
                rowSelection="multiple"
                suppressRowClickSelection={true}
                pagination={true}
                paginationPageSize={20}
                domLayout='autoHeight'
                onSelectionChanged={(event) => {
                    const selectedRows = event.api.getSelectedRows();
                    if (onSelectionChanged) onSelectionChanged(selectedRows);
                }}
            />
        </div>
    );
};

export default SalesDataGrid;
