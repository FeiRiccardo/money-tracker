import { parseAmount, validateCategoryName } from './rules';
import type { Category, LedgerData, Transaction, TxType } from './types';

const BOM = '﻿';
const EOL = '\r\n';

function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function formatCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export interface BackupFiles {
  transactionsCsv: string;
  categoriesCsv: string;
}

export function exportBackup(data: LedgerData, nameOf: (category: Category) => string): BackupFiles {
  const byId = new Map(data.categories.map((c) => [c.id, c]));
  const rows = data.transactions.map((t) => {
    const names = [
      ...t.categoryIds.flatMap((id) => {
        const c = byId.get(id);
        return c ? [nameOf(c)] : [];
      }),
      ...t.retired,
    ];
    return [t.date, t.type, formatCents(t.cents), names.join('|'), t.note].map(field).join(',');
  });
  const transactionsCsv = BOM + ['date,type,amount,categories,note', ...rows].join(EOL) + EOL;
  const categoryRows = data.categories.map((c) => [c.type, nameOf(c), c.defaultKey ?? ''].map(field).join(','));
  const categoriesCsv = BOM + ['type,name,default_key', ...categoryRows].join(EOL) + EOL;
  return { transactionsCsv, categoriesCsv };
}

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, CRLF or LF, optional BOM. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  const src = text.startsWith(BOM) ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        value += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else value += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(value);
      value = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else value += ch;
  }
  if (value !== '' || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

export type ImportErrorReason = 'invalidDate' | 'invalidType' | 'invalidAmount' | 'noCategories' | 'invalidName' | 'duplicateName';

export interface ImportPreview {
  data: LedgerData;
  errors: Array<{ file: 'transactions' | 'categories'; row: number; reason: ImportErrorReason }>;
  /** Set when a file's header is wrong; nothing is imported. */
  fatal?: 'transactionsColumns' | 'categoriesColumns';
}

const fold = (s: string) => s.trim().toLowerCase();
const TRANSACTION_HEADER = ['date', 'type', 'amount', 'categories', 'note'];
const CATEGORY_HEADER = ['type', 'name', 'default_key'];

function isRealDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function previewImport(files: BackupFiles, newId: () => string = () => crypto.randomUUID()): ImportPreview {
  const empty: LedgerData = { categories: [], transactions: [] };
  const transactionRows = parseCsv(files.transactionsCsv);
  if (transactionRows[0]?.join(',') !== TRANSACTION_HEADER.join(',')) {
    return { data: empty, errors: [], fatal: 'transactionsColumns' };
  }

  const categoryRows = parseCsv(files.categoriesCsv);
  if (categoryRows[0]?.join(',') !== CATEGORY_HEADER.join(',')) {
    return { data: empty, errors: [], fatal: 'categoriesColumns' };
  }

  const errors: ImportPreview['errors'] = [];
  const categories: Category[] = [];
  const seen: Record<TxType, string[]> = { expense: [], income: [] };
  categoryRows.slice(1).forEach(([type, name, defaultKey], index) => {
    const row = index + 2;
    if (type !== 'expense' && type !== 'income') {
      errors.push({ file: 'categories', row, reason: 'invalidType' });
      return;
    }
    const checked = validateCategoryName(name ?? '', { existing: seen[type], retired: [] });
    if (!checked.ok) {
      errors.push({ file: 'categories', row, reason: checked.reason === 'duplicate' ? 'duplicateName' : 'invalidName' });
      return;
    }
    seen[type].push(checked.name);
    categories.push({ id: newId(), type, name: checked.name, defaultKey: defaultKey ? defaultKey : undefined, lastUsedAt: 0 });
  });
  const idByName = new Map(categories.map((c) => [`${c.type}:${fold(c.name)}`, c.id]));

  const transactions: Transaction[] = [];
  transactionRows.slice(1).forEach(([date, type, amount, names, note], index) => {
    const row = index + 2;
    const fail = (reason: ImportErrorReason) => errors.push({ file: 'transactions', row, reason });
    if (!isRealDate(date ?? '')) return fail('invalidDate');
    if (type !== 'expense' && type !== 'income') return fail('invalidType');
    const cents = parseAmount(amount ?? '');
    if (cents === null) return fail('invalidAmount');
    const categoryIds: string[] = [];
    const retired: string[] = [];
    for (const name of (names ?? '').split('|').map((n) => n.trim()).filter(Boolean)) {
      const id = idByName.get(`${type}:${fold(name)}`);
      if (id) categoryIds.push(id);
      else retired.push(name);
    }
    if (categoryIds.length + retired.length === 0) return fail('noCategories');
    transactions.push({ id: newId(), date, type, cents, categoryIds, retired, note: note ?? '' });
  });

  return { data: { categories, transactions }, errors };
}
