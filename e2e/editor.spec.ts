import { expect, test } from '@playwright/test';
import { createDeck } from './helpers';

test('cria vários cards seguidos com Salvar e próximo', async ({ page }) => {
  await createDeck(page, 'Inglês');
  await page.goto('/#/card/new');
  await expect(page.getByLabel('Baralho')).toHaveValue(/.+/);
  await page.getByLabel('Frente').fill('Put off');
  await page.getByLabel('Verso').fill('Adiar');
  await page.getByRole('button', { name: 'Salvar e próximo' }).click();
  await expect(page.getByLabel('Frente')).toHaveValue('');
  await expect(page.getByLabel('Frente')).toBeFocused();
  await page.getByLabel('Frente').fill('Give up');
  await page.getByLabel('Verso').fill('Desistir');
  await page.getByRole('button', { name: 'Salvar e próximo' }).click();
  await expect(page.getByText('2 cards criados agora')).toBeVisible();
});

test('frente ou verso só com espaços não salva', async ({ page }) => {
  await createDeck(page, 'Inglês');
  await page.goto('/#/card/new');
  await page.getByLabel('Frente').fill('   ');
  await page.getByLabel('Verso').fill('Algo');
  await expect(page.getByRole('button', { name: 'Salvar e próximo' })).toBeDisabled();
});

test('sem baralhos, pede para criar um primeiro', async ({ page }) => {
  await page.goto('/#/card/new');
  await expect(page.getByText('Crie um baralho primeiro')).toBeVisible();
});
