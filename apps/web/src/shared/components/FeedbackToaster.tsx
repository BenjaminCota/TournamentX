import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { FeedbackDetail, feedbackEventName } from '../feedback';

type Toast = FeedbackDetail & { id: number };

const styles = {
  success: { icon: CheckCircle2, className: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100', iconClass: 'text-emerald-400' },
  error: { icon: XCircle, className: 'border-red-400/30 bg-red-500/15 text-red-100', iconClass: 'text-red-400' },
  info: { icon: Info, className: 'border-sky-400/30 bg-sky-500/15 text-sky-100', iconClass: 'text-sky-400' },
};

export const FeedbackToaster: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onFeedback = (event: Event) => {
      const detail = (event as CustomEvent<FeedbackDetail>).detail;
      const toast = { ...detail, id: Date.now() + Math.floor(Math.random() * 1000) };
      setToasts((current) => [...current, toast].slice(-4));
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 5000);
    };
    window.addEventListener(feedbackEventName, onFeedback);
    return () => window.removeEventListener(feedbackEventName, onFeedback);
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const style = styles[toast.kind];
        const Icon = style.icon;
        return <div key={toast.id} role={toast.kind === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${style.className}`}>
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`} />
          <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
          <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="rounded p-0.5 text-current/70 hover:bg-white/10 hover:text-white" aria-label="Cerrar notificación"><X className="h-4 w-4" /></button>
        </div>;
      })}
    </div>
  );
};
