// Снимки экрана стенда: node tools/capture.mjs <baseURL> <outDir> <before|after>
// before — 4 обязательных снимка из методички; after — 6 ширин x 2 темы + диалог + фокус.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [baseURL = 'http://127.0.0.1:5173', outDir = 'reports/screenshots/after', mode = 'after'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function open(width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(baseURL + '/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (theme === 'dark') await page.locator('#theme-toggle').click();
  await page.waitForTimeout(150);
}

async function shot(name, fullPage = true) {
  const file = join(outDir, name);
  await page.screenshot({ path: file, fullPage });
  console.log('saved', file);
}

async function dialogShot(width, theme, name) {
  await open(width, theme);
  await page.locator('#open-dialog').click();
  await page.waitForTimeout(150);
  // В исходной версии окно открыто через show() и стоит в потоке документа в конце страницы.
  await page.locator('#settings-dialog').scrollIntoViewIfNeeded();
  await shot(name, false);
}

if (mode === 'before') {
  await open(375, 'light'); await shot('before_375_light.png');
  await open(375, 'dark'); await shot('before_375_dark.png');
  await open(1440, 'light'); await shot('before_1440_light.png');
  await dialogShot(1440, 'light', 'before_dialog_1440_light.png');
} else {
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    for (const theme of ['light', 'dark']) {
      await open(width, theme);
      await shot(`after_${width}_${theme}.png`);
    }
  }
  await dialogShot(1440, 'light', 'after_dialog_1440_light.png');
  await dialogShot(375, 'dark', 'after_dialog_375_dark.png');
  // Клавиатурный фокус на переключателе и на кнопке (Tab-навигация, а не .focus()).
  await open(1440, 'light');
  await page.locator('#switches').scrollIntoViewIfNeeded();
  await page.locator('#switch-notifications').focus();
  await page.keyboard.press('Tab');
  await page.locator('#switches').screenshot({ path: join(outDir, 'after_switch_focus_light.png') });
  console.log('saved switch focus');
  await open(1440, 'dark');
  await page.locator('#buttons .ui-button--secondary').first().focus();
  await page.keyboard.press('Tab');
  await page.locator('#buttons').screenshot({ path: join(outDir, 'after_button_focus_dark.png') });
  console.log('saved button focus');
  // Поле после blur: ошибка появляется только после взаимодействия.
  await open(1440, 'light');
  await page.locator('#user-email').fill('ivan@');
  await page.locator('#user-name').focus();
  await page.locator('#user-name').blur();
  await page.locator('#fields').screenshot({ path: join(outDir, 'after_fields_invalid_light.png') });
  console.log('saved field invalid');
}

await browser.close();
