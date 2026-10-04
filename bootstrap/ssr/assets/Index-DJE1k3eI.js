import { t as Icon } from "./Icon-DQahs-u2.js";
import { f as SectionHead, l as EmptyState, n as useCity, r as SearchBox } from "../app.js";
import { t as ClinicCard } from "./ClinicCard-ChPAtBVA.js";
import { t as DoctorCard } from "./DoctorCard-DD2yuAuy.js";
import { t as ConcernChips } from "./Tiles-_iQru-fi.js";
import { Link } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Search/Index.tsx
function SearchIndex({ q, results, concerns }) {
	const city = useCity();
	const quick = results ? [
		...results.concerns,
		...results.services,
		...results.specialties,
		...results.cities
	] : [];
	const nothing = results && !quick.length && !results.clinic_cards?.length && !results.doctor_cards?.length;
	return /* @__PURE__ */ jsxs("div", {
		className: "container page-head",
		children: [
			/* @__PURE__ */ jsx("h1", { children: q ? `Результаты поиска: «${q}»` : "Поиск" }),
			/* @__PURE__ */ jsx("div", {
				style: {
					maxWidth: 720,
					margin: "20px 0 32px"
				},
				children: /* @__PURE__ */ jsx(SearchBox, { variant: "hero" })
			}),
			!results ? /* @__PURE__ */ jsxs("section", { children: [/* @__PURE__ */ jsx(SectionHead, { title: "С чем чаще обращаются" }), /* @__PURE__ */ jsx(ConcernChips, { concerns })] }) : nothing ? /* @__PURE__ */ jsx(EmptyState, {
				title: "Ничего не найдено",
				text: /* @__PURE__ */ jsxs(Fragment, { children: [
					"Проверьте написание или выберите готовый запрос. Мы ищем ",
					city.nameIn,
					" по клиникам, врачам, услугам и симптомам."
				] }),
				action: /* @__PURE__ */ jsx(ConcernChips, {
					concerns,
					scroll: false
				})
			}) : /* @__PURE__ */ jsxs("div", {
				className: "stack-lg",
				style: { paddingBottom: "var(--space-12)" },
				children: [
					quick.length > 0 ? /* @__PURE__ */ jsx("section", {
						"aria-label": "Быстрые переходы",
						children: /* @__PURE__ */ jsx("ul", {
							className: "hit-list",
							children: quick.map((h) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
								href: h.url,
								className: "hit card card--link",
								children: [
									/* @__PURE__ */ jsx("b", { children: h.name }),
									h.hint ? /* @__PURE__ */ jsx("span", {
										className: "text-sm text-muted",
										children: h.hint
									}) : null,
									/* @__PURE__ */ jsx(Icon, {
										name: "arrow-right",
										size: 18
									})
								]
							}) }, h.url))
						})
					}) : null,
					results.clinic_cards?.length ? /* @__PURE__ */ jsxs("section", {
						"aria-labelledby": "s-clinics",
						children: [
							/* @__PURE__ */ jsx(SectionHead, {
								title: /* @__PURE__ */ jsx("span", {
									id: "s-clinics",
									children: "Клиники"
								}),
								text: results.clinic_total ? `Найдено: ${results.clinic_total}` : void 0
							}),
							/* @__PURE__ */ jsx("div", {
								className: "stack-lg",
								children: results.clinic_cards.map((c) => /* @__PURE__ */ jsx(ClinicCard, { clinic: c }, c.id))
							}),
							results.clinic_total && results.clinic_total > results.clinic_cards.length ? /* @__PURE__ */ jsx("p", {
								style: { marginTop: 16 },
								children: /* @__PURE__ */ jsxs(Link, {
									href: city.path("clinics", { q }),
									className: "link-arrow",
									children: ["Показать все клиники ", /* @__PURE__ */ jsx(Icon, {
										name: "arrow-right",
										size: 18
									})]
								})
							}) : null
						]
					}) : null,
					results.doctor_cards?.length ? /* @__PURE__ */ jsxs("section", {
						"aria-labelledby": "s-doctors",
						children: [/* @__PURE__ */ jsx(SectionHead, { title: /* @__PURE__ */ jsx("span", {
							id: "s-doctors",
							children: "Врачи"
						}) }), /* @__PURE__ */ jsx("div", {
							className: "grid grid--doctors",
							children: results.doctor_cards.map((d) => /* @__PURE__ */ jsx(DoctorCard, { doctor: d }, d.id))
						})]
					}) : null
				]
			})
		]
	});
}
//#endregion
export { SearchIndex as default };

//# sourceMappingURL=Index-DJE1k3eI.js.map