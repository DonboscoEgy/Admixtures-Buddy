import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register all community features
ModuleRegistry.registerModules([AllCommunityModule]);

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const SalesDataGrid = ({ rowData, onSelectionChanged, onGridReady }) => {

    const columnDefs = useMemo(() => [
        {
            headerName: '#',
            field: 'serial_number',
            width: 80,
            checkboxSelection: true,
            headerCheckboxSelection: true,
            cellStyle: { display: 'flex', alignItems: 'center', color: '#60a5fa', fontWeight: '600', cursor: 'pointer' }, // Blue Link style
            onCellClicked: (params) => {
                // Allow clicking the ID to edit
                if (params.data.id) window.location.href = `/sales-ledger/edit/${params.data.id}`;
            }
        },
        {
            field: 'transaction_date',
            headerName: 'Order Date',
            filter: 'agDateColumnFilter',
            width: 130,
            sortable: true,
            cellStyle: { display: 'flex', alignItems: 'center', color: '#e2e8f0' },
            valueFormatter: (params) => {
                if (!params.value) return '';
                return new Date(params.value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            }
        },
        {
            field: 'account_name',
            headerName: 'Customer', // Renamed from Account
            filter: true,
            sortable: true,
            flex: 1.5,
            cellStyle: { display: 'flex', alignItems: 'center', fontWeight: '500', color: '#f8fafc' }
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
            cellStyle: { display: 'flex', alignItems: 'center' }
        },
        {
            field: 'quantity',
            headerName: 'Qty',
            type: 'numericColumn',
            width: 100,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#cbd5e1' },
            valueFormatter: params => params.value ? Number(params.value).toLocaleString() : ''
        },
        {
            field: 'unit_price',
            headerName: 'Price',
            type: 'numericColumn',
            width: 120,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#cbd5e1' },
            valueFormatter: params => params.value ? Number(params.value).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) : ''
        },
        {
            headerName: 'Total',
            valueGetter: params => (Number(params.data.quantity || 0) * Number(params.data.unit_price || 0)),
            type: 'numericColumn',
            width: 130,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: '600', color: '#10b981' }, // Green for money
            valueFormatter: params => params.value ? Number(params.value).toLocaleString('en-US', { style: 'currency', currency: 'SAR' }) : ''
        },

        {
            field: 'notes',
            headerName: 'Notes',
            flex: 1
        }
    ], []);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        filter: true,
        resizable: true,
    }), []);

    return (
        <div style={{ width: '100%', height: '100%' }} className="ag-theme-quartz-dark">
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onGridReady={onGridReady}
                rowSelection="multiple"
                suppressRowClickSelection={true}
                pagination={true}
                paginationPageSize={20}
                onSelectionChanged={(event) => {
                    const selectedRows = event.api.getSelectedRows();
                    if (onSelectionChanged) onSelectionChanged(selectedRows);
                }}
            />
        </div>
    );
};

export default SalesDataGrid;
