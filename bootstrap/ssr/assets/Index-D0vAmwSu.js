import { n as cx, t as clinicsWord } from "./format-BP5psl3Q.js";
import { n as Button } from "./Button-C2BxTtRt.js";
import { d as EmptyState, i as useCity, p as Pagination, u as Breadcrumbs } from "../app.js";
import { n as ClinicCardSkeleton, t as ClinicCard } from "./ClinicCard-BNgGJWfR.js";
import { t as AdSlot } from "./AdSlot-CNgFa8UC.js";
import { n as useCatalog, t as CatalogLayout } from "./Catalog-CvPf56di.js";
import { t as YandexMap } from "./YandexMap-CVmtcJ5u.js";
import { usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Clinics/Index.tsx
function ClinicsIndex({ clinics, recommended_clinics, banner_catalog, map_clinics, filters, options, service_name, breadcrumbs }) {
	const city = useCity();
	const { seo } = usePage().props;
	const cat = useCatalog(filters);
	/** null — по умолчанию: карта открыта на компьютере и свёрнута на телефоне (решает CSS, без скачка вёрстки). */
	const [mapPref, setMapPref] = useState(null);
	const [isWide, setIsWide] = useState(false);
	useEffect(() => {
		const query = window.matchMedia("(min-width: 769px)");
		const sync = () => setIsWide(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);
	const mapOpen = mapPref ?? isWide;
	const title = seo?.h1 ?? `Стоматологии ${city.nameIn}`;
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Breadcrumbs, { items: breadcrumbs }),
		/* @__PURE__ */ jsxs("header", {
			className: "container page-head",
			children: [/* @__PURE__ */ jsx("h1", { children: service_name ? `${service_name} ${city.nameIn}` : title }), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Цены указаны «от». Окончательную стоимость лечения называет врач после осмотра."
			})]
		}),
		/* @__PURE__ */ jsxs(CatalogLayout, {
			...cat,
			options,
			mode: "clinics",
			total: /* @__PURE__ */ jsx("b", { children: clinics.total > 0 ? `Найдено: ${clinicsWord(clinics.total)}` : "Ничего не найдено" }),
			mapToggle: map_clinics.length > 0 ? {
				open: mapOpen,
				onToggle: () => setMapPref(!mapOpen)
			} : void 0,
			children: [
				recommended_clinics.length > 0 && !cat.loading ? /* @__PURE__ */ jsxs("section", {
					className: "recommended-block stack",
					"aria-labelledby": "recommended-h",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "recommended-block__head",
						children: [/* @__PURE__ */ jsx("h2", {
							id: "recommended-h",
							children: "Рекомендуем"
						}), /* @__PURE__ */ jsx("span", {
							className: "text-xs text-muted",
							children: "Реклама"
						})]
					}), /* @__PURE__ */ jsx("div", {
						className: "stack-lg",
						children: recommended_clinics.map((c, i) => /* @__PURE__ */ jsx(ClinicCard, {
							clinic: c,
							priority: i < 2
						}, c.id))
					})]
				}) : null,
				/* @__PURE__ */ jsx(AdSlot, {
					banners: banner_catalog,
					slot: "catalog"
				}),
				map_clinics.length > 0 ? /* @__PURE__ */ jsx("section", {
					className: cx("catalog__map", mapPref === null ? "catalog__map--auto" : mapPref ? "catalog__map--open" : "catalog__map--closed"),
					"aria-label": "Клиники на карте",
					children: /* @__PURE__ */ jsx("div", {
						id: "catalog-map-body",
						className: "catalog__map-body",
						children: /* @__PURE__ */ jsx("div", {
							className: "catalog__map-viewport",
							children: /* @__PURE__ */ jsx(YandexMap, {
								points: map_clinics,
								className: "catalog__map-frame"
							})
						})
					})
				}) : null,
				cat.loading ? /* @__PURE__ */ jsx("div", {
					className: "stack-lg",
					children: Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ jsx(ClinicCardSkeleton, {}, i))
				}) : clinics.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
					title: "По вашим условиям клиник не нашлось",
					text: "Попробуйте убрать часть фильтров или изменить район и услугу.",
					action: /* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => cat.apply({}),
						children: "Сбросить фильтры"
					})
				}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
					className: "stack-lg",
					children: clinics.data.map((c, i) => /* @__PURE__ */ jsx(ClinicCard, {
						clinic: c,
						priority: i < 2
					}, c.id))
				}), /* @__PURE__ */ jsx(Pagination, { page: clinics })] })
			]
		})
	] });
}
//#endregion
export { ClinicsIndex as default };

//# sourceMappingURL=Index-D0vAmwSu.js.map