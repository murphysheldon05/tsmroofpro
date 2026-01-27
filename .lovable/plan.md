
# Streamlined Commission Workflow Implementation

## Overview

This plan consolidates the commission management system into a **single, unified workflow** where:
- **Commissions** = The form that gets submitted (the Excel-style spreadsheet form)
- **Documents** = The receipts/records of paid commissions (for export)

The workflow follows: **Rep submits → Manager reviews → Accounting approves → Paid → Document generated**

---

## Current State Analysis

**What Exists:**
- Spreadsheet-style Commission Document form with live calculations
- Separate "Submissions" and "Documents" navigation items
- Basic email notification system via edge function
- Action Required widget on Command Center
- Commission tier system restricting O&P % and profit split options

**What's Missing:**
- Unified workflow (currently two separate systems)
- In-app notifications in header
- Manager routing based on profile assignment
- Revision workflow with mandatory notes
- Dashboard metrics for reps (Submitted, Pending, Approved, Paid, Revisions)
- Manager view restricted to their assigned reps only
- Excel/PDF/Print export for paid documents

---

## Implementation Tasks

### 1. Database Schema Updates

**Modify `commission_documents` table:**
- Add `manager_id` (UUID) - assigned manager for routing
- Add `manager_approved_at` (timestamp)
- Add `manager_approved_by` (UUID)
- Add `accounting_approved_at` (timestamp)
- Add `accounting_approved_by` (UUID)
- Add `paid_at` (timestamp)
- Add `paid_by` (UUID)
- Add `revision_reason` (text) - mandatory when status = revision_required
- Add `revision_count` (integer, default 0)
- Add `submitted_at` (timestamp)
- Update `status` enum: draft → submitted → revision_required → manager_approved → accounting_approved → paid

**Create `user_notifications` table:**
- `id` (UUID, primary key)
- `user_id` (UUID, required)
- `notification_type` (text: commission_submitted, revision_required, approved, paid)
- `title` (text)
- `message` (text)
- `entity_type` (text: commission)
- `entity_id` (UUID)
- `is_read` (boolean, default false)
- `created_at` (timestamp)

**RLS Policies:**
- Sales reps: view/create their own commissions
- Managers: view/update commissions for their assigned reps only
- Admins/Accounting: view/update all commissions
- Mark as paid: only users with `can_payout` permission

---

### 2. Update Commission Document Form

**Auto-population:**
- Sales rep name auto-fills from user profile (already implemented)
- Manager ID auto-fills from profile.manager_id
- Tier-based restrictions for O&P% and profit splits (already implemented)

**Locked Formulas:**
- All calculated fields are read-only (already implemented)
- Only expense lines can be added (negatives and positives)

**Form Validation:**
- Prevent submission if no manager assigned in profile
- Show warning banner if tier not assigned

---

### 3. Unified Commission Page Restructure

**Merge "Submissions" and "Documents" into single `/commissions` route:**

**Tab Structure:**
1. **My Commissions** (default for reps) - user's own submissions
2. **Pending Review** (managers/accounting) - items awaiting their action
3. **Paid Documents** - paid commissions available for export

**Summary Dashboard Cards (role-based):**
| Metric | Sales Rep | Manager | Admin |
|--------|-----------|---------|-------|
| Total Submitted | Own only | Assigned reps | All |
| Pending Approval | Own only | Assigned reps | All |
| Approved | Own only | Assigned reps | All |
| Paid | Own only | Assigned reps | All |
| Revisions Needed | Own only | Assigned reps | All |

---

### 4. Manager Review Workflow

**When manager opens a submitted commission:**
- View all form details (read-only except approved amount)
- Can edit the final approved commission amount
- Must provide a note explaining any changes

**Action buttons:**
- **Approve** → Changes status to `manager_approved`, routes to Accounting
- **Request Revision** → Changes status to `revision_required`, mandatory reason required
- **Deny** → Changes status to `denied`, mandatory reason required

**Automatic Notifications:**
- Email to Accounting when manager approves
- Email + in-app notification to rep when revision requested
- In-app notification stores revision reason for display

---

### 5. Accounting Approval & Payment

**After Manager Approval:**
- Accounting reviews the commission
- Can adjust final approved amount with notes
- **Approve for Payment** → Status changes to `accounting_approved`

**Mark as Paid:**
- Only users with `can_payout` permission
- Sets `paid_at` timestamp
- Moves commission to "Paid Documents" tab
- Triggers paid notification to rep

---

### 6. In-App Notification System

**Header Bell Icon Component:**
- Shows unread count badge
- Dropdown shows recent notifications
- Click notification navigates to relevant commission

**Command Center Widget Enhancement:**
- Add "Revisions Needed" category to Action Required widget
- Show revision reason in the pending item card
- Direct link to edit & resubmit

