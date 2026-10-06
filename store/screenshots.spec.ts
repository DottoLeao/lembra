import { test } from '@playwright/test';
import { createCards, createDeck, openApp } from '../e2e/helpers';
import { featureGraphic, frame } from './frame';

const CARDS: [string, string][] = [
  ['Qual é a capital da Austrália?', 'Canberra'],
  ['Qual é a capital do Canadá?', 'Ottawa'],
  ['Qual é a capital da Nova Zelândia?', 'Wellington'],
  ['Qual é a capital da Turquia?', 'Ancara'],
  ['Qual é a capital do Marrocos?', 'Rabat'],
];
const OUT = 'docs/loja/arte';

test('capturas das lojas', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await openApp(page);
  await createDeck(page, 'Capitais do mundo');
  await createCards(page, 'Capitais do mundo', CARDS);

  const shots: [Buffer, string][] = [];
  await page.goto('/');
  shots.push([await page.screenshot(), 'Alguns minutos por dia']);

  await page.getByRole('link', { name: 'Estudar agora' }).click();
  shots.push([await page.screenshot(), 'Tente lembrar antes de virar']);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Fácil/ }).waitFor();
  await page.waitForTimeout(800); // botões terminam de entrar em cascata
  shots.push([await page.screenshot(), 'Cada card volta na hora certa']);

  // o primeiro card já está virado; Fácil gradua cada card e fecha a sessão (Bom faria o card novo voltar)
  await page.getByRole('button', { name: /^Fácil/ }).click();
  for (let i = 1; i < CARDS.length; i++) {
    await page.getByRole('button', { name: 'Mostrar resposta' }).click();
    await page.getByRole('button', { name: /^Fácil/ }).click();
  }
  await page.waitForURL(/#\/study\/end/);
  await page.waitForTimeout(800); // números terminam de contar
  shots.push([await page.screenshot(), 'Veja seu progresso']);

  await page.goto('/#/import');
  // como se a resposta de uma IA tivesse sido colada: mostra a prévia, não a tela vazia
  await page.getByLabel('JSON dos cards').fill(JSON.stringify({
    deck: 'Revolução Francesa',
    cards: [
      { front: 'Em que ano começou a Revolução Francesa?', back: '1789' },
      { front: 'Que prisão foi tomada em 14 de julho de 1789?', back: 'A Bastilha' },
      { front: 'Qual era o lema da Revolução?', back: 'Liberdade, igualdade, fraternidade' },
      { front: 'Quem liderou o período do Terror?', back: 'Robespierre' },
    ],
  }));
  await page.getByLabel('JSON dos cards').blur(); // sem o contorno de foco na foto
  await page.getByRole('button', { name: /^Importar 4 cards/ }).waitFor();
  await page.waitForTimeout(600); // prévia termina de entrar
  shots.push([await page.screenshot(), 'Crie cards com qualquer IA']);

  for (const [i, [shot, caption]] of shots.entries()) {
    const n = String(i + 1).padStart(2, '0');
    await frame(browser, shot, caption, 1080, 1920, `${OUT}/play-${n}.png`);
    await frame(browser, shot, caption, 1290, 2796, `${OUT}/ios-${n}.png`);
  }
  await featureGraphic(browser, `${OUT}/play-destaque.png`);
});
