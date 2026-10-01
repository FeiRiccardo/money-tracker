import { expect, test, type Page } from '@playwright/test';

async function openFilledForm(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start fresh' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Add a Transaction' }).click();
  await page.getByLabel('Amount', { exact: true }).fill('1234567,89');
  await page.getByRole('button', { name: 'Groceries', exact: true }).click();
}

const hasNoHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe('landscape phone (568x320)', () => {
  test.use({ viewport: { width: 568, height: 320 }, hasTouch: true, isMobile: true });

  test('Save stays on screen without scrolling', async ({ page }) => {
    await openFilledForm(page);

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeInViewport({ ratio: 1 });
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('the Category chips can still be scrolled to and picked', async ({ page }) => {
    await openFilledForm(page);

    await page.getByRole('button', { name: 'Other', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Other', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('small phone (320x568)', () => {
  test.use({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true });

  test('Save stays on screen with room to spare and nothing overflows sideways', async ({ page }) => {
    await openFilledForm(page);

    const save = await page.getByRole('button', { name: 'Save', exact: true }).boundingBox();
    expect(save!.y + save!.height).toBeLessThanOrEqual(568 - 8);
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  });

  test('Date and Note stack so each field is wide enough to use', async ({ page }) => {
    await openFilledForm(page);

    const note = await page.getByPlaceholder('e.g. Coffee').boundingBox();
    expect(note!.width).toBeGreaterThan(240);
  });

  test('a long amount still fits inside the screen', async ({ page }) => {
    await openFilledForm(page);

    const amount = await page.getByLabel('Amount', { exact: true }).boundingBox();
    expect(amount!.x + amount!.width).toBeLessThanOrEqual(320);
  });
});

test.describe('tablet (768x1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('the form stays a centred column that does not stretch edge to edge', async ({ page }) => {
    await openFilledForm(page);

    const save = await page.getByRole('button', { name: 'Save', exact: true }).boundingBox();
    expect(save!.width).toBeLessThanOrEqual(520);
    expect(save!.x).toBeGreaterThan(100);
  });
});

for (const [name, width, height] of [
  ['desktop window (1280x800)', 1280, 800],
  ['tablet (768x1024)', 768, 1024],
  ['phone (390x844)', 390, 844],
] as const) {
  test.describe(`${name}: Date and Note`, () => {
    test.use({ viewport: { width, height } });

    test('sit in two rows, one under the other, both full width', async ({ page }) => {
      await openFilledForm(page);

      const date = await page.getByLabel('Date').boundingBox();
      const note = await page.getByPlaceholder('e.g. Coffee').boundingBox();
      expect(note!.y).toBeGreaterThanOrEqual(date!.y + date!.height); // Note is below Date
      expect(Math.abs(note!.x - date!.x)).toBeLessThan(2); // same left edge
      expect(Math.abs(note!.width - date!.width)).toBeLessThan(2); // same width
    });
  });
}
