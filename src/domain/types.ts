export type TxType = 'expense' | 'income';
export type Language = 'en' | 'it';

export interface Category {
  id: string;
  type: TxType;
  /** Fallback/English name. Display uses `defaultKey` translation while it is set. */
  name: string;
  /** Set only while the Category is a still-translatable starter default. */
  defaultKey?: string;
  lastUsedAt: number;
}

export interface Transaction {
  id: string;
  /** Calendar date, YYYY-MM-DD, no time of day. */
  date: string;
  type: TxType;
  /** Always positive; `type` gives the direction. */
  cents: number;
  /** Live Category references. */
  categoryIds: string[];
  /** Retired labels: frozen names of deleted Categories. */
  retired: string[];
  note: string;
}

export interface LedgerData {
  categories: Category[];
  transactions: Transaction[];
}

export interface Settings {
  language: Language;
  openingCents: number;
  /** False/absent means the database is empty and the first-run screen is shown. */
  onboarded: boolean;
  lastBackupAt: number | null;
  changesSinceBackup: number;
  backupBannerHiddenUntil: number;
  installNudgeHiddenUntil: number;
  persistRequested: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  openingCents: 0,
  onboarded: false,
  lastBackupAt: null,
  changesSinceBackup: 0,
  backupBannerHiddenUntil: 0,
  installNudgeHiddenUntil: 0,
  persistRequested: false,
};

/** Starter Categories. `key` is stored as `defaultKey` and translated at display. */
export const STARTER_CATEGORIES: ReadonlyArray<{ type: TxType; key: string; name: string }> = [
  { type: 'expense', key: 'groceries', name: 'Groceries' },
  { type: 'expense', key: 'diningOut', name: 'Dining out' },
  { type: 'expense', key: 'transport', name: 'Transport' },
  { type: 'expense', key: 'housing', name: 'Housing' },
  { type: 'expense', key: 'utilities', name: 'Utilities' },
  { type: 'expense', key: 'health', name: 'Health' },
  { type: 'expense', key: 'entertainment', name: 'Entertainment' },
  { type: 'expense', key: 'shopping', name: 'Shopping' },
  { type: 'expense', key: 'otherExpense', name: 'Other' },
  { type: 'income', key: 'salary', name: 'Salary' },
  { type: 'income', key: 'gifts', name: 'Gifts' },
  { type: 'income', key: 'otherIncome', name: 'Other' },
];
