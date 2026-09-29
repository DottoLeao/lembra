import { expect, test } from '@playwright/test';

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
