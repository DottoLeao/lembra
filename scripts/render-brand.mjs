// Renderiza os SVGs de assets/brand em PNG com o Chromium do Playwright,
// para o wordmark sair com a Fraunces de verdade (o librsvg não carrega woff2).
// Uso: node scripts/render-brand.mjs <arquivo.svg> <saida.png> <largura> [altura] [--transparent]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const fontFile = require.resolve('@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2');

const [svgPath, outPath, w, h = w, flag] = process.argv.slice(2);
const width = Number(w);
const height = Number(h);
const svg = readFileSync(resolve(svgPath), 'utf8');

const html = `<!doctype html><html><head><style>
@font-face { font-family: 'Fraunces Variable'; font-weight: 100 900; src: url('${pathToFileURL(fontFile)}') format('woff2'); }
html, body { margin: 0; background: transparent; }
svg { display: block; width: ${width}px; height: ${height}px; }
</style></head><body>${svg}</body></html>`;

// CHROMIUM_PATH permite usar um Chromium já instalado em vez do baixado pelo Playwright
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width, height } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: resolve(outPath), omitBackground: flag === '--transparent' });
await browser.close();
