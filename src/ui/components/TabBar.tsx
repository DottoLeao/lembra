import { motion } from 'motion/react';
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

const MotionLink = motion.create(Link);
// o toque encolhe só o ícone: a variante "tap" do link passa para o ícone
const iconTap = { tap: { scale: 0.9 } };
const pillSpring = { type: 'spring', stiffness: 380, damping: 34 } as const;

export function TabBar({ createHref = '/card/new' }: { createHref?: string }) {
  const { pathname } = useLocation();
  const item = (t: Tab) => {
    const active = t.match(pathname);
    return (
      <MotionLink key={t.to} to={t.to} className={active ? 'tabbar__item tabbar__item--active' : 'tabbar__item'}
        aria-current={active ? 'page' : undefined} whileTap="tap">
        {active && <motion.span layoutId="tab-pill" className="tabbar__pill" transition={pillSpring} />}
        <motion.span className="tabbar__icon" variants={iconTap}><Icon name={t.icon} /></motion.span>
        <span className="tabbar__label">{t.label}</span>
      </MotionLink>
    );
  };
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {LEFT.map(item)}
      <MotionLink to={createHref} className="tabbar__create" aria-label="Criar card" whileTap="tap">
        <motion.span className="tabbar__icon" variants={iconTap}><Icon name="plus" size={24} stroke={2.4} /></motion.span>
      </MotionLink>
      {item(RIGHT)}
    </nav>
  );
}
