import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseAmount, type NameError } from '../domain/rules';
import type { Transaction, TxType } from '../domain/types';
import { categoryName } from '../i18n';
import { centsToInput, todayISO } from './format';
import { useStore } from './store';

export function TransactionForm({ transaction, onClose }: { transaction?: Transaction; onClose: () => void }) {
  const { t } = useTranslation();
  const store = useStore();
  const editing = transaction !== undefined;

  const [type, setType] = useState<TxType>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(transaction ? centsToInput(transaction.cents) : '');
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [note, setNote] = useState(transaction?.note ?? '');
  const [selected, setSelected] = useState<string[]>(transaction?.categoryIds ?? []);
  const [retired, setRetired] = useState<string[]>(transaction?.retired ?? []);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<NameError | null>(null);
  const [saving, setSaving] = useState(false);

  const cents = parseAmount(amount);
  const canSave = cents !== null && selected.length + retired.length > 0 && date !== '' && !saving;

  // Picker order: most recently used first.
  const choices = useMemo(
    () => store.data.categories.filter((c) => c.type === type).sort((a, b) => b.lastUsedAt - a.lastUsedAt),
    [store.data.categories, type],
  );

  function switchType(next: TxType) {
    if (next === type) return;
    setType(next);
    setSelected([]);
    setRetired([]);
    setAdding(false);
    setNameError(null);
  }

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  async function addCategory() {
    const result = await store.createCategory(type, newName);
    if (result.ok) {
      setSelected((current) => [...current, result.category.id]);
      setAdding(false);
      setNewName('');
      setNameError(null);
    } else setNameError(result.reason);
  }

  async function save() {
    if (!canSave || cents === null) return;
    setSaving(true);
    const input = { date, type, cents, categoryIds: selected, retired, note: note.trim() };
    const ok = editing
      ? await store.updateTransaction(transaction.id, input)
      : await store.addTransaction(input);
    setSaving(false);
    if (ok) onClose();
  }

  async function remove() {
    if (!editing) return;
    await store.deleteTransaction(transaction.id);
    onClose();
  }

  return (
    <div className="overlay" role="dialog" aria-label={editing ? t('form.titleEdit') : t('form.titleAdd')}>
      <div className="form-head">
        <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
          ✕
        </button>
        <div className="seg" role="group">
          <button className={type === 'expense' ? 'on' : ''} onClick={() => switchType('expense')}>
            {t('form.expense')}
          </button>
          <button className={type === 'income' ? 'on' : ''} onClick={() => switchType('income')}>
            {t('form.income')}
          </button>
        </div>
        {editing ? (
          <button className="link danger" onClick={() => void remove()}>
            {t('common.delete')}
          </button>
        ) : (
          <span className="spacer" />
        )}
      </div>

      <label className="amount-box">
        <span className="muted">€</span>
        <input
          autoFocus
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={t('form.amount')}
        />
      </label>

      <div className="label">
        {t('form.categories')} <span className="hint">({t('form.pickHint')})</span>
      </div>
      <div className="chips">
        {retired.map((name) => (
          <button
            key={`r:${name}`}
            className="chip sel retired"
            title={t('form.retiredHint')}
            onClick={() => setRetired((current) => current.filter((x) => x !== name))}
          >
            {name} ✕
          </button>
        ))}
        {choices.map((c) => (
          <button
            key={c.id}
            className={`chip ${selected.includes(c.id) ? 'sel' : ''}`}
            aria-pressed={selected.includes(c.id)}
            onClick={() => toggle(c.id)}
          >
            {categoryName(c)}
          </button>
        ))}
        <button className="chip add" onClick={() => setAdding((v) => !v)}>
          {t('form.newCategory')}
        </button>
      </div>
      {adding && (
        <div className="inline-add">
          <input
            autoFocus
            value={newName}
            maxLength={40}
            placeholder={t('form.newCategoryPlaceholder')}
            aria-label={t('form.newCategoryPlaceholder')}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addCategory()}
          />
          <button className="chip sel" onClick={() => void addCategory()}>
            {t('common.add')}
          </button>
        </div>
      )}
      {nameError && <div className="error">{t(`categories.errors.${nameError}`)}</div>}

      <div className="row-fields">
        <label className="field">
          <span>{t('form.date')}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>{t('form.note')}</span>
          <input
            value={note}
            placeholder={t('form.notePlaceholder')}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>

      <button className="btn primary wide" disabled={!canSave} onClick={() => void save()}>
        {editing ? t('form.saveChanges') : t('common.save')}
      </button>
    </div>
  );
}
