// Renders the icon design to public/icon-*.png, public/apple-touch-icon.png and public/icon.svg.
// Run with `npm run icons` (uses the Chromium that Playwright installs).
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { faviconSvg, squareSvg } from './icon-design.mjs';

const sizes = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };

const browser = await chromium.launch();
for (const [file, size] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(squareSvg).toString('base64')}`;
  await page.setContent(`<body style="margin:0"><img src="${dataUri}" width="${size}" height="${size}" style="display:block"></body>`);
  await page.screenshot({ path: `public/${file}` });
  await page.close();
}
await browser.close();
writeFileSync('public/icon.svg', faviconSvg);
console.log('icons written');
