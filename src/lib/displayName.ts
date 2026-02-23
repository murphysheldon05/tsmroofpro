export function formatDisplayName(
  fullName: string | null | undefined,
  email?: string | null
): string {
  const trimmed = (fullName || "").trim();
  if (trimmed) return trimmed;

  if (email) {
    const localPart = email.split("@")[0] || "";
    if (localPart) {
      const cleaned = localPart
        .replace(/[._-]+/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join(" ");
      if (cleaned) return cleaned;
    }
  }

  return "Unknown";
}

