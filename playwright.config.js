// Optional advanced browser verification. Run after: npm i -D @playwright/test
export default {
  testDir: './tests/browser',
  timeout: 30000,
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium', headless: true },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true, timeout: 15000 },
  reporter: 'list'
};
