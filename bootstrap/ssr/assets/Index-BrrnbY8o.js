import { n as cx, t as clinicsWord } from "./format-BPZIj7DQ.js";
import { n as Button } from "./Button-DsM_qe4F.js";
import { c as Breadcrumbs, d as Pagination, l as EmptyState, n as useCity } from "../app.js";
import { n as ClinicCardSkeleton, t as ClinicCard } from "./ClinicCard-Cw1BZp_2.js";
import { n as useCatalog, t as CatalogLayout } from "./Catalog-cD6Bee-i.js";
import { t as YandexMap } from "./YandexMap-DUj215Hk.js";
import { usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
//#region resources/js/pages/Clinics/Index.tsx
function ClinicsIndex({ clinics, map_clinics, filters, options, service_name, breadcrumbs }) {
	const city = useCity();
	const { seo } = usePage().props;
	const cat = useCatalog(filters);
	const [mapOpen, setMapOpen] = useState(false);
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
			children: [map_clinics.length > 0 ? /* @__PURE__ */ jsxs("section", {
				className: cx("catalog__map card", mapOpen && "catalog__map--open"),
				"aria-labelledby": "catalog-map-h",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "catalog__map-head",
					children: [/* @__PURE__ */ jsx("h2", {
						id: "catalog-map-h",
						className: "catalog__map-title",
						children: "На карте"
					}), /* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "outline",
						size: "sm",
						className: "catalog__map-toggle",
						onClick: () => setMapOpen((open) => !open),
						"aria-expanded": mapOpen,
						"aria-controls": "catalog-map-body",
						children: mapOpen ? "Скрыть карту" : "Показать карту"
					})]
				}), /* @__PURE__ */ jsx("div", {
					id: "catalog-map-body",
					className: cx("catalog__map-body", !mapOpen && "catalog__map-body--collapsed"),
					children: /* @__PURE__ */ jsx("div", {
						className: "catalog__map-viewport",
						children: /* @__PURE__ */ jsx(YandexMap, {
							points: map_clinics,
							className: "catalog__map-frame"
						})
					})
				})]
			}) : null, cat.loading ? /* @__PURE__ */ jsx("div", {
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
			}), /* @__PURE__ */ jsx(Pagination, { page: clinics })] })]
		})
	] });
}
//#endregion
export { ClinicsIndex as default };

//# sourceMappingURL=Index-BrrnbY8o.js.map