import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PasswordResetPrompt } from '@/components/auth/PasswordResetPrompt';

type AppRole = 'admin' | 'manager' | 'employee' | 'sales_rep' | 'sales_manager' | 'ops_compliance' | 'accounting';
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
  isSalesManager: boolean;
  isSalesRep: boolean;
  canApproveCommissions: boolean;
  canSubmitCommissions: boolean;
  userDepartment: string | null;
  isActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // TRUE by default — never false until init completes
  const [role, setRole] = useState<AppRole | null>(null);
  const [employeeStatus, setEmployeeStatus] = useState<EmployeeStatus | null>(null);
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchUserRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .order('role')
      .limit(1)
      .maybeSingle();
    
    if (isMounted.current && data) {
      setRole(data.role as AppRole);
    }
  }, []);

  const checkProfileStatus = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('must_reset_password, employee_status, is_approved, department')
      .eq('id', userId)
      .maybeSingle();
    
    if (!isMounted.current) return;

    if (data) {
      if (data.must_reset_password) {
        setMustResetPassword(true);
      }
      
      setUserDepartment(data.department || null);
      
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
      setEmployeeStatus('pending');
      setUserDepartment(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserRole(user.id);
      await checkProfileStatus(user.id);
    }
  }, [user, checkProfileStatus, fetchUserRole]);

  useEffect(() => {
    isMounted.current = true;

    // 1. Set up listener for ONGOING auth changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted.current) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Fire and forget — don't await, don't touch loading
          fetchUserRole(newSession.user.id);
          checkProfileStatus(newSession.user.id);
        } else {
        setRole(null);
        setEmployeeStatus(null);
        setMustResetPassword(false);
        setUserDepartment(null);
        }
      }
    );

    // 2. INITIAL load — controls loading state
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!isMounted.current) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          // Await BOTH before setting loading false
          await Promise.all([
            fetchUserRole(initialSession.user.id),
            checkProfileStatus(initialSession.user.id),
          ]);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [checkProfileStatus, fetchUserRole]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
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
    const redirectUrl = 'https://tsmroofpro.com/auth';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });

    if (!error && data.user) {
      await supabase
        .from("profiles")
        .update({
          data_consent_given: true,
          data_consent_given_at: new Date().toISOString(),
        })
        .eq("id", data.user.id);
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setEmployeeStatus(null);
    setMustResetPassword(false);
    setUserDepartment(null);
  };

  const handlePasswordReset = () => {
    setMustResetPassword(false);
  };

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
    isManager: role === 'manager' || role === 'sales_manager' || role === 'admin',
    isSalesManager: role === 'sales_manager' || role === 'admin',
    isSalesRep: role === 'sales_rep' || role === 'sales_manager' || role === 'admin',
    canApproveCommissions: role === 'sales_manager' || role === 'admin',
    canSubmitCommissions: role === 'sales_rep' || role === 'sales_manager' || role === 'admin',
    userDepartment,
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
