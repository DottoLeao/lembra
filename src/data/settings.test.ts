import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/types';
import { resetDb } from '../test/resetDb';
import { getSettings, updateSettings } from './settings';

beforeEach(resetDb);

describe('settings', () => {
  it('devolve os padrões quando não há nada salvo', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('salva alterações parciais', async () => {
    await updateSettings({ minutesPerDay: 20 });
    await updateSettings({ onboardedAt: 5 });
    expect(await getSettings()).toEqual({ ...DEFAULT_SETTINGS, minutesPerDay: 20, onboardedAt: 5 });
  });
});
