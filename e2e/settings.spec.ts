import { expect, test } from '@playwright/test';

test('ajustes ficam salvos depois de recarregar', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByLabel('Minutos por dia').selectOption('20');
  await page.getByText('Avançado').click();
  await page.getByLabel('Meta de lembrança').selectOption('0.85');
  await page.reload();
  await expect(page.getByLabel('Minutos por dia')).toHaveValue('20');
  await page.getByText('Avançado').click();
  await expect(page.getByLabel('Meta de lembrança')).toHaveValue('0.85');
});

test('exportar tudo gera arquivo de backup', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true });
  });
  await page.goto('/#/settings');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar tudo' }).click();
  expect((await downloading).suggestedFilename()).toMatch(/^lembra-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByText(/Último backup: hoje/)).toBeVisible();
});
