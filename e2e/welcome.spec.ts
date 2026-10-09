import { expect, test } from '@playwright/test';
import { continueInBrowser } from './helpers';

test('primeira abertura mostra o onboarding e termina criando o primeiro baralho', async ({ page }) => {
  await page.goto('/');
  await continueInBrowser(page);
  await expect(page.getByRole('heading', { name: 'Estude menos, lembre mais.' })).toBeVisible();
  await expect(page.getByText(/O Lembra revisa cada coisa\s+pouco antes de tu esqueceres\./)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Tente lembrar antes de virar.' })).toBeVisible();
  await page.getByText('Qual é a capital da Austrália?').first().click();
  await expect(page.getByText('Canberra')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Diga como foi.' })).toBeVisible();
  await expect(page.getByText(/Dunlosky/)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Pouco, todo dia.' })).toBeVisible();
  await page.getByRole('button', { name: '15 min' }).click();
  await page.getByRole('button', { name: 'Criar meu primeiro baralho' }).click();

  await expect(page.getByRole('dialog', { name: 'Novo baralho' })).toBeVisible();
  await page.goto('/#/settings');
  await expect(page.getByLabel('Minutos por dia')).toHaveValue('15');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Estude menos, lembre mais.' })).toHaveCount(0);
});

test('Pular marca como visto', async ({ page }) => {
  await page.goto('/');
  await continueInBrowser(page);
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.reload();
  await expect(page.getByText('Crie teu primeiro baralho para começar.')).toBeVisible();
});

test('dá para rever pelos Ajustes e volta para Ajustes', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('link', { name: 'Como o Lembra funciona' }).click();
  await expect(page.getByRole('heading', { name: 'Estude menos, lembre mais.' })).toBeVisible();
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
});
