import { expect, type Page } from '@playwright/test';

/** Na primeira abertura no celular aparece a tela de instalação: segue no navegador. */
export async function continueInBrowser(page: Page): Promise<void> {
  const stay = page.getByRole('button', { name: 'Continuar no navegador' });
  if (await stay.waitFor({ timeout: 3000 }).then(() => true, () => false)) await stay.click();
  await expect(stay).toHaveCount(0);
}

export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await continueInBrowser(page);
  const skip = page.getByRole('button', { name: 'Pular' });
  // o redirecionamento acontece depois da primeira renderização: espera o botão em vez de checar na hora
  if (await skip.waitFor({ timeout: 3000 }).then(() => true, () => false)) await skip.click();
  await expect(skip).toHaveCount(0);
}

export async function createDeck(page: Page, name: string): Promise<void> {
  await page.goto('/#/decks');
  await page.getByRole('button', { name: '+ Novo baralho' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Nome do baralho').fill(name);
  await sheet.getByRole('button', { name: 'Criar baralho' }).click();
  // com movimento, a folha leva um instante saindo: espera sumir antes de seguir para outra tela
  await expect(page.getByRole('dialog', { includeHidden: true })).toHaveCount(0);
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
