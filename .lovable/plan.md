

# Enhanced Commission Payment Notification System

## Overview

This update adds a **celebratory email notification with scheduled pay date** when Accounting approves a commission for payment. The pay date is calculated based on the Wednesday 4 PM MST deadline rule and displayed throughout the commission lifecycle.

---

## New Requirements

1. **Celebratory Email on Accounting Approval**: Send an exciting email to the rep/manager when their commission is approved for payment
2. **Scheduled Pay Date Calculation**: Automatically calculate the Friday pay date based on when the commission was approved
3. **Pay Date Display in Hub**: Show the scheduled pay date on approved commissions in the Commission list/detail view
4. **Pay Date in Email**: Include the calculated Friday pay date in the approval notification

---

## Business Logic: Pay Date Calculation

The pay date follows this rule:
- **If approved by Wednesday 4 PM MST** → Paid on **that Friday**
- **If approved after Wednesday 4 PM MST** → Paid on **next Friday**

```text
Example Timeline:
- Approved Monday 10 AM MST     → Pays Friday (same week)
- Approved Wednesday 2 PM MST   → Pays Friday (same week)
- Approved Wednesday 5 PM MST   → Pays Friday (next week)
- Approved Thursday 9 AM MST    → Pays Friday (next week)
```

---

## Implementation Tasks

### 1. Database Schema Update

**Add new column to `commission_documents` table:**
- `scheduled_pay_date` (DATE, nullable) - Calculated Friday pay date, set when accounting approves

This field gets populated when:
- Status changes to `accounting_approved`
- Calculated based on the approval timestamp

---

### 2. Pay Date Calculation Utility

**Create utility function in `src/lib/commissionPayDateCalculations.ts`:**

```typescript
// Calculate the scheduled Friday pay date based on approval time
// Rule: Approved by Wednesday 4 PM MST = same week Friday
//       Approved after Wednesday 4 PM MST = next week Friday

export function calculateScheduledPayDate(approvalDate: Date): Date {
  // Convert to MST (UTC-7)
  const mstOffset = -7 * 60; // minutes
  const approvalMST = new Date(approvalDate.getTime() + (mstOffset - approvalDate.getTimezoneOffset()) * 60000);
  
  const dayOfWeek = approvalMST.getDay(); // 0=Sun, 3=Wed, 5=Fri
  const hour = approvalMST.getHours();
  
  // Wednesday = 3, deadline is 4 PM (16:00)
  const isBeforeDeadline = dayOfWeek < 3 || (dayOfWeek === 3 && hour < 16);
  
  // Calculate days until Friday
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0) daysUntilFriday = 7; // If Friday, go to next Friday
  
  if (!isBeforeDeadline) {
    daysUntilFriday += 7; // Push to next week
  }
  
  const payDate = new Date(approvalMST);
  payDate.setDate(payDate.getDate() + daysUntilFriday);
  return payDate;
}

export function formatPayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}
```

---

### 3. Update Edge Function for Celebratory Email

**Modify `supabase/functions/send-commission-notification/index.ts`:**

Add new payload field and update the `accounting_approved` email template:

**New Payload Field:**
```typescript
interface CommissionNotification {
  // ... existing fields
  scheduled_pay_date?: string; // ISO date string of Friday pay date
}
```

**Updated Email Template for `accounting_approved`:**

```typescript
case "accounting_approved":
  const payDateFormatted = payload.scheduled_pay_date 
    ? new Date(payload.scheduled_pay_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      })
    : 'this Friday';
    
  subject = `🎉 Commission Approved - Payment Scheduled for ${payDateFormatted}!`;
  heading = "Congratulations! Your Commission is Approved! 🎉";
  introText = `Great news! Your commission for ${payload.job_name} has been fully approved by accounting and is scheduled to be paid!`;
  headerColor = "#059669";
  recipientEmails = payload.submitter_email ? [payload.submitter_email] : [];
  
  additionalPlainText = `
Job: ${payload.job_name}
Commission Amount: ${formatCurrency(payload.net_commission_owed)}
Payment Date: ${payDateFormatted}

