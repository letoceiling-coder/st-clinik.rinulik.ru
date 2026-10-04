export type BannerSlot = 'home' | 'catalog';

export type BannerProductCode = 'banner_home' | 'banner_catalog';

export interface BannerSpec {
    slot: BannerSlot;
    aspectRatio: number;
    outputWidth: number;
    outputHeight: number;
    placementLabel: string;
    hint: string;
}

export const BANNER_SPECS: Record<BannerProductCode, BannerSpec> = {
    banner_home: {
        slot: 'home',
        aspectRatio: 21 / 9,
        outputWidth: 1680,
        outputHeight: 720,
        placementLabel: 'Главная страница города',
        hint: 'Формат 21:9 — широкий баннер в контейнере на главной. JPG или PNG, до 4 МБ.',
    },
    banner_catalog: {
        slot: 'catalog',
        aspectRatio: 5 / 2,
        outputWidth: 1200,
        outputHeight: 480,
        placementLabel: 'Каталог клиник',
        hint: 'Формат 5:2 — баннер над списком клиник. JPG или PNG, до 4 МБ.',
    },
};

export function bannerSpecForCode(code: string): BannerSpec | null {
    if (code === 'banner_home' || code === 'banner_catalog') {
        return BANNER_SPECS[code];
    }

    return null;
}

export function bannerSpecForSlot(slot: BannerSlot): BannerSpec {
    return slot === 'home' ? BANNER_SPECS.banner_home : BANNER_SPECS.banner_catalog;
}

/** Сколько баннеров может быть в слоте по умолчанию (до настройки лимитов в админке). */
export const BANNER_SLOT_CAPACITY: Record<BannerSlot, number> = {
    home: 1,
    catalog: 2,
};
