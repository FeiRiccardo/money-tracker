import { describe, expect, it } from 'vitest';
import { activeBanner, backupBannerVisible, installNudgeVisible } from './reminders';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 18, 12);

const base = { now, lastBackupAt: now - 30 * DAY, changesSinceBackup: 0, transactionCount: 50, hiddenUntil: 0 };

describe('backupBannerVisible', () => {
  it('stays hidden when nothing has changed since the last backup, however old', () => {
    expect(backupBannerVisible({ ...base, changesSinceBackup: 0 })).toBe(false);
  });

  it('shows after 7 days since the last backup when there is at least one change', () => {
    const input = { ...base, changesSinceBackup: 1 };
    expect(backupBannerVisible({ ...input, lastBackupAt: now - 7 * DAY })).toBe(true);
    expect(backupBannerVisible({ ...input, lastBackupAt: now - 7 * DAY + 1 })).toBe(false);
  });

  it('shows once 20 changes have piled up even if the backup is recent', () => {
    const input = { ...base, lastBackupAt: now - 1 * DAY };
    expect(backupBannerVisible({ ...input, changesSinceBackup: 19 })).toBe(false);
    expect(backupBannerVisible({ ...input, changesSinceBackup: 20 })).toBe(true);
  });

  it('for a user who never backed up, shows from the 5th Transaction', () => {
    const input = { ...base, lastBackupAt: null, changesSinceBackup: 4 };
    expect(backupBannerVisible({ ...input, transactionCount: 4 })).toBe(false);
    expect(backupBannerVisible({ ...input, transactionCount: 5 })).toBe(true);
  });

  it('stays hidden until the dismissal time has passed', () => {
    const input = { ...base, changesSinceBackup: 25 };
    expect(backupBannerVisible({ ...input, hiddenUntil: now + 1 })).toBe(false);
    expect(backupBannerVisible({ ...input, hiddenUntil: now })).toBe(true);
  });
});

const ios = { now, isIos: true, isStandalone: false, transactionCount: 1, hiddenUntil: 0 };

describe('installNudgeVisible', () => {
  it('shows on iOS in a browser tab once a Transaction has been saved', () => {
    expect(installNudgeVisible(ios)).toBe(true);
  });

  it('never shows before the first Transaction, when installed, or off iOS', () => {
    expect(installNudgeVisible({ ...ios, transactionCount: 0 })).toBe(false);
    expect(installNudgeVisible({ ...ios, isStandalone: true })).toBe(false);
    expect(installNudgeVisible({ ...ios, isIos: false })).toBe(false);
  });

  it('stays hidden until the dismissal time has passed', () => {
    expect(installNudgeVisible({ ...ios, hiddenUntil: now + 1 })).toBe(false);
  });
});

describe('activeBanner', () => {
  const backupDue = { ...base, changesSinceBackup: 25 };

  it('shows the install nudge before the backup reminder when both apply', () => {
    expect(activeBanner({ backup: backupDue, install: ios })).toBe('install');
  });

  it('shows the backup reminder once the install nudge does not apply', () => {
    expect(activeBanner({ backup: backupDue, install: { ...ios, isStandalone: true } })).toBe('backup');
  });

  it('shows nothing when neither applies', () => {
    expect(activeBanner({ backup: base, install: { ...ios, isIos: false } })).toBeNull();
  });
});
