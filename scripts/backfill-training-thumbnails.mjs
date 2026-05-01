/**
 * One-off: fill thumbnailUrl on each entry in src/data/training-videos.json via Loom oEmbed.
 * Run from repo root: node scripts/backfill-training-thumbnails.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, "..", "src", "data", "training-videos.json");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchThumb(shareUrl) {
  const endpoint = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(shareUrl)}`;
  const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  const u = typeof data.thumbnail_url === "string" && data.thumbnail_url.length > 0 ? data.thumbnail_url : null;
  if (u && u.includes("private-video")) return null;
  return u;
}

async function main() {
  const raw = await readFile(jsonPath, "utf8");
  const catalog = JSON.parse(raw);
  let updated = 0;
  let skipped = 0;

  for (const cat of catalog.categories) {
    for (const v of cat.videos) {
      if (v.thumbnailUrl) {
        skipped++;
        continue;
      }
      const thumb = await fetchThumb(v.shareUrl);
      if (thumb) {
        v.thumbnailUrl = thumb;
        updated++;
      }
      await sleep(350);
    }
  }

  let total = 0;
  for (const cat of catalog.categories) {
    cat.videoCount = cat.videos.length;
    total += cat.videos.length;
  }
  catalog.totalVideos = total;

  await writeFile(jsonPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`Done. Set thumbnailUrl on ${updated} videos, skipped ${skipped} (already had thumb).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
