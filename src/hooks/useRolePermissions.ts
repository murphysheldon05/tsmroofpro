import { useAuth } from "@/contexts/AuthContext";

/**
 * RBAC Permission Definitions — 6-Tier Role Model
 * 
 * 1. Employee (base read-only access)
 * 2. Sales Rep (submits commissions, views own)
 * 3. Sales Manager (reviews team commissions, manages reps)
 * 4. Manager (full ops, sees all commissions, edits production)
 * 5. Accounting (commission approval and payment processing)
 * 6. Admin (full system access)
 * 
 * Legacy: ops_compliance remains supported for compliance enforcement
 */

export interface RolePermissions {
  // System editing (Admin Panel only)
  canEditCommissionTiers: boolean;
  canEditCategories: boolean;
  canEditTools: boolean;
  canEditNotificationRouting: boolean;
  canPublishSOPs: boolean;
  canArchiveSOPs: boolean;
  
  // User management
  canManageUsers: boolean;
  canApproveUsers: boolean;
  canAssignRoles: boolean;
  canAssignTeams: boolean;
  
  // Commission workflow
  canSubmitCommissions: boolean;
  canApproveCommissions: boolean;
  canDenyCommissions: boolean;
  canRequestRevisions: boolean;
  canFinalApproveManagerCommissions: boolean;
  canProcessPayouts: boolean;
  
  // Data access
  canViewAllCommissions: boolean;
  canViewTeamCommissions: boolean;
  canViewOwnCommissionsOnly: boolean;
  canExportAllData: boolean;
  canExportTeamData: boolean;
  canExportOwnData: boolean;
  
  // Requests & Forms
  canReviewRequests: boolean;
  canApproveRequests: boolean;
  
  // SOP
  canDraftSOPs: boolean;
  
  // Reporting
  canViewReports: boolean;
  canViewTeamReports: boolean;
  
  // Production
  canEditProduction: boolean;
  canEditDeliveries: boolean;
  canManageWarranties: boolean;
  
  // Draws
  canRequestDraws: boolean;
  canApproveDraws: boolean;
  canApplyDraws: boolean;
  canManageDrawSettings: boolean;
  
  // Compliance
  canManageViolations: boolean;
  canManageHolds: boolean;
  canCreateEscalations: boolean;
  canDecideEscalations: boolean;
  canViewAuditLog: boolean;
  canViewAllAcknowledgments: boolean;
  canGrantExceptions: boolean;
  canDeleteViolations: boolean;
}

const NO_PERMISSIONS: RolePermissions = {
  canEditCommissionTiers: false, canEditCategories: false, canEditTools: false,
  canEditNotificationRouting: false, canPublishSOPs: false, canArchiveSOPs: false,
  canManageUsers: false, canApproveUsers: false, canAssignRoles: false, canAssignTeams: false,
  canSubmitCommissions: false, canApproveCommissions: false, canDenyCommissions: false,
  canRequestRevisions: false, canFinalApproveManagerCommissions: false, canProcessPayouts: false,
  canViewAllCommissions: false, canViewTeamCommissions: false, canViewOwnCommissionsOnly: true,
  canExportAllData: false, canExportTeamData: false, canExportOwnData: false,
  canReviewRequests: false, canApproveRequests: false,
  canDraftSOPs: false,
  canViewReports: false, canViewTeamReports: false,
  canEditProduction: false, canEditDeliveries: false, canManageWarranties: false,
  canRequestDraws: false, canApproveDraws: false, canApplyDraws: false, canManageDrawSettings: false,
  canManageViolations: false, canManageHolds: false, canCreateEscalations: false,
  canDecideEscalations: false, canViewAuditLog: false, canViewAllAcknowledgments: false,
  canGrantExceptions: false, canDeleteViolations: false,
};

