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

test('rota inexistente mostra a tela de erro do app, não a tela crua do roteador', async ({ page }) => {
  await page.goto('/#/rota-que-nao-existe');
  await expect(page.getByText('Algo deu errado ao abrir teus dados')).toBeVisible();
  await expect(page.getByText('404 Not Found')).toBeVisible();
  await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);
});
