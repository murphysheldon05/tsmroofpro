

# Domain Migration Plan: hub.tsmroofs.com → tsmroofpro.com

## Overview

This plan migrates the TSM Roofing Hub from the subdomain `hub.tsmroofs.com` to the new root domain `tsmroofpro.com`. Using a root domain (instead of a subdomain) can improve authentication redirect reliability and provides a cleaner, more professional URL.

---

## Phase 1: DNS & Hosting Configuration

### Step 1.1: Configure DNS for tsmroofpro.com

At your domain registrar, add these DNS records:

```text
Type    Name    Value
----    ----    -----
A       @       185.158.133.1
A       www     185.158.133.1
TXT     _lovable  (provided during Lovable setup)
```

### Step 1.2: Add Domain in Lovable

1. Go to Project Settings → Domains
2. Click "Connect Domain"
3. Enter `tsmroofpro.com`
4. Add `www.tsmroofpro.com` as well
5. Set `tsmroofpro.com` as the Primary domain
6. Wait for DNS propagation and SSL provisioning (up to 72 hours)

### Step 1.3: Update Backend Auth Settings

In the Lovable Cloud dashboard, update authentication settings:
- **Site URL**: `https://tsmroofpro.com`
- **Redirect URLs**: Add `https://tsmroofpro.com/**` and `https://www.tsmroofpro.com/**`

---

## Phase 2: Frontend Code Updates

### Step 2.1: Update Domain Redirect Utility

**File**: `src/lib/domainRedirect.ts`

Change the canonical domain constant:

```typescript
// OLD
const CANONICAL_DOMAIN = "hub.tsmroofs.com";

// NEW
const CANONICAL_DOMAIN = "tsmroofpro.com";
```

Also update the `getAppBaseUrl()` function comment to reflect the new domain.

### Step 2.2: Update Auth Context

**File**: `src/contexts/AuthContext.tsx`

Update the hardcoded redirect URL in the signUp function:

```typescript
// OLD
const redirectUrl = 'https://hub.tsmroofs.com/auth';

// NEW
const redirectUrl = 'https://tsmroofpro.com/auth';
```

### Step 2.3: Update main.tsx Comment

**File**: `src/main.tsx`

Update the comment to reference the new domain for clarity.

---

## Phase 3: Backend Edge Function Updates

All 11 edge functions with domain references need updating. Each function contains:
- Email "from" addresses: `notifications@hub.tsmroofs.com`
- URL constants for links in emails

### Functions to Update

| Function | Lines to Change | Updates Required |
|----------|-----------------|------------------|
| `admin-create-user` | 273, 279 | Login URL, From address |
| `resend-invite` | 166, 172 | Login URL, From address |
| `send-invite-email` | 31, 34 | Signup URL, From address |
| `notify-new-signup` | 85 | Admin URL |
| `send-approval-notification` | 39, 44 | Login URL, From address |
| `send-commission-notification` | 95 | App URL |
| `send-credentials-to-submitter` | 102, 105 | App URL, From address |
| `send-warranty-notification` | 37, 161 | From address, App URL |
| `notify-new-hire` | 59, 68 | App URL, From address |
| `send-request-notification` | 36 | From address |
| `send-test-email` | 125, 175 | Signup URL, From address |

### Example Changes (per function)

```typescript
// OLD
const loginUrl = "https://hub.tsmroofs.com/auth";
from: "TSM Roofing <notifications@hub.tsmroofs.com>",

// NEW
const loginUrl = "https://tsmroofpro.com/auth";
from: "TSM Roofing <notifications@tsmroofpro.com>",
```

---

## Phase 4: Email Sender Domain Configuration

### Step 4.1: Configure Resend for New Domain

In your Resend dashboard (https://resend.com/domains):
1. Add `tsmroofpro.com` as a verified domain
2. Add the required DNS records for email authentication (SPF, DKIM, DMARC)
3. Verify the domain

Without this step, emails from `notifications@tsmroofpro.com` will fail to send or go to spam.

---

## Phase 5: Testing & Validation

### Pre-Launch Checklist

- [ ] DNS records configured and propagated
- [ ] Domain verified in Lovable (shows "Active" status)
- [ ] SSL certificate active (green lock)
- [ ] Resend domain verified for email sending
- [ ] Backend auth settings updated
- [ ] All edge functions redeployed

### Test Scenarios

1. **Direct Access**: Visit `https://tsmroofpro.com` - should load the hub
2. **Auth Flow**: Sign up a new test user - should receive email with correct links
3. **Invite Flow**: Send an invite from Admin panel - email should point to new domain
4. **Old Domain Redirect**: Visit `https://hub.tsmroofs.com` - should redirect to new domain (if you keep the old domain pointing to Lovable)
5. **Preview Iframe**: Lovable preview should work without redirect loops

---

## Phase 6: Post-Migration

### Optional: Keep Old Domain as Redirect

If you want users who bookmarked `hub.tsmroofs.com` to still reach the app:
- Keep DNS for `hub.tsmroofs.com` pointing to Lovable
- The domain redirect logic will automatically redirect them to `tsmroofpro.com`

### Update Memory/Documentation

The system will need updated memory entries to reflect the new canonical domain.

---

## Technical Summary

### Files Modified

| File | Type |
|------|------|
| `src/lib/domainRedirect.ts` | Frontend |
| `src/contexts/AuthContext.tsx` | Frontend |
| `src/main.tsx` | Frontend (comment only) |
| `supabase/functions/admin-create-user/index.ts` | Edge Function |
| `supabase/functions/resend-invite/index.ts` | Edge Function |
| `supabase/functions/send-invite-email/index.ts` | Edge Function |
| `supabase/functions/notify-new-signup/index.ts` | Edge Function |
| `supabase/functions/send-approval-notification/index.ts` | Edge Function |
| `supabase/functions/send-commission-notification/index.ts` | Edge Function |
| `supabase/functions/send-credentials-to-submitter/index.ts` | Edge Function |
| `supabase/functions/send-warranty-notification/index.ts` | Edge Function |
| `supabase/functions/notify-new-hire/index.ts` | Edge Function |
| `supabase/functions/send-request-notification/index.ts` | Edge Function |
| `supabase/functions/send-test-email/index.ts` | Edge Function |

### Total Changes

- **14 files** to update
- **~30 line changes** across all files
- **1 external configuration** (Resend email domain)
- **2 Lovable settings** (domain + auth redirects)

---

## Estimated Timeline

| Step | Duration |
|------|----------|
| DNS Configuration | 5-10 minutes |
| DNS Propagation | Up to 72 hours |
| Code Changes | 15-20 minutes |
| Resend Domain Setup | 15 minutes + verification time |
| Testing | 30 minutes |

Most delays come from DNS propagation and email domain verification - the actual code changes are quick.

