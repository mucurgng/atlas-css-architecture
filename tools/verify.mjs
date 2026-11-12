// Быстрая проверка фактов матрицы: node tools/verify.mjs [baseURL]
import { chromium } from '@playwright/test';
const base = process.argv[2] || 'http://127.0.0.1:5173';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(base + '/');
const lum = `const L=(c)=>{const m=c.match(/[0-9.]+/g).map(Number).slice(0,3).map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return .2126*m[0]+.7152*m[1]+.0722*m[2]};const CR=(a,b)=>{const x=L(a),y=L(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};`;
const contrast = (sel, bgSel) => p.evaluate(([s, bs, code]) => { eval(code + 'window.__CR=CR'); const e=document.querySelector(s); const bg=document.querySelector(bs||s); return window.__CR(getComputedStyle(e).color, getComputedStyle(bg).backgroundColor); }, [sel, bgSel, lum]);
const out = {};
for (const theme of ['light','dark']) {
  if (theme==='dark') { await p.locator('#theme-toggle').click(); await p.mouse.move(0, 0); await p.waitForTimeout(600); }
  out[theme] = {
    alertInfo: await contrast('.alerts-stack .ui-alert--info'), alertSuccess: await contrast('.alerts-stack .ui-alert--success'),
    alertWarning: await contrast('.alerts-stack .ui-alert--warning'), alertDanger: await contrast('.alerts-stack .ui-alert--danger'),
    tagSuccess: await contrast('#tags .ui-tag--success'), tagWarning: await contrast('#tags .ui-tag--warning'), tagDanger: await contrast('#tags .ui-tag--danger'), tagNeutral: await contrast('#tags .ui-tag--neutral'),
    btnPrimary: await contrast('#buttons .ui-button--primary'), btnDanger: await contrast('#buttons .ui-button--danger'),
    fieldBorder: await p.evaluate((code)=>{eval(code+'window.__CR=CR');const e=document.querySelector('#user-name');return window.__CR(getComputedStyle(e).borderTopColor, getComputedStyle(document.querySelector('#fields')).backgroundColor)}, lum),
    switchOff: await p.evaluate((code)=>{eval(code+'window.__CR=CR');const e=document.querySelector('#switch-autosave + .ui-switch__track');return window.__CR(getComputedStyle(e).backgroundColor, getComputedStyle(document.querySelector('#switches')).backgroundColor)}, lum),
    focusVsSurface: await p.evaluate((code)=>{eval(code+'window.__CR=CR');const f=getComputedStyle(document.documentElement).getPropertyValue('--color-focus').trim();const d=document.createElement('i');d.style.color=f;document.body.append(d);const c=getComputedStyle(d).color;d.remove();return window.__CR(c, getComputedStyle(document.querySelector('#buttons')).backgroundColor)}, lum),
    cardText: await p.evaluate(()=>getComputedStyle(document.querySelector('#cards .ui-card__description')).fontSize),
  };
}
await p.locator('#theme-toggle').click();
out.heights = await p.evaluate(()=>[...document.querySelectorAll('#buttons .sample-row:nth-child(2) .ui-button')].map(e=>e.getBoundingClientRect().height));
// Submit пустой формы
await p.locator('#demo-form button[type=submit]').click();
out.submit = await p.evaluate(()=>({ name: document.querySelector('#user-name').getAttribute('aria-invalid'), email: document.querySelector('#user-email').getAttribute('aria-invalid'), focus: document.activeElement.id, status: document.querySelector('#form-feedback').textContent }));
await p.locator('#user-email').fill('name@company.ru'); await p.locator('#user-name').fill('Мария');
out.valid = await p.evaluate(()=>({ email: document.querySelector('#user-email').getAttribute('aria-invalid'), hint: document.querySelector('#email-hint').textContent, border: getComputedStyle(document.querySelector('#user-email')).borderTopColor }));
// Диалог: Tab внутри, Отмена возвращает фокус
await p.locator('[data-open-dialog]').click();
const seq=[]; for (let i=0;i<6;i++){ await p.keyboard.press('Tab'); seq.push(await p.evaluate(()=>document.activeElement.closest('dialog')?'in':'OUT:'+document.activeElement.tagName)); }
out.dialogTab = seq.join(',');
await p.getByRole('button', { name: 'Отмена' }).click();
out.cancelFocus = await p.evaluate(()=>document.activeElement.matches('[data-open-dialog]'));
// Переключатели: Tab пропускает disabled, Shift+Tab назад
await p.locator('#switch-notifications').focus(); await p.keyboard.press('Tab'); const a=await p.evaluate(()=>document.activeElement.id);
await p.keyboard.press('Tab'); const c2=await p.evaluate(()=>document.activeElement.id);
await p.keyboard.press('Shift+Tab'); const d2=await p.evaluate(()=>document.activeElement.id);
out.switchTab = { afterFirstTab: a, afterSecondTab: c2, shiftTabBack: d2 };
// Закрытие уведомления клавиатурой
await p.locator('.alerts-stack .ui-alert__dismiss').first().focus(); await p.keyboard.press('Enter');
out.alertKeyboard = await p.evaluate(()=>({ left: document.querySelectorAll('.alerts-stack > .ui-alert').length, focus: document.activeElement.getAttribute('aria-label') }));
// Тег: курсор
out.tagCursor = await p.evaluate(()=>getComputedStyle(document.querySelector('#tags .ui-tag--danger')).cursor);
// Виджет подрядчика
out.legacy = await p.evaluate(()=>({ font: getComputedStyle(document.querySelector('.legacy-widget')).fontFamily, actionRadius: getComputedStyle(document.querySelector('.legacy-action')).borderRadius, libRadius: getComputedStyle(document.querySelector('#buttons .ui-button')).borderRadius }));
// reduced motion
await p.emulateMedia({ reducedMotion: 'reduce' });
out.reduced = await p.evaluate(()=>getComputedStyle(document.querySelector('.ui-button')).transitionDuration);
// overflow 6 widths x 2 themes
out.overflow = [];
for (const theme of ['light','dark']) for (const w of [320,375,768,1024,1440,1920]) { await p.setViewportSize({width:w,height:850}); await p.goto(base+'/'); if(theme==='dark') await p.locator('#theme-toggle').click(); out.overflow.push(`${theme}-${w}:${await p.evaluate(()=>document.documentElement.scrollWidth)}`); }
console.log(JSON.stringify(out, null, 1));
await b.close();
