// ------------------------------------------------------------
// Генерация случайных данных для регистрации.
//
// ParaBank — общая публичная база: username должен быть уникальным среди
// ВСЕХ, кто когда-либо тестировал этот сайт по всему миру. Подтверждено
// экспериментально (см. debug-прогон перед этим коммитом): проверка
// уникальности на сервере ведёт себя как нечёткое совпадение по
// подстроке, а не точное сравнение — ЛЮБОЙ username с префиксом вроде
// "qa_", "test_", "e2e_" стабильно получает "This username already
// exists.", даже если такая строка гарантированно никогда раньше не
// встречалась (проверено: "qa_debug_<уникальный хвост>" — отказ,
// "qa_e2e_<уникальный хвост>" — отказ, но точно такой же по энтропии
// username БЕЗ узнаваемого префикса — проходит с первого раза). Поэтому
// генерируем чисто случайную буквенно-цифровую строку без семантического
// префикса — только это даёт стабильную регистрацию.
// ------------------------------------------------------------

export type NewCustomerData = {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
};

const firstNames = ['Ivan', 'Anna', 'Sergey', 'Olga', 'Dmitry', 'Maria'];
const lastNames = ['Petrov', 'Ivanova', 'Sidorov', 'Kuznetsova', 'Volkov', 'Orlova'];

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

// Без семантического префикса ("qa_", "test_" и т.п. — см. пояснение
// выше) и без разделителей вроде "_", чисто [a-z0-9]. Две склеенные
// base36-случайности вместо одной — запас энтропии на случай плотного
// параллельного запуска (несколько воркеров могут стартовать в одну и ту
// же миллисекунду, timestamp тогда не помогает отличить их друг от друга).
function randomUsername(): string {
  return Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
}

export function generateNewCustomer(): NewCustomerData {
  return {
    firstName: pick(firstNames),
    lastName: pick(lastNames),
    street: `${randomInt(1, 999)} Test Street`,
    city: 'Testville',
    state: 'TS',
    zipCode: String(randomInt(10000, 99999)),
    phoneNumber: `555${randomInt(1000000, 9999999)}`,
    ssn: String(randomInt(100000000, 999999999)),
    username: randomUsername(),
    password: `Demo${randomInt(1000, 9999)}Pass!`,
  };
}
