// MatinDesk — generate PWA icons from an SVG mark using sharp.
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const OUT = "/home/z/my-project/public/icons";
fs.mkdirSync(OUT, { recursive: true });

// Rounded-square emerald gradient + white "M" desk mark
const svg = (pad = 0) => `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0ea373"/>
      <stop offset="1" stop-color="#065f46"/>
    </linearGradient>
  </defs>
  <rect x="${pad}" y="${pad}" width="${512 - pad * 2}" height="${512 - pad * 2}" rx="${96 - pad * 0.6}" fill="url(#g)"/>
  <g transform="translate(256,${252 - pad})">
    <rect x="-140" y="60" width="280" height="26" rx="13" fill="#ffffff" opacity="0.95"/>
    <path d="M -105 40 L -105 -70 L -52 0 L 0 -70 L 0 40" fill="none" stroke="#ffffff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 40 -70 L 40 40" stroke="#a7f3d0" stroke-width="30" stroke-linecap="round"/>
    <circle cx="40" cy="-96" r="17" fill="#a7f3d0"/>
  </g>
</svg>`;

(async () => {
  const jobs = [
    { file: "icon-512.png", size: 512, pad: 0 },
    { file: "icon-192.png", size: 192, pad: 0 },
    { file: "icon-180.png", size: 180, pad: 0 },
    { file: "maskable-512.png", size: 512, pad: 56 },
  ];
  for (const j of jobs) {
    await sharp(Buffer.from(svg(j.pad)))
      .resize(j.size, j.size)
      .png()
      .toFile(path.join(OUT, j.file));
    console.log("wrote", j.file);
  }
})();
