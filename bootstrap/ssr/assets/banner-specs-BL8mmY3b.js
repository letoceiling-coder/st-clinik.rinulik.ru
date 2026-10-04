//#region resources/js/lib/banner-specs.ts
var BANNER_SPECS = {
	banner_home: {
		slot: "home",
		aspectRatio: 21 / 9,
		outputWidth: 1680,
		outputHeight: 720,
		placementLabel: "Главная страница города",
		hint: "Формат 21:9 — широкий баннер в контейнере на главной. JPG или PNG, до 4 МБ."
	},
	banner_catalog: {
		slot: "catalog",
		aspectRatio: 5 / 2,
		outputWidth: 1200,
		outputHeight: 480,
		placementLabel: "Каталог клиник",
		hint: "Формат 5:2 — баннер над списком клиник. JPG или PNG, до 4 МБ."
	}
};
function bannerSpecForSlot(slot) {
	return slot === "home" ? BANNER_SPECS.banner_home : BANNER_SPECS.banner_catalog;
}
/** Сколько баннеров может быть в слоте по умолчанию (до настройки лимитов в админке). */
var BANNER_SLOT_CAPACITY = {
	home: 1,
	catalog: 2
};
//#endregion
export { BANNER_SPECS as n, bannerSpecForSlot as r, BANNER_SLOT_CAPACITY as t };

//# sourceMappingURL=banner-specs-BL8mmY3b.js.map