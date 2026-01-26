

# TSM Hub Invite Flow Fix & Domain Enforcement Enhancement

## Problem Summary

When managers receive invite emails and click the link to `https://hub.tsmroofs.com/auth`, they are somehow ending up on a Lovable platform login page ("Access Denied" screen) instead of the TSM Hub signup page. This is preventing them from creating accounts.

## Root Cause Analysis

The invite email link is correctly configured (`https://hub.tsmroofs.com/auth`), but users are still hitting the wrong domain. Possible causes:

1. **Race condition**: The domain redirect in `main.tsx` runs via JavaScript, meaning users on a preview URL briefly see the app before being redirected
2. **Cached redirects**: Browser may have cached an old redirect from when the site was still pointing to preview URLs
3. **Link tracking/email clients**: Some email clients preview links through their own servers or modify URLs

## Implementation Plan

### Part 1: Test Invite Email Verification

I will send a test invite to verify the email content is correct and the link works as expected.

**Steps:**
1. Deploy a quick test by calling the `send-invite-email` edge function directly with a test email address
2. Verify the email arrives with the correct `https://hub.tsmroofs.com/auth` link
3. Confirm clicking the link lands on the correct TSM Hub signup page

---

### Part 2: Enhanced Domain Enforcement with Visual Feedback

Create a more robust redirect system that shows users a brief, branded message while redirecting them to the correct domain, preventing any confusion.

**Technical Changes:**

#### 1. Create a Dedicated Redirect Page Component
- **File**: `src/pages/DomainRedirect.tsx`
- Shows a branded TSM Hub message: "Redirecting you to TSM Hub..."
- Displays a spinner/loading indicator
- Auto-redirects after 1 second to give visual feedback
- Prevents the "flash" of the wrong domain

#### 2. Update Domain Redirect Logic
- **File**: `src/lib/domainRedirect.ts`
- Add a check that prevents app rendering on wrong domain
- Store redirect state in sessionStorage to prevent loops

#### 3. Modify Main Entry Point
- **File**: `src/main.tsx`
- Before rendering the app, check if on wrong domain
- If on wrong domain, show redirect page component instead of main app
- This prevents any authenticated routes from triggering on preview domains

#### 4. Add Meta Redirect Fallback
- **File**: `index.html`
- Add a `<noscript>` redirect for users with JavaScript disabled
- Add early-executing script in `<head>` that redirects before React loads

---

### Part 3: User Experience During Redirect

When someone accidentally hits a preview URL, they will see:

```
┌────────────────────────────────────────┐
│                                        │
│         [TSM Logo]                     │
│                                        │
│    Redirecting to TSM Hub...           │
│         ⟳ (spinner)                    │
│                                        │
│    Please wait while we redirect you   │
│    to the correct site.                │
│                                        │
└────────────────────────────────────────┘
```

After 1 second, they automatically land on `https://hub.tsmroofs.com` with their intended path preserved.

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/DomainRedirect.tsx` | Create | Friendly redirect page component |
| `src/lib/domainRedirect.ts` | Modify | Enhanced redirect logic with blocking |
| `src/main.tsx` | Modify | Render redirect page when on wrong domain |
| `index.html` | Modify | Add early redirect script in `<head>` |

---

## Testing Verification

After implementation:
1. Access any `*.lovable.app` or `*.lovable.dev` URL - should show redirect page then land on `hub.tsmroofs.com`
2. Access `hub.tsmroofs.com/auth` directly - should show login/signup page normally
3. Send a test invite email and click the link - should land on signup page
4. Test in incognito mode to simulate a fresh manager experience

---

## Technical Details

### Early Head Script (index.html)
```javascript
<script>
(function() {
  var h = window.location.hostname;
  if (h.endsWith('.lovable.dev') || h.endsWith('.lovable.app')) {
    var url = 'https://hub.tsmroofs.com' + window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(url);
  }
})();
</script>
```

This runs immediately before any other JavaScript loads, catching users on the wrong domain before React even starts.

### Redirect Page Component
A simple, fast-loading component that:
- Shows TSM branding for trust
- Displays clear messaging about what's happening
- Redirects programmatically after a brief delay
- Works as a fallback if the head script doesn't execute

---

## Expected Outcome

- **Managers clicking invite links** will always land on `hub.tsmroofs.com/auth`
- **Anyone accidentally hitting a preview URL** will be smoothly redirected with a friendly message
- **No more "Access Denied" confusion** from hitting Lovable platform pages
- **Preserved paths and query strings** ensure deep links work correctly

