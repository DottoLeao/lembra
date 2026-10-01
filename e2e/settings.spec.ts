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

test('backup de outro ano mostra o ano', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true });
  });
  await page.clock.install({ time: new Date('2025-03-10T12:00:00') });
  await page.goto('/#/settings');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar tudo' }).click();
  await downloading;
  await expect(page.getByText(/Último backup: hoje/)).toBeVisible();
  await page.clock.setSystemTime(new Date('2026-09-29T12:00:00'));
  await page.reload();
  await expect(page.getByText('Último backup: 10 de março de 2025.')).toBeVisible();
});

test('backup deste ano mostra a data sem o ano', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true });
  });
  await page.clock.install({ time: new Date('2026-03-10T12:00:00') });
  await page.goto('/#/settings');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar tudo' }).click();
  await downloading;
  await page.clock.setSystemTime(new Date('2026-09-29T12:00:00'));
  await page.reload();
  await expect(page.getByText('Último backup: 10 de março.')).toBeVisible();
});
