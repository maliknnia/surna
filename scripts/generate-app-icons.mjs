/**
 * Generate PWA + native app icons from client/public/brand/app-icon-source.png
 * Usage: node scripts/generate-app-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "client/public/brand/app-icon-source.png");
const ICONS_DIR = path.join(ROOT, "client/public/icons");
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function renderSquare(size, paddingRatio, dest) {
  const padding = Math.round(size * paddingRatio);
  const inner = size - padding * 2;
  const logo = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: BG })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(dest);
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error("Missing source:", SOURCE);
    process.exit(1);
  }

  fs.mkdirSync(ICONS_DIR, { recursive: true });

  const pwaSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  for (const size of pwaSizes) {
    const out = path.join(ICONS_DIR, `icon-${size}.png`);
    await renderSquare(size, 0.06, out);
    console.log("wrote", out);
  }

  for (const size of [192, 512]) {
    const out = path.join(ICONS_DIR, `maskable-icon-${size}.png`);
    await renderSquare(size, 0.12, out);
    console.log("wrote", out);
  }

  // Favicon
  await renderSquare(32, 0.06, path.join(ROOT, "client/public/favicon.png"));
  console.log("wrote favicon.png");

  // iOS universal 1024
  const iosIcon = path.join(
    ROOT,
    "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  );
  fs.mkdirSync(path.dirname(iosIcon), { recursive: true });
  await renderSquare(1024, 0.06, iosIcon);
  console.log("wrote", iosIcon);

  // Android launcher + foreground (white bg already in values)
  const androidSizes = {
    mdpi: 48,
    hdpi: 72,
    xhdpi: 96,
    xxhdpi: 144,
    xxxhdpi: 192,
  };
  const androidFgSizes = {
    mdpi: 108,
    hdpi: 162,
    xhdpi: 216,
    xxhdpi: 324,
    xxxhdpi: 432,
  };

  for (const [density, size] of Object.entries(androidSizes)) {
    const dir = path.join(ROOT, `android/app/src/main/res/mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of ["ic_launcher.png", "ic_launcher_round.png"]) {
      const out = path.join(dir, name);
      await renderSquare(size, 0.06, out);
      console.log("wrote", out);
    }
  }

  for (const [density, size] of Object.entries(androidFgSizes)) {
    const out = path.join(
      ROOT,
      `android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`,
    );
    await renderSquare(size, 0.12, out);
    console.log("wrote", out);
  }

  // Shortcut icons (reuse 96)
  for (const name of ["shortcut-feed", "shortcut-events", "shortcut-teams", "shortcut-messages"]) {
    const out = path.join(ICONS_DIR, `${name}.png`);
    await renderSquare(96, 0.06, out);
    console.log("wrote", out);
  }

  // Brand logo copy for og:image etc.
  await renderSquare(512, 0.06, path.join(ROOT, "client/public/brand/surna-logo.png"));
  console.log("wrote surna-logo.png");

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
