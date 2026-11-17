// Нагрузочный тест k6: каталог, поиск, подсказки, слоты записи.
//   k6 run -e BASE_URL=https://staging.example.ru -e CITY=moskva -e CLINIC=slug-kliniki tests/load/catalog.js
// Запись (POST) намеренно не нагружаем на проде: сценарий booking включается только с -e BOOKING=1 на staging.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:8000';
const CITY = __ENV.CITY || 'moskva';
const CLINIC = __ENV.CLINIC || '';

export const options = {
    scenarios: {
        browse: { executor: 'ramping-vus', startVUs: 1, stages: [{ duration: '30s', target: 20 }, { duration: '1m', target: 50 }, { duration: '30s', target: 0 }] },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<1500'],
        'http_req_duration{name:suggest}': ['p(95)<400'],
    },
};

const QUERIES = ['имплант', 'кариес', 'ортодонт', 'детская стоматология', 'имплатнация'];

export default function () {
    check(http.get(`${BASE}/`), { 'home 200': (r) => r.status === 200 });
    check(http.get(`${BASE}/${CITY}/clinics`), { 'catalog 200': (r) => r.status === 200 });
    check(http.get(`${BASE}/${CITY}/doctors`), { 'doctors 200': (r) => r.status === 200 });

    const q = encodeURIComponent(QUERIES[Math.floor(Math.random() * QUERIES.length)]);
    const s = http.get(`${BASE}/api/v1/search/suggest?q=${q}&city=${CITY}`, { tags: { name: 'suggest' } });
    check(s, { 'suggest 200': (r) => r.status === 200 });

    if (CLINIC) {
        check(http.get(`${BASE}/clinics/${CLINIC}`), { 'clinic 200': (r) => r.status === 200 });
        const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        check(http.get(`${BASE}/api/v1/clinics/${CLINIC}/slots?date=${date}`, { tags: { name: 'slots' } }), { 'slots ok': (r) => r.status === 200 || r.status === 422 });
    }
    sleep(1);
}
