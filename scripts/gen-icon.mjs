import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(resolve(__dirname, 'semillita-icon.svg'));
const out = resolve(__dirname, '../apps/huerto-tracker/assets');

const sizes = [
  { file: 'icon.png', size: 1024 },
  { file: 'adaptive-icon.png', size: 1024 },
  { file: 'favicon.png', size: 48 },
  { file: 'splash-icon.png', size: 256 },
];

for (const { file, size } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`${out}/${file}`);
  console.log(`✓ ${file} (${size}x${size})`);
}
