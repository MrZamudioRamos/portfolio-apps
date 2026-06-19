import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconSvg = readFileSync(resolve(__dirname, 'semillita-icon.svg'));
const splashSvg = readFileSync(resolve(__dirname, 'semillita-splash.svg'));
const out = resolve(__dirname, '../apps/huerto-tracker/assets');

const icons = [
  { file: 'icon.png', size: 1024 },
  { file: 'adaptive-icon.png', size: 1024 },
  { file: 'favicon.png', size: 48 },
  { file: 'splash-icon.png', size: 256 },
];

for (const { file, size } of icons) {
  await sharp(iconSvg).resize(size, size).png().toFile(`${out}/${file}`);
  console.log(`✓ ${file} (${size}x${size})`);
}

// Splash — portrait 1284×2778
await sharp(splashSvg).resize(1284, 2778).png().toFile(`${out}/splash.png`);
console.log('✓ splash.png (1284x2778)');
