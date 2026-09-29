import { expect, test } from '@playwright/test';
import { createCards, createDeck, openApp } from './helpers';

test('primeira abertura sem baralhos convida a criar um', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('Crie teu primeiro baralho para começar.')).toBeVisible();
  await page.getByRole('button', { name: 'Criar baralho' }).click();
  const sheet = page.getByRole('dialog', { name: 'Novo baralho' });
  await sheet.getByLabel('Nome do baralho').fill('Inglês');
  await sheet.getByRole('button', { name: 'Criar baralho' }).click();
  await expect(page.getByRole('link', { name: /Inglês/ })).toBeVisible();
  await expect(page.getByText('Tudo em dia por hoje.')).toBeVisible();
});

test('mostra o total do dia e os baralhos', async ({ page }) => {
  await createDeck(page, 'Capitais');
  await createCards(page, 'Capitais', [['Capital da Austrália?', 'Canberra'], ['Capital do Canadá?', 'Ottawa']]);
  await openApp(page);
  await expect(page.locator('.hero__number')).toHaveText('2');
  await expect(page.getByText('0 revisões · 2 novos · cerca de 1 min')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Estudar agora' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Capitais/ })).toContainText('2 cards');
});

test('Baralhos lista e cria baralhos', async ({ page }) => {
  await createDeck(page, 'Química');
  await createDeck(page, 'Física');
  await expect(page.locator('.deck-row')).toHaveCount(2);
});
