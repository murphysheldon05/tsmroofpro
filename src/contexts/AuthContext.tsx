import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'; // v2
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PasswordResetPrompt } from '@/components/auth/PasswordResetPrompt';

type AppRole = 'admin' | 'manager' | 'employee';
// CANONICAL STATUS: Single source of truth for user access
type EmployeeStatus = 'active' | 'pending' | 'rejected' | 'inactive';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  employeeStatus: EmployeeStatus | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isActive: boolean; // True ONLY when employee_status = 'active'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [employeeStatus, setEmployeeStatus] = useState<EmployeeStatus | null>(null);
  const [mustResetPassword, setMustResetPassword] = useState(false);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .order('role')
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setRole(data.role as AppRole);
    }
  };

  // CANONICAL ACCESS CHECK: employee_status is the SINGLE source of truth
  const checkProfileStatus = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('must_reset_password, employee_status, is_approved')
      .eq('id', userId)
      .maybeSingle();
    
    if (data) {
      if (data.must_reset_password) {
        setMustResetPassword(true);
      }
      
      // GOVERNANCE: employee_status is canonical; is_approved is kept for backward compat
      // Active status requires BOTH employee_status='active' AND is_approved=true
      let status: EmployeeStatus = 'pending';
      if (data.employee_status) {
        status = data.employee_status as EmployeeStatus;
      } else if (data.is_approved === false) {
        status = 'pending';
      } else if (data.is_approved === true) {
        status = 'active';
      }
      
      setEmployeeStatus(status);
    } else {
      // No profile found - treat as pending
      setEmployeeStatus('pending');
    }
  }, []);

  // Public method to refresh profile status after approval
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserRole(user.id);
      await checkProfileStatus(user.id);
    }
  }, [user, checkProfileStatus]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            checkProfileStatus(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setEmployeeStatus(null);
          setMustResetPassword(false);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        checkProfileStatus(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkProfileStatus]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Update last login timestamp on successful sign in
    if (!error && data.user) {
      supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)
        .then();
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // HARD LOCK: Always use tsmroofpro.com for all auth redirects
    const redirectUrl = 'https://tsmroofpro.com/auth';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });

    // Update profile with data consent
    if (!error && data.user) {
      await supabase
        .from("profiles")
        .update({
          data_consent_given: true,
          data_consent_given_at: new Date().toISOString(),
        })
        .eq("id", data.user.id);
      
      // Note: Admin notification is sent from Signup.tsx with full details
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setEmployeeStatus(null);
    setMustResetPassword(false);
  };

  const handlePasswordReset = () => {
    setMustResetPassword(false);
  };

  // CANONICAL ACCESS RULE: Only 'active' status grants access
  const isActive = employeeStatus === 'active';

  const value = {
    user,
    session,
    loading,
    role,
    employeeStatus,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isActive,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <PasswordResetPrompt 
        open={mustResetPassword && !!user && isActive} 
        onPasswordReset={handlePasswordReset} 
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
