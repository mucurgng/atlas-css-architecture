const root = document.documentElement;

/* Тема: меняется только атрибут data-theme на html, цвета переключают токены (tokens.css). */
const themeToggle = document.querySelector('#theme-toggle');
function applyTheme(theme) {
  root.dataset.theme = theme;
  const toDark = theme !== 'dark';
  themeToggle.querySelector('[data-theme-icon]').textContent = toDark ? '🌙' : '☀️';
  themeToggle.lastChild.textContent = toDark ? ' Тёмная тема' : ' Светлая тема';
}
themeToggle.addEventListener('click', () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

/* Диалог: только модальный режим. showModal() кладёт окно в верхний слой, делает фон inert,
   закрывается по Escape и возвращает фокус на кнопку, которая его открыла. */
const dialog = document.querySelector('#settings-dialog');
let dialogTrigger = null;
for (const trigger of document.querySelectorAll('#open-dialog, [data-open-dialog]')) {
  trigger.addEventListener('click', () => {
    dialogTrigger = trigger;
    dialog.showModal();
  });
}
dialog.addEventListener('close', () => {
  // Браузер возвращает фокус сам; это страховка на случай старого движка.
  if (dialogTrigger && document.activeElement !== dialogTrigger) dialogTrigger.focus();
  dialogTrigger = null;
});

/* Валидация: до взаимодействия ошибки нет. После blur или submit поле получает aria-invalid,
   а подсказка (aria-describedby) объясняет, что исправить. CSS читает только aria-invalid. */
const form = document.querySelector('#demo-form');
const requiredInputs = [...form.querySelectorAll('input[required]')];
function setFieldState(input) {
  const invalid = !input.checkValidity();
  input.setAttribute('aria-invalid', String(invalid));
  const hint = document.getElementById(input.getAttribute('aria-describedby'));
  if (hint) {
    hint.dataset.defaultText ??= hint.textContent;
    hint.textContent = invalid ? input.dataset.error : hint.dataset.defaultText;
  }
  return invalid;
}
for (const input of requiredInputs) {
  input.addEventListener('blur', () => setFieldState(input));
  input.addEventListener('input', () => {
    if (input.hasAttribute('aria-invalid')) setFieldState(input);
  });
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const invalidInputs = requiredInputs.filter((input) => setFieldState(input));
  document.querySelector('#form-feedback').textContent = invalidInputs.length
    ? `Исправьте поля: ${invalidInputs.length}.`
    : 'Данные прошли проверку.';
  invalidInputs[0]?.focus();
});

/* Уведомления: закрытие удаляет одно уведомление, а не контейнер; фокус не теряется. */
const alerts = document.querySelector('.alerts-stack');
const restoreButton = document.querySelector('#restore-alerts');
const initialAlerts = [...alerts.children].map((node) => node.cloneNode(true));
alerts.addEventListener('click', (event) => {
  const dismiss = event.target.closest('.ui-alert__dismiss');
  if (!dismiss) return;
  const alert = dismiss.closest('.ui-alert');
  const neighbour = alert.nextElementSibling ?? alert.previousElementSibling;
  alert.remove();
  (neighbour?.querySelector('.ui-alert__dismiss') ?? restoreButton).focus();
});
restoreButton.addEventListener('click', () => {
  alerts.replaceChildren(...initialAlerts.map((node) => node.cloneNode(true)));
});

/* Переключатели: состояние хранит сам checkbox, здесь только текстовая обратная связь. */
for (const input of document.querySelectorAll('.ui-switch input')) {
  input.addEventListener('change', () => {
    const label = input.closest('.ui-switch').querySelector('.ui-switch__label').textContent;
    document.querySelector('#switch-feedback').textContent = `${label}: ${input.checked ? 'включено' : 'выключено'}`;
  });
}
