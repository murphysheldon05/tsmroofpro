/** Capitalize first letter of each word (e.g. "sheldon murphy" → "Sheldon Murphy"). */
function toTitleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Split camelCase/PascalCase into words (e.g. "JordanPollei" → ["Jordan", "Pollei"]). */
function splitCamelCase(s: string): string[] {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Derive "First Last" from email local part (e.g. "sheldon.murphy" or "first_last" → "Sheldon Murphy"). */
function parseNameFromEmail(email: string): string | null {
  const localPart = email.split("@")[0] || "";
  if (!localPart) return null;
  const cleaned = localPart
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
  return cleaned || null;
}

/**
 * Format a user's display name for UI.
 * - If fullName has spaces: title-case it (e.g. "sheldon murphy" → "Sheldon Murphy").
 * - If fullName has no space (e.g. "JordanPollei", "sheldonmurphy"): try email first (first.last@domain → First Last),
 *   then camelCase split. Prefer email when it yields "First Last" to fix email-handle-as-username.
 * - If no fullName: derive from email, or show email as fallback until user sets name.
 */
export function formatDisplayName(
  fullName: string | null | undefined,
  email?: string | null
): string {
  const trimmed = (fullName || "").trim();

  // Case 1: Proper full name with space(s)
  if (trimmed && trimmed.includes(" ")) {
    return toTitleCase(trimmed);
  }

  // Case 2: fullName exists but no space — try email first (first.last@domain → First Last)
  if (trimmed) {
    if (email) {
      const fromEmail = parseNameFromEmail(email);
      if (fromEmail && fromEmail.includes(" ")) {
        return fromEmail; // e.g. "sheldon.murphy@domain" → "Sheldon Murphy"
      }
    }
    // Try camelCase split (e.g. "JordanPollei" → "Jordan Pollei")
    const camelSplit = splitCamelCase(trimmed);
    if (camelSplit.length > 1) {
      return toTitleCase(camelSplit.join(" "));
    }
    // Email gave single word or no email — use email result if available
    if (email) {
      const fromEmail = parseNameFromEmail(email);
      if (fromEmail) return fromEmail;
    }
    // Single word: title-case it
    return toTitleCase(trimmed);
  }

  // Case 3: No fullName — use email to derive name or show email as fallback
  if (email) {
    const fromEmail = parseNameFromEmail(email);
    if (fromEmail) return fromEmail;
    // Fallback: show email until user sets their name
    return email;
  }

  return "Unknown";
}
