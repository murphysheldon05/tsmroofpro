/**
 * CANONICAL DOMAIN ENFORCEMENT
 * 
 * All traffic must route through hub.tsmroofs.com.
 * If users hit any lovable domain, they are redirected to the canonical hub domain.
 * 
 * This module provides:
 * 1. Detection of non-canonical domains
 * 2. URL generation for redirects preserving path/query/hash
 * 3. Immediate redirect enforcement (called before React renders)
 */

const CANONICAL_DOMAIN = "hub.tsmroofs.com";
const LOVABLE_DOMAIN_PATTERNS = [".lovable.dev", ".lovable.app"];

/**
 * Check if current hostname is a Lovable preview/dev domain
 */
export function isLovableDomain(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return LOVABLE_DOMAIN_PATTERNS.some(pattern => hostname.endsWith(pattern));
}

/**
 * Check if we should show the redirect page
 * Returns true if on a non-canonical domain that needs redirecting
 */
export function shouldShowRedirectPage(): boolean {
  return isLovableDomain();
}

/**
 * Get the full canonical URL preserving path, query, and hash
 */
export function getCanonicalUrl(): string {
  if (typeof window === "undefined") return `https://${CANONICAL_DOMAIN}`;
  const { pathname, search, hash } = window.location;
  return `https://${CANONICAL_DOMAIN}${pathname}${search}${hash}`;
}

/**
 * Redirect to canonical domain if on a Lovable domain
 * Preserves the full path and query string
 * 
 * NOTE: This is now a fallback. The primary redirect happens in index.html
 * via an early script that runs before React loads.
 */
export function enforceCanonicalDomain(): void {
  if (isLovableDomain()) {
    const canonicalUrl = getCanonicalUrl();
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
