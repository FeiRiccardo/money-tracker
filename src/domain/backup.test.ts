import { describe, expect, it } from 'vitest';
import { exportBackup, previewImport } from './backup';
import type { Category, LedgerData, Transaction, TxType } from './types';

const cat = (id: string, type: TxType, name: string, defaultKey?: string): Category => ({
  id,
  type,
  name,
  defaultKey,
  lastUsedAt: 0,
});
const tx = (
  date: string,
  type: TxType,
  cents: number,
  categoryIds: string[],
  retired: string[] = [],
  note = '',
): Transaction => ({ id: `${date}-${cents}`, date, type, cents, categoryIds, retired, note });

const nameOf = (c: Category) => c.name;
const BOM = '﻿';

const sample: LedgerData = {
  categories: [
    cat('groceries', 'expense', 'Groceries', 'groceries'),
    cat('household', 'expense', 'Household'),
    cat('salary', 'income', 'Salary', 'salary'),
  ],
  transactions: [
    tx('2026-10-12', 'income', 180000, ['salary'], [], 'October salary'),
    tx('2026-10-17', 'expense', 6230, ['groceries', 'household'], [], 'Weekly shop, new pan'),
    tx('2026-10-18', 'expense', 450, [], ['Gym'], 'He said "hi"'),
  ],
};

describe('exportBackup: transactions.csv', () => {
  it('writes a BOM, the header, positive dot-decimal amounts, | between Categories and quoted notes', () => {
    const { transactionsCsv } = exportBackup(sample, nameOf);

    expect(transactionsCsv).toBe(
      BOM +
        'date,type,amount,categories,note\r\n' +
        '2026-10-12,income,1800.00,Salary,October salary\r\n' +
        '2026-10-17,expense,62.30,Groceries|Household,"Weekly shop, new pan"\r\n' +
        '2026-10-18,expense,4.50,Gym,"He said ""hi"""\r\n',
    );
  });
});

describe('exportBackup: categories.csv', () => {
  it('lists live Categories with their default key, and never a Retired label', () => {
    const { categoriesCsv } = exportBackup(sample, nameOf);

    expect(categoriesCsv).toBe(
      BOM +
        'type,name,default_key\r\n' +
        'expense,Groceries,groceries\r\n' +
        'expense,Household,\r\n' +
        'income,Salary,salary\r\n',
    );
    expect(categoriesCsv).not.toContain('Gym');
  });

  it('writes the displayed name, so a translated default exports in the current language', () => {
    const italian = (c: Category) => (c.defaultKey === 'groceries' ? 'Spesa' : c.name);
    const { categoriesCsv, transactionsCsv } = exportBackup(sample, italian);

    expect(categoriesCsv).toContain('expense,Spesa,groceries');
    expect(transactionsCsv).toContain('Spesa|Household');
  });
});

let n = 0;
const seqId = () => `id${++n}`;

/** Describes imported data without depending on generated ids. */
function describeData(data: LedgerData) {
  const byId = new Map(data.categories.map((c) => [c.id, c]));
  return {
    categories: data.categories.map((c) => ({ type: c.type, name: c.name, defaultKey: c.defaultKey })),
    transactions: data.transactions.map((t) => ({
      date: t.date,
      type: t.type,
      cents: t.cents,
      note: t.note,
      categories: t.categoryIds.map((id) => byId.get(id)?.name),
      retired: t.retired,
    })),
  };
}

describe('previewImport', () => {
  it('round-trips an export: Categories, default keys, Retired labels, notes and amounts survive', () => {
    const preview = previewImport(exportBackup(sample, nameOf), seqId);

    expect(preview.errors).toEqual([]);
    expect(describeData(preview.data)).toEqual({
      categories: [
        { type: 'expense', name: 'Groceries', defaultKey: 'groceries' },
        { type: 'expense', name: 'Household', defaultKey: undefined },
        { type: 'income', name: 'Salary', defaultKey: 'salary' },
      ],
      transactions: [
        { date: '2026-10-12', type: 'income', cents: 180000, note: 'October salary', categories: ['Salary'], retired: [] },
        { date: '2026-10-17', type: 'expense', cents: 6230, note: 'Weekly shop, new pan', categories: ['Groceries', 'Household'], retired: [] },
        { date: '2026-10-18', type: 'expense', cents: 450, note: 'He said "hi"', categories: [], retired: ['Gym'] },
      ],
    });
  });
});

