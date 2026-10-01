import { expect, test } from '@playwright/test';

const html = (page: import('@playwright/test').Page) => page.locator('html');

test('escolher Escuro em Ajustes escurece o app e continua depois de recarregar', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Escuro', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Escuro', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#16130F');
  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Escuro', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('Automático segue o tema do sistema, inclusive quando ele muda', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#/settings');
  await expect(page.getByRole('button', { name: 'Automático', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
});

test('Claro vence o sistema escuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Claro', exact: true }).click();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F3EEE4');
  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
});
