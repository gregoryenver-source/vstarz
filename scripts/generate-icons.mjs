import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const src = path.join(root, "scripts/app-icon-source.png");
const iconsDir = path.join(root, "public/icons");
mkdirSync(iconsDir, { recursive: true });

// Requires: bun add -d sharp  (one-time dev dependency for regenerating icons)

// Square center-crop so a non-square source doesn't squash; then resize.
const meta = await sharp(src).metadata();
const side = Math.min(meta.width, meta.height);
const crop = () =>
  sharp(src).extract({
    left: Math.round((meta.width - side) / 2),
    top: Math.round((meta.height - side) / 2),
    width: side,
    height: side,
  });

async function make(size, out, { maskable = false } = {}) {
  let pipeline = crop().resize(size, size, { fit: "cover" });

  if (maskable) {
    // Maskable icons need full-bleed art inside the safe zone (~80%).
    // Shrink the art first, then pad back to exactly `size`.
    const art = Math.round(size * 0.8);
    const pad = Math.round((size - art) / 2);
    pipeline = crop()
      .resize(art, art, { fit: "cover" })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      });
  }

  await pipeline.png({ compressionLevel: 9 }).toFile(path.join(iconsDir, out));
  console.log(`✓ ${out} (${size}x${size})`);
}

await make(512, "icon-512.png");
await make(192, "icon-192.png");
await make(180, "apple-touch-icon.png");
await make(512, "maskable-512.png", { maskable: true });

// favicon-64.png lives at public/ root (referenced from index.html)
await crop()
  .resize(64, 64, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "public/favicon-64.png"));
console.log("✓ favicon-64.png (64x64)");
