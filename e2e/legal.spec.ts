import { expect, test } from '@playwright/test';

const EMAIL = 'lembra.flashcards@gmail.com';

for (const [path, title] of [['/privacidade/', 'Política de privacidade'], ['/suporte/', 'Suporte']] as const) {
  test(`${path} abre a página com título e contato`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);
  });
}

test('privacidade não promete que backups do iPhone sobrevivem a apagar o app', async ({ page }) => {
  await page.goto('/privacidade/');
  await expect(page.getByText('No iPhone, apagar o app apaga também a pasta Lembra do app Arquivos')).toBeVisible();
});

test('suporte avisa como guardar o backup do iPhone fora do app', async ({ page }) => {
  await page.goto('/suporte/');
  await expect(page.getByText('copie o backup para o iCloud Drive')).toBeVisible();
});

test.describe('com o PWA instalado', () => {
  test.use({ serviceWorkers: 'allow' });

  test('o service worker não troca /privacidade/ pelo app', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload(); // agora a página é controlada pelo service worker
    await page.goto('/privacidade/');
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeVisible();
    await expect(page.locator('#root')).toHaveCount(0);
  });
});

test('páginas legíveis no tema escuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/privacidade/');
  // o fundo escuro do app tem a mesma cor: confirma antes que é a página certa
  await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeVisible();
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(22, 19, 15)');
});
