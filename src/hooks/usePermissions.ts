// ============================================================
// TSM ROOF PRO HUB — usePermissions Hook
// File: src/hooks/usePermissions.ts
//
// Call this hook in any component to get the current user's
// role, department, and permission check helpers.
//
// USAGE:
//   const { role, department, can, isAdmin } = usePermissions();
//
//   // Gate a button
//   {can('approveCommission') && <Button>Approve</Button>}
//
//   // Gate a whole route/page
//   if (!can('viewOPSCompliance')) return <Navigate to="/" />;
//
//   // Check department for display logic
//   if (department === 'hr_it') { showHRPanel(); }
// ============================================================

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  can as checkPermission,
  canAll as checkAll,
  canAny as checkAny,
  getPermissions,
  UserRole,
  Department,
  PermissionKey,
} from '@/lib/permissions';

// Map user_roles.app_role (Supabase enum) to the 3-tier UserRole
function mapToUserRole(dbRole: string | null | undefined): UserRole {
  if (!dbRole) return 'user';
  switch (dbRole) {
    case 'admin':
      return 'admin';
    case 'manager':
    case 'sales_manager':
      return 'manager';
    case 'user':
    case 'employee':
    case 'sales_rep':
    case 'ops_compliance':
    case 'accounting':
    default:
      return 'user';
  }
}

interface UsePermissionsReturn {
  role: UserRole | null;
  department: Department | null;
  loading: boolean;
  userId: string | null;
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
  can: (permission: PermissionKey) => boolean;
  canAll: (permissions: PermissionKey[]) => boolean;
  canAny: (permissions: PermissionKey[]) => boolean;
  permissions: PermissionKey[];
}

export function usePermissions(): UsePermissionsReturn {
  const [role, setRole]             = useState<UserRole | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [userId, setUserId]         = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) {
            setRole(null);
            setDepartment(null);
            setUserId(null);
            setLoading(false);
          }
          return;
        }

        const uid = session.user.id;

        // Fetch role from user_roles table and department from profiles in parallel
        const [roleResult, profileResult] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', uid)
            .order('role')
            .limit(1)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('department')
            .eq('id', uid)
            .maybeSingle(),
        ]);

        if (roleResult.error) {
          console.error('[usePermissions] Could not fetch role:', roleResult.error.message);
        }
        if (profileResult.error) {
          console.error('[usePermissions] Could not fetch profile:', profileResult.error.message);
        }

        if (mounted) {
          setRole(mapToUserRole(roleResult.data?.role));
          setDepartment((profileResult.data?.department as Department) ?? null);
          setUserId(uid);
          setLoading(false);
        }
      } catch (err) {
        console.error('[usePermissions] Unexpected error:', err);
        if (mounted) setLoading(false);
      }
    }

    fetchProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return {
    role,
    department,
    loading,
    userId,
    isAdmin:   role === 'admin',
    isManager: role === 'manager',
    isUser:    role === 'user',
    can:       (permission)  => checkPermission(role, permission),
    canAll:    (permissions) => checkAll(role, permissions),
    canAny:    (permissions) => checkAny(role, permissions),
    permissions: role ? getPermissions(role) : [],
  };
}
