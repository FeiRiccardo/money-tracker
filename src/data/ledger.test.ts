import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openLedger } from './ledger';
import { DEFAULT_SETTINGS } from '../domain/types';

let counter = 0;
const freshName = () => `money-test-${++counter}`;
const nameOf = (c: { name: string }) => c.name;

describe('openLedger', () => {
  it('loads empty data and the default settings from a fresh database', async () => {
    const ledger = await openLedger(freshName(), nameOf);

    const { data, settings } = await ledger.load();

    expect(data).toEqual({ categories: [], transactions: [] });
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('starter Categories and Transactions', () => {
  it('seeds the starter Categories, each with a default key, in separate Expense and Income lists', async () => {
    const ledger = await openLedger(freshName(), nameOf);

    await ledger.seedStarterCategories();
    const { data } = await ledger.load();

    // Picker order is most recently used first; fresh starters keep the starter order.
    const picker = (type: string) =>
      data.categories
        .filter((c) => c.type === type)
        .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
        .map((c) => c.name);
    expect(picker('expense')).toEqual([
      'Groceries', 'Dining out', 'Transport', 'Housing', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Other',
    ]);
    expect(picker('income')).toEqual(['Salary', 'Gifts', 'Other']);
    expect(data.categories.every((c) => typeof c.defaultKey === 'string')).toBe(true);
  });

  it('keeps a saved Transaction after the database is closed and reopened', async () => {
    const name = freshName();
    const first = await openLedger(name, nameOf);
    await first.seedStarterCategories();
    const groceries = (await first.load()).data.categories.find((c) => c.defaultKey === 'groceries')!;

    const saved = await first.addTransaction({
      date: '2026-10-17', type: 'expense', cents: 6230, categoryIds: [groceries.id], retired: [], note: 'Weekly shop',
    });
    first.close();

    const second = await openLedger(name, nameOf);
    const { data } = await second.load();

    expect(data.transactions).toEqual([saved]);
    expect(saved.id).toEqual(expect.any(String));
  });
});

describe('what saving a Transaction does', () => {
  it('moves its Categories to the front of the picker order and counts one unbacked change', async () => {
    const ledger = await openLedger(freshName(), nameOf);
    await ledger.seedStarterCategories();
    const before = (await ledger.load()).data.categories;
    const transport = before.find((c) => c.defaultKey === 'transport')!;
    const health = before.find((c) => c.defaultKey === 'health')!;

    await ledger.addTransaction({
      date: '2026-10-03', type: 'expense', cents: 1240, categoryIds: [transport.id, health.id], retired: [], note: '',
    });
    const { data, settings } = await ledger.load();

    const picker = data.categories
      .filter((c) => c.type === 'expense')
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .map((c) => c.name);
    expect(picker.slice(0, 3)).toEqual(expect.arrayContaining(['Transport', 'Health']));
    expect(picker.slice(0, 2).sort()).toEqual(['Health', 'Transport']);
    expect(picker[2]).toBe('Groceries');
    expect(settings.changesSinceBackup).toBe(1);
  });
});

async function ledgerWithOneTransaction() {
  const ledger = await openLedger(freshName(), nameOf);
  await ledger.seedStarterCategories();
  const categories = (await ledger.load()).data.categories;
  const groceries = categories.find((c) => c.defaultKey === 'groceries')!;
  const shopping = categories.find((c) => c.defaultKey === 'shopping')!;
  const saved = await ledger.addTransaction({
    date: '2026-10-17', type: 'expense', cents: 6230, categoryIds: [groceries.id], retired: [], note: 'Weekly shop',
  });
  return { ledger, groceries, shopping, saved };
}

describe('editing and deleting a Transaction', () => {
  it('replaces the stored Transaction, keeps its id, and counts another change', async () => {
    const { ledger, shopping, saved } = await ledgerWithOneTransaction();

    const updated = await ledger.updateTransaction(saved.id, {
      date: '2026-10-18', type: 'expense', cents: 7000, categoryIds: [shopping.id], retired: ['Gym'], note: 'New pan',
    });
    const { data, settings } = await ledger.load();

    expect(updated).toEqual({
      id: saved.id, date: '2026-10-18', type: 'expense', cents: 7000, categoryIds: [shopping.id], retired: ['Gym'], note: 'New pan',
    });
    expect(data.transactions).toEqual([updated]);
    expect(settings.changesSinceBackup).toBe(2);
  });
});

describe('deleting a Transaction and Undo', () => {
  it('deletes at once and returns a snapshot; restoring it brings everything back, as if never deleted', async () => {
    const { ledger, saved } = await ledgerWithOneTransaction();

    const removed = await ledger.deleteTransaction(saved.id);
    const afterDelete = await ledger.load();

    expect(removed).toEqual(saved);
    expect(afterDelete.data.transactions).toEqual([]);
    expect(afterDelete.settings.changesSinceBackup).toBe(2);

    await ledger.restoreTransaction(removed);
    const afterUndo = await ledger.load();

    expect(afterUndo.data.transactions).toEqual([saved]);
    expect(afterUndo.settings.changesSinceBackup).toBe(1);
  });
});

describe('creating a Category', () => {
  it('adds it at the front of the picker order for its type and counts a change', async () => {
    const { ledger } = await ledgerWithOneTransaction();

    const result = await ledger.createCategory('expense', '  Gym ');
    const { data, settings } = await ledger.load();

    expect(result).toEqual({ ok: true, category: expect.objectContaining({ type: 'expense', name: 'Gym' }) });
    const picker = data.categories
      .filter((c) => c.type === 'expense')
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .map((c) => c.name);
    expect(picker[0]).toBe('Gym');
    expect(settings.changesSinceBackup).toBe(2);
  });

  it('refuses a duplicate name within the same type, ignoring case, but allows it in the other type', async () => {
    const { ledger } = await ledgerWithOneTransaction();

    expect(await ledger.createCategory('expense', 'groceries')).toEqual({ ok: false, reason: 'duplicate' });
    expect(await ledger.createCategory('income', 'Groceries')).toEqual({
      ok: true,
      category: expect.objectContaining({ type: 'income', name: 'Groceries' }),
    });
    expect(await ledger.createCategory('expense', 'a|b')).toEqual({ ok: false, reason: 'pipe' });
  });
});

describe('deleting a Category', () => {
  it('leaves its name on the Transactions that had it as a Retired label, and reports how many were affected', async () => {
    const { ledger, groceries, shopping, saved } = await ledgerWithOneTransaction();
    const both = await ledger.updateTransaction(saved.id, {
      date: saved.date, type: 'expense', cents: saved.cents, categoryIds: [groceries.id, shopping.id], retired: ['Gym'], note: '',
    });

    const snapshot = await ledger.deleteCategory(groceries.id);
    const { data } = await ledger.load();

    expect(snapshot.affected).toBe(1);
    expect(data.categories.find((c) => c.id === groceries.id)).toBeUndefined();
    expect(data.transactions).toEqual([{ ...both, categoryIds: [shopping.id], retired: ['Gym', 'Groceries'] }]);
  });

  it('can be undone: the Category and every affected Transaction come back exactly as they were', async () => {
    const { ledger, groceries, saved } = await ledgerWithOneTransaction();
    const before = await ledger.load();

    const snapshot = await ledger.deleteCategory(groceries.id);
    await ledger.restoreCategory(snapshot);
    const after = await ledger.load();

    expect(after.data.categories).toEqual(before.data.categories);
    expect(after.data.transactions).toEqual([saved]);
    expect(after.settings.changesSinceBackup).toBe(before.settings.changesSinceBackup);
  });
});

describe('Retired labels reserve their name', () => {
  it('refuses to create a Category with a deleted Category\'s name, but only in the same type', async () => {
    const { ledger, groceries } = await ledgerWithOneTransaction();
    await ledger.deleteCategory(groceries.id);

    expect(await ledger.createCategory('expense', 'groceries')).toEqual({ ok: false, reason: 'reserved' });
    expect((await ledger.createCategory('income', 'Groceries')).ok).toBe(true);
  });
});

describe('a deleted Category nobody used', () => {
  it('leaves no Retired label, so its name is free to use again', async () => {
    const { ledger, shopping } = await ledgerWithOneTransaction();
    await ledger.deleteCategory(shopping.id);

    expect((await ledger.createCategory('expense', 'Shopping')).ok).toBe(true);
  });
});

describe('renaming a Category', () => {
  it('renames it, turns a starter default into a plain custom Category, and counts a change', async () => {
    const { ledger, groceries } = await ledgerWithOneTransaction();

    const result = await ledger.renameCategory(groceries.id, ' Supermarket ');
    const { data, settings } = await ledger.load();

    expect(result).toEqual({ ok: true, category: expect.objectContaining({ id: groceries.id, name: 'Supermarket' }) });
    const stored = data.categories.find((c) => c.id === groceries.id)!;
    expect(stored.name).toBe('Supermarket');
    expect(stored.defaultKey).toBeUndefined();
    expect(settings.changesSinceBackup).toBe(2);
  });

  it('refuses a name used by another Category or reserved by a Retired label, but accepts keeping its own name', async () => {
    const { ledger, groceries, shopping } = await ledgerWithOneTransaction();
    await ledger.addTransaction({
      date: '2026-10-18', type: 'expense', cents: 500, categoryIds: [shopping.id], retired: [], note: '',
    });
    await ledger.deleteCategory(shopping.id);

    expect(await ledger.renameCategory(groceries.id, 'Transport')).toEqual({ ok: false, reason: 'duplicate' });
    expect(await ledger.renameCategory(groceries.id, 'shopping')).toEqual({ ok: false, reason: 'reserved' });
    expect((await ledger.renameCategory(groceries.id, 'GROCERIES')).ok).toBe(true);
  });
});

describe('replacing and erasing everything', () => {
  it('replaceAll swaps in the imported data, keeps language and opening balance, and resets the change count', async () => {
    const { ledger } = await ledgerWithOneTransaction();
    await ledger.updateSettings({ language: 'it', openingCents: 12345 });
    const imported = {
      categories: [{ id: 'c1', type: 'expense' as const, name: 'Food', lastUsedAt: 5 }],
      transactions: [
        { id: 't1', date: '2026-01-02', type: 'expense' as const, cents: 100, categoryIds: ['c1'], retired: [], note: '' },
      ],
    };

    await ledger.replaceAll(imported);
    const { data, settings } = await ledger.load();

    expect(data).toEqual(imported);
    expect(settings).toEqual(expect.objectContaining({
      language: 'it', openingCents: 12345, onboarded: true, changesSinceBackup: 0,
    }));
  });

  it('eraseAll removes every Category, Transaction and setting, so the app is back at first run', async () => {
    const { ledger } = await ledgerWithOneTransaction();
    await ledger.updateSettings({ language: 'it', openingCents: 999, onboarded: true });

    await ledger.eraseAll();
    const { data, settings } = await ledger.load();

    expect(data).toEqual({ categories: [], transactions: [] });
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});
