import { openDB, type IDBPDatabase } from 'idb';
import { validateCategoryName, type NameError } from '../domain/rules';
import {
  DEFAULT_SETTINGS,
  STARTER_CATEGORIES,
  type Category,
  type LedgerData,
  type Settings,
  type Transaction,
  type TxType,
} from '../domain/types';

export type TransactionInput = Omit<Transaction, 'id'>;

export type CategoryResult = { ok: true; category: Category } | { ok: false; reason: NameError };

/** What a deleted Category looked like, plus the Transactions it touched, for Undo. */
export interface CategoryDeletion {
  category: Category;
  /** The affected Transactions as they were before the delete. */
  transactions: Transaction[];
  affected: number;
}

export interface Ledger {
  load(): Promise<{ data: LedgerData; settings: Settings }>;
  seedStarterCategories(): Promise<void>;
  addTransaction(input: TransactionInput): Promise<Transaction>;
  updateTransaction(id: string, input: TransactionInput): Promise<Transaction>;
  /** Deletes and returns a snapshot to pass to `restoreTransaction` for Undo. */
  deleteTransaction(id: string): Promise<Transaction>;
  restoreTransaction(snapshot: Transaction): Promise<void>;
  createCategory(type: TxType, name: string): Promise<CategoryResult>;
  /** A renamed starter default becomes a plain custom Category (it stops translating). */
  renameCategory(id: string, name: string): Promise<CategoryResult>;
  /** Removes the Category; its displayed name stays on its Transactions as a Retired label. */
  deleteCategory(id: string): Promise<CategoryDeletion>;
  restoreCategory(snapshot: CategoryDeletion): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  /** Import: replaces all Categories and Transactions; settings are kept, the change count resets. */
  replaceAll(data: LedgerData): Promise<void>;
  /** Wipes everything, settings included, so the app is back at first run. */
  eraseAll(): Promise<void>;
  close(): void;
}

/** The few object-store operations the helpers need (both IDB stores in a transaction satisfy it). */
interface Store {
  getAll(): Promise<unknown[]>;
  get(key: string): Promise<unknown>;
  put(value: unknown, key?: string): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

/** Moves the given Categories to the front of the picker order (strictly newer than any other). */
async function markUsed(categories: Store, ids: string[]): Promise<void> {
  const all = (await categories.getAll()) as Category[];
  let stamp = Math.max(Date.now(), ...all.map((c) => c.lastUsedAt + 1));
  for (const id of ids) {
    const category = all.find((c) => c.id === id);
    if (category) await categories.put({ ...category, lastUsedAt: stamp++ });
  }
}

async function countChange(meta: Store, by: number): Promise<void> {
  const stored = ((await meta.get('settings')) as Partial<Settings> | undefined) ?? {};
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stored };
  await meta.put({ ...settings, changesSinceBackup: Math.max(0, settings.changesSinceBackup + by) }, 'settings');
}

function retiredNames(transactions: Transaction[], type: TxType): string[] {
  return [...new Set(transactions.filter((t) => t.type === type).flatMap((t) => t.retired))];
}

