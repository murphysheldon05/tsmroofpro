// ============================================================
// TSM ROOF PRO HUB — PERMISSIONS CONFIG
// File: src/lib/permissions.ts
//
// THREE TIERS:
//   user    → reps, production (Dustin/Tim/Anakin), Jayden, VAs (Jane/David)
//   manager → Jordan, Conrad, Paul (view-only on commissions, no approvals)
//   admin   → Sheldon, Courtney, Manny (full access)
//
// DEPARTMENTS (notification routing only — independent of tier):
//   management | accounting | operations | hr_it | sales | production | office | va
//
//   Paul = manager tier + hr_it department
//   → Can't approve commissions, DOES get HR notifications
//
// HOW TO USE:
//   import { can } from '@/lib/permissions'
//   if (can(userRole, 'approveCommission')) { ... }
// ============================================================

export type UserRole = 'user' | 'manager' | 'admin';

export type Department =
  | 'management'   // Sheldon
  | 'accounting'   // Courtney
  | 'operations'   // Manny
  | 'hr_it'        // Paul
  | 'sales'        // Jordan, Conrad, all reps
  | 'production'   // Dustin, Tim, Anakin
  | 'office'       // Jayden
  | 'va';          // Jane, David

// ─── Permission Keys ─────────────────────────────────────────
// Every action in the app lives here.
// Add new keys as the app grows — never hardcode role checks in components.
export type PermissionKey =
  // Commissions
  | 'submitCommission'
  | 'viewOwnCommissions'
  | 'viewAllCommissions'        // manager + admin
  | 'approveCommission'         // admin only
  | 'denyCommission'            // admin only
  | 'markCommissionPaid'        // admin only (Courtney)
  | 'deleteCommission'          // admin only

  // Playbook / SOPs
  | 'viewSalesSOPs'             // all roles
  | 'viewProductionSOPs'        // manager + admin
  | 'viewAccountingSOPs'        // admin only
  | 'editSOPs'                  // admin only
  | 'uploadSOPVersion'          // admin only

  // Production
  | 'viewProductionSchedule'    // all roles
  | 'editProductionSchedule'    // manager + admin
  | 'viewWarrantyTracker'       // all roles
  | 'submitWarranty'            // all roles
  | 'updateWarrantyStatus'      // manager + admin
  | 'closeWarranty'             // admin only

  // Training & Onboarding
  | 'viewOwnTraining'           // all roles
  | 'viewAllTraining'           // admin only
  | 'uploadTrainingContent'     // admin only

  // Users & Admin Panel
  | 'viewOwnProfile'            // all roles
  | 'viewAllUsers'              // admin only
  | 'assignRoles'               // admin only
  | 'inviteUsers'               // admin only
  | 'viewCredentialVault'       // admin only
  | 'editCredentialVault'       // admin only

  // Forms & Requests
  | 'submitForms'               // all roles
  | 'viewOwnForms'              // all roles
  | 'viewAllForms'              // admin only
  | 'approveFormRequests'       // admin only

  // New Hire Onboarding (HR)
  | 'submitNewHireForm'         // admin only (Sheldon/Manny trigger it)
  | 'viewNewHireForms'          // admin + manager (Paul gets notified)
  | 'completeOnboardingChecklist' // manager (Paul fills out credential checklist)

  // OPS Compliance
  | 'viewOPSCompliance'         // admin only
  | 'issueWarning'              // admin only
  | 'viewAuditLog'              // admin only

  // Subcontractors / Vendors
  | 'viewSubcontractors'        // manager + admin
  | 'submitNewSubcontractor'    // manager + admin
  | 'approveSubcontractor'      // admin only

  // Dashboard
  | 'viewCommandCenter'         // all roles
  | 'viewPaidDrawBalance'       // admin only
  | 'viewAllStats'              // admin only
  | 'viewTeamStats'             // manager + admin
  | 'configureCommandCenter';   // all roles

