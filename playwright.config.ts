import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://st-clinik.rinulik.ru';

const breakpoints = [
    { name: '320', width: 320, height: 800 },
    { name: '360', width: 360, height: 800 },
    { name: '375', width: 375, height: 812 },
    { name: '390', width: 390, height: 844 },
    { name: '430', width: 430, height: 932 },
    { name: '768', width: 768, height: 1024 },
    { name: '1024', width: 1024, height: 768 },
    { name: '1280', width: 1280, height: 800 },
    { name: '1440', width: 1440, height: 900 },
    { name: '1920', width: 1920, height: 1080 },
];

export default defineConfig({
    testDir: './tests/playwright',
    timeout: 90_000,
    expect: { timeout: 15_000 },
    fullyParallel: false,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL,
        trace: 'off',
        screenshot: 'off',
        video: 'off',
    },
    projects: breakpoints.map((bp) => ({
        name: bp.name,
        use: {
            ...devices['Desktop Chrome'],
            viewport: { width: bp.width, height: bp.height },
        },
    })),
});
