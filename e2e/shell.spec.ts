import { expect, test } from '@playwright/test';

test('menu inferior navega entre Hoje, Baralhos e Ajustes', async ({ page }) => {
  await page.goto('/#/decks');
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(nav.getByRole('link', { name: 'Baralhos' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Ajustes' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(nav.getByRole('link', { name: 'Ajustes' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Criar card' })).toBeVisible();
});
