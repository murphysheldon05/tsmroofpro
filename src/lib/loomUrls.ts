/** Loom share/embed IDs are hex strings (32 chars), sometimes with hyphens in older links. */
const LOOM_ID_PATTERN = /loom\.com\/(?:share|embed)\/([a-fA-F0-9-]+)/;

export function extractLoomVideoId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(LOOM_ID_PATTERN);
  if (!match) return null;
  return match[1].replace(/-/g, "");
}

export function buildLoomShareUrl(loomVideoId: string): string {
  return `https://www.loom.com/share/${loomVideoId}`;
}

export function buildLoomEmbedUrl(loomVideoId: string): string {
  return `https://www.loom.com/embed/${loomVideoId}`;
}
