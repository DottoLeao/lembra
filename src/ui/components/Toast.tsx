import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export const UNDO_MS = 6000;

interface ToastInput {
  message: string;
  action?: { label: string; onAction: () => void };
}
interface ToastItem extends ToastInput {
  id: number;
}
type ShowToast = (t: ToastInput, ms?: number) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);
  const reduce = useReducedMotion();

  const show = useCallback<ShowToast>((t, ms = 4000) => {
    window.clearTimeout(timer.current);
    const item = { ...t, id: ++counter.current };
    setToast(item);
    timer.current = window.setTimeout(() => setToast((cur) => (cur?.id === item.id ? null : cur)), ms);
  }, []);

  const view = toast && <ToastView key={toast.id} toast={toast} onDone={() => setToast(null)} />;
  return (
    <ToastContext.Provider value={show}>
      {children}
      {reduce ? view : <AnimatePresence>{view}</AnimatePresence>}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: ToastItem; onDone: () => void }) {
  // o toast que está saindo deixa de ser o status e não recebe toques
  const isPresent = useIsPresent();
  return (
    <motion.div className="toast" role={isPresent ? 'status' : undefined} inert={!isPresent}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
      <span>{toast.message}</span>
      {toast.action && (
        <button type="button" className="toast__action"
          onClick={() => { toast.action?.onAction(); onDone(); }}>
          {toast.action.label}
        </button>
      )}
    </motion.div>
  );
}

export const useToast = (): ShowToast => useContext(ToastContext);

export const SAVE_ERROR = 'Não foi possível salvar. Teus dados continuam como estavam.';
export const UNDO_ERROR = 'Não foi possível desfazer.';
export const DELETE_ERROR = 'Não foi possível apagar. Nada mudou.';
export const BACKUP_ERROR = 'Não foi possível exportar o backup.';

/**
 * Roda uma ação que grava, apaga ou exporta. Se ela falhar (cota cheia, modo privado…),
 * mostra um toast em vez de falhar calada.
 */
export function useSafeAction(): (action: () => Promise<unknown>, message?: string) => void {
  const toast = useToast();
  return useCallback((action, message = SAVE_ERROR) => {
    action().catch((err: unknown) => {
      console.error(err);
      toast({ message });
    });
  }, [toast]);
}
