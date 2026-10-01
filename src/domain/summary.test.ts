import { describe, expect, it } from 'vitest';
import { balance, summarize } from './summary';
import type { Category, LedgerData, Transaction, TxType } from './types';

const cat = (id: string, type: TxType, name: string): Category => ({ id, type, name, lastUsedAt: 0 });
const tx = (
  date: string,
  type: TxType,
  cents: number,
  categoryIds: string[],
  retired: string[] = [],
): Transaction => ({ id: `${date}-${cents}-${categoryIds.join()}`, date, type, cents, categoryIds, retired, note: '' });

const nameOf = (c: Category) => c.name;

const categories = [
  cat('groceries', 'expense', 'Groceries'),
  cat('household', 'expense', 'Household'),
  cat('salary', 'income', 'Salary'),
];

describe('summarize', () => {
  it('totals income, expenses and net for the chosen month only', () => {
    const data: LedgerData = {
      categories,
      transactions: [
        tx('2026-10-02', 'income', 180000, ['salary']),
        tx('2026-10-03', 'expense', 5000, ['groceries']),
        tx('2026-10-20', 'expense', 2500, ['groceries']),
        tx('2026-09-30', 'expense', 99900, ['groceries']),
        tx('2026-11-01', 'income', 99900, ['salary']),
      ],
    };

    const s = summarize(data, '2026-10', nameOf);

    expect(s.incomeCents).toBe(180000);
    expect(s.expenseCents).toBe(7500);
    expect(s.netCents).toBe(172500);
  });

  it('counts a Transaction in full under each of its Categories, but once in the real total', () => {
    const data: LedgerData = {
      categories,
      transactions: [
        tx('2026-10-17', 'expense', 5000, ['groceries', 'household']),
        tx('2026-10-18', 'expense', 1000, ['groceries']),
      ],
    };

    const s = summarize(data, '2026-10', nameOf);

    expect(s.expenseCents).toBe(6000);
    expect(s.expenseLines).toEqual([
      { name: 'Groceries', cents: 6000, count: 2, retired: false },
      { name: 'Household', cents: 5000, count: 1, retired: false },
    ]);
    expect(s.expenseLines.reduce((a, l) => a + l.cents, 0)).toBeGreaterThan(s.expenseCents);
  });
});

describe('summarize with Retired labels', () => {
  it('shows a Retired label as its own line, flagged retired, still counted', () => {
    const data: LedgerData = {
      categories,
      transactions: [
        tx('2026-10-15', 'expense', 3500, [], ['Gym']),
        tx('2026-10-16', 'expense', 1200, ['groceries'], ['Gym']),
      ],
    };

    const s = summarize(data, '2026-10', nameOf);

    expect(s.expenseCents).toBe(4700);
    expect(s.expenseLines).toEqual([
      { name: 'Gym', cents: 4700, count: 2, retired: true },
      { name: 'Groceries', cents: 1200, count: 1, retired: false },
    ]);
  });
});

describe('balance', () => {
  it('is the opening balance plus all income minus all expenses, over all time', () => {
    const data: LedgerData = {
      categories,
      transactions: [
        tx('2026-09-25', 'income', 180000, ['salary']),
        tx('2026-10-10', 'expense', 72000, ['groceries']),
        tx('2026-10-11', 'expense', 1050, ['groceries']),
      ],
    };

    expect(balance(data, 120000)).toBe(120000 + 180000 - 72000 - 1050);
    expect(balance({ categories: [], transactions: [] }, -5000)).toBe(-5000);
  });
});
