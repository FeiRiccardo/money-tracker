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

export function ToastView() {
  const { toast, dismissToast } = useStore();
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.onAction && (
        <button className="toast-action" onClick={toast.onAction}>
          {toast.actionLabel}
        </button>
      )}
      {!toast.onAction && (
        <button className="toast-action" onClick={dismissToast}>
          ✕
        </button>
      )}
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
