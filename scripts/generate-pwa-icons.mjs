import sharp from "sharp";

const source = "public/icon.svg";
const targets = [
  { path: "public/apple-touch-icon-180.png", size: 180 },
  { path: "public/pwa-192x192.png", size: 192 },
  { path: "public/pwa-512x512.png", size: 512 },
  { path: "public/maskable-icon-512x512.png", size: 512 }
];

for (const target of targets) {
  await sharp(source)
    .resize(target.size, target.size)
    .png()
    .toFile(target.path);
}

console.log("PWA icons generated.");
