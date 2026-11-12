// Трассировка каскада через Chrome DevTools Protocol (тот же источник данных, что панель Styles).
// node tools/trace.mjs <baseURL> <out.json> [label]
// Для каждого элемента и свойства выводит всех кандидатов: происхождение, важность, слой,
// специфичность, файл:строку — и итоговое вычисленное значение.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const [baseURL = 'http://127.0.0.1:5173', out = 'reports/traces/after.json', label = 'after'] = process.argv.slice(2);

const TRACES = [
  { id: 'T1', title: 'Основная кнопка в #workbench', selector: '#buttons .ui-button--primary', props: ['background-color', 'padding-left', 'border-top-left-radius'] },
  { id: 'T1b', title: 'Вторичная кнопка в #workbench', selector: '#buttons .ui-button--secondary', props: ['background-color', 'color'] },
  { id: 'T1c', title: 'Опасная кнопка', selector: '#buttons .ui-button--danger', props: ['background-color'] },
  { id: 'T2', title: 'Опасная метка внутри карточки', selector: '#cards .ui-tag--danger', props: ['background-color', 'color', 'padding-left'] },
  { id: 'T3', title: 'Поле email до взаимодействия', selector: '#user-email', props: ['border-top-color', 'background-color'] },
  { id: 'T4', title: 'Текст вложенного уведомления в карточке', selector: '#cards .ui-alert p', props: ['font-size', 'color'] },
  { id: 'T5', title: 'Checkbox переключателя', selector: '#switch-autosave', props: ['display', 'position'] },
  { id: 'T6', title: 'Кнопка в состоянии :focus-visible', selector: '#buttons .ui-button--secondary', props: ['outline-style'], force: ['focus', 'focus-visible'] },
  { id: 'T7', title: 'Поле имени в состоянии :focus-visible', selector: '#user-name', props: ['outline-style'], force: ['focus', 'focus-visible'] },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const client = await page.context().newCDPSession(page);
const sheets = new Map();
client.on('CSS.styleSheetAdded', ({ header }) => sheets.set(header.styleSheetId, header.sourceURL.split('/').pop() || '(inline)'));
await client.send('DOM.enable');
await client.send('CSS.enable');
await page.goto(baseURL + '/');
await page.waitForTimeout(300);

const longhandOf = (prop) => {
  const map = { 'padding-left': ['padding', 'padding-inline', 'padding-inline-start', 'padding-left'],
    'background-color': ['background', 'background-color'], 'border-top-color': ['border', 'border-color', 'border-top-color'],
    'border-top-left-radius': ['border-radius', 'border-top-left-radius', 'border-start-start-radius'],
    'outline-style': ['outline', 'outline-style'], 'font-size': ['font', 'font-size'] };
  return map[prop] ?? [prop];
};

const result = { label, baseURL, date: new Date().toISOString(), traces: [] };
for (const t of TRACES) {
  const { root } = await client.send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: t.selector });
  if (!nodeId) { result.traces.push({ ...t, error: 'not found' }); continue; }
  if (t.force) await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: t.force });
  const matched = await client.send('CSS.getMatchedStylesForNode', { nodeId });
  const computed = await client.send('CSS.getComputedStyleForNode', { nodeId });
  const entry = { id: t.id, title: t.title, selector: t.selector, forced: t.force ?? [], props: [] };
  for (const prop of t.props) {
    const names = longhandOf(prop);
    const candidates = [];
    matched.matchedCSSRules.forEach((m, order) => {
      const rule = m.rule;
      for (const p of rule.style.cssProperties) {
        if (!names.includes(p.name) || p.text === undefined || p.disabled) continue;
        const sel = m.matchingSelectors.map((i) => rule.selectorList.selectors[i]);
        candidates.push({
          order,
          origin: rule.origin,
          important: !!p.important,
          layer: rule.origin !== 'regular' ? '(UA)' : (rule.layers?.map((l) => l.text).join('.') || '(вне слоёв)'),
          selector: rule.selectorList.text,
          matched: sel.map((s) => s.text).join(', '),
          specificity: sel.map((s) => s.specificity ? `${s.specificity.a}-${s.specificity.b}-${s.specificity.c}` : '?').join(', '),
          source: rule.styleSheetId ? `${sheets.get(rule.styleSheetId)}:${(rule.style.range?.startLine ?? 0) + 1}` : 'user-agent',
          declaration: p.text.trim(),
        });
      }
    });
    // Победитель: среди important — первый по порядку CDP (более ранний слой сильнее), иначе последний normal.
    const imp = candidates.filter((c) => c.important && c.origin === 'regular');
    const winner = imp.length ? imp[0] : candidates[candidates.length - 1];
    const value = computed.computedStyle.find((c) => c.name === prop)?.value;
    entry.props.push({ prop, computed: value, winner: winner ? winner.order : null, candidates });
  }
  if (t.force) await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
  result.traces.push(entry);
}
writeFileSync(out, JSON.stringify(result, null, 2));

// Короткий вывод в консоль
for (const tr of result.traces) {
  console.log(`\n${tr.id} ${tr.title} — ${tr.selector}${tr.forced.length ? ' [' + tr.forced.join(',') + ']' : ''}`);
  for (const p of tr.props ?? []) {
    console.log(`  ${p.prop} = ${p.computed}`);
    for (const c of p.candidates) {
      console.log(`    ${c.order === p.winner ? '>>' : '  '} ${c.layer.padEnd(12)} ${c.specificity.padEnd(7)} ${c.important ? '!imp' : '    '} ${c.source.padEnd(18)} ${c.matched}  { ${c.declaration} }`);
    }
  }
}
await browser.close();
