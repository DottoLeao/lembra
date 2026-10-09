import { expect, test, type Page } from '@playwright/test';
import { continueInBrowser, createCards, createDeck, openApp } from './helpers';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

/** Simula o evento que o Chrome e o Samsung Internet disparam quando o site pode ser instalado. */
async function offerInstall(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const e = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };
      e.prompt = async () => {
        (window as unknown as { __prompted: boolean }).__prompted = true;
      };
      e.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(e);
    });
  });
}

/** Simula o app aberto pelo ícone da tela inicial. */
async function asInstalled(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true });
  });
}

test.describe('Android no navegador', () => {
  test('primeira abertura mostra a tela de instalação com o caminho pelo menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Instale o Lembra' })).toBeVisible();
    await expect(page.getByText('Adicionar à tela inicial')).toBeVisible();
  });

  test('com o botão do navegador, "Instalar o Lembra" abre a instalação', async ({ page }) => {
    await offerInstall(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Instalar o Lembra' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted?: boolean }).__prompted)).toBe(true);
  });

  test('"Continuar no navegador" segue para as boas-vindas e não volta mais', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continuar no navegador' }).click();
    await expect(page.getByRole('button', { name: 'Pular' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Instale o Lembra' })).toHaveCount(0);
  });

  test('no navegador, a tela Hoje mostra a faixa de instalar, que pode ser fechada', async ({ page }) => {
    await openApp(page);
    const banner = page.getByRole('region', { name: 'Instalar o app' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Fechar' }).click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('region', { name: 'Instalar o app' })).toHaveCount(0);
  });
});

test.describe('iPhone no Safari', () => {
  test.use({ userAgent: IPHONE_SAFARI, permissions: ['clipboard-read', 'clipboard-write'] });

  test('mostra o passo a passo do Compartilhar e o aviso dos dados separados', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Instale o Lembra' })).toBeVisible();
    await expect(page.getByText('Adicionar à Tela de Início')).toBeVisible();
    await expect(page.getByText(/ficam separados/)).toBeVisible();
  });

  test('"Levar meus cards para o app" copia o backup', async ({ page }) => {
    await openApp(page);
    await createDeck(page, 'Inglês');
    await createCards(page, 'Inglês', [['dog', 'cão']]);
    await page.goto('/');
    await page.getByRole('button', { name: 'Levar meus cards para o app' }).click();
    await expect(page.getByText(/Copiado/)).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('"Inglês"');
    expect(copied).toContain('"dog"');
  });
});

test.describe('app instalado', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('não mostra a tela de instalação nem a faixa', async ({ page }) => {
    await asInstalled(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Pular' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Instale o Lembra' })).toHaveCount(0);
  });

  test('vazio, oferece colar os cards do navegador e os restaura', async ({ page }) => {
    await asInstalled(page);
    await page.goto('/');
    const backup = JSON.stringify({
      version: 1,
      decks: [{ name: 'Inglês', color: '#B5482A', cards: [{ front: 'dog', back: 'cão' }] }],
    });
    await page.evaluate((t) => navigator.clipboard.writeText(t), backup);
    await page.getByRole('button', { name: 'Já usava no navegador? Colar meus cards' }).click();
    await expect(page.getByText('1 card trazido do navegador')).toBeVisible();
    await expect(page.getByRole('link', { name: /Inglês/ })).toBeVisible();
  });

  test('sem nada copiado, explica o que fazer', async ({ page }) => {
    await asInstalled(page);
    await page.goto('/');
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await page.getByRole('button', { name: 'Já usava no navegador? Colar meus cards' }).click();
    await expect(page.getByText(/Não achei cards copiados/)).toBeVisible();
  });
});

test('continueInBrowser é seguro de chamar quando a tela não aparece', async ({ page }) => {
  await asInstalled(page);
  await page.goto('/');
  await continueInBrowser(page);
  await expect(page.getByRole('button', { name: 'Pular' })).toBeVisible();
});
