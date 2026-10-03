import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const pages = [
    { name: 'home', path: '/' },
    { name: 'search', path: '/search' },
    { name: 'clinics', path: '/moskva/clinics' },
    { name: 'doctors', path: '/moskva/doctors' },
    { name: 'directions', path: '/moskva/directions' },
    { name: 'login', path: '/login' },
] as const;

const outRoot = path.join(process.cwd(), 'tests', 'playwright', 'screenshots');

for (const pageDef of pages) {
    test(`${pageDef.name} layout`, async ({ page }, testInfo) => {
        await page.goto(pageDef.path, { waitUntil: 'networkidle' });

        const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            return doc.scrollWidth - doc.clientWidth;
        });
        expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(1);

        const previewBar = page.locator('.preview-bar');
        await expect(previewBar).toHaveCount(0);

        const dir = path.join(outRoot, testInfo.project.name);
        fs.mkdirSync(dir, { recursive: true });
        await page.screenshot({
            path: path.join(dir, `${pageDef.name}.png`),
            fullPage: true,
        });
    });
}

test('clinic detail layout', async ({ page }, testInfo) => {
    await page.goto('/moskva/clinics', { waitUntil: 'networkidle' });
    const link = page.locator('a[href^="/clinics/"]').first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    await page.goto(href!, { waitUntil: 'networkidle' });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const dir = path.join(outRoot, testInfo.project.name);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'clinic-show.png'), fullPage: true });
});
