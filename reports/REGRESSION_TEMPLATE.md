# 04. Регрессионный отчёт

## Сборка и окружение

Node: 24.21.0 · Browser/version: Chromium 1254 (Playwright 1.65.0), Google Chrome 157 · Windows 11 Pro · Commit: ветка `fix/css-architecture`, см. `git log`

## Тестирование

- `npm test`: **18 / 18** пройдено (до: 4 / 18). Вывод: `test-output/npm-test-before.txt`, `test-output/npm-test-after.txt`.
- `npm run test:e2e`: **6 / 6** пройдено (до: 1 / 6). Вывод: `test-output/e2e-before.txt`, `test-output/e2e-after.txt`.
- 320 / 375 / 768 / 1024 / 1440 / 1920 px: `scrollWidth` равен ширине окна во всех 12 сочетаниях ширина × тема (`test-output/verify-after.json`, поле `overflow`).
- light / dark / reduced-motion / Tab / Shift+Tab / Space / Enter / Escape: проверено. Reduced-motion: `transition-duration: 0s` у кнопки при `emulateMedia({ reducedMotion: 'reduce' })` и в DevTools → Rendering.
- Нет глобального горизонтального скролла: да, без `overflow-x: hidden` на body — убраны причины (`min-width` 20/22rem, треки без `minmax(0, …)`).
- Сторонний виджет сохранён и не влияет на библиотеку: виджет со шрифтом Georgia и квадратной кнопкой, у кнопок библиотеки радиус 12px, test 18 проходит.

## Доказательства

| Проверка | Команда/сценарий | Результат | Скриншот/ссылка |
|---|---|---|---|
| Контраст уведомлений | `node tools/verify.mjs` | Светлая: 5,00–6,14; тёмная: 6,15–7,49 (норма 4,5) | `after_1440_light.png`, `after_1440_dark.png` |
| Фокус переключателя | e2e «switch is keyboard reachable», Tab в браузере | Фокус на checkbox, обводка на треке, Space включает | `after_switch_focus_light.png` |
| Действительно модальное окно | e2e «native dialog is truly modal» | `:modal` = true, Escape закрывает, фокус на `#open-dialog` | `after_dialog_1440_light.png`, `after_dialog_375_dark.png` |
| Контракт кнопки | test 11, trace T1, e2e «primary button uses theme tokens» | Один базовый блок, фон из токена меняется с темой, высоты 34,4/44/52 px | `devtools/after_trace1_button.png` |
| Длинный текст карточки | e2e overflow, ширина 320 | Заголовок переносится, `scrollWidth` = 320 | `after_320_light.png`, `after_320_dark.png` |
| Ошибка поля после blur | e2e «field does not display error before user interacts» | До — обычная рамка, после blur — danger и текст ошибки | `after_fields_invalid_light.png` |
| Виджет подрядчика | test 18, trace T1 | Вид виджета сохранён, библиотека не задета | `after_1440_light.png` |

## Известные ограничения

1. Цвета виджета подрядчика не зависят от темы: в тёмной теме он остаётся светлым. Так он визуально отделён от библиотеки, но это не «родной» вид.
2. Конфликты внутри одного слоя всё ещё возможны: если кто-то добавит в components селектор потомков вида `.ui-card p`, слой его не остановит. Ловится только ревью и тестом-трассировкой. План: добавить статическую проверку «нет селекторов потомков по тегу в components.css».
3. Тесты на контраст и визуальную регрессию не входят в CI: `tools/verify.mjs` и скриншоты запускаются вручную. Ручной остаётся проверка экранным диктором.
4. Не поддержаны варианты: кнопка-иконка без текста, метка с иконкой, поле с префиксом, уведомление без кнопки закрытия в стопке.

## До/после

Самый показательный дефект — вторичная кнопка в `#workbench` (A-01).

До: `#workbench .ui-button { background:#2939a8 }` в `legacy.css` вне слоёв. Он сильнее `.ui-button--secondary` из слоя components, хотя файл компонентов подключён позже. Все четыре варианта кнопки одного синего цвета.

Diff:

```diff
-@import url('./legacy.css'); /* TODO: investigate unlayered precedence */
+@import url('./legacy.css') layer(legacy);
-#workbench .ui-button { background: #2939a8; padding: .45rem .65rem; }
-#workbench .ui-button.is-danger { background: #a41e24 !important; }
+/* правила подрядчика ограничены корнем .legacy-widget */
```

После: в DevTools у кнопки остаётся один кандидат на фон — `.ui-button--secondary` (Layer components). Победило правило слоя components, потому что legacy теперь ранний слой, а правил вне слоёв нет.

Почему отказ от important и ID улучшил расширяемость: новый вариант кнопки — это один класс `.ui-button--x` весом 0-1-0 в слое components. Не нужно «перебивать» ID или important, а значит не нужно поднимать вес всей библиотеки.