**Notification Triggers:**
1. Rep submits → Notify assigned manager
2. Manager requests revision → Notify rep (email + in-app)
3. Manager approves → Notify accounting
4. Accounting approves → Notify rep
5. Marked as paid → Notify rep

---

### 7. Export Functionality

**Paid Documents Tab Features:**
- Filter by date range, sales rep (admin/manager only)
- Search by job name/ID

**Export Options:**
- **Excel/CSV**: Download filtered list with all commission details
- **PDF**: Generate printable document for individual commission
- **Print View**: Browser print-optimized layout

**Export Fields:**
- Job Name/ID, Job Date, Sales Rep
- Contract Total, O&P Amount, Material Cost, Labor Cost
- All expense lines (negative and positive)
- Net Profit, Rep Commission, Company Profit
- Status, Approved Date, Paid Date, Approved By

---

### 8. Business Rules

**Payout Deadline:**
- Display deadline reminder: "Submit by Wednesday 4 PM MST for Friday payout"
- Show this prominently in the form header

**Revision Loop:**
- When revision requested: status → `revision_required`
- Rep edits and resubmits: status → `submitted`, increment `revision_count`
- Revision reason always visible to rep

**Access Control Matrix:**
| Action | Rep | Manager | Admin | Accounting |
|--------|-----|---------|-------|------------|
| Create Commission | ✅ | ✅ | ✅ | ❌ |
| View Own | ✅ | ✅ | ✅ | ✅ |
| View Assigned Reps | ❌ | ✅ | ✅ | ✅ |
| View All | ❌ | ❌ | ✅ | ✅ |
| Approve (Manager) | ❌ | ✅ | ✅ | ❌ |
| Approve (Accounting) | ❌ | ❌ | ✅ | ✅ |
| Mark Paid | ❌ | ❌ | ✅ | ✅ |
| Export Paid | ✅ own | ✅ assigned | ✅ all | ✅ all |

---

## File Changes Summary

### New Files
- `src/components/notifications/NotificationBell.tsx` - Header notification dropdown
- `src/components/notifications/NotificationItem.tsx` - Individual notification card
- `src/hooks/useNotifications.ts` - Fetch/mark-read notifications
- `src/components/commissions/CommissionReviewPanel.tsx` - Manager/Accounting review UI
- `src/components/commissions/CommissionExportDialog.tsx` - Export options modal
- `src/lib/commissionExport.ts` - Excel/PDF generation utilities

### Modified Files
- `src/pages/Commissions.tsx` - Unified page with tabs
- `src/pages/CommissionDocuments.tsx` - Redirect to `/commissions?tab=paid`
- `src/components/commissions/CommissionDocumentForm.tsx` - Add manager routing
- `src/components/command-center/ActionRequiredWidget.tsx` - Add revision items
- `src/components/layout/AppLayout.tsx` - Add NotificationBell to header
- `src/components/layout/AppSidebar.tsx` - Simplify to single "Commissions" link
- `src/hooks/useCommissionDocuments.ts` - Add manager/accounting approval mutations
- `supabase/functions/send-commission-notification/index.ts` - Update for new flow

### Database Migrations
- Add new columns to `commission_documents`
- Create `user_notifications` table with RLS
- Update RLS policies for manager-based access

---

## Visual Flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        COMMISSION WORKFLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────┐      ┌──────────┐      ┌────────────┐      ┌──────┐  │
│   │  DRAFT  │ ───► │ SUBMITTED│ ───► │  MANAGER   │ ───► │ ACCT │  │
│   │         │      │          │      │  APPROVED  │      │APPRVD│  │
│   └─────────┘      └────┬─────┘      └────────────┘      └──┬───┘  │
│                         │                                    │      │
│                         ▼                                    ▼      │
│                    ┌──────────┐                         ┌──────┐   │
│                    │ REVISION │◄─────────────────────── │ PAID │   │
│                    │ REQUIRED │                         │      │   │
│                    └────┬─────┘                         └──────┘   │
│                         │                                          │
│                         └─── Rep edits & resubmits ───────►        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Checklist

- [ ] Sales rep can submit commission form with auto-populated name and tier
- [ ] Manager receives email when commission submitted by their assigned rep
- [ ] Manager can only view commissions from reps assigned to them
- [ ] Manager can approve, request revision, or deny with mandatory notes
- [ ] Rep receives email + in-app notification when revision requested
- [ ] Rep sees revision reason and can edit & resubmit
- [ ] Accounting can approve after manager approval
- [ ] Accounting can mark commission as paid
- [ ] Paid commissions appear in Documents tab
- [ ] Documents can be exported as Excel/CSV, PDF, or Print View
- [ ] Header shows notification bell with unread count
- [ ] Command Center shows pending revisions in Action Required widget
- [ ] Dashboard cards show correct metrics per role
- [ ] Admin can view and manage all commissions
- [ ] Deadline reminder displays in submission form
