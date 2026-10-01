import { expect, test } from '@playwright/test';

test('publica manifesto instalável', async ({ page, request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: 'Lembra', short_name: 'Lembra', display: 'standalone', lang: 'pt-BR' });
  expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
});
