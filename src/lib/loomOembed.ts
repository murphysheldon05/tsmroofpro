/** Loom oEmbed JSON (subset). See https://dev.loom.com/docs/embed-sdk/api */
type LoomOembedResponse = {
  thumbnail_url?: string;
};

/**
 * Fetches Loom video metadata for a share URL. Works from Node (backfill scripts);
 * from the browser, CORS may block — callers should treat null as acceptable.
 */
export async function fetchLoomOembedMeta(shareUrl: string): Promise<{ thumbnailUrl: string | null }> {
  const trimmed = shareUrl.trim();
  if (!trimmed) return { thumbnailUrl: null };

  const endpoint = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(trimmed)}`;
  const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!res.ok) return { thumbnailUrl: null };

  const data = (await res.json()) as LoomOembedResponse;
  let thumb = typeof data.thumbnail_url === "string" && data.thumbnail_url.length > 0 ? data.thumbnail_url : null;
  if (thumb && thumb.includes("private-video")) thumb = null;
  return { thumbnailUrl: thumb };
}

/** Treat Loom “private” oEmbed placeholder as missing so the UI can fall back to a play tile. */
export function normalizeLoomThumbnailUrl(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (t.includes("private-video")) return null;
  return t;
}
