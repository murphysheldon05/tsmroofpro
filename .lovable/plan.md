

# Plan: Revert to Self-Signup & Purge Tim Brown

## Summary
You want to undo the invite-only changes and go back to allowing users to create their own accounts via the signup page. Additionally, you want to completely remove `timbrown@tsmroofs.com` from all database records so he can register fresh.

---

## Part 1: Complete Purge of Tim Brown

**Current Records Found:**
- Profile ID: `7f380256-1da8-4c05-a3d4-81be992f90b5`
- User role: `employee`
- Pending approval record exists
- 2 audit log entries referencing Tim Brown

**Database Deletions Required:**
| Table | Record |
|-------|--------|
| `profiles` | ID: `7f380256-1da8-4c05-a3d4-81be992f90b5` |
| `user_roles` | user_id: `7f380256-1da8-4c05-a3d4-81be992f90b5` |
| `pending_approvals` | entity_id: `7f380256-1da8-4c05-a3d4-81be992f90b5` |
| `admin_audit_log` | 2 entries with object_id referencing timbrown@tsmroofs.com |
| `auth.users` | Delete via edge function |

---

## Part 2: Revert Signup Page (Enable Self-Registration)

**File:** `src/pages/Signup.tsx`

**Current State:** Shows "Invite Only" message, blocks all signups

**Revert To:** Full signup form that allows users to create their own accounts with:
- Email field
- Password field (with show/hide toggle)
- Full name field
- Terms/consent checkbox
- Password strength indicator
- Form validation
- Submit button that calls `signUp()` from AuthContext
- Pending approval message after successful signup

---

## Part 3: Revert Auth Page Link

**File:** `src/pages/Auth.tsx`

**Current State:**
```tsx
Need access? <a href="mailto:sheldonmurphy@tsmroofs.com">Request an invite</a>
```

**Revert To:**
```tsx
Don't have an account? <button onClick={() => navigate("/signup")}>Create one</button>
```

---

## Part 4: Revert Invite Email

**File:** `supabase/functions/send-invite-email/index.ts`

**Current State:** Points to `/auth` with "Sign In" messaging

**Revert To:** Points to `/signup` with "Create My Account" messaging:
- URL: `https://tsmroofpro.com/signup`
- Button text: "Create My Account"
- Instructions about creating account and awaiting approval

---

## Technical Summary

| Action | Details |
|--------|---------|
| Delete from `profiles` | 1 record |
| Delete from `user_roles` | 1 record |
| Delete from `pending_approvals` | 1 record |
| Delete from `admin_audit_log` | 2 records |
| Delete from `auth.users` | Via admin-delete-user function |
| Rewrite `Signup.tsx` | Full signup form with email/password/name |
| Edit `Auth.tsx` | Restore "Create one" link |
| Edit `send-invite-email` | Restore `/signup` URL and messaging |

---

## User Flow After Changes

1. **Tim Brown** visits `tsmroofpro.com/signup`
2. Enters email, password, and full name
3. Clicks "Create Account"
4. Sees "Pending Approval" message
5. Admin approves → Tim gets access

Invited users will also follow the same flow—they receive an email pointing to `/signup` where they create their own password and account.

