import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
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
import { Plus, MapPin, Calendar, Package, Droplet, User, X } from 'lucide-react';
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
    const [opportunities, setOpportunities] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
            // Suppress error if table missing (first run)
        } finally {
            setLoading(false);
        }
    };

    // --- DRAG HANDLERS ---
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id; // This will be a STAGE ID (container) or another TASK ID

        // Find the dragged item
        const activeItem = opportunities.find(Op => Op.id === activeId);
        if (!activeItem) return;

        // Determine New Stage
        let newStage = null;

        // 1. Dropped directly on a Column Header/Container (Stage ID)
        if (STAGES.some(s => s.id === overId)) {
            newStage = overId;
        }
        // 2. Dropped on another Card (Task ID) -> Take that card's stage
        else {
            const overItem = opportunities.find(Op => Op.id === overId);
            if (overItem) {
                newStage = overItem.stage;
            }
        }

        if (newStage && newStage !== activeItem.stage) {
            // Optimistic Update
            setOpportunities(prev => prev.map(op =>
                op.id === activeId ? { ...op, stage: newStage } : op
            ));

            // Backend Update
            try {
                const { error } = await supabase
                    .from('opportunities')
                    .update({ stage: newStage })
                    .eq('id', activeId);

                if (error) throw error;
                showToast(`Moved to ${newStage}`, 'success');
            } catch (err) {
                console.error("Move failed", err);
                showToast('Failed to update stage: ' + err.message, 'error');
                fetchOpportunities(); // Revert
            }
        }
    };

    return (
        <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <div className="breadcrumb">Home / Sales / Pipeline</div>
                    <h1 className="page-title">Opportunities Pipeline</h1>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                    <Plus size={20} /> Add Opportunity
                </button>
            </div>

            {/* Kanban Board */}
            <div style={{
                flex: 1,
                overflowX: 'auto',
                overflowY: 'hidden',
                display: 'flex',
                gap: '15px',
                paddingBottom: '20px'
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
                            items={opportunities.filter(op => op.stage === stage.id)}
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
                <AddOpportunityModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        fetchOpportunities();
                        setIsModalOpen(false);
                    }}
                    profile={profile}
                />
            )}
        </div>
    );
}

// --- SUB-COMPONENTS ---

function PipelineColumn({ stage, items }) {
    const { setNodeRef } = useSortable({
        id: stage.id,
        data: {
            type: 'Column',
            stageId: stage.id
        }
    });

    return (
        <div ref={setNodeRef} style={{
            minWidth: '300px',
            width: '300px',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            border: `1px solid ${stage.color}30`
        }}>
            {/* Column Header */}
            <div style={{
                padding: '15px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: stage.color }}></div>
                    <span style={{ fontWeight: 600, color: 'white' }}>{stage.label}</span>
                </div>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {items.length}
                </span>
            </div>

            {/* Drop Zone / List */}
            <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
                <SortableContext items={items.map(op => op.id)} strategy={verticalListSortingStrategy}>
                    {items.map(op => (
                        <SortableCard key={op.id} op={op} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

function SortableCard({ op }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: op.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <OpportunityCard op={op} />
        </div>
    );
}

function OpportunityCard({ op, isOverlay }) {
    if (!op) return null;
    return (
        <div className="glass-card" style={{
            padding: '15px',
            marginBottom: '10px',
            cursor: 'grab',
            border: '1px solid rgba(255,255,255,0.08)',
            backgroundColor: '#1e293b', // Force visible bg
            boxShadow: isOverlay ? '0 10px 20px rgba(0,0,0,0.5)' : 'none'
        }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{op.account_name}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <MapPin size={14} color="#60a5fa" />
                    {op.location || 'No Location'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Droplet size={14} color="#f59e0b" />
                    {op.expected_volume_liters ? `${Number(op.expected_volume_liters).toLocaleString()} L` : '-'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Calendar size={14} color="#10b981" />
                    {op.closing_date || 'No Date'}
                </div>
            </div>

            {op.category && (
                <div style={{ marginTop: '10px' }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
                        {op.category}
                    </span>
                </div>
            )}
        </div>
    );
}

function AddOpportunityModal({ onClose, onSuccess, profile }) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);

    // Form State
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
        // Fetch accounts for dropdown
        const fetchAcc = async () => {
            const { data } = await supabase.from('accounts_master').select('name');
            setAccounts(data || []);
        }
        fetchAcc();
    }, []);

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
            sales_rep: profile?.initials || profile?.email || 'Unknown' // Auto-assign rep
        };

        try {
            const { error } = await supabase
                .from('opportunities')
                .insert([payload]);

            if (error) throw error;
            showToast('Opportunity Created Successfully', 'success');
            onSuccess();
        } catch (err) {
            console.error('Create Op Error:', err);
            showToast('Failed to create opportunity: ' + err.message + ' (Check Console)', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ overflowY: 'auto', maxHeight: '90vh' }}>
                <div className="modal-header">
                    <h2>New Opportunity</h2>
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

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Opportunity'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
