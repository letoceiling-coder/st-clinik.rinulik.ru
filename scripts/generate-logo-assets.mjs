// Генерирует фавиконы и иконки PWA из композиции логотипа (resources/js/components/brand/logoSpheres.ts).
// Запуск: node scripts/generate-logo-assets.mjs
// Если Playwright не находит свой браузер: PLAYWRIGHT_CHROMIUM_PATH=/путь/к/chrome node scripts/generate-logo-assets.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { LOGO_CENTER, LOGO_FAMILIES, LOGO_HALF_EXTENT, LOGO_SPHERES, LOGO_TOKEN_FALLBACK } from '../resources/js/components/brand/logoSpheres.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (path) => resolve(root, 'public', path);
const round = (value) => Math.round(value * 10) / 10;

/**
 * SVG знака. padding — доля пустого поля вокруг композиции, background — цвет подложки или null.
 */
function logoSvg({ padding = 0, background = null, radius = 0 }) {
    const half = LOGO_HALF_EXTENT * (1 + padding * 2);
    const size = round(half * 2);
    const x0 = round(LOGO_CENTER.x - half);
    const y0 = round(LOGO_CENTER.y - half);
    const gradients = LOGO_FAMILIES.map((family) => {
        const { light, deep } = LOGO_TOKEN_FALLBACK[family];

        return `<linearGradient id="${family[0]}" x1=".85" y1=".15" x2=".15" y2=".85"><stop stop-color="${light}"/><stop offset="1" stop-color="${deep}"/></linearGradient>`;
    }).join('');
    const bg = background ? `<rect x="${x0}" y="${y0}" width="${size}" height="${size}" rx="${round(size * radius)}" fill="${background}"/>` : '';
    const circles = LOGO_SPHERES.map((s) => `<circle cx="${round(s.x)}" cy="${round(s.y)}" r="${round(s.r)}" fill="url(#${s.family[0]})"/>`).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${size} ${size}"><defs>${gradients}</defs>${bg}${circles}</svg>\n`;
}

/** ICO с PNG внутри (поддерживается всеми браузерами с Windows Vista). */
function buildIco(images) {
    const header = Buffer.alloc(6 + images.length * 16);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(images.length, 4);
    let offset = header.length;
    images.forEach(({ size, png }, index) => {
        const entry = 6 + index * 16;
        header.writeUInt8(size >= 256 ? 0 : size, entry);
        header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
        header.writeUInt16LE(1, entry + 4);
        header.writeUInt16LE(32, entry + 6);
        header.writeUInt32LE(png.length, entry + 8);
        header.writeUInt32LE(offset, entry + 12);
        offset += png.length;
    });

    return Buffer.concat([header, ...images.map((image) => image.png)]);
}

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const page = await browser.newPage();

async function renderPng(svg, size, transparent) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${size}" height="${size}" style="display:block"></body></html>`);
    await page.waitForFunction(() => document.images[0]?.complete);

    return page.screenshot({ omitBackground: transparent, type: 'png' });
}

mkdirSync(out('icons'), { recursive: true });

const faviconSvg = logoSvg({ padding: 0.06, background: '#ffffff', radius: 0.22 });
const plainSvg = logoSvg({});
const whiteSquareSvg = logoSvg({ padding: 0.1, background: '#ffffff' });
const maskableSvg = logoSvg({ padding: 0.22, background: '#ffffff' });

writeFileSync(out('favicon.svg'), faviconSvg);
writeFileSync(out('icons/logo.svg'), plainSvg);

const files = {
    'icons/icon-192.png': [whiteSquareSvg, 192, false],
    'icons/icon-512.png': [whiteSquareSvg, 512, false],
    'icons/icon-maskable-512.png': [maskableSvg, 512, false],
    'icons/apple-touch-icon.png': [whiteSquareSvg, 180, false],
};
for (const [path, [svg, size, transparent]] of Object.entries(files)) {
    writeFileSync(out(path), await renderPng(svg, size, transparent));
}

const icoImages = [];
for (const size of [16, 32, 48]) {
    icoImages.push({ size, png: await renderPng(faviconSvg, size, true) });
}
writeFileSync(out('favicon.ico'), buildIco(icoImages));

await browser.close();
console.log('Logo assets written to public/.');
