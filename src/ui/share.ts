import { saveToDocuments, visibleFolder } from './nativeBackupFs';
import { isNativeApp } from './platform';

export type ShareResult = 'shared' | 'downloaded' | 'saved' | 'cancelled';

/** Mensagem depois de salvar no app, com a pasta de cada sistema. */
export function savedMessage(): string {
  return `Salvo em ${visibleFolder()}`;
}

/** No app grava na pasta do Lembra ('saved'); na web compartilha ou baixa. */
export async function shareJson(filename: string, json: string): Promise<ShareResult> {
  if (isNativeApp()) {
    await saveToDocuments(filename, json);
    return 'saved';
  }
  const file = new File([json], filename, { type: 'application/json' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      // outra falha: cai no download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'baralho';
}
