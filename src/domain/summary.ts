import type { Category, LedgerData, TxType } from './types';

export interface SummaryLine {
  name: string;
  cents: number;
  count: number;
  retired: boolean;
}

export interface MonthSummary {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  expenseLines: SummaryLine[];
  incomeLines: SummaryLine[];
}

export function summarize(
  data: LedgerData,
  month: string,
  nameOf: (category: Category) => string,
): MonthSummary {
  const byId = new Map(data.categories.map((c) => [c.id, c]));
  const lines: Record<TxType, Map<string, SummaryLine>> = { expense: new Map(), income: new Map() };
  let incomeCents = 0;
  let expenseCents = 0;

  for (const t of data.transactions) {
    if (!t.date.startsWith(month)) continue;
    if (t.type === 'income') incomeCents += t.cents;
    else expenseCents += t.cents;

    for (const id of t.categoryIds) {
      const category = byId.get(id);
      if (!category) continue;
      const line = lines[t.type].get(`c:${id}`) ?? { name: nameOf(category), cents: 0, count: 0, retired: false };
      line.cents += t.cents;
      line.count += 1;
      lines[t.type].set(`c:${id}`, line);
    }

    for (const label of t.retired) {
      const line = lines[t.type].get(`r:${label}`) ?? { name: label, cents: 0, count: 0, retired: true };
      line.cents += t.cents;
      line.count += 1;
      lines[t.type].set(`r:${label}`, line);
    }
  }

  const sorted = (type: TxType) => [...lines[type].values()].sort((a, b) => b.cents - a.cents);
  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    expenseLines: sorted('expense'),
    incomeLines: sorted('income'),
  };
}

/** All-time Balance: the Opening balance plus all Income minus all Expenses. */
export function balance(data: LedgerData, openingCents: number): number {
  return data.transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.cents : -t.cents), openingCents);
}
