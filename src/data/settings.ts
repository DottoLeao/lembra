import { DEFAULT_SETTINGS, type Settings } from '../domain/types';
import { db } from './db';

export async function getSettings(): Promise<Settings> {
  const stored = await db.settings.get('settings');
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const next: Settings = { ...(await getSettings()), ...patch, id: 'settings' };
  await db.settings.put(next);
  return next;
}