export async function openLedger(dbName: string, nameOf: (category: Category) => string): Promise<Ledger> {
  const db: IDBPDatabase = await openDB(dbName, 1, {
    upgrade(database) {
      database.createObjectStore('categories', { keyPath: 'id' });
      database.createObjectStore('transactions', { keyPath: 'id' });
      database.createObjectStore('meta');
    },
  });

  return {
    async load() {
      const categories = (await db.getAll('categories')) as Category[];
      const transactions = (await db.getAll('transactions')) as Transaction[];
      const stored = (await db.get('meta', 'settings')) as Partial<Settings> | undefined;
      return { data: { categories, transactions }, settings: { ...DEFAULT_SETTINGS, ...stored } };
    },

    async seedStarterCategories() {
      const base = Date.now();
      const tx = db.transaction('categories', 'readwrite');
      STARTER_CATEGORIES.forEach((starter, index) => {
        const category: Category = {
          id: crypto.randomUUID(),
          type: starter.type,
          name: starter.name,
          defaultKey: starter.key,
          lastUsedAt: base - index,
        };
        void tx.store.put(category);
      });
      await tx.done;
    },

    async addTransaction(input) {
      const transaction: Transaction = { ...input, id: crypto.randomUUID() };
      const tx = db.transaction(['categories', 'transactions', 'meta'], 'readwrite');
      await tx.objectStore('transactions').put(transaction);
      await markUsed(tx.objectStore('categories'), transaction.categoryIds);
      await countChange(tx.objectStore('meta'), 1);
      await tx.done;
      return transaction;
    },

    async updateTransaction(id, input) {
      const transaction: Transaction = { ...input, id };
      const tx = db.transaction(['categories', 'transactions', 'meta'], 'readwrite');
      await tx.objectStore('transactions').put(transaction);
      await markUsed(tx.objectStore('categories'), transaction.categoryIds);
      await countChange(tx.objectStore('meta'), 1);
      await tx.done;
      return transaction;
    },

    async deleteTransaction(id) {
      const tx = db.transaction(['transactions', 'meta'], 'readwrite');
      const snapshot = (await tx.objectStore('transactions').get(id)) as Transaction;
      await tx.objectStore('transactions').delete(id);
      await countChange(tx.objectStore('meta'), 1);
      await tx.done;
      return snapshot;
    },

    async restoreTransaction(snapshot) {
      const tx = db.transaction(['transactions', 'meta'], 'readwrite');
      await tx.objectStore('transactions').put(snapshot);
      await countChange(tx.objectStore('meta'), -1);
      await tx.done;
    },

    async createCategory(type, name) {
      const tx = db.transaction(['categories', 'transactions', 'meta'], 'readwrite');
      const all = (await tx.objectStore('categories').getAll()) as Category[];
      const transactions = (await tx.objectStore('transactions').getAll()) as Transaction[];
      const checked = validateCategoryName(name, {
        existing: all.filter((c) => c.type === type).map(nameOf),
        retired: retiredNames(transactions, type),
      });
      if (!checked.ok) {
        await tx.done;
        return checked;
      }
      const category: Category = {
        id: crypto.randomUUID(),
        type,
        name: checked.name,
        lastUsedAt: Math.max(Date.now(), ...all.map((c) => c.lastUsedAt + 1)),
      };
      await tx.objectStore('categories').put(category);
      await countChange(tx.objectStore('meta'), 1);
      await tx.done;
      return { ok: true, category };
    },

    async renameCategory(id, name) {
      const tx = db.transaction(['categories', 'transactions', 'meta'], 'readwrite');
      const all = (await tx.objectStore('categories').getAll()) as Category[];
      const current = all.find((c) => c.id === id)!;
      const transactions = (await tx.objectStore('transactions').getAll()) as Transaction[];
      const checked = validateCategoryName(name, {
        existing: all.filter((c) => c.type === current.type && c.id !== id).map(nameOf),
        retired: retiredNames(transactions, current.type),
      });
      if (!checked.ok) {
        await tx.done;
        return checked;
      }
      const { defaultKey: _dropped, ...rest } = current;
      const category: Category = { ...rest, name: checked.name };
      await tx.objectStore('categories').put(category);
      await countChange(tx.objectStore('meta'), 1);
      await tx.done;
      return { ok: true, category };
    },

    async deleteCategory(id) {
      const tx = db.transaction(['categories', 'transactions', 'meta'], 'readwrite');
      const category = (await tx.objectStore('categories').get(id)) as Category;
      const label = nameOf(category);
      const all = (await tx.objectStore('transactions').getAll()) as Transaction[];
      const touched = all.filter((t) => t.categoryIds.includes(id));
      for (const t of touched) {
        await tx.objectStore('transactions').put({
          ...t,
          categoryIds: t.categoryIds.filter((c) => c !== id),
          retired: t.retired.includes(label) ? t.retired : [...t.retired, label],
        });
      }
      await tx.objectStore('categories').delete(id);
      await countChange(tx.objectStore('meta'), 1);
      await tx.done;
      return { category, transactions: touched, affected: touched.length };
    },

    async restoreCategory(snapshot) {
      const tx = db.transaction(['categories', 'transactions', 'meta'], 'readwrite');
      await tx.objectStore('categories').put(snapshot.category);
      for (const t of snapshot.transactions) await tx.objectStore('transactions').put(t);
      await countChange(tx.objectStore('meta'), -1);
      await tx.done;
    },

    async updateSettings(patch) {
      const tx = db.transaction('meta', 'readwrite');
      const stored = ((await tx.store.get('settings')) as Partial<Settings> | undefined) ?? {};
      const settings: Settings = { ...DEFAULT_SETTINGS, ...stored, ...patch };
      await tx.store.put(settings, 'settings');
      await tx.done;
      return settings;
    },

    async replaceAll(data) {
      const tx = db.transaction(['categories', 'transactions', 'meta'], 'readwrite');
      await tx.objectStore('categories').clear();
      await tx.objectStore('transactions').clear();
      for (const c of data.categories) await tx.objectStore('categories').put(c);
      for (const t of data.transactions) await tx.objectStore('transactions').put(t);
      const stored = ((await tx.objectStore('meta').get('settings')) as Partial<Settings> | undefined) ?? {};
      await tx.objectStore('meta').put(
        { ...DEFAULT_SETTINGS, ...stored, onboarded: true, changesSinceBackup: 0 },
        'settings',
      );
      await tx.done;
    },

    async eraseAll() {
      const tx = db.transaction(['categories', 'transactions', 'meta'], 'readwrite');
      await tx.objectStore('categories').clear();
      await tx.objectStore('transactions').clear();
      await tx.objectStore('meta').clear();
      await tx.done;
    },

    close() {
      db.close();
    },
  };
}
