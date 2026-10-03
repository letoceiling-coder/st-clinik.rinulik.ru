//#region resources/js/lib/format.ts
var nbsp = "\xA0";
function money(value) {
	if (value === null || value === void 0) return "";
	return new Intl.NumberFormat("ru-RU").format(value).replace(/\s/g, nbsp) + "\xA0₽";
}
function priceFrom(value, fallback = "по запросу") {
	if (!value) return fallback;
	return "от\xA0" + money(value);
}
function plural(n, forms) {
	const abs = Math.abs(n) % 100;
	const last = abs % 10;
	if (abs > 10 && abs < 20) return forms[2];
	if (last > 1 && last < 5) return forms[1];
	if (last === 1) return forms[0];
	return forms[2];
}
var reviewsWord = (n) => `${n}${nbsp}${plural(n, [
	"отзыв",
	"отзыва",
	"отзывов"
])}`;
var doctorsWord = (n) => `${n}${nbsp}${plural(n, [
	"врач",
	"врача",
	"врачей"
])}`;
var clinicsWord = (n) => `${n}${nbsp}${plural(n, [
	"клиника",
	"клиники",
	"клиник"
])}`;
var yearsWord = (n) => `${n}${nbsp}${plural(n, [
	"год",
	"года",
	"лет"
])}`;
var months = [
	"января",
	"февраля",
	"марта",
	"апреля",
	"мая",
	"июня",
	"июля",
	"августа",
	"сентября",
	"октября",
	"ноября",
	"декабря"
];
function dateRu(iso, withYear = true) {
	if (!iso) return "";
	const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) return iso;
	return `${d} ${months[m - 1]}${withYear ? " " + y : ""}`;
}
function initials(name) {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
function cx(...parts) {
	return parts.filter(Boolean).join(" ");
}
function phoneHref(phone) {
	return "tel:" + (phone ?? "").replace(/[^\d+]/g, "");
}
//#endregion
export { initials as a, priceFrom as c, doctorsWord as i, reviewsWord as l, cx as n, money as o, dateRu as r, phoneHref as s, clinicsWord as t, yearsWord as u };

//# sourceMappingURL=format-Cjg0FGVI.js.map