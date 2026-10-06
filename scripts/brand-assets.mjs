// Gera as imagens-fonte da marca a partir de public/icon.svg (a única fonte do desenho).
import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const svg = readFileSync('public/icon.svg', 'utf8');
const INK = '#1E1A16';

// o desenho da ficha, sem o quadrado de fundo
const card = svg.replace(/<rect width="512" height="512" rx="112" fill="#1E1A16"\/>/, '');
if (card === svg) throw new Error('public/icon.svg mudou: atualize scripts/brand-assets.mjs');
const inner = card.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const wrap = (body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg ? `<rect width="512" height="512" fill="${bg}"/>` : ''}${body}</svg>`;
const png = (s, size) => sharp(Buffer.from(s), { density: 384 }).resize(size, size).png();

mkdirSync('assets', { recursive: true });
mkdirSync('docs/loja/arte', { recursive: true });

// iOS e lojas: quadrado cheio, sem cantos e sem transparência (o sistema arredonda)
await png(wrap(inner, INK), 1024).flatten({ background: INK }).toFile('assets/icon-only.png');
await png(wrap(inner, INK), 512).flatten({ background: INK }).toFile('docs/loja/arte/play-icone.png');
// Android adaptativo (o capacitor-assets já recua o primeiro plano para a área segura)
await png(wrap(inner), 1024).toFile('assets/icon-foreground.png');
await png(wrap('', INK), 1024).toFile('assets/icon-background.png');

// abertura: o ícone arredondado no centro, sobre o papel
async function splash(bg, out) {
  const icon = await png(svg, 600).toBuffer();
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: bg } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(out);
}
await splash('#F3EEE4', 'assets/splash.png');
await splash('#16130F', 'assets/splash-dark.png');

console.log('arte gerada em assets/ e docs/loja/arte/');
