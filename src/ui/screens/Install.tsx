import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { dismissInstallScreen, promptInstall, useInstall } from '../install';

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="install__steps">
      {items.map((item, i) => (
        <li key={i}><span className="install__num">{i + 1}</span><span>{item}</span></li>
      ))}
    </ol>
  );
}

export default function Install() {
  const navigate = useNavigate();
  const { installCase, installedNow } = useInstall();
  const [accepted, setAccepted] = useState(false);
  const ios = installCase === 'ios-safari' || installCase === 'ios-other';

  function stayInBrowser() {
    dismissInstallScreen();
    navigate('/', { replace: true });
  }

  async function install() {
    if ((await promptInstall()) === 'accepted') setAccepted(true);
  }

  const done = accepted || installedNow;

  return (
    <main className="screen install">
      <img className="install__icon" src="/icon.svg" alt="" width={88} height={88} />
      <h1 className="welcome__title">Instale o Lembra</h1>
      <p className="welcome__text">
        Com o ícone na tela inicial, o Lembra abre como app, funciona sem internet e teus cards ficam bem guardados.
      </p>

      {done ? (
        <p className="install__done" role="status">Pronto! Abre o Lembra pelo ícone na tela inicial.</p>
      ) : installCase === 'android-prompt' ? (
        <button type="button" className="btn btn--primary btn--block" onClick={() => void install()}>
          Instalar o Lembra
        </button>
      ) : ios ? (
        <>
          <Steps
            items={[
              <>Toca em <strong>Compartilhar</strong> <Icon name="share" size={18} /> {installCase === 'ios-safari' ? 'na barra de baixo' : 'na barra de endereço'}</>,
              <>Desce a lista e toca em <strong>Adicionar à Tela de Início</strong></>,
              <>Toca em <strong>Adicionar</strong></>,
            ]}
          />
          {installCase === 'ios-other' && (
            <p className="welcome__note">Se não achar a opção, abre este endereço no Safari.</p>
          )}
          <p className="welcome__note">
            No iPhone, os cards criados no navegador ficam separados dos do app: instala antes de começar.
          </p>
        </>
      ) : (
        <Steps
          items={[
            <>Toca no menu do navegador (<strong>⋮</strong> ou <strong>≡</strong>)</>,
            <>Toca em <strong>Adicionar à tela inicial</strong> ou <strong>Instalar app</strong></>,
            <>Confirma em <strong>Adicionar</strong></>,
          ]}
        />
      )}

      <button type="button" className="btn btn--secondary btn--block install__stay" onClick={stayInBrowser}>
        Continuar no navegador
      </button>
    </main>
  );
}
