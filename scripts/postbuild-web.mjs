// Post-process the static web export for Cloudflare: Turkish lang attribute + SPA fallback.
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'dist/index.html';
writeFileSync(file, readFileSync(file, 'utf8').replace('<html lang="en">', '<html lang="tr">'));
console.log('✓ dist ready for Cloudflare');
