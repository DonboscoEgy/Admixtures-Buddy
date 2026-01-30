import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Added
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MapPin, Calendar, Package, Droplet, User, X, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { NumericFormat } from 'react-number-format';

// --- CONSTANTS ---
const STAGES = [
    { id: 'Prospect', label: 'Prospect', color: '#64748b' },
    { id: 'In-House Trial', label: 'In-House Trial', color: '#3b82f6' },
    { id: 'Lab Trial', label: 'Lab Trial', color: '#8b5cf6' },
    { id: 'Batch Trial', label: 'Batch Trial', color: '#ec4899' },
    { id: 'Quotation', label: 'Quotation', color: '#f59e0b' },
    { id: 'Won', label: 'Won', color: '#10b981' },
    { id: 'Lost', label: 'Lost', color: '#ef4444' }
];

const CATEGORIES = [
    'Readymix',
    'Precast',
    'Contractor',
    'Applicator',
    'Block',
    'Tile',
    'Other'
];

export default function Pipeline() {
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate(); // Hook
    const [opportunities, setOpportunities] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOp, setEditingOp] = useState(null);
    const [ownerFilter, setOwnerFilter] = useState('All');

    const uniqueOwners = useMemo(() => {
        const owners = opportunities.map(op => op.sales_rep).filter(Boolean);
        return [...new Set(owners)].sort();
    }, [opportunities]);

    const filteredOpportunities = useMemo(() => {
        // 1. Strict User Filter
        if (profile && !profile.is_admin) {
            return opportunities.filter(op => op.sales_rep === profile.initials || op.sales_rep === profile.email);
        }
        // 2. Admin Filter
        if (ownerFilter === 'All') return opportunities;
        return opportunities.filter(op => op.sales_rep === ownerFilter);
    }, [opportunities, ownerFilter, profile]);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const fetchOpportunities = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('opportunities')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOpportunities(data || []);
        } catch (error) {
            console.error('Error fetching pipeline:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS ---
    const handleEdit = (op) => {
        setEditingOp(op);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingOp(null);
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;
        const activeItem = opportunities.find(Op => Op.id === activeId);
        if (!activeItem) return;

        let newStage = null;
        if (STAGES.some(s => s.id === overId)) {
            newStage = overId;
        } else {
            const overItem = opportunities.find(Op => Op.id === overId);
            if (overItem) newStage = overItem.stage;
        }

        if (newStage && newStage !== activeItem.stage) {
            setOpportunities(prev => prev.map(op =>
                op.id === activeId ? { ...op, stage: newStage } : op
            ));
            try {
                const { error } = await supabase.from('opportunities').update({ stage: newStage }).eq('id', activeId);
                if (error) throw error;
            } catch (err) {
                console.error("Move failed", err);
                showToast('Failed to update stage', 'error');
                fetchOpportunities();
            }
        }
    };

    return (
        <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <div className="breadcrumb">Home / Sales / Pipeline</div>
                    <h1 className="page-title">Opportunities Pipeline</h1>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {profile?.is_admin && (
                        <select
                            value={ownerFilter}
                            onChange={(e) => setOwnerFilter(e.target.value)}
                            className="form-input"
                            style={{ width: '200px' }}
                        >
                            <option value="All">All Sales Reps</option>
                            {uniqueOwners.map(owner => (
                                <option key={owner} value={owner}>{owner}</option>
                            ))}
                        </select>
                    )}
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                        <Plus size={20} /> Add Opportunity
                    </button>
                </div>
            </div>

            {/* Kanban Board - Compact */}
            <div style={{
                flex: 1,
                overflowX: 'auto',
                overflowY: 'hidden',
                display: 'flex',
                gap: '10px',
                paddingBottom: '10px'
            }}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {STAGES.map(stage => (
                        <PipelineColumn
                            key={stage.id}
                            stage={stage}
                            items={filteredOpportunities.filter(op => op.stage === stage.id)}
                            onItemClick={handleEdit}
                        />
                    ))}

                    <DragOverlay>
                        {activeId ? (
                            <OpportunityCard
                                op={opportunities.find(op => op.id === activeId)}
                                isOverlay
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <OpportunityModal
                    onClose={handleModalClose}
                    onSuccess={() => {
                        fetchOpportunities();
                        handleModalClose();
                    }}
                    profile={profile}
                    initialData={editingOp}
                />
            )}
        </div>
    );
}

// --- SUB-COMPONENTS ---

function PipelineColumn({ stage, items, onItemClick }) {
    const { theme } = useTheme();
    const { setNodeRef } = useSortable({
        id: stage.id,
        data: { type: 'Column', stageId: stage.id }
    });

    const totalVolume = items.reduce((sum, item) => sum + (Number(item.expected_volume_liters) || 0), 0);

    return (
        <div ref={setNodeRef} style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: theme === 'dark' ? 'rgba(0,0,0,0.3)' : '#e2e8f0',
            borderRadius: '12px',
            border: `1px solid ${stage.color}40`
        }}>
            <div style={{
                padding: '12px 12px 4px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color }}></div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{stage.label}</span>
                </div>
                <span style={{ background: 'var(--card-bg)', padding: '2px 6px', borderRadius: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {items.length}
                </span>
            </div>

            <div style={{
                padding: '0 12px 12px 12px',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', gap: '4px'
            }}>
                <Droplet size={10} />
                {totalVolume.toLocaleString()} L
            </div>

            <div style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
                <SortableContext items={items.map(op => op.id)} strategy={verticalListSortingStrategy}>
                    {items.map(op => (
                        <SortableCard key={op.id} op={op} onClick={() => onItemClick(op)} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

function SortableCard({ op, onClick }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: op.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} onDoubleClick={onClick}>
            <OpportunityCard op={op} />
        </div>
    );
}

if (!op) return null;
return (
    <div
        className="glass-card opp-card-hover"
        style={{
            padding: '12px',
            marginBottom: '8px',
            cursor: 'grab',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg)',
            boxShadow: isOverlay ? '0 10px 20px rgba(0,0,0,0.5)' : 'none',
            transition: 'all 0.2s ease',
        }}
    >
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>{op.account_name}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <MapPin size={12} color="#60a5fa" />
                {op.location || '-'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Droplet size={12} color="#f59e0b" />
                {op.expected_volume_liters ? `${Number(op.expected_volume_liters).toLocaleString()} L` : '-'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Calendar size={12} color="#10b981" />
                {op.closing_date || '-'}
            </div>
        </div>

        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {op.category && (
                <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    {op.category}
                </span>
            )}
            {op.sales_rep && (
                <div style={{
                    width: '24px', height: '24px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    title: `Created by ${op.sales_rep}`
                }}>
                    {op.sales_rep.substring(0, 2).toUpperCase()}
                </div>
            )}
        </div>
    </div>
);
}

function OpportunityModal({ onClose, onSuccess, profile, initialData }) {
    const { showToast } = useToast();
    const navigate = useNavigate(); // Added hook here
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);

    // Default State
    const [formData, setFormData] = useState({
        account_name: '',
        location: '',
        category: 'Readymix',
        monthly_production_m3: '',
        monthly_consumption_liters: '',
        expected_volume_liters: '',
        closing_date: '',
        stage: 'Prospect'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                account_name: initialData.account_name || '',
                location: initialData.location || '',
                category: initialData.category || 'Readymix',
                monthly_production_m3: initialData.monthly_production_m3 || '',
                monthly_consumption_liters: initialData.monthly_consumption_liters || '',
                expected_volume_liters: initialData.expected_volume_liters || '',
                closing_date: initialData.closing_date || '',
                stage: initialData.stage || 'Prospect'
            });
        }

        // Fetch accounts
        const fetchAcc = async () => {
            const { data } = await supabase.from('accounts_master').select('name');
            setAccounts(data || []);
        }
        fetchAcc();
    }, [initialData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNumberChange = (fieldName, floatValue) => {
        setFormData({ ...formData, [fieldName]: floatValue });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            sales_rep: profile?.initials || profile?.email || 'Unknown'
        };

        try {
            if (initialData) {
                // UPDATE
                const { error } = await supabase
                    .from('opportunities')
                    .update(payload)
                    .eq('id', initialData.id);
                if (error) throw error;
                showToast('Opportunity Updated', 'success');
            } else {
                // INSERT
                const { error } = await supabase
                    .from('opportunities')
                    .insert([payload]);
                if (error) throw error;
                showToast('Opportunity Created', 'success');
            }
            onSuccess();
        } catch (err) {
            console.error('Save Op Error:', err);
            showToast('Failed to save: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleConvertToAccount = async () => {
        if (!formData.account_name) return;
        setLoading(true);
        try {
            // 1. Check if exists
            const { data: existing } = await supabase
                .from('accounts_master')
                .select('id')
                .eq('name', formData.account_name)
                .single();

            if (existing) {
                showToast('Account already exists!', 'error');
                setLoading(false);
                return;
            }

            // 2. Create Account
            const { error: accError } = await supabase.from('accounts_master').insert([{
                name: formData.account_name,
                account_family: formData.category,
                created_by_initials: profile?.initials || 'SYS'
            }]);

            if (accError) throw accError;

            // 3. Delete Opportunity (Move to Account)
            if (initialData) {
                const { data: deleted, error: delError } = await supabase
                    .from('opportunities')
                    .delete()
                    .eq('id', initialData.id)
                    .select();

                if (delError) throw delError;
                if (!deleted || deleted.length === 0) {
                    throw new Error('Permission denied: Could not delete opportunity. Please run the SQL script.');
                }
            }

            showToast('Account Created & Opportunity Moved! 🎉', 'success');
            onSuccess();
            // Auto-navigate
            navigate('/accounts', { state: { openAccountName: formData.account_name, openSetup: true } });
        } catch (err) {
            console.error('Conversion Failed:', err);
            showToast('Failed to convert: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this opportunity?')) return;
        setLoading(true);
        try {
            const { data: deleted, error } = await supabase
                .from('opportunities')
                .delete()
                .eq('id', initialData.id)
                .select();

            if (error) throw error;
            if (!deleted || deleted.length === 0) {
                throw new Error('Permission denied: Could not delete opportunity. Please run the SQL script.');
            }

            // Optimistic Update
            setOpportunities(prev => prev.filter(p => p.id !== initialData.id));

            showToast('Opportunity Deleted', 'success');
            onSuccess();
        } catch (err) {
            console.error('Delete Error:', err);
            showToast('Failed to delete: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ overflowY: 'auto', maxHeight: '90vh' }}>
                <div className="modal-header">
                    <h2>{initialData ? 'Edit Opportunity' : 'New Opportunity'}</h2>
                    <button onClick={onClose} className="close-btn"><X /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-responsive" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {/* Account & Location */}
                    <div className="grid-responsive-2">
                        <div>
                            <label className="form-label">Account Name</label>
                            <input
                                list="accounts-list"
                                name="account_name"
                                className="form-input"
                                placeholder="Search or type..."
                                value={formData.account_name}
                                onChange={handleChange}
                                required
                            />
                            <datalist id="accounts-list">
                                {accounts.map(a => <option key={a.name} value={a.name} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="form-label">Location</label>
                            <input
                                name="location"
                                className="form-input"
                                placeholder="City / Site"
                                value={formData.location}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Category & Stage */}
                    <div className="grid-responsive-2">
                        <div>
                            <label className="form-label">Category</label>
                            <select name="category" className="form-input" value={formData.category} onChange={handleChange}>
                                <option value="">Select...</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Current Stage</label>
                            <select name="stage" className="form-input" value={formData.stage} onChange={handleChange}>
                                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid-responsive-3">
                        <div>
                            <label className="form-label">Monthly Concrete (m3)</label>
                            <NumericFormat
                                className="form-input"
                                placeholder="e.g. 5,000"
                                value={formData.monthly_production_m3}
                                onValueChange={(values) => handleNumberChange('monthly_production_m3', values.floatValue)}
                                thousandSeparator={true}
                                allowNegative={false}
                            />
                        </div>
                        <div>
                            <label className="form-label">Monthly Admixture (L)</label>
                            <NumericFormat
                                className="form-input"
                                placeholder="e.g. 20,000"
                                value={formData.monthly_consumption_liters}
                                onValueChange={(values) => handleNumberChange('monthly_consumption_liters', values.floatValue)}
                                thousandSeparator={true}
                                allowNegative={false}
                            />
                        </div>
                        <div>
                            <label className="form-label">Expected Volume (L)</label>
                            <NumericFormat
                                className="form-input"
                                placeholder="e.g. 15,000"
                                value={formData.expected_volume_liters}
                                onValueChange={(values) => handleNumberChange('expected_volume_liters', values.floatValue)}
                                thousandSeparator={true}
                                allowNegative={false}
                            />
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="form-label">Expected Closing Date</label>
                        <input type="date" name="closing_date" className="form-input" value={formData.closing_date} onChange={handleChange} required />
                    </div>

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {initialData && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="btn-danger"
                                    title="Delete Opportunity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            {initialData && formData.stage === 'Won' && (
                                <button
                                    type="button"
                                    onClick={handleConvertToAccount}
                                    className="btn-secondary"
                                    style={{ color: '#10b981', borderColor: '#10b981' }}
                                    title="Convert to Account"
                                >
                                    <Package size={16} style={{ marginRight: '5px' }} /> Convert
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : (initialData ? 'Update Opportunity' : 'Create Opportunity')}
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
