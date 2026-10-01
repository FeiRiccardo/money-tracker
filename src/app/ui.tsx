import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from './store';

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <h2>{title}</h2>
        {children}
      </div>
    </>
  );
}

const ICON = { success: '✓', info: 'i', error: '!' } as const;

/** Up to three toasts, newest at the bottom. A toast waits while it is held, hovered or focused. */
export function ToastView() {
  const { t } = useTranslation();
  const { toasts, dismissToast, pauseToast, resumeToast } = useStore();
  if (toasts.length === 0) return null;
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={'toast ' + toast.kind}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          onPointerEnter={() => pauseToast(toast.id)}
          onPointerLeave={() => resumeToast(toast.id)}
          onFocus={() => pauseToast(toast.id)}
          onBlur={() => resumeToast(toast.id)}
        >
          <span className="toast-icon" aria-hidden="true">
            {ICON[toast.kind]}
          </span>
          <span className="toast-text">{toast.message}</span>
          {toast.onAction && (
            <button
              className="toast-action"
              onClick={() => {
                toast.onAction?.();
                dismissToast(toast.id);
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button className="toast-close" aria-label={t('toast.dismiss')} onClick={() => dismissToast(toast.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/** Blocking message shown when a write failed: the change was not saved, so back up now. */
export function SaveFailedDialog() {
  const { t } = useTranslation();
  const { saveFailed, clearSaveFailed, exportBackup } = useStore();
  if (!saveFailed) return null;
  return (
    <Dialog title={t('form.saveFailedTitle')} onClose={clearSaveFailed}>
      <p>{t('form.saveFailedBody')}</p>
      <div className="dialog-actions">
        <button className="btn" onClick={clearSaveFailed}>
          {t('common.close')}
        </button>
        <button className="btn primary" onClick={() => void exportBackup()}>
          {t('settings.export')}
        </button>
      </div>
    </Dialog>
  );
}
