import { expect, test } from '@playwright/test';
import { createCards, createDeck } from './helpers';

const FENCE = '`'.repeat(3);
const longBack = 'x'.repeat(320);
const AI_REPLY = `Claro! Aqui estão:
${FENCE}json
{"version":1,"deck":"Revolução Francesa","cards":[
  {"front":"Em que ano começou?","back":"1789"},
  {"front":"O que foi a Queda da Bastilha?","back":"Tomada da prisão em 14/07/1789"},
  {"front":"Explique tudo sobre Luís XVI","back":"${longBack}"}
]}
${FENCE}`;

test('cola resposta de IA, revisa e importa', async ({ page }) => {
  await page.goto('/#/import');
  await page.getByLabel('JSON dos cards').fill(AI_REPLY);
  await expect(page.getByText('Pré-visualização')).toBeVisible();
  const items = page.locator('.preview-item');
  await expect(items).toHaveCount(3);
  await expect(items.nth(2)).toContainText('Resposta longa demais para um card');
  await expect(items.nth(2).getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByLabel('Nome do novo baralho')).toHaveValue('Revolução Francesa');
  await page.getByRole('button', { name: 'Importar 2 cards' }).click();
  await expect(page.getByRole('heading', { name: 'Revolução Francesa' })).toBeVisible();
  await expect(page.locator('.card-item')).toHaveCount(2);
});

test('mostra o erro e não importa', async ({ page }) => {
  await page.goto('/#/import');
  await page.getByLabel('JSON dos cards').fill('{"cards":[{"front":"a"}]}');
  await expect(page.getByRole('alert')).toHaveText('O card 1 está sem verso.');
  await expect(page.getByRole('button', { name: /^Importar/ })).toBeDisabled();
});

test('texto com HTML aparece literal e não executa', async ({ page }) => {
  await page.goto('/#/import');
  const evil = '<img src=x onerror=\\"window.__xss=1\\">';
  await page.getByLabel('JSON dos cards').fill(`{"deck":"Seguro","cards":[{"front":"${evil}","back":"ok"}]}`);
  await page.getByRole('button', { name: 'Importar 1 card' }).click();
  await expect(page.getByText('<img src=x onerror="window.__xss=1">')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test('abre arquivo .json', async ({ page }) => {
  await page.goto('/#/import');
  await page.getByRole('button', { name: 'Abrir arquivo' }).click();
  await page.getByLabel('Escolher arquivo .json').setInputFiles({
    name: 'cards.json',
    mimeType: 'application/json',
    buffer: Buffer.from('[{"front":"a","back":"b"}]'),
  });
  await expect(page.locator('.preview-item')).toHaveCount(1);
});

const PAIR = '{"deck":"Inglês","cards":[{"front":"Put off","back":"Adiar"},{"front":"Give up","back":"Desistir"}]}';

async function deckWithPutOff(page: import('@playwright/test').Page): Promise<string> {
  await createDeck(page, 'Inglês');
  await createCards(page, 'Inglês', [['Put off', 'Adiar']]);
  await page.goto('/#/decks');
  await page.getByRole('link', { name: /Inglês/ }).click();
  await expect(page.getByRole('heading', { name: 'Inglês' })).toBeVisible();
  return page.url().split('/deck/')[1];
}

test('destino da URL: duplicado vem desmarcado e o botão cita o baralho', async ({ page }) => {
  const id = await deckWithPutOff(page);
  await page.goto(`/#/import?deck=${id}`);
  await page.getByLabel('JSON dos cards').fill(PAIR);
  const items = page.locator('.preview-item');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText('Já existe neste baralho');
  await expect(items.nth(0).getByRole('checkbox')).not.toBeChecked();
  await expect(items.nth(1).getByRole('checkbox')).toBeChecked();
  await expect(page.getByRole('button', { name: 'Importar 1 card para “Inglês”' })).toBeVisible();
});

test('desmarcação manual sobrevive à troca de destino', async ({ page }) => {
  const id = await deckWithPutOff(page);
  await page.goto(`/#/import?deck=${id}`);
  await page.getByLabel('JSON dos cards').fill(PAIR);
  const items = page.locator('.preview-item');
  await items.nth(1).getByRole('checkbox').uncheck();
  await page.getByLabel('Baralho de destino').selectOption({ label: 'Novo baralho' });
  await expect(items.nth(1).getByRole('checkbox')).not.toBeChecked();
  await page.getByLabel('Baralho de destino').selectOption({ label: 'Inglês' });
  await expect(items.nth(1).getByRole('checkbox')).not.toBeChecked();
  await expect(items.nth(0).getByRole('checkbox')).not.toBeChecked();
});

test('novo baralho sem nome desabilita a importação', async ({ page }) => {
  await page.goto('/#/import');
  await page.getByLabel('JSON dos cards').fill(PAIR);
  await page.getByLabel('Nome do novo baralho').fill('');
  await expect(page.getByRole('button', { name: /^Importar/ })).toBeDisabled();
});

test('importar pede armazenamento persistente', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __persistCalls: number };
    w.__persistCalls = 0;
    Object.defineProperty(StorageManager.prototype, 'persist', {
      configurable: true,
      value: async () => {
        w.__persistCalls++;
        return true;
      },
    });
  });
  await page.goto('/#/import');
  await page.getByLabel('JSON dos cards').fill(PAIR);
  await page.getByRole('button', { name: 'Importar 2 cards' }).click();
  await expect(page.getByRole('heading', { name: 'Inglês' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __persistCalls: number }).__persistCalls)).toBe(1);
});
