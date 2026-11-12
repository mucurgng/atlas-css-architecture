const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const dialog = document.querySelector('#settings-dialog');

function toggleTheme() {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  themeToggle.setAttribute('aria-pressed', String(next === 'dark'));
  themeToggle.textContent = next === 'dark' ? '☀️ Светлая тема' : '🌙 Сменить тему';
}
themeToggle.addEventListener('click', toggleTheme);

// INCIDENT D08: the window is opened, but not in a modal state.
for (const trigger of document.querySelectorAll('#open-dialog, [data-open-dialog]')) {
  trigger.addEventListener('click', () => dialog.show());
}

const form = document.querySelector('#demo-form');
for (const input of form.querySelectorAll('input[required]')) {
  input.addEventListener('blur', () => input.setAttribute('aria-invalid', String(!input.checkValidity())));
  input.addEventListener('input', () => {
    if (input.hasAttribute('aria-invalid')) input.setAttribute('aria-invalid', String(!input.checkValidity()));
  });
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  let hasErrors = false;
  for (const input of form.querySelectorAll('input[required]')) {
    const invalid = !input.checkValidity();
    input.setAttribute('aria-invalid', String(invalid));
    if (invalid) hasErrors = true;
  }
  document.querySelector('#form-feedback').textContent = hasErrors ? 'Исправьте поля формы.' : 'Данные прошли проверку.';
});

const alerts = document.querySelector('.alerts-stack');
const initialAlerts = alerts.innerHTML;
alerts.addEventListener('click', (event) => {
  const dismiss = event.target.closest('.ui-alert__dismiss');
  if (dismiss) dismiss.closest('.ui-alert')?.remove();
});
document.querySelector('#restore-alerts').addEventListener('click', () => { alerts.innerHTML = initialAlerts; });
for (const input of document.querySelectorAll('.ui-switch input')) {
  input.addEventListener('change', () => {
    document.querySelector('#switch-feedback').textContent = `${input.closest('.ui-switch').querySelector('strong').textContent}: ${input.checked ? 'включено' : 'выключено'}`;
  });
}
