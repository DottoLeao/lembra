import { expect, test, type Page } from '@playwright/test';
import { createCards, createDeck, openApp } from './helpers';

async function setup(page: Page, cards: [string, string][]) {
  await createDeck(page, 'Capitais');
  await createCards(page, 'Capitais', cards);
  await openApp(page);
  await page.getByRole('link', { name: 'Estudar agora' }).click();
}

const TWO: [string, string][] = [['Capital da Austrália?', 'Canberra'], ['Capital do Canadá?', 'Ottawa']];

test('vira o card, responde e termina a sessão', async ({ page }) => {
  await setup(page, TWO);
  await expect(page.getByText('1 / 2')).toBeVisible();
  await expect(page.getByText('Capital da Austrália?').first()).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await expect(page.getByText('Canberra')).toBeVisible();
  await page.getByRole('button', { name: /^Fácil/ }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Fácil/ }).click();
  await expect(page).toHaveURL(/#\/study\/end/);
});

test('Errei faz o card voltar na mesma sessão', async ({ page }) => {
  await setup(page, [TWO[0]]);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Errei/ }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await expect(page.getByText('Capital da Austrália?').first()).toBeVisible();
});

test('desfazer volta ao card anterior já virado', async ({ page }) => {
  await setup(page, TWO);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Fácil/ }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer última resposta' }).click();
  await expect(page.getByText('1 / 2')).toBeVisible();
  await expect(page.getByText('Canberra')).toBeVisible();
});

test('arrastar para a direita responde Bom', async ({ page }) => {
  await setup(page, TWO);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  // Bom num card novo o reagenda como aprendizagem: volta na sessão, então o total passa a 3
  const box = (await page.locator('.flip__drag').boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 220, y, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
});

test('toque duplo num botão registra uma resposta só', async ({ page }) => {
  await setup(page, TWO);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Fácil/ }).dblclick();
  await expect(page.getByText('2 / 2')).toBeVisible();
});

test('texto muito longo rola dentro do card e o botão continua visível', async ({ page }) => {
  await setup(page, [['palavra '.repeat(400), 'fim']]);
  await expect(page.getByRole('button', { name: 'Mostrar resposta' })).toBeInViewport();
});

test('sem nada para estudar mostra estado vazio', async ({ page }) => {
  await page.goto('/#/study');
  await expect(page.getByText('Nada para estudar agora')).toBeVisible();
});
