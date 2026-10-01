import { Component, useState, type ReactNode } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { exportBackupJson } from '../../data/importExport';
import { SAVED_MESSAGE, shareJson } from '../share';

export function ErrorScreen({ error }: { error: unknown }) {
  const [exportMsg, setExportMsg] = useState('');
  async function rescue() {
    try {
      const result = await shareJson('lembra-resgate.json', await exportBackupJson());
      setExportMsg(result === 'saved' ? `${SAVED_MESSAGE}.` : 'Arquivo gerado.');
    } catch {
      setExportMsg('Não foi possível exportar os dados.');
    }
  }
  return (
    <main className="screen">
      <div className="empty">
        <p className="empty__title">Algo deu errado ao abrir teus dados</p>
        <p>Isso pode acontecer em modo anônimo ou com o armazenamento do celular cheio.</p>
        <p className="small">{error instanceof Error ? error.message : String(error)}</p>
        <button type="button" className="btn btn--primary btn--block" onClick={() => location.reload()}>Tentar novamente</button>
        <button type="button" className="btn btn--secondary btn--block" onClick={() => void rescue()}>Exportar o que for possível</button>
        {exportMsg && <p role="status">{exportMsg}</p>}
      </div>
    </main>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    return this.state.error !== null ? <ErrorScreen error={this.state.error} /> : this.props.children;
  }
}

export function RouteError() {
  const error = useRouteError();
  return <ErrorScreen error={isRouteErrorResponse(error) ? new Error(`${error.status} ${error.statusText}`) : error} />;
}
