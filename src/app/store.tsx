import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { openLedger, type CategoryResult, type Ledger, type TransactionInput } from '../data/ledger';
import { BACKUP_DISMISS_MS, INSTALL_DISMISS_MS } from '../domain/reminders';
import { DEFAULT_SETTINGS, type Language, type LedgerData, type Settings, type TxType } from '../domain/types';
import i18n, { categoryName, setLanguage as applyLanguage } from '../i18n';
import { exportFiles, requestPersistence } from './platform';

export interface Toast {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface Store {
  ready: boolean;
  storageError: boolean;
  data: LedgerData;
  settings: Settings;
  language: Language;
  toast: Toast | null;
  showToast: (toast: Toast, ms?: number) => void;
  dismissToast: () => void;
  saveFailed: boolean;
  clearSaveFailed: () => void;
  /** True right after an import: the opening balance is not in the backup, so ask the user to check it. */
  openingCheck: boolean;
  dismissOpeningCheck: () => void;
  addTransaction: (input: TransactionInput) => Promise<boolean>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<void>;
  createCategory: (type: TxType, name: string) => Promise<CategoryResult>;
  renameCategory: (id: string, name: string) => Promise<CategoryResult>;
  deleteCategory: (id: string) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  setOpeningBalance: (cents: number) => Promise<void>;
  startFresh: (openingCents: number) => Promise<void>;
  applyImport: (data: LedgerData) => Promise<void>;
  eraseAll: () => Promise<void>;
  exportBackup: () => Promise<boolean>;
  dismissBanner: (kind: 'backup' | 'install') => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

const EMPTY: LedgerData = { categories: [], transactions: [] };

export function StoreProvider({ children }: { children: ReactNode }) {
  const ledgerRef = useRef<Ledger | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [data, setData] = useState<LedgerData>(EMPTY);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [openingCheck, setOpeningCheck] = useState(false);

  const refresh = useCallback(async () => {
    const loaded = await ledgerRef.current!.load();
    setData(loaded.data);
    setSettings(loaded.settings);
    applyLanguage(loaded.settings.language);
  }, []);

  useEffect(() => {
    let cancelled = false;
    openLedger('money-tracker', categoryName)
      .then(async (ledger) => {
        if (cancelled) return;
        ledgerRef.current = ledger;
        await refresh();
        setReady(true);
      })
      .catch(() => {
        setStorageError(true);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const dismissToast = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const showToast = useCallback((next: Toast, ms = 5000) => {
    window.clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  /** Runs a write; any failure becomes the blocking "not saved, back up now" message. */
  const write = useCallback(
    async <T,>(fn: (ledger: Ledger) => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> => {
      try {
        const value = await fn(ledgerRef.current!);
        await refresh();
        return { ok: true, value };
      } catch {
        setSaveFailed(true);
        return { ok: false };
      }
    },
    [refresh],
  );

  const store = useMemo<Store>(() => {
    const requestPersistenceOnce = async () => {
      const current = (await ledgerRef.current!.load()).settings;
      if (current.persistRequested) return;
      await requestPersistence();
      await ledgerRef.current!.updateSettings({ persistRequested: true });
    };

    return {
      ready,
      storageError,
      data,
      settings,
      language: settings.language,
      toast,
      showToast,
      dismissToast,
      saveFailed,
      clearSaveFailed: () => setSaveFailed(false),
      openingCheck,
      dismissOpeningCheck: () => setOpeningCheck(false),

      async addTransaction(input) {
        const result = await write((l) => l.addTransaction(input));
        if (result.ok) {
          await requestPersistenceOnce();
          await refresh();
        }
        return result.ok;
      },
      async updateTransaction(id, input) {
        return (await write((l) => l.updateTransaction(id, input))).ok;
      },
      async deleteTransaction(id) {
        const result = await write((l) => l.deleteTransaction(id));
        if (!result.ok) return;
        const snapshot = result.value;
        showToast({
          message: i18n.t('form.deleted'),
          actionLabel: i18n.t('common.undo'),
          onAction: () => {
            dismissToast();
            void write((l) => l.restoreTransaction(snapshot));
          },
        });
      },

      async createCategory(type, name) {
        const result = await write((l) => l.createCategory(type, name));
        return result.ok ? result.value : { ok: false, reason: 'empty' };
      },
      async renameCategory(id, name) {
        const result = await write((l) => l.renameCategory(id, name));
        return result.ok ? result.value : { ok: false, reason: 'empty' };
      },
      async deleteCategory(id) {
        const result = await write((l) => l.deleteCategory(id));
        if (!result.ok) return;
        const snapshot = result.value;
        showToast({
          message: i18n.t('categories.deleted'),
          actionLabel: i18n.t('common.undo'),
          onAction: () => {
            dismissToast();
            void write((l) => l.restoreCategory(snapshot));
          },
        });
      },

      async setLanguage(language) {
        applyLanguage(language);
        await write((l) => l.updateSettings({ language }));
      },
      async setOpeningBalance(cents) {
        await write((l) => l.updateSettings({ openingCents: cents }));
      },
      async startFresh(openingCents) {
        await write(async (l) => {
          await l.seedStarterCategories();
          await l.updateSettings({ onboarded: true, openingCents });
        });
      },

      async applyImport(imported) {
        const before = await ledgerRef.current!.load();
        const result = await write((l) => l.replaceAll(imported));
        if (!result.ok) return;
        setOpeningCheck(true);
        showToast(
          {
            message: i18n.t('import.done'),
            actionLabel: i18n.t('common.undo'),
            onAction: () => {
              dismissToast();
              setOpeningCheck(false);
              void write(async (l) => {
                await l.replaceAll(before.data);
                await l.updateSettings(before.settings);
              });
            },
          },
          10000,
        );
      },

      async eraseAll() {
        const result = await write((l) => l.eraseAll());
        if (result.ok) applyLanguage('en');
      },

      async exportBackup() {
        const shared = await exportFiles(data, i18n.t('export.shareTitle'));
        if (!shared) return false;
        await write((l) => l.updateSettings({ lastBackupAt: Date.now(), changesSinceBackup: 0 }));
        showToast({ message: i18n.t('export.done') });
        return true;
      },

      async dismissBanner(kind) {
        const patch =
          kind === 'backup'
            ? { backupBannerHiddenUntil: Date.now() + BACKUP_DISMISS_MS }
            : { installNudgeHiddenUntil: Date.now() + INSTALL_DISMISS_MS };
        await write((l) => l.updateSettings(patch));
      },
    };
  }, [ready, storageError, data, settings, toast, showToast, dismissToast, saveFailed, openingCheck, write, refresh]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
