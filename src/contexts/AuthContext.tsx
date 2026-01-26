import React, { createContext, useContext, useEffect, useState } from 'react'; // v1
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PasswordResetPrompt } from '@/components/auth/PasswordResetPrompt';

type AppRole = 'admin' | 'manager' | 'employee';
type EmployeeStatus = 'active' | 'pending' | 'rejected' | 'inactive';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  isApproved: boolean | null;
  employeeStatus: EmployeeStatus | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isActive: boolean; // True only when employee_status = 'active'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
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

  const checkProfileStatus = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('must_reset_password, is_approved, employee_status')
      .eq('id', userId)
      .maybeSingle();
    
    if (data) {
      if (data.must_reset_password) {
        setMustResetPassword(true);
      }
      setIsApproved(data.is_approved ?? false);
      setEmployeeStatus((data.employee_status as EmployeeStatus) || 'pending');
    } else {
      setEmployeeStatus('pending');
    }
  };

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
          setIsApproved(null);
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
  }, []);

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
    setIsApproved(null);
    setEmployeeStatus(null);
    setMustResetPassword(false);
  };

  const handlePasswordReset = () => {
    setMustResetPassword(false);
  };

  const isActive = employeeStatus === 'active' && isApproved === true;

  const value = {
    user,
    session,
    loading,
    role,
    isApproved,
    employeeStatus,
    signIn,
    signUp,
    signOut,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    isActive,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <PasswordResetPrompt 
        open={mustResetPassword && !!user && isApproved === true} 
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
