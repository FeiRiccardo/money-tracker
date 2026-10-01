export const DAY_MS = 24 * 60 * 60 * 1000;
export const BACKUP_DISMISS_MS = 3 * DAY_MS;
export const INSTALL_DISMISS_MS = 7 * DAY_MS;

export interface BackupReminderInput {
  now: number;
  lastBackupAt: number | null;
  changesSinceBackup: number;
  transactionCount: number;
  hiddenUntil: number;
}

export const BACKUP_AFTER_DAYS_MS = 7 * DAY_MS;
export const BACKUP_AFTER_CHANGES = 20;

export const BACKUP_FIRST_AFTER_TRANSACTIONS = 5;

export function backupBannerVisible(input: BackupReminderInput): boolean {
  if (input.now < input.hiddenUntil) return false;
  if (input.changesSinceBackup === 0) return false;
  if (input.lastBackupAt === null) return input.transactionCount >= BACKUP_FIRST_AFTER_TRANSACTIONS;
  return (
    input.now - input.lastBackupAt >= BACKUP_AFTER_DAYS_MS || input.changesSinceBackup >= BACKUP_AFTER_CHANGES
  );
}

export interface InstallNudgeInput {
  now: number;
  isIos: boolean;
  isStandalone: boolean;
  transactionCount: number;
  hiddenUntil: number;
}

export function installNudgeVisible(input: InstallNudgeInput): boolean {
  return (
    input.isIos &&
    !input.isStandalone &&
    input.transactionCount >= 1 &&
    input.now >= input.hiddenUntil
  );
}

export type Banner = 'install' | 'backup' | null;

/** One banner at a time: the install nudge (which removes the 7-day erasure risk) comes first. */
export function activeBanner(input: { backup: BackupReminderInput; install: InstallNudgeInput }): Banner {
  if (installNudgeVisible(input.install)) return 'install';
  if (backupBannerVisible(input.backup)) return 'backup';
  return null;
}
