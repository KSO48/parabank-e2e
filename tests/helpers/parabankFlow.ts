import { Page, expect } from '@playwright/test';
import type { NewCustomerData } from './testData';

// ============================================================
// ПЕРЕИСПОЛЬЗУЕМЫЕ ШАГИ ДЛЯ PARABANK
//
// Особенность сайта, подтверждённая вручную перед написанием этого файла:
// кнопки "Open New Account" и "Apply Now" — НЕ submit, а <button type=
// "button">, обрабатывающие клик через AJAX и подменяющие содержимое
// страницы без полной навигации. Обычный Playwright click() отрабатывает
// корректно (события input/change/blur он диспатчит сам), но результат
// проверяем через ожидание конкретного текста, а не через waitForURL —
// URL при AJAX-подмене не меняется.
// ============================================================

export async function registerNewCustomer(page: Page, data: NewCustomerData): Promise<void> {
  await page.goto('register.htm');

  // ВНИМАНИЕ: id-шники формы содержат точки ("customer.firstName") —
  // в CSS-локаторе Playwright точка после # читается как разделитель
  // класса, а не как часть id ("#customer.firstName" === id=customer
  // класс=firstName). Нужен атрибутный селектор, а не голый #id.
  await page.locator('[id="customer.firstName"]').fill(data.firstName);
  await page.locator('[id="customer.lastName"]').fill(data.lastName);
  await page.locator('[id="customer.address.street"]').fill(data.street);
  await page.locator('[id="customer.address.city"]').fill(data.city);
  await page.locator('[id="customer.address.state"]').fill(data.state);
  await page.locator('[id="customer.address.zipCode"]').fill(data.zipCode);
  await page.locator('[id="customer.phoneNumber"]').fill(data.phoneNumber);
  await page.locator('[id="customer.ssn"]').fill(data.ssn);
  const usernameField = page.locator('[id="customer.username"]');
  await usernameField.fill(data.username);
  // Уводим фокус с поля явно (Tab) — есть подозрение на debounced
  // AJAX-проверку уникальности username на blur, которая не успевает
  // отработать, если сразу переходить к следующему полю через fill()
  // без реального ухода фокуса.
  await usernameField.press('Tab');

  await page.locator('[id="customer.password"]').fill(data.password);
  await page.locator('#repeatedPassword').fill(data.password);

  await page.getByRole('button', { name: 'Register' }).click();

  // "This username already exists" — реальный кейс на общей публичной базе
  // (см. testData.ts), поэтому явно проверяем позитивный исход, а не просто
  // ждём любую следующую страницу.
  await expect(page.getByText('Your account was created successfully.')).toBeVisible({ timeout: 10_000 });
}

export async function login(page: Page, username: string, password: string): Promise<void> {
  await page.goto('index.htm');
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  // "Welcome ..." — текст в левой панели сессии (<p class="smallText">),
  // не заголовок (подтверждено дампом реального DOM).
  await expect(page.locator('#leftPanel')).toContainText('Welcome', { timeout: 10_000 });
}

export type AccountType = 'CHECKING' | 'SAVINGS';

// Открывает новый счёт и возвращает его номер. Кнопка — AJAX, без
// навигации, поэтому результат ловим через появление текста "Account
// Opened!", а сам номер счёта вытаскиваем из ссылки на него.
//
// РЕАЛЬНАЯ гонка на стороне сайта (подтверждено дампом JS перед этим
// коммитом): список #fromAccountId заполняется отдельным асинхронным
// AJAX-запросом (getAccounts()) уже ПОСЛЕ рендера страницы. Обработчик
// клика читает accounts.selectedOption.id без проверки на null — если
// кликнуть раньше, чем этот запрос успеет отработать, JS падает с
// исключением и submit() вообще не отправляет запрос на создание счёта
// (кнопка "нажимается", эффекта — ноль). Поэтому явно ждём, что список
// счетов реально заполнился, прежде чем кликать.
export async function openNewAccount(page: Page, type: AccountType): Promise<string> {
  await page.goto('openaccount.htm');

  await page.locator('#fromAccountId option').first().waitFor({ state: 'attached', timeout: 10_000 });

  await page.locator('#type').selectOption(type === 'CHECKING' ? '0' : '1');

  await page.getByRole('button', { name: 'Open New Account' }).click();

  await expect(page.getByText('Account Opened!')).toBeVisible({ timeout: 10_000 });

  const accountLink = page.locator('#newAccountId');
  await expect(accountLink).toBeVisible();
  const accountNumber = (await accountLink.textContent())?.trim();

  if (!accountNumber) {
    throw new Error('Не удалось прочитать номер нового счёта после "Account Opened!"');
  }

  return accountNumber;
}

export async function transferFunds(
  page: Page,
  params: { amount: number; fromAccountId: string; toAccountId: string },
): Promise<void> {
  await page.goto('transfer.htm');

  await page.locator('#amount').fill(String(params.amount));
  await page.locator('#fromAccountId').selectOption(params.fromAccountId);
  await page.locator('#toAccountId').selectOption(params.toAccountId);

  await page.getByRole('button', { name: 'Transfer' }).click();

  await expect(page.getByText('Transfer Complete!')).toBeVisible({ timeout: 10_000 });
}

export type LoanRequestResult = {
  status: 'Approved' | 'Denied';
  reasonText: string;
};

// Заявка на кредит — единственный сценарий на сайте с явным решением
// Approved/Denied, ближайший аналог "заявление → решение" из рабочих
// проектов. Тоже AJAX-кнопка ("Apply Now"), поэтому ждём заголовок
// результата, а не навигацию.
export async function requestLoan(
  page: Page,
  params: { amount: number; downPayment: number; fromAccountId: string },
): Promise<LoanRequestResult> {
  await page.goto('requestloan.htm');

  await page.locator('#amount').fill(String(params.amount));
  await page.locator('#downPayment').fill(String(params.downPayment));
  await page.locator('#fromAccountId').selectOption(params.fromAccountId);

  await page.getByRole('button', { name: 'Apply Now' }).click();

  await expect(page.getByText('Loan Request Processed')).toBeVisible({ timeout: 10_000 });

  const statusText = await page.locator('#loanStatus').textContent();
  const status = statusText?.trim() === 'Approved' ? 'Approved' : 'Denied';

  // При отказе причина лежит в #loanRequestDenied, при одобрении — блок
  // #loanRequestApproved (может содержать номер выданного кредитного
  // счёта); оба блока присутствуют в DOM одновременно, виден только
  // актуальный (второй скрыт через display:none) — читаем нужный явно
  // по status, а не пытаемся угадать текстом.
  const reasonText =
    status === 'Denied'
      ? ((await page.locator('#loanRequestDenied').textContent()) ?? '').trim()
      : ((await page.locator('#loanRequestApproved').textContent()) ?? '').trim();

  return { status, reasonText };
}
