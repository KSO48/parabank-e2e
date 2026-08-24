import { defineConfig, devices } from '@playwright/test';

// ParaBank — публичный демо-сайт от Parasoft, официально предназначенный
// для практики автоматизации (никакого спецбраузера/плагинов не нужно —
// в отличие от рабочих проектов с реальным ЭДО-подписанием, здесь обычный
// Chromium из коробки).
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    // Слэш на конце ОБЯЗАТЕЛЕН: baseURL резолвится по правилам WHATWG URL,
    // а во всех page.goto() ниже пути указаны БЕЗ ведущего слэша — так
    // "register.htm" корректно дописывается к /parabank/, а не сбрасывает
    // путь до корня домена (что происходит, если использовать ведущий "/").
    baseURL: 'https://parabank.parasoft.com/parabank/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
