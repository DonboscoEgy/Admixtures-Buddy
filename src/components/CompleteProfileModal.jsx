import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Briefcase, Type } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CompleteProfileModal() {
    const { profile, user, syncProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        position: '',
        initials: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Trigger if profile exists but lacks critical info
        if (profile && (!profile.first_name || !profile.last_name || !profile.position || !profile.initials)) {

            // Pre-fill from Google Metadata if available
            const meta = user?.user_metadata || {};
            const names = (meta.full_name || meta.name || '').split(' ');

            setFormData(prev => ({
                ...prev,
                first_name: prev.first_name || names[0] || '',
                last_name: prev.last_name || names.slice(1).join(' ') || '',
                // Try to infer initials
                initials: prev.initials || ''
            }));

            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [profile, user]);

    // Auto-generate Initials
    useEffect(() => {
        if (formData.first_name && formData.last_name && !formData.initials) {
            const f = formData.first_name.charAt(0).toUpperCase();
            const l = formData.last_name.charAt(0).toUpperCase();
            setFormData(prev => ({ ...prev, initials: f + l }));
        }
    }, [formData.first_name, formData.last_name]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const updates = {
                id: user.id,
                first_name: formData.first_name,
                last_name: formData.last_name,
                position: formData.position,
                initials: formData.initials.toUpperCase(),
                // Update full name too for consistency
                full_name: `${formData.first_name} ${formData.last_name}`,
                updated_at: new Date()
            };

            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;

            console.log('Profile upserted successfully. Syncing context...');

            // Force refresh context with timeout to prevent hanging
            const syncPromise = syncProfile();
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));

            await Promise.race([syncPromise, timeoutPromise]);
            console.log('Sync complete or timed out. Closing modal.');

            setIsOpen(false);
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>Complete Your Profile</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Please define your identification details for the Sales Ledger.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="form-label" style={{ color: 'var(--text-muted)' }}>First Name</label>
                            <div className="input-group">
                                <input
                                    required
                                    className="form-input"
                                    value={formData.first_name}
                                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="form-label" style={{ color: 'var(--text-muted)' }}>Last Name</label>
                            <input
                                required
                                className="form-input"
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label" style={{ color: 'var(--text-muted)' }}>Position / Title</label>
                        <div style={{ position: 'relative' }}>
                            <Briefcase size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                            <input
                                required
                                className="form-input"
                                style={{ paddingLeft: '35px' }}
                                placeholder="e.g. Sales Manager"
                                value={formData.position}
                                onChange={e => setFormData({ ...formData, position: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label" style={{ color: 'var(--text-muted)' }}>Sales Initials (Unique)</label>
                        <div style={{ position: 'relative' }}>
                            <Type size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                            <input
                                required
                                maxLength={3}
                                className="form-input"
                                style={{ paddingLeft: '35px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
                                placeholder="e.g. MH"
                                value={formData.initials}
                                onChange={e => setFormData({ ...formData, initials: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            These initials will appear on all your sales orders (e.g., {formData.initials || 'XX'} - {formData.first_name || '...'} {formData.last_name}).
                        </small>
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="btn-primary"
                        style={{ marginTop: '1rem', padding: '0.8rem' }}
                    >
                        {isSaving ? 'Saving Profile...' : 'Save & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}
