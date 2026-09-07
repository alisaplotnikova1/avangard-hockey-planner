import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string; }

const ToastContext = createContext<{ showToast: (type: ToastType, message: string) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-xl px-4 py-3 shadow-lg border text-sm animate-in slide-in-from-right ${
              t.type === 'success' ? 'bg-success-50 dark:bg-success-500/10 border-success-200 dark:border-success-500/30 text-success-700 dark:text-success-300'
              : t.type === 'error' ? 'bg-error-50 dark:bg-error-500/10 border-error-200 dark:border-error-500/30 text-error-700 dark:text-error-300'
              : 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-300'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            {t.type === 'info' && <Info className="w-4 h-4 mt-0.5 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-50 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