export function useRolePermissions(): RolePermissions {
  const { role, isAdmin } = useAuth();

  if (isAdmin) {
    // Admin: FULL CONTROL
    return {
      canEditCommissionTiers: true, canEditCategories: true, canEditTools: true,
      canEditNotificationRouting: true, canPublishSOPs: true, canArchiveSOPs: true,
      canManageUsers: true, canApproveUsers: true, canAssignRoles: true, canAssignTeams: true,
      canSubmitCommissions: true, canApproveCommissions: true, canDenyCommissions: true,
      canRequestRevisions: true, canFinalApproveManagerCommissions: true, canProcessPayouts: true,
      canViewAllCommissions: true, canViewTeamCommissions: true, canViewOwnCommissionsOnly: false,
      canExportAllData: true, canExportTeamData: true, canExportOwnData: true,
      canReviewRequests: true, canApproveRequests: true,
      canDraftSOPs: true,
      canViewReports: true, canViewTeamReports: true,
      canEditProduction: true, canEditDeliveries: true, canManageWarranties: true,
      canRequestDraws: false, canApproveDraws: true, canApplyDraws: true, canManageDrawSettings: true,
      canManageViolations: true, canManageHolds: true, canCreateEscalations: true,
      canDecideEscalations: true, canViewAuditLog: true, canViewAllAcknowledgments: true,
      canGrantExceptions: true, canDeleteViolations: true,
    };
  }

  switch (role) {
    case 'accounting':
      return {
        ...NO_PERMISSIONS,
        canProcessPayouts: true,
        canApproveCommissions: true,
        canViewAllCommissions: true, canViewTeamCommissions: true, canViewOwnCommissionsOnly: false,
        canExportAllData: true, canExportTeamData: true, canExportOwnData: true,
        canViewReports: true, canViewTeamReports: true,
        canReviewRequests: true,
        canApplyDraws: true,
        canApproveDraws: true,
      };

    case 'manager':
      return {
        ...NO_PERMISSIONS,
        canSubmitCommissions: true,
        canApproveCommissions: true, canDenyCommissions: true, canRequestRevisions: true,
        canViewAllCommissions: true, canViewTeamCommissions: true, canViewOwnCommissionsOnly: false,
        canExportAllData: false, canExportTeamData: true, canExportOwnData: true,
        canReviewRequests: true, canApproveRequests: true,
        canDraftSOPs: true,
        canViewReports: true, canViewTeamReports: true,
        canEditProduction: true, canEditDeliveries: true, canManageWarranties: true,
        canApproveDraws: true, canApplyDraws: true,
      };

    case 'sales_manager':
      return {
        ...NO_PERMISSIONS,
        canSubmitCommissions: true,
        canApproveCommissions: true, canDenyCommissions: true, canRequestRevisions: true,
        canViewTeamCommissions: true, canViewOwnCommissionsOnly: false,
        canExportTeamData: true, canExportOwnData: true,
        canReviewRequests: true, canApproveRequests: true,
        canDraftSOPs: true,
        canViewReports: true, canViewTeamReports: true,
        canRequestDraws: true,
        canApproveDraws: true, canApplyDraws: true,
      };

    case 'sales_rep':
      return {
        ...NO_PERMISSIONS,
        canSubmitCommissions: true,
        canViewOwnCommissionsOnly: true,
        canExportOwnData: true,
        canRequestDraws: true,
        canManageWarranties: false,
      };

    case 'ops_compliance':
      return {
        ...NO_PERMISSIONS,
        canViewAllCommissions: true, canViewTeamCommissions: true, canViewOwnCommissionsOnly: false,
        canExportAllData: true, canExportTeamData: true, canExportOwnData: true,
        canReviewRequests: true,
        canViewReports: true, canViewTeamReports: true,
        canManageViolations: true, canManageHolds: true, canCreateEscalations: true,
        canViewAuditLog: true, canViewAllAcknowledgments: true,
      };

    case 'employee':
    default:
      return { ...NO_PERMISSIONS, canExportOwnData: true };
  }
}

// Quick permission check helpers
export function useCanEditSystem() {
  const { isAdmin } = useAuth();
  return isAdmin;
}

export function useCanApproveCommissions() {
  const { isAdmin, isManager, role } = useAuth();
  return isAdmin || isManager || role === 'sales_manager' || role === 'accounting';
}

export function useCanViewAllData() {
  const { isAdmin, role } = useAuth();
  return isAdmin || role === 'ops_compliance' || role === 'accounting';
}

export function useCanViewTeamData() {
  const { isAdmin, isManager, role } = useAuth();
  return isAdmin || isManager || role === 'ops_compliance' || role === 'sales_manager' || role === 'accounting';
}

export function useIsOpsCompliance() {
  const { role } = useAuth();
  return role === 'ops_compliance';
}
