import { Link, useLocation } from 'react-router';
import { Icon, type IconName } from './Icon';

interface Tab {
  to: string;
  label: string;
  icon: IconName;
  match: (path: string) => boolean;
}

const LEFT: Tab[] = [
  { to: '/', label: 'Hoje', icon: 'home', match: (p) => p === '/' },
  { to: '/decks', label: 'Baralhos', icon: 'decks', match: (p) => p.startsWith('/deck') },
];
const RIGHT: Tab = { to: '/settings', label: 'Ajustes', icon: 'settings', match: (p) => p.startsWith('/settings') };

export function TabBar({ createHref = '/card/new' }: { createHref?: string }) {
  const { pathname } = useLocation();
  const item = (t: Tab) => {
    const active = t.match(pathname);
    return (
      <Link key={t.to} to={t.to} className={active ? 'tabbar__item tabbar__item--active' : 'tabbar__item'}
        aria-current={active ? 'page' : undefined}>
        <Icon name={t.icon} />
        <span>{t.label}</span>
      </Link>
    );
  };
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {LEFT.map(item)}
      <Link to={createHref} className="tabbar__create" aria-label="Criar card">
        <Icon name="plus" size={24} stroke={2.4} />
      </Link>
      {item(RIGHT)}
    </nav>
  );
}
