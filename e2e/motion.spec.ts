import { expect, test } from '@playwright/test';
import { createCards, createDeck, openApp } from './helpers';

test.describe('com reduzir movimento', () => {
  test.use({ reducedMotion: 'reduce' });

  test('o número grande de Hoje já aparece com o valor final', async ({ page }) => {
    await createDeck(page, 'Capitais');
    await createCards(page, 'Capitais', [['Capital da Austrália?', 'Canberra']]);
    await openApp(page);
    const number = page.locator('.hero__number');
    await number.waitFor();
    // lido uma vez, sem nova tentativa: não pode haver contagem a partir de 0
    expect(await number.textContent()).toBe('1');
  });
});

test.describe('com movimento', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('trocar de aba navega e não gera erro no console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await createDeck(page, 'Capitais');
    await openApp(page);
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await nav.getByRole('link', { name: 'Baralhos' }).click();
    await expect(page).toHaveURL(/#\/decks$/);
    await expect(page.getByRole('heading', { name: 'Baralhos', level: 1 })).toBeVisible();
    await nav.getByRole('link', { name: 'Ajustes' }).click();
    await expect(page).toHaveURL(/#\/settings$/);
    await nav.getByRole('link', { name: 'Hoje' }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByText('Tudo em dia por hoje.')).toBeVisible();
    await expect(nav).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('voltar com a folha aberta fecha a folha junto com a tela', async ({ page }) => {
    await createDeck(page, 'Capitais');
    await page.getByRole('link', { name: /Capitais/ }).click();
    await page.getByRole('button', { name: 'Exportar' }).click();
    await expect(page.getByRole('dialog', { name: 'Exportar baralho' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/#\/decks$/);
    // lido uma vez, logo depois da troca: a folha que sai não pode receber toques por cima da tela nova
    expect(await page.evaluate(() => [...document.querySelectorAll('.sheet-backdrop')].every((b) => (b as HTMLElement).inert))).toBe(true);
    await expect(page.locator('.sheet-backdrop')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Baralhos', level: 1 })).toBeVisible();
  });

  test('a contagem do número grande termina no valor exato', async ({ page }) => {
    await createDeck(page, 'Capitais');
    await createCards(page, 'Capitais', [['Capital da Austrália?', 'Canberra'], ['Capital do Canadá?', 'Ottawa']]);
    await openApp(page);
    await expect(page.locator('.hero__number')).toHaveText('2');
  });
});
