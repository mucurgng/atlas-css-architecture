# ATLAS UI · CSS Architecture Rescue

Практическая работа № 6 «Компонентный CSS и управление каскадом». Азаев М. С., 2024-ФГиИБ-ИС-2б.

Стенд из семи семейств компонентов (кнопка, поле, карточка, метка, уведомление, переключатель, диалог), две темы и виджет подрядчика. Исходная заготовка с ошибками — коммит `baseline` (тег `baseline`), исправленная версия — ветка `fix/css-architecture`, слита в `main`.

| Проверка | До | После |
|---|---|---|
| `npm test` (структурные проверки) | 4 / 18 | **18 / 18** |
| `npm run test:e2e` (браузерные сценарии) | 1 / 6 | **6 / 6** |
| Горизонтальный скролл, 6 ширин × 2 темы | есть на 320 и 375 | **нет** |

## Запуск

Нужен Node.js 18+. Зависимости для запуска не нужны.

```bash
npm run dev          # http://127.0.0.1:5173
npm test             # 18 структурных проверок
npm install          # один раз, для браузерных тестов
npx playwright install chromium
npm run test:e2e     # 6 браузерных сценариев
```

Открывать через сервер, не через `file://`.

Посмотреть исходную версию рядом с исправленной:

```bash
git worktree add ../atlas-before baseline
cd ../atlas-before && PORT=5174 npm run dev   # http://127.0.0.1:5174
```

Вспомогательные скрипты (нужен Playwright):

- `node tools/trace.mjs <url> <out.json>` — трассировка каскада через DevTools Protocol: все кандидаты на свойство со слоем, специфичностью и файлом;
- `node tools/devtools-shot.mjs <url> <dir> <prefix>` — скриншоты настоящей панели DevTools → Styles (нужен Google Chrome);
- `node tools/capture.mjs <url> <dir> before|after` — скриншоты 6 ширин × 2 темы, диалог, фокус;
- `node tools/verify.mjs <url>` — контраст, клавиатура, overflow, reduced-motion.

## Архитектура

```text
css/app.css         @layer reset, legacy, tokens, base, components, states, utilities; + импорты в слои
css/reset.css       нормализация, только :where()
css/legacy.css      CSS подрядчика, ограничен корнем .legacy-widget
css/tokens.css      семантические токены, светлая и тёмная темы
css/base.css        страница, каркас, сетки стенда
css/components.css  корень, слоты и варианты 7 семейств
css/states.css      hover, focus-visible, active, disabled, checked, aria-invalid, reduced-motion
css/utilities.css   .u-visually-hidden
js/app.js           тема, showModal(), валидация после blur/submit, уведомления, переключатели
reports/            аудит, ADR, матрица, регрессия, трассировки, скриншоты, вывод тестов
tools/              скрипты проверок
```

Главные правила (подробно — `reports/ADR_TEMPLATE.md`):

1. Каждый файл подключён в свой слой, правил вне слоёв нет.
2. Нет `!important` и ID в селекторах. Конфликт решает слой, а не вес.
3. Компонент оформляет только свой корень и слоты `__element`, не чужих потомков.
4. Цвета только из токенов, тема меняется атрибутом `data-theme` на `<html>`.
5. Состояния — псевдоклассы и ARIA, глобальных `.is-*` нет.

## CSS API

| Семейство | Корень и слоты | Модификаторы | Состояния | Токены |
|---|---|---|---|---|
| Кнопка | `.ui-button` | `--primary`, `--secondary`, `--ghost`, `--danger`; `--sm`, `--lg` | `:hover`, `:active`, `:focus-visible`, нативный `disabled` | `--color-accent*`, `--color-danger-solid*`, `--color-on-danger`, `--control-height`, `--radius-md` |
| Поле | `.ui-field`, `__label`, `__control`, `__hint` | `--full` | `aria-invalid="true\|false"`, `:focus-visible` | `--color-border-strong`, `--color-danger*`, `--color-success` |
| Карточка | `.ui-card`, `__meta`, `__title`, `__description`, `__action` | `--featured` | — | `--color-surface`, `--shadow-card`, `--radius-md` |
| Метка | `.ui-tag` | `--neutral`, `--success`, `--warning`, `--danger` | нет (не интерактивна) | `--color-*-bg`, `--color-*`, `--radius-pill` |
| Уведомление | `.ui-alert`, `__body`, `__title`, `__text`, `__dismiss` | `--info`, `--success`, `--warning`, `--danger` | `__dismiss:hover`, `:focus-visible` | локальные `--alert-accent`, `--alert-bg` |
| Переключатель | `label.ui-switch`, `input[type=checkbox][role=switch]`, `__copy`, `__label`, `__description`, `__track`, `__thumb` | — | `:checked`, нативный `disabled`, `:focus-visible` | `--color-border-strong`, `--color-accent`, `--color-switch-thumb` |
| Диалог | `dialog.ui-dialog`, `__head`, `__title`, `__text`, `__actions` | — | открытие только `showModal()`; Escape, возврат фокуса | `--color-backdrop`, `--shadow-dialog`, `--radius-lg` |

Новый вариант добавляется одним классом-модификатором в `components.css`. Новый цвет — новой ролью в `tokens.css` для обеих тем.

## Отчёты

- `reports/AUDIT_TEMPLATE.md` — 16 причин, 3 трассировки каскада;
- `reports/ADR_TEMPLATE.md` — выбор архитектуры и инварианты;
- `reports/MATRIX_TEMPLATE.csv` — 48 сценариев (разделитель `;`);
- `reports/REGRESSION_TEMPLATE.md` — результаты проверок и ограничения;
- `reports/traces/` — трассировки до и после (txt и json);
- `reports/screenshots/before`, `after`, `devtools` — снимки.
