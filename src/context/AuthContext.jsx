import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('AUTH DEBUG: AuthProvider Mounted');
        // 1. Get initial session
        const getSession = async () => {
            console.log('AUTH DEBUG: Calling getSession()');
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log('AUTH DEBUG: Session retrieved', session ? 'User Found' : 'No Session', error);

                setUser(session?.user ?? null);
                if (session?.user) {
                    console.log('AUTH DEBUG: Fetching profile...');
                    await fetchProfile(session.user.id, session.user);
                } else {
                    console.log('AUTH DEBUG: No user, setting loading=false');
                    setLoading(false);
                }
            } catch (err) {
                console.error('AUTH DEBUG: getSession Request Failed', err);
                setLoading(false);
            }
        };

        getSession();

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('AUTH DEBUG: Auth State Change:', event);
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id, session.user);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId, sessionUser = null) => {
        try {
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle(); // maybeSingle avoids 406 error if not found

            if (error) {
                console.warn('Error fetching profile:', error);
            }

            // Self-Healing & Sync: Create or Update Profile using Upsert
            if (sessionUser && sessionUser.user_metadata) {
                const meta = sessionUser.user_metadata;

                // Prepare the payload
                const profileData = {
                    id: userId,
                    email: sessionUser.email,
                    full_name: meta.full_name || meta.name || sessionUser.email.split('@')[0],
                    avatar_url: meta.avatar_url || meta.picture || '',
                    updated_at: new Date()
                };

                // Detect if sync is needed (Missing Data OR Mismatch)
                const needsSync = !data ||
                    (profileData.full_name !== data.full_name) ||
                    (profileData.avatar_url !== data.avatar_url);

                if (needsSync) {
                    console.log('AuthContext: Creating/Updating profile...', profileData);

                    const { data: newProfile, error: upsertError } = await supabase
                        .from('profiles')
                        .upsert(profileData, { onConflict: 'id' })
                        .select()
                        .single();

                    if (!upsertError && newProfile) {
                        data = newProfile; // Use the new/updated profile
                    } else {
                        console.error('AuthContext: Failed to upsert profile:', upsertError);
                    }
                }
            }

            setProfile(data);
        } catch (error) {
            console.error('Profile fetch unexpected error:', error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
    };

    const syncProfile = async () => {
        try {
            console.log('Syncing profile... forcing session refresh.');
            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) console.warn('Refresh session warning:', refreshError);

            const { data: { user: latestUser }, error } = await supabase.auth.getUser();
            if (error) throw error;

            if (latestUser) {
                console.log('Latest User Metadata from Supabase:', latestUser.user_metadata);
                await fetchProfile(latestUser.id, latestUser);
                return true;
            }
        } catch (error) {
            console.error('Sync Profile Error:', error);
            return false;
        }
    };

    const value = {
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        isAdmin: !!profile?.is_admin,
        isApproved: !!profile?.is_approved,
        signOut,
        syncProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
            {loading && (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f172a',
                    color: 'white'
                }}>
                    Loading User Data...
                </div>
            )}
        </AuthContext.Provider>
    );
};
