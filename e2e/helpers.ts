import { expect, type Page } from '@playwright/test';

export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Pular' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

export async function createDeck(page: Page, name: string): Promise<void> {
  await page.goto('/#/decks');
  await page.getByRole('button', { name: '+ Novo baralho' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Nome do baralho').fill(name);
  await sheet.getByRole('button', { name: 'Criar baralho' }).click();
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
}

export async function createCards(page: Page, deckName: string, cards: [string, string][]): Promise<void> {
  await page.goto('/#/card/new');
  await page.getByLabel('Baralho').selectOption({ label: deckName });
  for (const [front, back] of cards) {
    await page.getByLabel('Frente').fill(front);
    await page.getByLabel('Verso').fill(back);
    await page.getByRole('button', { name: 'Salvar e próximo' }).click();
    await expect(page.getByLabel('Frente')).toHaveValue('');
  }
}
