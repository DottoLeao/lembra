import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createCards, createDeck } from './helpers';

test.beforeEach(async ({ page }) => {
  // força o caminho de download (sem menu de compartilhar) para o teste conseguir ler o arquivo
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true });
  });
  await createDeck(page, 'Inglês');
  await createCards(page, 'Inglês', [['Put off', 'Adiar'], ['Give up', 'Desistir'], ['Run out of', 'Ficar sem']]);
  await page.goto('/#/decks');
  await page.getByRole('link', { name: /Inglês/ }).click();
});

test('lista, busca e mostra o estado dos cards', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Inglês' })).toBeVisible();
  await expect(page.getByText('3 cards · 0 para hoje · 3 novos')).toBeVisible();
  await expect(page.locator('.card-item')).toHaveCount(3);
  await page.getByLabel('Buscar nos cards').fill('desis');
  await expect(page.locator('.card-item')).toHaveCount(1);
  await expect(page.locator('.card-item').first()).toContainText('novo');
});

test('apagar card tem desfazer', async ({ page }) => {
  await page.getByText('Put off').click();
  await expect(page.getByRole('heading', { name: 'Editar card' })).toBeVisible();
  await page.getByRole('button', { name: 'Apagar card' }).click();
  await expect(page.locator('.card-item')).toHaveCount(2);
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.locator('.card-item')).toHaveCount(3);
});

test('exporta o baralho em JSON', async ({ page }) => {
  await page.getByRole('button', { name: 'Exportar' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Compartilhar só os cards' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('ingles.json');
  const json = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(json.deck).toBe('Inglês');
  expect(json.cards.map((c: { front: string }) => c.front)).toEqual(['Put off', 'Give up', 'Run out of']);
});

test('apagar baralho tem desfazer', async ({ page }) => {
  await page.getByRole('button', { name: 'Opções do baralho' }).click();
  await page.getByRole('button', { name: 'Apagar baralho' }).click();
  await expect(page).toHaveURL(/#\/decks$/);
  await expect(page.locator('.deck-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.locator('.deck-row')).toHaveCount(1);
});

test('um card novo aparece no singular', async ({ page }) => {
  await createDeck(page, 'Química');
  await createCards(page, 'Química', [['H2O', 'Água']]);
  await page.goto('/#/decks');
  await page.getByRole('link', { name: /Química/ }).click();
  await expect(page.getByText('1 card · 0 para hoje · 1 novo', { exact: true })).toBeVisible();
});
