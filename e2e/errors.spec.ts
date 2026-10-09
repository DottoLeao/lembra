import { expect, test, type Page } from '@playwright/test';
import { continueInBrowser, createCards, createDeck, openApp } from './helpers';

const SAVE_ERROR = 'Não foi possível salvar. Teus dados continuam como estavam.';

/** Simula cota cheia: toda escrita no IndexedDB passa a falhar. */
async function breakWrites(page: Page): Promise<void> {
  await page.evaluate(() => {
    const fail = () => {
      throw new DOMException('Cota cheia', 'QuotaExceededError');
    };
    IDBObjectStore.prototype.add = fail;
    IDBObjectStore.prototype.put = fail;
    IDBObjectStore.prototype.delete = fail;
    IDBCursor.prototype.update = fail;
    IDBCursor.prototype.delete = fail;
  });
}

test('salvar card com falha avisa e mantém o texto', async ({ page }) => {
  await openApp(page);
  await createDeck(page, 'Inglês');
  await page.goto('/#/card/new');
  await breakWrites(page);
  await page.getByLabel('Frente').fill('Put off');
  await page.getByLabel('Verso').fill('Adiar');
  await page.getByRole('button', { name: 'Salvar e próximo' }).click();
  await expect(page.getByRole('status')).toHaveText(SAVE_ERROR);
  await expect(page.getByLabel('Frente')).toHaveValue('Put off');
});

test('criar baralho com falha avisa', async ({ page }) => {
  await openApp(page);
  await page.goto('/#/decks');
  await breakWrites(page);
  await page.getByRole('button', { name: '+ Novo baralho' }).click();
  await page.getByRole('dialog').getByLabel('Nome do baralho').fill('Inglês');
  await page.getByRole('dialog').getByRole('button', { name: 'Criar baralho' }).click();
  await expect(page.getByRole('status')).toHaveText(SAVE_ERROR);
});

test('responder com falha avisa e o card continua na tela', async ({ page }) => {
  await createDeck(page, 'Capitais');
  await createCards(page, 'Capitais', [['Capital da Austrália?', 'Canberra']]);
  await openApp(page);
  await page.getByRole('link', { name: 'Estudar agora' }).click();
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await breakWrites(page);
  await page.getByRole('button', { name: /^Bom/ }).click();
  await expect(page.getByRole('status')).toHaveText(SAVE_ERROR);
  await expect(page.getByText('1 / 1')).toBeVisible();
  await expect(page.getByText('Canberra')).toBeVisible();
});

test('desfazer com falha avisa', async ({ page }) => {
  await createDeck(page, 'Capitais');
  await createCards(page, 'Capitais', [['Capital da Austrália?', 'Canberra'], ['Capital do Canadá?', 'Ottawa']]);
  await openApp(page);
  await page.getByRole('link', { name: 'Estudar agora' }).click();
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Fácil/ }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await breakWrites(page);
  await page.getByRole('button', { name: 'Desfazer última resposta' }).click();
  await expect(page.getByRole('status')).toHaveText('Não foi possível desfazer.');
  await expect(page.getByText('2 / 2')).toBeVisible();
});

test('apagar baralho com falha avisa e continua no baralho', async ({ page }) => {
  await openApp(page);
  await createDeck(page, 'Inglês');
  await page.getByRole('link', { name: /Inglês/ }).click();
  await breakWrites(page);
  await page.getByRole('button', { name: 'Opções do baralho' }).click();
  await page.getByRole('button', { name: 'Apagar baralho' }).click();
  await expect(page.getByRole('status')).toHaveText('Não foi possível apagar. Nada mudou.');
  await expect(page).toHaveURL(/#\/deck\//);
  await expect(page.getByRole('heading', { level: 1, name: 'Inglês' })).toBeVisible();
});

test('mudar ajuste com falha avisa', async ({ page }) => {
  await openApp(page);
  await page.goto('/#/settings');
  await breakWrites(page);
  await page.getByLabel('Minutos por dia').selectOption('20');
  await expect(page.getByRole('status')).toHaveText(SAVE_ERROR);
});

test('exportar backup com falha avisa', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true });
  });
  await openApp(page);
  await page.goto('/#/settings');
  await breakWrites(page);
  await page.getByRole('button', { name: 'Exportar tudo' }).click();
  await expect(page.getByRole('status')).toHaveText('Não foi possível exportar o backup.');
  await expect(page.getByText('Nenhum backup ainda.')).toBeVisible();
});

test('onboarding com falha avisa e continua nele', async ({ page }) => {
  await page.goto('/');
  await continueInBrowser(page);
  await expect(page.getByRole('heading', { name: 'Estude menos, lembre mais.' })).toBeVisible();
  await breakWrites(page);
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page.getByRole('status')).toHaveText(SAVE_ERROR);
  await expect(page.getByRole('heading', { name: 'Estude menos, lembre mais.' })).toBeVisible();
});
