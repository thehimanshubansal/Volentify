'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; message: string }

const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex max-w-md animate-fade-up items-start gap-3 rounded-xl border border-line-strong bg-ink-800/95 px-4 py-3 text-sm text-ivory shadow-float backdrop-blur">
            {t.kind === 'error'
              ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" aria-hidden />
              : <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', t.kind === 'success' ? 'text-low' : 'text-info')} aria-hidden />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))} className="text-stone hover:text-ivory" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
