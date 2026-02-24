

## Fix Build Errors and Restore App Functionality

The app is completely broken due to multiple build errors, which is why pending approvals (and everything else) can't be seen. The pending approval data IS correctly stored in the database — Anakin Armenta is pending with both `profiles.is_approved = false` and a matching `pending_approvals` row. Once these build errors are fixed, the Pending Approvals section will work as expected.

---

### Root Cause

The app has a blank screen because the build fails with type errors across several files. Fixing these will restore the entire app including the admin panel's Pending Approvals box.

---

### Fixes Required

**1. Edge Function: send-hold-notification/index.ts**
- Change `import { Resend } from "npm:resend@2.0.0"` to use the `esm.sh` CDN pattern (matching all other edge functions in the project)
- New import: `import { Resend } from "https://esm.sh/resend@2.0.0?target=deno"`

**2. src/hooks/useCommissions.ts — Missing `pay_run_id` column**
- The `commission_submissions` table does NOT have a `pay_run_id` column
- Remove `pay_run_id` from the `CommissionSubmission` interface
- Remove `pay_run_id` from the `.select()` query on line ~304
- Remove `pay_run_id` references in the pay tracking logic (~line 427)

**3. src/hooks/useCommissions.ts — Missing `email` in profile select**
- Line 197 selects `manager_id, full_name` but line 251 references `profile?.email`
- Add `email` to the select: `.select("manager_id, full_name, email")`

**4. src/hooks/useCommissions.ts — `previous_submission_snapshot` type mismatch**
- Line ~710: `Record<string, unknown>` is not assignable to `Json`
- Cast `previousSnapshot` as `Json` before passing to the update

**5. src/hooks/useEmployeeHandbook.ts — `.catch` on PromiseLike**
- Line 114: chain `.then(() => {}).catch(...)` on a PromiseLike that doesn't have `.catch`
- Wrap in a proper try/catch or use `Promise.resolve()` wrapper

**6. src/pages/CommissionDetail.tsx — Type conversion error**
- Line 147: casting `submission` as `Record<string, unknown>` fails
- Add intermediate `unknown` cast: `(submission as unknown as Record<string, unknown>)[key]`

**7. src/pages/Commissions.tsx — Type mismatch in pay run grouping**
- Line ~282: items cast to `{ scheduled_pay_date?: string | null }[]` but then `push(s)` where `s` must be full `CommissionSubmission`
- Fix the type assertion to use `any` or properly type the accumulator

---

### Technical Details

All changes are TypeScript type fixes and one edge function import fix. No database schema changes needed. No new features — purely restoring the app to a working state.

After these fixes:
- The app will load and render properly
- The Admin panel's "Users" tab will show the Pending Approvals section with Anakin Armenta listed
- All existing functionality will be restored

