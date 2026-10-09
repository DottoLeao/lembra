import { useState } from 'react';
import { Link } from 'react-router';
import { exportBackupJson } from '../../data/importExport';
import { closeInstallBanner, installBannerClosed, promptInstall, useInstall } from '../install';
import { copyText } from '../share';
import { Icon } from './Icon';
import { useSafeAction, useToast } from './Toast';

/** Faixa na tela Hoje para quem usa o Lembra no navegador. */
export function InstallBanner({ hasDecks }: { hasDecks: boolean }) {
  const { installCase } = useInstall();
  const [closed, setClosed] = useState(installBannerClosed);
  const toast = useToast();
  const run = useSafeAction();

  const canPrompt = installCase === 'android-prompt';
  const ios = installCase === 'ios-safari' || installCase === 'ios-other';
  const manual = ios || installCase === 'android-manual';
  // só no celular: no app instalado, no APK e no computador não aparece
  if (closed || !(canPrompt || manual)) return null;

  function close() {
    closeInstallBanner();
    setClosed(true);
  }

  async function carryCards() {
    const ok = await copyText(await exportBackupJson());
    toast({
      message: ok
        ? 'Copiado! Abre o Lembra pela tela inicial e toca em “Colar meus cards”.'
        : 'Não consegui copiar. Exporta o backup em Ajustes e importa no app.',
    });
  }

  return (
    <section className="notice install-banner" aria-label="Instalar o app">
      <p>Instala o Lembra na tela inicial: abre como app e funciona sem internet.</p>
      <div className="install-banner__actions">
        {canPrompt ? (
          <button type="button" className="link-btn" onClick={() => void promptInstall()}>Instalar</button>
        ) : (
          <Link to="/install" className="link-btn">Como instalar</Link>
        )}
        {ios && hasDecks && (
          <button type="button" className="link-btn" onClick={() => run(carryCards)}>Levar meus cards para o app</button>
        )}
      </div>
      <button type="button" className="icon-btn" aria-label="Fechar" onClick={close}>
        <Icon name="close" size={18} />
      </button>
    </section>
  );
}
