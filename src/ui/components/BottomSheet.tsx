import type { ReactNode } from 'react';

export function BottomSheet({ open, title, onClose, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