describe('previewImport: validation', () => {
  const categoriesCsv = 'type,name,default_key\r\nexpense,Groceries,\r\nincome,Salary,\r\n';

  it('skips invalid Transaction rows, reports row number and reason, and imports the valid ones', () => {
    const transactionsCsv =
      'date,type,amount,categories,note\r\n' +
      '2026-10-01,expense,10.00,Groceries,ok\r\n' + // row 2: valid
      '2026-13-45,expense,10.00,Groceries,\r\n' + // row 3: impossible date
      '2026-10-02,spend,10.00,Groceries,\r\n' + // row 4: bad type
      '2026-10-03,expense,0,Groceries,\r\n' + // row 5: amount not above zero
      '2026-10-04,expense,1.234,Groceries,\r\n' + // row 6: too many decimals
      '2026-10-05,expense,10.00,,\r\n' + // row 7: no categories
      '2026-10-06,income,2000,Salary,\r\n'; // row 8: valid

    const preview = previewImport({ transactionsCsv, categoriesCsv }, seqId);

    expect(preview.data.transactions.map((t) => t.date)).toEqual(['2026-10-01', '2026-10-06']);
    expect(preview.errors).toEqual([
      { file: 'transactions', row: 3, reason: 'invalidDate' },
      { file: 'transactions', row: 4, reason: 'invalidType' },
      { file: 'transactions', row: 5, reason: 'invalidAmount' },
      { file: 'transactions', row: 6, reason: 'invalidAmount' },
      { file: 'transactions', row: 7, reason: 'noCategories' },
    ]);
  });

  it('rejects a file whose header is not the expected columns', () => {
    const preview = previewImport(
      { transactionsCsv: 'when,what\r\n2026-10-01,x\r\n', categoriesCsv },
      seqId,
    );

    expect(preview.fatal).toBe('transactionsColumns');
    expect(preview.data).toEqual({ categories: [], transactions: [] });
  });
});

describe('previewImport: Categories validation', () => {
  const transactionsCsv = 'date,type,amount,categories,note\r\n';

  it('skips invalid Category rows and reports them', () => {
    const categoriesCsv =
      'type,name,default_key\r\n' +
      'expense,Groceries,groceries\r\n' + // row 2: valid
      'spend,Food,\r\n' + // row 3: bad type
      'expense,,\r\n' + // row 4: empty name
      'expense,Food|Drink,\r\n' + // row 5: pipe in name
      `expense,${'a'.repeat(31)},\r\n` + // row 6: too long
      'expense, groceries ,\r\n' + // row 7: duplicate of row 2 (case and spacing ignored)
      'income,Groceries,\r\n'; // row 8: same name, other type: valid

    const preview = previewImport({ transactionsCsv, categoriesCsv }, seqId);

    expect(preview.data.categories.map((c) => `${c.type}:${c.name}`)).toEqual([
      'expense:Groceries',
      'income:Groceries',
    ]);
    expect(preview.errors).toEqual([
      { file: 'categories', row: 3, reason: 'invalidType' },
      { file: 'categories', row: 4, reason: 'invalidName' },
      { file: 'categories', row: 5, reason: 'invalidName' },
      { file: 'categories', row: 6, reason: 'invalidName' },
      { file: 'categories', row: 7, reason: 'duplicateName' },
    ]);
  });

  it('turns a Transaction name that points at a skipped Category into a Retired label', () => {
    const preview = previewImport(
      {
        transactionsCsv: transactionsCsv + '2026-10-01,expense,5.00,Food|Drink,\r\n',
        categoriesCsv: 'type,name,default_key\r\nexpense,Food|Drink,\r\n',
      },
      seqId,
    );

    expect(preview.data.transactions[0]?.retired).toEqual(['Food', 'Drink']);
  });

  it('rejects a Categories file whose header is not the expected columns', () => {
    const preview = previewImport({ transactionsCsv, categoriesCsv: 'kind,label\r\nexpense,Food\r\n' }, seqId);

    expect(preview.fatal).toBe('categoriesColumns');
  });
});
