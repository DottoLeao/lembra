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

  const show = useCallback<ShowToast>((t, ms = 4000) => {
    window.clearTimeout(timer.current);
    const item = { ...t, id: ++counter.current };
    setToast(item);
    timer.current = window.setTimeout(() => setToast((cur) => (cur?.id === item.id ? null : cur)), ms);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.action && (
            <button type="button" className="toast__action"
              onClick={() => { toast.action?.onAction(); setToast(null); }}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = (): ShowToast => useContext(ToastContext);
