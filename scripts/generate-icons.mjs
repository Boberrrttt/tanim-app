/**
 * Builds Expo / Android icon PNGs from a single source raster.
 * Source: assets/images/tanim-logo.png (replace with your master artwork).
 * Run: npx --package=sharp node ./scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const img = join(__dirname, "../assets/images");
const src = join(img, "tanim-logo.png");

if (!existsSync(src)) {
  console.error("Missing assets/images/tanim-logo.png — add your PNG first.");
  process.exit(1);
}

const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// iOS / store icon: 1024, logo centered on black
await sharp(src)
  .resize(1024, 1024, { fit: "contain", position: "center", background: BLACK })
  .png()
  .toFile(join(img, "icon.png"));

await sharp(src).resize(48, 48, { fit: "contain", position: "center", background: BLACK }).png().toFile(join(img, "favicon.png"));

// Android adaptive: dark plate + centered foreground (safe zone ~66%)
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: BLACK },
})
  .png()
  .toFile(join(img, "android-icon-background.png"));

const fgSize = Math.round(1024 * 0.66);
const fgBuffer = await sharp(src)
  .resize(fgSize, fgSize, { fit: "contain", position: "center", background: CLEAR })
  .png()
  .toBuffer();

await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: CLEAR },
})
  .composite([{ input: fgBuffer, gravity: "center" }])
  .png()
  .toFile(join(img, "android-icon-foreground.png"));

// Themed / monochrome layer: white glyph from alpha (works for most flat logos)
const monoBuf = await sharp(fgBuffer).ensureAlpha().toBuffer();
const { data, info } = await sharp(monoBuf).raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i += 4) {
  const a = data[i + 3] / 255;
  out[i] = 255;
  out[i + 1] = 255;
  out[i + 2] = 255;
  out[i + 3] = Math.round(a * 255);
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile(join(img, "android-icon-monochrome.png"));

// Splash + in-app logo: preserve transparency
await sharp(src)
  .resize(200, 200, { fit: "contain", position: "center", background: CLEAR })
  .png()
  .toFile(join(img, "splash-icon.png"));

await sharp(src)
  .resize(512, 512, { fit: "contain", position: "center", background: CLEAR })
  .png()
  .toFile(join(img, "logo.png"));

console.log("Wrote icon.png, logo.png, favicon.png, android-icon-*.png, splash-icon.png from tanim-logo.png");
