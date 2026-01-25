import { useAuth } from "@/contexts/AuthContext";

/**
 * RBAC Permission Definitions
 * 
 * Three roles: Admin, Manager, Employee (Sales Rep)
 * 
 * Admin: Full system control via Admin Panel
 * Manager: Review/approve workflows, view reports for scope, draft SOPs
 * Employee: Submit own data, view own data, edit personal preferences
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
}

export function useRolePermissions(): RolePermissions {
  const { role, isAdmin, isManager } = useAuth();

  // Sales Rep (employee) permissions
  const employeePermissions: RolePermissions = {
    // System editing - NONE
    canEditCommissionTiers: false,
    canEditCategories: false,
    canEditTools: false,
    canEditNotificationRouting: false,
    canPublishSOPs: false,
    canArchiveSOPs: false,
    
    // User management - NONE
    canManageUsers: false,
    canApproveUsers: false,
    canAssignRoles: false,
    canAssignTeams: false,
    
    // Commission workflow
    canSubmitCommissions: true,
    canApproveCommissions: false,
    canDenyCommissions: false,
    canRequestRevisions: false,
    canFinalApproveManagerCommissions: false,
    
    // Data access - OWN ONLY
    canViewAllCommissions: false,
    canViewTeamCommissions: false,
    canViewOwnCommissionsOnly: true,
    canExportAllData: false,
    canExportTeamData: false,
    canExportOwnData: true,
    
    // Requests
    canReviewRequests: false,
    canApproveRequests: false,
    
    // SOP
    canDraftSOPs: false,
    
    // Reporting
    canViewReports: false,
    canViewTeamReports: false,
  };

  // Manager permissions
  const managerPermissions: RolePermissions = {
    // System editing - NONE (Admin Panel only)
    canEditCommissionTiers: false,
    canEditCategories: false,
    canEditTools: false,
    canEditNotificationRouting: false,
    canPublishSOPs: false,
    canArchiveSOPs: false,
    
    // User management - LIMITED
    canManageUsers: false,
    canApproveUsers: false,
    canAssignRoles: false,
    canAssignTeams: false,
    
    // Commission workflow
    canSubmitCommissions: true,
    canApproveCommissions: true,
    canDenyCommissions: true,
    canRequestRevisions: true,
    canFinalApproveManagerCommissions: false, // Only Admin (Sheldon)
    
    // Data access - TEAM SCOPE
    canViewAllCommissions: false,
    canViewTeamCommissions: true,
    canViewOwnCommissionsOnly: false,
    canExportAllData: false,
    canExportTeamData: true,
    canExportOwnData: true,
    
    // Requests
    canReviewRequests: true,
    canApproveRequests: true,
    
    // SOP
    canDraftSOPs: true,
    
    // Reporting
    canViewReports: true,
    canViewTeamReports: true,
  };

  // Admin permissions - FULL CONTROL
  const adminPermissions: RolePermissions = {
    // System editing - FULL (via Admin Panel)
    canEditCommissionTiers: true,
    canEditCategories: true,
    canEditTools: true,
    canEditNotificationRouting: true,
    canPublishSOPs: true,
    canArchiveSOPs: true,
    
    // User management - FULL
    canManageUsers: true,
    canApproveUsers: true,
    canAssignRoles: true,
    canAssignTeams: true,
    
    // Commission workflow
    canSubmitCommissions: true,
    canApproveCommissions: true,
    canDenyCommissions: true,
    canRequestRevisions: true,
    canFinalApproveManagerCommissions: true, // Admin (Sheldon) only
    
    // Data access - ALL
    canViewAllCommissions: true,
    canViewTeamCommissions: true,
    canViewOwnCommissionsOnly: false,
    canExportAllData: true,
    canExportTeamData: true,
    canExportOwnData: true,
    
    // Requests
    canReviewRequests: true,
    canApproveRequests: true,
    
    // SOP
    canDraftSOPs: true,
    
    // Reporting
    canViewReports: true,
    canViewTeamReports: true,
  };

  if (isAdmin) return adminPermissions;
  if (isManager) return managerPermissions;
  return employeePermissions;
}

/**
 * Quick permission check helpers
 */
export function useCanEditSystem() {
  const { isAdmin } = useAuth();
  return isAdmin;
}

export function useCanApproveCommissions() {
  const { isAdmin, isManager } = useAuth();
  return isAdmin || isManager;
}

export function useCanViewAllData() {
  const { isAdmin } = useAuth();
  return isAdmin;
}

export function useCanViewTeamData() {
  const { isAdmin, isManager } = useAuth();
  return isAdmin || isManager;
}
