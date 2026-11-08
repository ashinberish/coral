/**
 * Renders store/launcher icons from the brand geometry in assets/brand/.
 * Usage: pnpm --filter @coral/mobile icons
 *
 * Outputs (assets/images/):
 *  icon.png                      1024² full-bleed tile (iOS masks corners; no transparency)
 *  splash-icon.png               white glyph, transparent (on coral splash background)
 *  android-icon-foreground.png   glyph inside the adaptive-icon safe zone, transparent
 *  android-icon-monochrome.png   single-colour glyph for themed icons
 *  favicon.png                   48² rounded tile
 *  assets/brand/icon.svg         the source SVG of the app icon (for design tools)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const part = readFileSync(join(root, 'assets/brand/glyph.svg.part'), 'utf8');
const glyph = (fill, eye = fill) => part.replaceAll('{FILL}', fill).replaceAll('{EYE}', eye);

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF8A6E"/><stop offset=".55" stop-color="#FF5E4D"/><stop offset="1" stop-color="#F0402F"/>
    </linearGradient>
    <linearGradient id="sea" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="60">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFE0D8"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2.2" stdDeviation="1.8" flood-color="#8E1D10" flood-opacity=".35"/>
    </filter>
    <clipPath id="round"><rect width="120" height="120" rx="27"/></clipPath>
  </defs>`;

const lifted = (transform) => `
  <g transform="${transform}" filter="url(#shadow)">
    <g transform="translate(0 2.4)">${glyph('#C8352A')}</g>
    ${glyph('url(#sea)', '#E8483A')}
  </g>`;

const tile = (rounded) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${defs}
  <g ${rounded ? 'clip-path="url(#round)"' : ''}>
    <rect width="120" height="120" fill="url(#bg)"/>
    <ellipse cx="60" cy="-6" rx="86" ry="58" fill="url(#gloss)"/>
    <rect y="116" width="120" height="4" fill="#C9301F" opacity=".35"/>
  </g>
  ${lifted('translate(9 12) scale(1.5)')}
</svg>`;

// Glyph alone, centred; `scale` controls how much of the canvas it fills.
const glyphOnly = (fill, eye, scale) => {
  const offset = (120 - 64 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <g transform="translate(${offset - 3 * scale} ${offset}) scale(${scale})">${glyph(fill, eye)}</g>
</svg>`;
};

function render(svg, size, file) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(root, 'assets/images', file), png);
  console.log(`✓ ${file} (${size}px)`);
}

writeFileSync(join(root, 'assets/brand/icon.svg'), tile(false).trim() + '\n');
render(tile(false), 1024, 'icon.png');
render(tile(true), 48, 'favicon.png');
render(glyphOnly('#FFFFFF', '#FF5E4D', 1.5), 1024, 'splash-icon.png');
// Adaptive icons: keep the glyph within the central 66% safe zone.
render(glyphOnly('#FFFFFF', '#FF5E4D', 1.15), 1024, 'android-icon-foreground.png');
render(glyphOnly('#FFFFFF', '#FFFFFF00', 1.15), 1024, 'android-icon-monochrome.png');
