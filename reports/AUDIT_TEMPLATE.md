# 01. Аудит CSS-архитектуры

Автор / группа: Азаев М. С., 2024-ФГиИБ-ИС-2б · Репозиторий: `atlas-css-architecture` · Commit до правок: `6fa7035` (тег `baseline`)

## Гипотеза о причине (до изменения кода)

`legacy.css` подключён в `app.css` без `layer(...)`. Поэтому все его правила оказались вне слоёв. А обычное правило вне слоёв сильнее любого правила из именованного слоя, какая бы ни была специфичность. Отсюда одинаковые синие кнопки, квадратные углы и мелкий текст в карточках.

`@layer` решает вопрос «чей код главнее»: чужой CSS кладётся в ранний слой и проигрывает компонентам. Но `@layer` не решает три вещи: important-правила в раннем слое становятся самыми сильными; глобальные селекторы (`.is-danger`, `.ui-card p`) всё равно задевают чужие компоненты внутри своего слоя; поведение (модальность, фокус, момент показа ошибки) задаётся HTML и JS, а не каскадом.

## Инвентаризация дефектов (16 доказанных причин)

Номера строк — по коммиту `baseline`. Доказательства: `reports/traces/before.txt` (CDP), `reports/screenshots/devtools/before_*.png`, вывод `npm test` и `npm run test:e2e`.

| ID | Симптом и шаги воспроизведения | Файл:строка | Применённое правило и выигравший каскад | Первопричина | Минимальное исправление | Регрессионный тест |
|---|---|---|---|---|---|---|
| A-01 | Все кнопки в `#workbench` синие (secondary, ghost тоже) | app.css:3, legacy.css:3 | `#workbench .ui-button { background:#2939a8 }` вне слоёв > `.ui-button--secondary` в components | Импорт legacy без `layer()` | `@import url('./legacy.css') layer(legacy)` | test 02, trace T1b |
| A-02 | Опасная кнопка тёмно-красная, hover не работает | legacy.css:4 | `#workbench .ui-button.is-danger { background:#a41e24 !important }` — important вне слоёв | important у подрядчика; в слое legacy стал бы самым сильным | Правило удалено, вариант `ui-button--danger` в components | test 03, trace T1c |
| A-03 | У всех кнопок квадратные углы | legacy.css:2 | `button { border-radius:0 }` (0-0-1, вне слоёв) > `.ui-button` (0-1-0, components) | Глобальный селектор по тегу у подрядчика | Ограничен `.legacy-widget button` | test 18, trace T1 |
| A-04 | Текст карточек 11px, текст уведомления в карточке тоже | legacy.css:6, components.css:21 | `.ui-card p { font-size:.69rem }` вне слоёв > `.ui-alert p` | Селектор потомков задевает чужой компонент | Слоты `.ui-card__description`, `.ui-alert__text` | trace T4 |
| A-05 | Метка «Риск» в карточке выглядит как кнопка удаления (UX-141) | states.css:11, legacy.css:5 | `.is-danger { background:#c12236 }` в states > `.ui-tag--danger` в components; `color:#fff` из legacy | Глобальный класс состояния для разных семейств | `.is-danger` убран из HTML и CSS, только модификаторы семейств | tests 08, 17, trace T2 |
| A-06 | У меток в карточках лишний отступ 16px | states.css:12 | `:is(.ui-card, #workbench) .ui-tag` — вес 1-1-0 из-за ID в `:is()` | `:is()` берёт максимум веса аргументов | Правило удалено | test 13, trace T2 |
| A-07 | Метка при наведении темнеет и показывает курсор-руку | states.css:13 | `.ui-tag:hover { filter; cursor:pointer }` | Ложная интерактивность у статуса без действия | Правило удалено | матрица, `cursor: auto` |
| A-08 | Обязательные поля красные сразу после загрузки | states.css:9–10 | `.ui-field:has(input:invalid) input` (0-2-2) | `:invalid` у пустого required есть до ввода | Вид по `aria-invalid`, который JS ставит после blur/submit | test 09, e2e 3, trace T3 |
| A-09 | Нет видимого фокуса у кнопок | states.css:6 | `.ui-button:focus { outline:none }` в states > `:where(:focus-visible)` в base | Сброс outline без замены | `.ui-button:focus-visible { outline:3px solid }` | test 05, trace T6 |
| A-10 | Нет видимого фокуса у полей | legacy.css:7 | `input { outline:none }` вне слоёв > base | Глобальный сброс у подрядчика | Сброс убран, `.ui-field__control:focus-visible` | trace T7 |
| A-11 | Горизонтальный скролл на 320/375 (UX-142) | components.css:12, 17 | `min-width:20rem` у input, `min-width:22rem` у карточки | Фиксированная минимальная ширина больше трека | `min-width:0`, треки `minmax(0,1fr)` | test 10, e2e 4 |
| A-12 | Переключатель не достижим по Tab (UX-143) | components.css:44 | `.ui-switch input { display:none }` | Контрол удалён из дерева доступности | Визуально скрытый `position:absolute`, фокус на треке | test 06, e2e 2, trace T5 |
| A-13 | Модальное окно не модальное (UX-144) | js/app.js:15 | — (не каскад) | Вызов немодального метода вместо `showModal()` | `dialog.showModal()` | test 04, e2e 1 |
| A-14 | Primary не меняет цвет в тёмной теме, тексты уведомлений не читаются в тёмной теме | components.css:4, 7, 29; states.css:5, 9 | Жёсткие `#3659d9`, `#b42336`, `#111827` в компонентах | Значения в обход токенов | Только `var(--color-*)`, новые роли в tokens.css | test 07, e2e 5 |
| A-15 | Базовый блок кнопки объявлен дважды, padding берётся из второго | components.css:2–3 | Второй `.ui-button` перезаписывает `padding-inline` по порядку | Дублирование правила | Один блок `.ui-button` | test 11 |
| A-16 | Анимация hover без учёта настройки ОС, у disabled нет курсора | states.css:2, 8 | `transform` без `prefers-reduced-motion`; `pointer-events:none` | Нет режима reduce; disabled «через CSS» | `@media (prefers-reduced-motion: reduce)`, `cursor:not-allowed`, `:not(:disabled)` | test 12 |

