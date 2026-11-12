// Скриншоты настоящей панели DevTools (Elements → Styles) для трассировок каскада.
// node tools/devtools-shot.mjs <baseURL> <outDir> <prefix>
// Открывает стенд, подключает к нему фронтенд DevTools через remote debugging,
// находит элемент поиском по CSS-селектору (Ctrl+F в Elements) и снимает панель Styles.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [baseURL = 'http://127.0.0.1:5173', outDir = 'reports/screenshots/devtools', prefix = 'after'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const PORT = 9333;
const TARGETS = [
  { name: 'trace1_button', selector: '#buttons .ui-button--secondary', filter: 'background' },
  { name: 'trace1c_danger_button', selector: '#buttons .ui-button--danger', filter: 'background' },
  { name: 'trace2_tag', selector: '#cards .ui-tag--danger', filter: '' },
  { name: 'trace3_field', selector: '#user-email', filter: '' },
  { name: 'trace4_nested_alert', selector: '#cards .ui-alert p', filter: 'font-size' },
];

const browser = await chromium.launch({ channel: 'chrome', args: [`--remote-debugging-port=${PORT}`] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const app = await context.newPage();
await app.goto(baseURL + '/');
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const target = list.find((t) => t.type === 'page' && t.url.startsWith(baseURL));
const tools = await context.newPage();
await tools.setViewportSize({ width: 1400, height: 900 });
const inspector = `http://127.0.0.1:${PORT}/devtools/inspector.html?ws=127.0.0.1:${PORT}/devtools/page/${target.id}&panel=elements`;
// Настройки фронтенда DevTools: без трансляции экрана и без баннера о языке.
await tools.goto(inspector);
await tools.waitForTimeout(1500);
await tools.evaluate(() => {
  localStorage.setItem('screencast-enabled', 'false');
  localStorage.setItem('screencastEnabled', 'false');
  localStorage.setItem('disable-locale-info-bar', 'true');
  localStorage.setItem('elements-panel-split-view-state', JSON.stringify({ vertical: { size: 640 } }));
});

for (const t of TARGETS) {
  await tools.goto(inspector);
  await tools.waitForTimeout(2500);
  await tools.keyboard.press('Control+F');
  await tools.waitForTimeout(300);
  await tools.keyboard.type(t.selector, { delay: 10 });
  await tools.keyboard.press('Enter');
  await tools.waitForTimeout(500);
  await tools.keyboard.press('Escape');
  await tools.waitForTimeout(800);
  if (t.filter) {
    const box = tools.locator('[aria-label="Filter"].text-prompt').first();
    await box.click();
    await tools.keyboard.type(t.filter);
  }
  await tools.waitForTimeout(1000);
  const file = join(outDir, `${prefix}_${t.name}.png`);
  await tools.screenshot({ path: file });
  console.log('saved', file);
}
await browser.close();
