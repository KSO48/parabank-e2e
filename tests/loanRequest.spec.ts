import { test, expect } from '@playwright/test';
import { generateNewCustomer } from './helpers/testData';
import { registerNewCustomer, requestLoan } from './helpers/parabankFlow';

// ============================================================
// ЗАЯВКА НА КРЕДИТ — единственный сценарий на ParaBank с явным решением
// Approved/Denied, ближайший открытый аналог "заявление → решение" из
// закрытых корпоративных проектов. Два теста ниже намеренно направлены
// в разные исходы одним и тем же механизмом (размер первоначального
// взноса относительно баланса счёта), а не моком ответа сервера —
// свежезарегистрированный клиент получает стартовый баланс ~$415 на
// первом счёте (подтверждено вручную перед написанием теста), поэтому:
//   - маленький взнос -> одобрено
//   - взнос многократно больше баланса -> отказано
// ============================================================

test.describe('Заявка на кредит', () => {
  test('одобряется, когда взнос не превышает доступный баланс', async ({ page }) => {
    const customer = generateNewCustomer();
    await registerNewCustomer(page, customer);

    await page.goto('overview.htm');
    const accountId = (await page.locator('#accountTable a').first().textContent())?.trim() ?? '';
    expect(accountId).not.toBe('');

    const result = await requestLoan(page, {
      amount: 100,
      downPayment: 0,
      fromAccountId: accountId,
    });

    expect(result.status).toBe('Approved');
  });

  test('отклоняется, когда взнос сильно превышает доступный баланс', async ({ page }) => {
    const customer = generateNewCustomer();
    await registerNewCustomer(page, customer);

    await page.goto('overview.htm');
    const accountId = (await page.locator('#accountTable a').first().textContent())?.trim() ?? '';
    expect(accountId).not.toBe('');

    const result = await requestLoan(page, {
      amount: 50_000,
      downPayment: 40_000,
      fromAccountId: accountId,
    });

    expect(result.status).toBe('Denied');
    expect(result.reasonText).toContain('sufficient funds');
  });
});
