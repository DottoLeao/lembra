import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <button type="button" className="update-banner" onClick={() => void updateServiceWorker(true)}>
      Atualização disponível — tocar para recarregar
    </button>
  );
}
