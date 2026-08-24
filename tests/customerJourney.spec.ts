import { test, expect } from '@playwright/test';
import { generateNewCustomer } from './helpers/testData';
import { registerNewCustomer, openNewAccount, transferFunds, login } from './helpers/parabankFlow';

// ============================================================
// ПОЛНЫЙ ПУТЬ КЛИЕНТА: регистрация → второй счёт → перевод между счетами
//
// Каждый прогон создаёт СВОЕГО уникального пользователя (см.
// helpers/testData.ts) — сайт публичный и общий для всех, кто его
// тестирует, поэтому изоляция данных теста держится на уникальности
// имени пользователя, а не на выделенном тестовом окружении.
// ============================================================

test('регистрация → второй счёт → перевод средств между своими счетами', async ({ page }) => {
  const customer = generateNewCustomer();

  await test.step('Регистрация нового клиента', async () => {
    await registerNewCustomer(page, customer);
    // "Welcome Имя Фамилия" — это не заголовок, а текст в левой панели
    // сессии (<p class="smallText">), подтверждено дампом реального DOM.
    await expect(page.locator('#leftPanel')).toContainText(`Welcome ${customer.firstName} ${customer.lastName}`);
  });

  let checkingAccountId = '';
  await test.step('Читаем номер счёта, созданного автоматически при регистрации', async () => {
    await page.goto('overview.htm');
    const firstAccountLink = page.locator('#accountTable a').first();
    await expect(firstAccountLink).toBeVisible();
    checkingAccountId = (await firstAccountLink.textContent())?.trim() ?? '';
    expect(checkingAccountId).not.toBe('');
  });

  let savingsAccountId = '';
  await test.step('Открываем второй счёт (SAVINGS)', async () => {
    savingsAccountId = await openNewAccount(page, 'SAVINGS');
    expect(savingsAccountId).not.toBe(checkingAccountId);
  });

  await test.step('Переводим средства с текущего счёта на новый', async () => {
    await transferFunds(page, {
      amount: 50,
      fromAccountId: checkingAccountId,
      toAccountId: savingsAccountId,
    });
  });

  await test.step('Проверяем, что оба счёта видны в обзоре', async () => {
    await page.goto('overview.htm');
    await expect(page.locator('#accountTable')).toContainText(checkingAccountId);
    await expect(page.locator('#accountTable')).toContainText(savingsAccountId);
  });

  await test.step('Логаут и повторный логин под тем же пользователем', async () => {
    await page.getByRole('link', { name: 'Log Out' }).click();
    await login(page, customer.username, customer.password);
  });
});
