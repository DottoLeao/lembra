import { useLiveQuery } from 'dexie-react-hooks';
import { useId } from 'react';
import { Link } from 'react-router';
import { exportBackupJson, markExported } from '../../data/importExport';
import { getSettings, updateSettings } from '../../data/settings';
import { studyDayKey } from '../../domain/studyDay';
import type { Settings } from '../../domain/types';
import { TabBar } from '../components/TabBar';
import { BACKUP_ERROR, useSafeAction, useToast } from '../components/Toast';
import { shareJson } from '../share';

function SelectRow({ label, hint, value, options, onChange }: {
  label: string;
  hint?: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="settings-row">
      <div>
        <label htmlFor={id} className="settings-row__label">{label}</label>
        {hint && <p className="settings-row__hint">{hint}</p>}
      </div>
      <select id={id} className="select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function lastBackupText(s: Settings): string {
  if (s.lastExportAt === undefined) return 'Nenhum backup ainda.';
  const sameDay = studyDayKey(s.lastExportAt, s.dayStartHour) === studyDayKey(Date.now(), s.dayStartHour);
  if (sameDay) return 'Último backup: hoje.';
  const sameYear = new Date(s.lastExportAt).getFullYear() === new Date().getFullYear();
  const format = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) });
  return `Último backup: ${format.format(s.lastExportAt)}.`;
}

export default function SettingsScreen() {
  const settings = useLiveQuery(() => getSettings(), []);
  const toast = useToast();
  const run = useSafeAction();

  if (!settings) return <main className="screen screen--tabs" aria-busy="true" />;
  const set = (patch: Partial<Omit<Settings, 'id'>>) => run(() => updateSettings(patch));

  async function backup() {
    if (!settings) return;
    const now = Date.now();
    const result = await shareJson(`lembra-backup-${studyDayKey(now, settings.dayStartHour)}.json`, await exportBackupJson());
    if (result !== 'cancelled') {
      await markExported(now);
      toast({ message: 'Backup exportado' });
    }
  }

  return (
    <main className="screen screen--tabs">
      <h1 className="title-serif page-title">Ajustes</h1>

      <section className="settings-group">
        <SelectRow label="Minutos por dia" hint="Quantas revisões cabem no teu dia." value={settings.minutesPerDay}
          options={[5, 10, 15, 20, 30, 45, 60].map((v) => ({ value: v, label: `${v} min` }))}
          onChange={(v) => set({ minutesPerDay: v })} />
        <SelectRow label="Cards novos por dia" value={settings.newPerDay}
          options={[0, 5, 10, 15, 20, 30].map((v) => ({ value: v, label: String(v) }))}
          onChange={(v) => set({ newPerDay: v })} />
      </section>

      <section className="settings-group">
        <h2 className="settings-group__title">Backup</h2>
        <button type="button" className="settings-action" onClick={() => run(backup, BACKUP_ERROR)}>Exportar tudo</button>
        <Link to="/import" className="settings-action">Importar backup</Link>
        <p className="small muted" style={{ margin: '10px 0' }}>{lastBackupText(settings)}</p>
      </section>

      <section className="settings-group">
        <Link to="/welcome?again=1" className="settings-action">Como o Lembra funciona</Link>
      </section>

      <details className="settings-group">
        <summary>Avançado</summary>
        <SelectRow label="Meta de lembrança" hint="Maior = mais revisões, menos esquecimento." value={settings.desiredRetention}
          options={[0.8, 0.85, 0.9, 0.95].map((v) => ({ value: v, label: `${Math.round(v * 100)}%` }))}
          onChange={(v) => set({ desiredRetention: v })} />
        <SelectRow label="O dia começa às" hint="Para quem estuda de madrugada." value={settings.dayStartHour}
          options={[0, 1, 2, 3, 4, 5, 6].map((v) => ({ value: v, label: `${v}h` }))}
          onChange={(v) => set({ dayStartHour: v })} />
      </details>

      <TabBar />
    </main>
  );
}
