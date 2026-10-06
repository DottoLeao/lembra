import { readFileSync } from 'node:fs';
import type { Browser } from '@playwright/test';

const font = readFileSync('node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2').toString('base64');
const FACE = `@font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; }`;

/** Monta uma imagem de loja: legenda em cima, captura do app embaixo, no tamanho exato. */
export async function frame(browser: Browser, shot: Buffer, caption: string, width: number, height: number, out: string) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const img = `data:image/png;base64,${shot.toString('base64')}`;
  await page.setContent(`<!doctype html><html><head><style>${FACE}
    html, body { margin: 0; width: ${width}px; height: ${height}px; background: #F3EEE4; overflow: hidden; }
    .wrap { display: flex; flex-direction: column; align-items: center; height: 100%; }
    h1 { font-family: Fraunces; font-weight: 600; color: #1E1A16; text-align: center;
         font-size: ${Math.round(width * 0.075)}px; line-height: 1.15; margin: ${Math.round(height * 0.06)}px ${Math.round(width * 0.08)}px ${Math.round(height * 0.035)}px; }
    img { flex: 1; min-height: 0; border-radius: ${Math.round(width * 0.05)}px; box-shadow: 0 24px 60px rgba(60,40,20,.25);
          border: ${Math.round(width * 0.012)}px solid #1E1A16; margin-bottom: ${Math.round(height * 0.045)}px; }
  </style></head><body><div class="wrap"><h1>${caption}</h1><img src="${img}"></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  await page.close();
}

/** Imagem de destaque da Play: ficha à esquerda, frase à direita. */
export async function featureGraphic(browser: Browser, out: string) {
  const icon = readFileSync('public/icon.svg', 'utf8');
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>${FACE}
    html, body { margin: 0; width: 1024px; height: 500px; background: #F3EEE4; overflow: hidden; }
    .row { display: flex; align-items: center; gap: 56px; height: 100%; padding: 0 80px; box-sizing: border-box; }
    .row svg { width: 260px; height: 260px; flex: none; }
    h1 { font-family: Fraunces; font-weight: 600; color: #1E1A16; font-size: 64px; line-height: 1.1; margin: 0; }
    h1 span { color: #B5482A; }
  </style></head><body><div class="row">${icon}<h1>Estude menos,<br><span>lembre mais.</span></h1></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  await page.close();
}
