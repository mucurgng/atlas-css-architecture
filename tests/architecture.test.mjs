import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const cssFiles = ['css/app.css', 'css/tokens.css', 'css/base.css', 'css/components.css', 'css/states.css', 'css/utilities.css', 'css/legacy.css'];
const combined = cssFiles.map(read).join('\n');
const components = read('css/components.css');
const states = read('css/states.css');
const legacy = read('css/legacy.css');
const html = read('index.html');

test('01 — порядок слоёв объявлен явно', () => {
  assert.match(read('css/app.css'), /@layer\s+reset\s*,\s*legacy\s*,\s*tokens\s*,\s*base\s*,\s*components\s*,\s*states\s*,\s*utilities\s*;/);
});
test('02 — унаследованные стили импортированы в legacy-слой', () => {
  assert.match(read('css/app.css'), /@import\s+url\(['"]\.\/legacy\.css['"]\)\s+layer\(legacy\)/);
});
test('03 — архитектура не использует !important', () => {
  assert.equal(/!important\b/i.test(combined), false, 'Найдены !important в одном из CSS-файлов');
});
test('04 — модальное окно открывается через showModal()', () => {
  assert.match(read('js/app.js'), /\.showModal\s*\(/);
  assert.doesNotMatch(read('js/app.js'), /\.show\s*\(/);
});
test('05 — состояния focus-visible описаны для кнопки и переключателя', () => {
  assert.match(states + '\n' + components, /\.ui-button:focus-visible\b/);
  assert.match(states + '\n' + components, /\.ui-switch\s+input:focus-visible\b/);
});
test('06 — переключатель не скрыт через display:none', () => {
  assert.doesNotMatch(components, /\.ui-switch\s+input\s*\{[^}]*display\s*:\s*none/is);
  assert.match(components, /\.ui-switch\s+input\s*\{[^}]*position\s*:\s*absolute/is);
});
test('07 — визуальные стили компонентов зависят от токенов, не от жёстких hex', () => {
  assert.doesNotMatch(components + '\n' + states, /#[0-9a-f]{3,8}\b/i);
});
test('08 — глобальный .is-danger не должен перезаписывать разные компоненты', () => {
  assert.doesNotMatch(states + '\n' + legacy, /(^|\n)\s*\.is-danger\s*\{/m);
});
test('09 — ошибки поля показываются по aria-invalid, не сразу по :invalid', () => {
  assert.match(states, /\.ui-field:has\(input\[aria-invalid=['"]true['"]\]\)/);
  assert.doesNotMatch(states, /\.ui-field:has\(input:invalid\)/);
});
test('10 — компонентные CSS не содержат фиксированных мобильных min-width', () => {
  assert.doesNotMatch(components, /min-width\s*:\s*(?:20|22)rem/);
});
test('11 — кнопка имеет один базовый блок .ui-button', () => {
  assert.equal((components.match(/(^|\n)\s*\.ui-button\s*\{/g) || []).length, 1);
});
test('12 — предусмотрен режим reduced motion', () => {
  assert.match(states + '\n' + components + '\n' + read('css/utilities.css'), /prefers-reduced-motion\s*:\s*reduce/);
});
test('13 — отсутствует опасный :is со смешанным ID и классом', () => {
  assert.doesNotMatch(states + '\n' + components, /:is\([^)]*#[a-z]/i);
});
test('14 — нативные disabled атрибуты присутствуют', () => {
  assert.match(html, /<button[^>]*disabled/);
  assert.match(html, /<input[^>]*disabled/);
});
test('15 — все семь семейств представлены на стенде', () => {
  for (const name of ['ui-button', 'ui-field', 'ui-card', 'ui-tag', 'ui-alert', 'ui-switch', 'ui-dialog']) {
    assert.ok(html.includes(name), `Нет компонента ${name}`);
  }
});
test('16 — диалог имеет доступное имя', () => {
  assert.match(html, /<dialog[^>]*aria-labelledby=['"]dialog-title['"]/);
});
test('17 — модификаторы риска не зависят от служебного .is-danger', () => {
  assert.doesNotMatch(html, /class=['"][^'"]*\bis-danger\b/);
});
test('18 — провайдерские селекторы не нацелены на библиотеку и глобальные html-элементы', () => {
  assert.doesNotMatch(legacy, /(^|\n)\s*(?:#workbench|button\s*\{|input\s*\{|\.ui-card|\.ui-button)/m);
});
