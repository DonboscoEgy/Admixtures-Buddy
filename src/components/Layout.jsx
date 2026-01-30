import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    LayoutDashboard, FileText, Zap, Settings, Bell, Search, Menu, LogOut, Users,
    DollarSign, ShieldCheck, X, RefreshCw, Package, PieChart, KanbanSquare,
    ScrollText, CreditCard, PlusCircle, Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CompleteProfileModal from './CompleteProfileModal';

export default function Layout() {
    const { user, profile, startLogout, signOut, isAdmin, syncProfile } = useAuth();
    const [showProfile, setShowProfile] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        await syncProfile();
        setIsSyncing(false);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-main)', overflow: 'hidden' }}>
            {/* Sidebar - Desktop (Hidden on Mobile) */}
            <aside className="desktop-sidebar" style={{
                width: '80px',
                height: '100vh',
                backgroundColor: 'rgba(11, 15, 25, 0.4)',
                borderRight: '1px solid var(--border-color)',
                display: 'flex', // This will be overriden by CSS for mobile
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 0',
                backdropFilter: 'blur(10px)',
                zIndex: 20
            }}>
                {/* Brand Logo */}
                <div style={{ paddingBottom: '30px' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        background: 'linear-gradient(135deg, var(--primary), #2563eb)',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 'bold', fontSize: '1.2rem',
                        boxShadow: '0 0 15px var(--primary-glow)'
                    }}>P</div>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <NavItems isAdmin={isAdmin} />
                </nav>

                <div style={{ paddingBottom: '20px' }}>
                    <button onClick={signOut} className="nav-btn-hover" title="Sign Out" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '10px' }}>
                        <LogOut size={22} />
                    </button>
                </div>
            </aside>

            {/* Mobile Drawer (Overlay) */}
            <div className={`mobile-drawer ${showProfile ? '' : ''}`} style={{
                position: 'fixed', top: 0, left: 0, height: '100vh', width: '250px',
                background: '#0b0f19', borderRight: '1px solid #1e293b', zIndex: 50,
                transform: showMobileMenu ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s ease-in-out',
                display: 'flex', flexDirection: 'column', padding: '20px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                    <h2 style={{ color: 'white', fontWeight: 'bold' }}>Menu</h2>
                    <button onClick={() => setShowMobileMenu(false)} style={{ background: 'none', border: 'none', color: '#94a3b8' }}><X /></button>
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <NavItemMobile to="/dashboard" icon={<PieChart size={20} />} label="Dashboard" setShow={setShowMobileMenu} />
                    <NavItemMobile to="/pipeline" icon={<KanbanSquare size={20} />} label="Pipeline" setShow={setShowMobileMenu} />
                    <NavItemMobile to="/sales-ledger" icon={<ScrollText size={20} />} label="Sales Ledger" setShow={setShowMobileMenu} />
                    <NavItemMobile to="/payments" icon={<CreditCard size={20} />} label="Payments" setShow={setShowMobileMenu} />
                    <NavItemMobile to="/accounts" icon={<Briefcase size={20} />} label="Accounts" setShow={setShowMobileMenu} />
                    <NavItemMobile to="/quick-order" icon={<PlusCircle size={20} />} label="Create Order" setShow={setShowMobileMenu} />
                    <NavItemMobile to="/reports" icon={<FileText size={20} />} label="Reports" setShow={setShowMobileMenu} />
                    <NavItemMobile to="/products" icon={<Package size={20} />} label="Products" setShow={setShowMobileMenu} />
                    <NavItemMobile to="/masters" icon={<Settings size={20} />} label="Masters" setShow={setShowMobileMenu} />
                </nav>
            </div>

            {/* Mobile Overlay Backdrop */}
            {showMobileMenu && (
                <div onClick={() => setShowMobileMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 40 }}></div>
            )}

            {/* Main Content Wrapper */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>

                {/* Floating Glass Header */}
                <header style={{
                    height: '70px',
                    margin: '0 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid transparent',
                    color: 'var(--text-main)'
                }}>

                    {/* Mobile Menu Toggle */}
                    <button className="mobile-only-btn" onClick={() => setShowMobileMenu(true)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                        <Menu size={24} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: 'auto' }}>
                        <button style={{ background: 'none', border: 'none', position: 'relative', cursor: 'pointer' }}>
                            <Bell size={20} color="var(--text-main)" />
                            <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', boxShadow: '0 0 8px var(--danger)' }}></span>
                        </button>

                        {/* Profile Section - Clickable */}
                        <div
                            onClick={() => setShowProfile(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                        >
                            <div className="desktop-only-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{profile?.full_name || user?.email?.split('@')[0] || 'User'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isAdmin ? 'Super Admin' : 'Staff Member'}</span>
                            </div>
                            <div style={{
                                width: '38px', height: '38px', borderRadius: '12px',
                                background: `url(${profile?.avatar_url || 'https://i.pravatar.cc/150?img=11'}) center/cover`,
                                border: '2px solid rgba(255,255,255,0.1)'
                            }}></div>
                        </div>
                    </div>
                </header>

                {/* Profile Modal */}
                {showProfile && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 100,
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onClick={() => setShowProfile(false)}>
                        <div onClick={e => e.stopPropagation()} className="glass-card" style={{
                            width: '400px', padding: '30px', borderRadius: '24px',
                            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                            textAlign: 'center', position: 'relative'
                        }}>
                            <button onClick={() => setShowProfile(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>

                            <img
                                src={profile?.avatar_url || 'https://i.pravatar.cc/150?img=11'}
                                style={{ width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 20px auto', border: '4px solid rgba(59, 130, 246, 0.3)' }}
                            />

                            <h2 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{profile?.full_name || 'Unknown'}</h2>
                            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>{user?.email}</p>

                            <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '20px', background: isAdmin ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: isAdmin ? '#fbbf24' : '#60a5fa', fontWeight: 600, fontSize: '0.9rem', marginBottom: '30px' }}>
                                {isAdmin ? 'Super Admin' : 'Authorized User'}
                            </div>

                            <button onClick={handleSync} disabled={isSyncing} style={{
                                width: '100%', padding: '12px', borderRadius: '12px',
                                background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.2)',
                                fontWeight: 600, cursor: isSyncing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                marginBottom: '10px'
                            }}>
                                <RefreshCw size={18} className={isSyncing ? "spin-anim" : ""} />
                                {isSyncing ? 'Syncing...' : 'Sync Google Profile'}
                            </button>

                            <button onClick={signOut} style={{
                                width: '100%', padding: '12px', borderRadius: '12px',
                                background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)',
                                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}>
                                <LogOut size={18} /> Sign Out
                            </button>
                        </div>
                    </div>
                )}

                {/* Scrollable Content Area */}
                <main style={{ flex: 1, overflowY: 'auto', padding: '10px 30px 30px 30px' }}>
                    <Outlet />
                </main>
            </div>

            {/* Global Modals */}
            <CompleteProfileModal />
        </div>
    );
}

// Helper Component for Desktop Nav
function NavItems({ isAdmin }) {
    return (
        <>
            <NavItem to="/dashboard" icon={<PieChart size={22} />} tooltip="Dashboard" />
            <NavItem to="/pipeline" icon={<KanbanSquare size={22} />} tooltip="Pipeline" />
            <NavItem to="/sales-ledger" icon={<ScrollText size={22} />} tooltip="Sales Ledger" />
            <NavItem to="/payments" icon={<CreditCard size={22} />} tooltip="Payments" />
            <NavItem to="/accounts" icon={<Briefcase size={22} />} tooltip="Accounts" />
            <NavItem to="/quick-order" icon={<PlusCircle size={22} />} tooltip="Create Order" />

            <div style={{ height: '1px', background: 'var(--border-color)', width: '40px', margin: '5px auto' }} />

            <NavItem to="/reports" icon={<FileText size={22} />} tooltip="Reports" />
            <NavItem to="/products" icon={<Package size={22} />} tooltip="Products" />
            <NavItem to="/masters" icon={<Settings size={22} />} tooltip="Masters Setup" />

            {isAdmin && (
                <>
                    <div style={{ height: '1px', background: 'var(--border-color)', width: '40px', margin: '5px auto' }} />
                    <NavItem to="/admin/users" icon={<ShieldCheck size={22} color="#f59e0b" />} tooltip="Admin Users" />
                </>
            )}
        </>
    );
}

function NavItem({ to, icon, tooltip }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <NavLink
            to={to}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
            }
            style={({ isActive }) => ({
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '45px',
                height: '45px',
                borderRadius: '12px',
                color: isActive ? 'white' : 'var(--text-muted)',
                background: isActive ? 'var(--primary)' : 'transparent',
                boxShadow: isActive ? '0 0 15px var(--primary-glow)' : 'none',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)', // Hover Animation
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            })}
        >
            {icon}

            {/* Custom Floating Tooltip */}
            <div style={{
                position: 'absolute',
                left: '60px',
                top: '50%',
                transform: isHovered ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(-10px)',
                opacity: isHovered ? 1 : 0,
                visibility: isHovered ? 'visible' : 'hidden',
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#f8fafc',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 50,
                pointerEvents: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
                {tooltip}

                {/* Arrow Tip */}
                <div style={{
                    position: 'absolute',
                    left: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%) rotate(45deg)',
                    width: '8px',
                    height: '8px',
                    background: '#1e293b',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}></div>
            </div>
        </NavLink>
    );
}

function NavItemMobile({ to, icon, label, setShow }) {
    return (
        <NavLink
            to={to}
            onClick={() => setShow(false)}
            className={({ isActive }) => isActive ? 'mobile-nav-active' : ''}
            style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '15px',
                padding: '12px', borderRadius: '12px',
                color: isActive ? '#3b82f6' : '#94a3b8',
                background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                textDecoration: 'none', fontWeight: 600, fontSize: '1rem'
            })}
        >
            {icon}
            {label}
        </NavLink>
    )
}
