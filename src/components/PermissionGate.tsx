// ============================================================
// TSM ROOF PRO HUB — PermissionGate Component
// File: src/components/PermissionGate.tsx
//
// Wrap any UI element to show/hide it based on the current
// user's role. Nothing leaks to users who lack permission.
//
// USAGE EXAMPLES:
//
//   <PermissionGate permission="approveCommission">
//     <Button>Approve</Button>
//   </PermissionGate>
//
//   <PermissionGate permission="viewAllCommissions"
//     fallback={<p>You can only view your own commissions.</p>}
//   >
//     <AllCommissionsTable />
//   </PermissionGate>
//
//   <PermissionGate requireAll={['approveCommission', 'markCommissionPaid']}>
//     <PayoutPanel />
//   </PermissionGate>
//
//   <PermissionGate requireAny={['viewAllCommissions', 'viewTeamStats']}>
//     <TeamDashboard />
//   </PermissionGate>
//
//   <PermissionGate role="admin">
//     <AdminPanel />
//   </PermissionGate>
//
//   <PermissionGate minRole="manager">
//     <ManagerTools />
//   </PermissionGate>
// ============================================================

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionKey, UserRole } from '@/lib/permissions';

const ROLE_RANK: Record<UserRole, number> = {
  user: 1,
  manager: 2,
  admin: 3,
};

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: PermissionKey;
  requireAll?: PermissionKey[];
  requireAny?: PermissionKey[];
  role?: UserRole;
  minRole?: UserRole;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

export function PermissionGate({
  children,
  permission,
  requireAll,
  requireAny,
  role: exactRole,
  minRole,
  fallback = null,
  loadingFallback = null,
}: PermissionGateProps) {
  const { role, loading, can, canAll, canAny } = usePermissions();

  if (loading) return <>{loadingFallback}</>;

  let hasAccess = true;

  if (permission)   hasAccess = hasAccess && can(permission);
  if (requireAll)   hasAccess = hasAccess && canAll(requireAll);
  if (requireAny)   hasAccess = hasAccess && canAny(requireAny);
  if (exactRole)    hasAccess = hasAccess && role === exactRole;
  if (minRole && role) {
    hasAccess = hasAccess && ROLE_RANK[role] >= ROLE_RANK[minRole];
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

export default PermissionGate;
