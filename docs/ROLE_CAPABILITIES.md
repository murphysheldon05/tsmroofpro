# TSM Roof Pro — Role Capability Summary

**Access gate:** `employee_status = 'active'` (ProtectedRoute). Pending/rejected/inactive users cannot access protected routes.

**User assignment:** Single place — Admin → Users tab → Edit User. Permission level (User/Manager/Admin), Department, Manager, and Commission Tier (only when Department = Sales).

---

## User (Employee / Base Role)

**Role:** `employee` — Default for new signups. No commission tier unless assigned.

### CAN DO
- **Command Center** — View dashboard, widgets (limited by permissions)
- **Message Center** — View and participate in feed
- **Pending Review** — See own rejected commissions needing resubmission; warranty/request items as applicable
- **Playbook Library** — Master Playbook, Employee Handbook, category SOPs (visibility by section)
- **Training** — Documents, Video Library, Shingle ID, Role Onboarding, IT Request
- **Tools & Systems** — Access tools (if section visible)
- **Forms & Requests** — Submit and view own requests
- **Subs & Vendors** — Subcontractors, Contact List, Team Directory (if section visible)
- **Profile** — Edit own profile
- **Production** — Build Schedule, Delivery Schedule, Warranty Tracker (if section visible and permissions allow)

### CANNOT DO
- **Commissions** — Hidden if no commission tier. With tier: view own submissions only; cannot submit (only sales_rep/sales_manager/admin can submit)
- **Commission Tracker** — No access (no My Tracker; Tracker is manager-only)
- **Accounting** — Admin only
- **Admin Panel** — Admin only
- **New Hires** — Admin only
- Approve commissions, process payouts, manage users, edit production, approve requests, etc.

---

## Sales Rep

**Role:** `sales_rep` — Has commission tier; can submit commissions.

### CAN DO
- Everything a User can do, plus:
- **Commissions** — Submit commissions, view own submissions, edit rejected/denied
- **My Tracker** — View own commission history at `/my-commissions` (requires linked `commission_rep` row)
- **Commission Documents** — Create and manage own documents
- **Draw Requests** — Request draws (if `canRequestDraws`)
- View own commission detail; "View in Tracker" when paid

### CANNOT DO
- **Tracker** (full) — Manager-only; sales reps use My Tracker
- **Accounting** — Admin only
- **Admin Panel** — Admin only
- Approve commissions, process payouts, view other reps' data, manage users

---

## Manager / Sales Manager

**Role:** `manager` or `sales_manager` — Team oversight.

### CAN DO
- Everything a Sales Rep can do, plus:
- **Tracker** — View team commission tracker at `/commission-tracker` (read-only for managers; admins can edit)
- **Commission Submissions** — View all team submissions (scoped by `team_assignments` and `profiles.manager_id`)
- **Pending Review** — Compliance/accounting items based on role (compliance: pending_manager; accounting: pending_accounting)
- **Draw Approval** — Approve draws (if `canApproveDraws`)
- **Team Directory** — Manage team assignments (Admin Panel → Team Assignment)
- **Warranties** — Manage warranties (if `canManageWarranties`)
- **Requests** — Review and approve requests (if `canReviewRequests` / `canApproveRequests`)
- **Manager Panel** — Sidebar link to Manager-specific views

### CANNOT DO
- **Admin Panel** — Admin only (except Ops Compliance redirect)
- **Accounting** — Admin only
- Edit commission tiers, categories, tools, notification routing
- Process payouts (mark as paid), delete commissions
- Manage users (invite, roles, departments) — Admin only
- Full audit log, compliance holds, escalations

---

## Admin

**Role:** `admin` — Full system access.

### CAN DO
- **Everything** — All routes, all data
- **Admin Panel** — Users, Tiers, SOPs, Categories, Tools, Notifications, Routing, Audit, Draws, Overrides, Leaderboard, Playbook Status, Role Onboarding, Roles & Departments, Ops Compliance
- **Accounting** — Full accounting view, process payouts, mark commissions paid
- **Commission Tracker** — Full access, edit entries, bulk import, pay runs
- **User Management** — Invite, edit roles/departments/tiers/managers, reset password, delete users
- **Compliance** — Holds, escalations, violations, acknowledgments
- **Commission Workflow** — Approve, deny, request revisions, revert, delete

### CANNOT DO
- Nothing — full access

---

## Route Protection Summary

| Route | User | Sales Rep | Manager | Admin |
|-------|------|-----------|---------|-------|
| /admin | No | No | No | Yes |
| /accounting | No | No | No | Yes |
| /commission-tracker | No | No | Yes (read) | Yes (edit) |
| /my-commissions | No | Yes | No* | No* |
| /commissions | Tier only | Yes | Yes | Yes |
| All other protected | Yes | Yes | Yes | Yes |

*Managers/Admins see full Tracker instead of My Tracker.

---

## Commission Logic (States)

- **Pending Review** — `status = 'pending_review'` + stage in `pending_manager` | `pending_admin` | null
- **Ready for Payment** — `pending_accounting` OR `approved`
- **Paid This Month** — `status = 'paid'` AND `paid_at` in current month
- **Flow:** pending_manager → Compliance → pending_accounting → Accounting → approved → Mark Paid → paid
