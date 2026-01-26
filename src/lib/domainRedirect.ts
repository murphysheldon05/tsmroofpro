/**
 * CANONICAL DOMAIN ENFORCEMENT
 * 
 * All traffic must route through hub.tsmroofs.com.
 * If users hit any lovable domain, they are redirected to the canonical hub domain.
 */

const CANONICAL_DOMAIN = "hub.tsmroofs.com";
const LOVABLE_DOMAIN_PATTERNS = [".lovable.dev", ".lovable.app"];

/**
 * Lovable preview runs inside an iframe. Redirecting inside the iframe causes
 * the preview to constantly navigate/reload and/or hit frame restrictions.
 * Canonical enforcement should only happen for top-level navigation.
 */
function isInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access to window.top can throw; treat as iframe.
    return true;
  }
}

/**
 * Check if current hostname is a Lovable preview/dev domain
 */
export function isLovableDomain(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return LOVABLE_DOMAIN_PATTERNS.some(pattern => hostname.endsWith(pattern));
}

/**
 * Redirect to canonical domain if on a Lovable domain
 * Preserves the full path and query string
 */
export function enforceCanonicalDomain(): void {
  // Never enforce inside the Lovable preview iframe.
  if (isInIframe()) return;

  if (isLovableDomain()) {
    const { pathname, search, hash } = window.location;
    const canonicalUrl = `https://${CANONICAL_DOMAIN}${pathname}${search}${hash}`;
    console.log(`[Domain Redirect] Redirecting from ${window.location.hostname} to ${CANONICAL_DOMAIN}`);
    window.location.replace(canonicalUrl);
  }
}

/**
 * Get the canonical app base URL
 * Always returns https://hub.tsmroofs.com for production use
 */
export function getAppBaseUrl(): string {
  return `https://${CANONICAL_DOMAIN}`;
}
