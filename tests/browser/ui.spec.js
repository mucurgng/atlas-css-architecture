import { test, expect } from '@playwright/test';

test('native dialog is truly modal and Escape restores focus', async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('#open-dialog');
  await trigger.click();
  const dialog = page.locator('#settings-dialog');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((node) => node.matches(':modal'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('switch is keyboard reachable and Space toggles it', async ({ page }) => {
  await page.goto('/');
  const control = page.locator('#switch-autosave');
  await control.focus();
  await expect(control).toBeFocused();
  await page.keyboard.press('Space');
  await expect(control).toBeChecked();
});

test('field does not display error before user interacts', async ({ page }) => {
  await page.goto('/');
  const field = page.locator('#user-email');
  const borderColorBefore = await field.evaluate(el => getComputedStyle(el).borderColor);
  await field.focus();
  await field.blur();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  const borderColorAfter = await field.evaluate(el => getComputedStyle(el).borderColor);
  expect(borderColorAfter).not.toBe(borderColorBefore);
});

test('no horizontal viewport overflow at 320, 375, 768, 1024, 1440, 1920', async ({ page }) => {
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `Overflow at ${width}px`).toBe(false);
  }
});

test('primary button uses theme tokens', async ({ page }) => {
  await page.goto('/');
  const button = page.locator('#buttons .ui-button--primary').first();
  const light = await button.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.locator('#theme-toggle').click();
  await expect.poll(() => button.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(light);
});

test('alert is dismissible and restore action works', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.alerts-stack > .ui-alert')).toHaveCount(4);
  await page.locator('.alerts-stack .ui-alert__dismiss').first().click();
  await expect(page.locator('.alerts-stack > .ui-alert')).toHaveCount(3);
  await page.locator('#restore-alerts').click();
  await expect(page.locator('.alerts-stack > .ui-alert')).toHaveCount(4);
});