// ─── Role → Permissions Map ───────────────────────────────────
const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {

  // ── USER ─────────────────────────────────────────────────────
  // Reps (Chance, Jeff, Preston, Sean, Jesus, etc.)
  // Production: Dustin, Tim, Anakin
  // Office: Jayden
  // VAs: Jane, David
  user: [
    'submitCommission',
    'viewOwnCommissions',
    'viewSalesSOPs',
    'viewProductionSchedule',
    'viewWarrantyTracker',
    'submitWarranty',
    'viewOwnTraining',
    'viewOwnProfile',
    'submitForms',
    'viewOwnForms',
    'viewCommandCenter',
    'configureCommandCenter',
  ],

  // ── MANAGER ──────────────────────────────────────────────────
  // Sales: Jordan, Conrad — see all commissions, zero approval power
  // HR/IT: Paul — HR form notifications come via department tag, not this tier
  manager: [
    'submitCommission',
    'viewOwnCommissions',
    'viewAllCommissions',         // full visibility, read-only
    'viewSalesSOPs',
    'viewProductionSOPs',
    'viewProductionSchedule',
    'editProductionSchedule',
    'viewWarrantyTracker',
    'submitWarranty',
    'updateWarrantyStatus',
    'viewOwnTraining',
    'viewOwnProfile',
    'submitForms',
    'viewOwnForms',
    'viewNewHireForms',           // Paul gets these via notification routing
    'completeOnboardingChecklist', // Paul fills out credential/setup checklist
    'viewSubcontractors',
    'submitNewSubcontractor',
    'viewCommandCenter',
    'viewTeamStats',
    'configureCommandCenter',
  ],

  // ── ADMIN ─────────────────────────────────────────────────────
  // Sheldon, Courtney, Manny — full access, no restrictions
  admin: [
    'submitCommission',
    'viewOwnCommissions',
    'viewAllCommissions',
    'approveCommission',
    'denyCommission',
    'markCommissionPaid',
    'deleteCommission',
    'viewSalesSOPs',
    'viewProductionSOPs',
    'viewAccountingSOPs',
    'editSOPs',
    'uploadSOPVersion',
    'viewProductionSchedule',
    'editProductionSchedule',
    'viewWarrantyTracker',
    'submitWarranty',
    'updateWarrantyStatus',
    'closeWarranty',
    'viewOwnTraining',
    'viewAllTraining',
    'uploadTrainingContent',
    'viewOwnProfile',
    'viewAllUsers',
    'assignRoles',
    'inviteUsers',
    'viewCredentialVault',
    'editCredentialVault',
    'submitForms',
    'viewOwnForms',
    'viewAllForms',
    'approveFormRequests',
    'submitNewHireForm',
    'viewNewHireForms',
    'completeOnboardingChecklist',
    'viewOPSCompliance',
    'issueWarning',
    'viewAuditLog',
    'viewSubcontractors',
    'submitNewSubcontractor',
    'approveSubcontractor',
    'viewCommandCenter',
    'viewPaidDrawBalance',
    'viewAllStats',
    'viewTeamStats',
    'configureCommandCenter',
  ],
};

// ─── Permission Helpers ───────────────────────────────────────

/**
 * Check if a role has a specific permission.
 * @example
 * can('admin', 'approveCommission')    // true
 * can('manager', 'approveCommission')  // false
 * can('manager', 'viewAllCommissions') // true
 * can('user', 'viewAllCommissions')    // false
 */
export function can(
  role: UserRole | undefined | null,
  permission: PermissionKey
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL specified permissions.
 * @example
 * canAll('admin', ['approveCommission', 'markCommissionPaid']) // true
 */
export function canAll(
  role: UserRole | undefined | null,
  permissions: PermissionKey[]
): boolean {
  return permissions.every((p) => can(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 * @example
 * canAny('manager', ['approveCommission', 'viewAllCommissions']) // true
 */
export function canAny(
  role: UserRole | undefined | null,
  permissions: PermissionKey[]
): boolean {
  return permissions.some((p) => can(role, p));
}

/** Get the full permission list for a role. */
export function getPermissions(role: UserRole): PermissionKey[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ─── UI Helpers ───────────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'User',
  manager: 'Manager',
  admin: 'Admin',
};

// Tailwind badge classes per role
export const ROLE_COLORS: Record<UserRole, string> = {
  user:    'bg-slate-100 text-slate-600 border border-slate-200',
  manager: 'bg-blue-50  text-blue-700  border border-blue-200',
  admin:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
  management: 'Management',
  accounting: 'Accounting',
  operations: 'Operations',
  hr_it:      'HR / IT',
  sales:      'Sales',
  production: 'Production',
  office:     'Office',
  va:         'Virtual Assistant',
};

export const ALL_ROLES: UserRole[] = ['user', 'manager', 'admin'];

export const ALL_DEPARTMENTS: Department[] = [
  'management', 'accounting', 'operations', 'hr_it',
  'sales', 'production', 'office', 'va',
];