Ещё мелкие причины, исправленные попутно: подсказка поля имени не связана через `aria-describedby`; у полей и трека рамка с контрастом ниже 3:1; цвет фокуса `#e8791a` давал 2,9:1; кнопка темы меняла и текст, и `aria-pressed`; раскладка шапки лежала в utilities.

## Три трассировки каскада

Формат: **элемент → свойство → кандидаты (происхождение / важность / слой / специфичность / файл) → победитель**. Данные сняты через Chrome DevTools Protocol (`CSS.getMatchedStylesForNode`) — это тот же источник, что панель Styles. Скриншоты панели: `reports/screenshots/devtools/`.

1. **Вторичная кнопка в `#workbench` → `background-color`.**
   Кандидаты: (а) author normal, слой `components`, `.ui-button--secondary` 0-1-0, components.css:5, `background: var(--color-surface)`; (б) author normal, **вне слоёв**, `#workbench .ui-button` 1-1-0, legacy.css:3, `background:#2939a8`.
   Победил (б). Причина не в ID: важность одинаковая, а правило вне слоёв стоит выше любого именованного слоя. Специфичность даже не сравнивается.
   После: legacy в слое `legacy`, его селектор ограничен виджетом. Победитель — `.ui-button--secondary` из `components`, итог `rgb(255,255,255)`. Если бы ID-правило осталось в слое legacy, оно бы всё равно проиграло: слой сравнивается раньше специфичности.
   Для опасной кнопки (T1c) был ещё кандидат `#workbench .ui-button.is-danger { … !important }` вне слоёв. Если просто перенести файл в `@layer legacy`, это правило станет **сильнее всех**: для important порядок слоёв обратный, ранний слой побеждает. Поэтому important удалён, а не перенесён.
   Скриншоты: `before_trace1_button.png`, `before_trace1c_danger_button.png`, `after_trace1_button.png`.

2. **Опасная метка внутри карточки → `background-color`, `color`, `padding-left`.**
   background: `.ui-tag--danger` (components, 0-1-0) против `.is-danger` (states, 0-1-0) → победил `.is-danger`: веса равны, но `states` позже `components`.
   color: три кандидата, победил `.is-danger { color:#fff }` из legacy вне слоёв.
   padding-left: `.ui-tag` (components, 0-1-0) против `:is(.ui-card, #workbench) .ui-tag` (states, **1-1-0**) → 16px. Метка совпала только с `.ui-card`, но `:is()` взял вес ID.
   После: остался один кандидат на каждое свойство — `.ui-tag--danger` и `.ui-tag` из `components`. Фон `rgb(255,240,242)`, текст `rgb(187,40,58)`, отступ 10,4px.
   Скриншоты: `before_trace2_tag.png`, `after_trace2_tag.png`.

3. **Поле email до взаимодействия → `border-top-color`.**
   Кандидаты: `.ui-field input` (components, 0-1-1) и `.ui-field:has(input:invalid) input` (states, 0-2-2). Победил второй: и слой позже, и вес больше. Поле красное сразу после загрузки, потому что пустое required-поле уже `:invalid`.
   Лечить это более сильным селектором нельзя: селектор правильно срабатывает на `:invalid`, ошибка в выборе состояния. Нужно состояние, которое появляется только после действия пользователя, — `aria-invalid`, его ставит JS после blur или submit.
   После: единственный кандидат — `.ui-field__control` из `components`, рамка `rgb(125,136,159)`. После blur срабатывает `.ui-field:has(input[aria-invalid="true"]) .ui-field__control` из `states`.
   Скриншоты: `before_trace3_field.png`, `after_trace3_field.png`.

Дополнительно (T4): текст уведомления в карточке. До: `.ui-card p` из legacy вне слоёв → 11,04px и серый цвет карточки. После: `.ui-alert__text` → 13,28px, цвет наследуется от `.ui-alert--warning`.

## Вывод

Каскадом решались A-01…A-11, A-14…A-16: это порядок слоёв, глобальные и слишком широкие селекторы, жёсткие значения. A-12 и A-13 — это семантика и JS: переключатель должен быть настоящим checkbox в дереве доступности, а модальность даёт только `showModal()`. A-08 смешанный: CSS показывал ошибку по неверному признаку, а сам признак (`aria-invalid`) задаёт JS.
