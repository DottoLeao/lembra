import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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

test('/testar/ mostra os 3 passos com os links do grupo e do teste da Play', async ({ page }) => {
  await page.goto('/testar/');
  await expect(page.getByRole('heading', { level: 1, name: 'Teste o Lembra' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrar no grupo de testadores' }))
    .toHaveAttribute('href', 'https://groups.google.com/g/lembra-testadores');
  await expect(page.getByRole('link', { name: 'Quero participar do teste' }))
    .toHaveAttribute('href', 'https://play.google.com/apps/testing/com.dottoleao.lembra');
  await expect(page.getByRole('link', { name: 'Instalar pela Play Store' }))
    .toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=com.dottoleao.lembra');
});

// abertas direto do disco (pré-visualização), as páginas também precisam achar ícone e fontes
for (const page of ['testar', 'privacidade', 'suporte']) {
  test(`${page} carrega o ícone mesmo aberta como arquivo`, async ({ page: p }) => {
    const url = pathToFileURL(resolve(`public/${page}/index.html`)).href;
    await p.goto(url);
    const img = p.locator('img').first();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  });
}
