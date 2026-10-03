import { t as clinicsWord } from "./format-Cjg0FGVI.js";
import { n as Button } from "./Button-D4s3iLUi.js";
import { c as Breadcrumbs, d as Pagination, l as EmptyState, n as useCity } from "../app.js";
import { n as ClinicCardSkeleton, t as ClinicCard } from "./ClinicCard-DDz1EaqG.js";
import { n as useCatalog, t as CatalogLayout } from "./Catalog-BDO6w_cg.js";
import { usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Clinics/Index.tsx
function ClinicsIndex({ clinics, filters, options, service_name, breadcrumbs }) {
	const city = useCity();
	const { seo } = usePage().props;
	const cat = useCatalog(filters);
	const title = seo?.h1 ?? `Стоматологии в ${city.nameIn}`;
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Breadcrumbs, { items: breadcrumbs }),
		/* @__PURE__ */ jsxs("header", {
			className: "container page-head",
			children: [/* @__PURE__ */ jsx("h1", { children: service_name ? `${service_name} в ${city.nameIn}` : title }), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Цены указаны «от». Окончательную стоимость лечения называет врач после осмотра."
			})]
		}),
		/* @__PURE__ */ jsx(CatalogLayout, {
			...cat,
			options,
			mode: "clinics",
			total: /* @__PURE__ */ jsx("b", { children: clinics.total > 0 ? `Найдено: ${clinicsWord(clinics.total)}` : "Ничего не найдено" }),
			children: cat.loading ? /* @__PURE__ */ jsx("div", {
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
		})
	] });
}
//#endregion
export { ClinicsIndex as default };

//# sourceMappingURL=Index-BaIZEcru.js.map