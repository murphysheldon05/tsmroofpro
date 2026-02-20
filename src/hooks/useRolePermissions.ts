import { useAuth } from "@/contexts/AuthContext";

/**
 * RBAC Permission Definitions — 5-Role Model
 * 
 * 1. Employee (base read-only access)
 * 2. Sales Rep (submits commissions, views own)
 * 3. Sales Manager (reviews team commissions, manages reps)
 * 4. Manager (department-level oversight for non-sales departments)
 * 5. Admin (full system access)
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

  // Vendors/Subs
  canManageVendors: boolean;

  // Training
  canUploadTraining: boolean;
  canManageNewHires: boolean;
}

const NO_PERMISSIONS: RolePermissions = {
  canEditCommissionTiers: false, canEditCategories: false, canEditTools: false,
  canEditNotificationRouting: false, canPublishSOPs: false, canArchiveSOPs: false,
  canManageUsers: false, canApproveUsers: false, canAssignRoles: false, canAssignTeams: false,
  canSubmitCommissions: true, canApproveCommissions: false, canDenyCommissions: false,
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
  canManageVendors: false,
  canUploadTraining: false, canManageNewHires: false,
};

export function useRolePermissions(): RolePermissions {
  const { role, isAdmin, userDepartment } = useAuth();

  if (isAdmin) {
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
      canManageVendors: true,
      canUploadTraining: true, canManageNewHires: true,
    };
  }

  const isProductionDept = userDepartment === 'Production';
  const isAccountingDept = userDepartment === 'Accounting';

  switch (role) {
    case 'manager':
      return {
        ...NO_PERMISSIONS,
        canViewOwnCommissionsOnly: false,
        canExportOwnData: true,
        canReviewRequests: true, canApproveRequests: true,
        canDraftSOPs: true,
        canViewReports: true, canViewTeamReports: true,
        canEditProduction: isProductionDept, canEditDeliveries: isProductionDept,
        canManageWarranties: isProductionDept,
        canProcessPayouts: isAccountingDept,
        canApplyDraws: isAccountingDept,
        canManageVendors: true,
        canUploadTraining: true,
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
        canApproveDraws: true,
        canUploadTraining: true,
      };

    case 'sales_rep':
      return {
        ...NO_PERMISSIONS,
        canSubmitCommissions: true,
        canViewOwnCommissionsOnly: true,
        canExportOwnData: true,
        canRequestDraws: true,
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
  const { role } = useAuth();
  return role === 'admin' || role === 'sales_manager';
}

export function useCanViewAllData() {
  const { isAdmin } = useAuth();
  return isAdmin;
}

export function useCanViewTeamData() {
  const { role } = useAuth();
  return role === 'admin' || role === 'manager' || role === 'sales_manager';
}
