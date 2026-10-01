export type ToastKind = 'success' | 'info' | 'error';

export interface ToastInput {
  kind: ToastKind;
  message: string;
  /** Label of the action button (for example "Undo"); shown only together with `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastItem extends ToastInput {
  id: number;
  /** When it disappears, or null while it is paused. */
  expiresAt: number | null;
  /** Time left, remembered while paused. */
  remainingMs: number;
}

export interface ToastState {
  items: ToastItem[];
  nextId: number;
}

export const EMPTY_TOASTS: ToastState = { items: [], nextId: 1 };

const PLAIN_MS = 3000;
const LONG_MS = 6000;

export function push(state: ToastState, input: ToastInput, now: number): { state: ToastState; id: number } {
  const duration = input.onAction || input.kind === 'error' ? LONG_MS : PLAIN_MS;
  const item: ToastItem = { ...input, id: state.nextId, expiresAt: now + duration, remainingMs: duration };
  const items = [...state.items, item];
  // At most three at once. Toasts with an Undo are kept as long as possible: drop the oldest one
  // without an Undo, and only when every toast has one drop the oldest of all.
  while (items.length > MAX_TOASTS) {
    const victim = items.findIndex((t) => !t.onAction);
    items.splice(victim === -1 || victim === items.length - 1 ? 0 : victim, 1);
  }
  return { state: { items, nextId: state.nextId + 1 }, id: item.id };
}

const MAX_TOASTS = 3;

/** Removes the toasts whose time has come. Paused ones never expire. */
export function expire(state: ToastState, now: number): ToastState {
  return { ...state, items: state.items.filter((t) => t.expiresAt === null || t.expiresAt > now) };
}

export function dismiss(state: ToastState, id: number): ToastState {
  return { ...state, items: state.items.filter((t) => t.id !== id) };
}

const update = (state: ToastState, id: number, change: (t: ToastItem) => ToastItem): ToastState => ({
  ...state,
  items: state.items.map((t) => (t.id === id ? change(t) : t)),
});

/** Holds a toast on screen (while it is being touched or hovered), remembering how long it had left. */
export function pause(state: ToastState, id: number, now: number): ToastState {
  return update(state, id, (t) =>
    t.expiresAt === null ? t : { ...t, remainingMs: Math.max(0, t.expiresAt - now), expiresAt: null },
  );
}

export function resume(state: ToastState, id: number, now: number): ToastState {
  return update(state, id, (t) => (t.expiresAt !== null ? t : { ...t, expiresAt: now + t.remainingMs }));
}

/** When the next toast will expire, or null when none will (empty, or all paused). */
export function nextExpiry(state: ToastState): number | null {
  const times = state.items.flatMap((t) => (t.expiresAt === null ? [] : [t.expiresAt]));
  return times.length === 0 ? null : Math.min(...times);
}