🎉 Your hard work is paying off! This commission will be deposited on ${payDateFormatted}.
`;

  additionalContent = `
    <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Job:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${payload.job_name}</td></tr>
    <tr><td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Commission Amount:</strong></td><td style="padding: 10px 0; color: #16a34a; font-weight: bold; font-size: 24px;">${formatCurrency(payload.net_commission_owed)}</td></tr>
    <tr><td style="padding: 10px 0;"><strong>Payment Date:</strong></td><td style="padding: 10px 0; color: #1e40af; font-weight: bold; font-size: 20px;">📅 ${payDateFormatted}</td></tr>
    <tr><td colspan="2" style="padding: 25px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; margin-top: 15px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 10px;">🎉💰🎉</div>
      <div style="font-size: 18px; font-weight: bold; color: #166534;">Your hard work is paying off!</div>
      <div style="font-size: 14px; color: #15803d; margin-top: 5px;">Payment will be deposited on ${payDateFormatted}</div>
    </td></tr>
  `;
  break;
```

---

### 4. Update Commission Documents Hook

**Modify `src/hooks/useCommissionDocuments.ts`:**

Add the pay date calculation when status changes to `accounting_approved`:

```typescript
// Add to CommissionDocument interface:
scheduled_pay_date: string | null;

// Update useUpdateCommissionDocumentStatus mutation:
mutationFn: async ({ id, status, approval_comment }) => {
  const updateData: Partial<CommissionDocument> = { status };
  
  if (status === 'accounting_approved') {
    // Calculate scheduled pay date
    const now = new Date();
    const payDate = calculateScheduledPayDate(now);
    updateData.scheduled_pay_date = payDate.toISOString().split('T')[0]; // YYYY-MM-DD
    updateData.approved_by = user?.id || null;
    updateData.approved_at = new Date().toISOString();
  }
  
  // ... rest of mutation
}
```

---

### 5. Display Pay Date in Commission Hub

**Update Commission List/Detail Views:**

Add a "Scheduled Pay Date" column/badge that appears when status is `manager_approved` or later:

```text
┌────────────────────────────────────────────────────────────────┐
│ Job Name       │ Status              │ Scheduled Pay Date      │
├────────────────────────────────────────────────────────────────┤
│ Smith Roof     │ Manager Approved    │ Est. Friday, Jan 31     │
│ Jones Project  │ Accounting Approved │ 📅 Friday, Jan 31       │
│ Brown House    │ Paid                │ ✅ Paid Jan 31          │
└────────────────────────────────────────────────────────────────┘
```

**Badge States:**
- `manager_approved`: Shows "Est." prefix (pending accounting)
- `accounting_approved`: Shows calendar icon with confirmed date
- `paid`: Shows checkmark with actual paid date

---

### 6. Update Notification Trigger

**When Accounting Approves:**

1. Calculate `scheduled_pay_date` using the utility function
2. Store in database
3. Send celebratory email with pay date to submitter
4. Create in-app notification with pay date

---

## File Changes Summary

### New Files
- `src/lib/commissionPayDateCalculations.ts` - Pay date calculation utility

### Modified Files
- `src/hooks/useCommissionDocuments.ts` - Add scheduled_pay_date to interface, update status mutation
- `src/hooks/useCommissionNotifications.ts` - Include scheduled_pay_date in notification payload
- `supabase/functions/send-commission-notification/index.ts` - Enhanced celebratory email template
- Commission list/detail components - Display scheduled pay date badge

### Database Migration
- Add `scheduled_pay_date` column to `commission_documents` table

---

## Email Preview

**Subject:** 🎉 Commission Approved - Payment Scheduled for Friday, January 31, 2026!

**Body:**
```
┌─────────────────────────────────────────────────────────────┐
│           🎉 Congratulations! Your Commission              │
│                    is Approved! 🎉                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Great news! Your commission for Smith Residential Roof    │
│  has been fully approved by accounting and is scheduled    │
│  to be paid!                                                │
│                                                             │
│  Job:              Smith Residential Roof                   │
│  Commission:       $2,450.00                                │
│  Payment Date:     📅 Friday, January 31, 2026              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              🎉💰🎉                                  │   │
│  │       Your hard work is paying off!                 │   │
│  │   Payment will be deposited on Friday, Jan 31      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              [View Commission Details]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Acceptance Checklist

- [ ] New `scheduled_pay_date` column added to `commission_documents` table
- [ ] Pay date calculated correctly: Wed 4 PM MST cutoff for same-week Friday
- [ ] Pay date stored in database when accounting approves
- [ ] Celebratory email sent to rep/manager on accounting approval
- [ ] Email includes job name, commission amount, and scheduled pay date
- [ ] Email has celebratory design with emojis and green success styling
- [ ] Commission Hub shows scheduled pay date on approved commissions
- [ ] Estimated pay date shows for manager-approved (pending accounting)
- [ ] Confirmed pay date shows for accounting-approved/paid
- [ ] In-app notification also includes pay date information

