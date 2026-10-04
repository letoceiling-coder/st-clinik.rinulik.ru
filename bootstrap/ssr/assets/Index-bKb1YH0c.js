import { i as doctorsWord } from "./format-BPZIj7DQ.js";
import { n as Button } from "./Button-D8Mzgn6o.js";
import { c as Breadcrumbs, d as Pagination, l as EmptyState, n as useCity, p as Skeleton } from "../app.js";
import { t as DoctorCard } from "./DoctorCard-DD2yuAuy.js";
import { n as useCatalog, t as CatalogLayout } from "./Catalog-BYgW9g69.js";
import { usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Doctors/Index.tsx
function DoctorsIndex({ doctors, filters, options, breadcrumbs }) {
	const city = useCity();
	const { seo } = usePage().props;
	const cat = useCatalog(filters);
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Breadcrumbs, { items: breadcrumbs }),
		/* @__PURE__ */ jsxs("header", {
			className: "container page-head",
			children: [/* @__PURE__ */ jsx("h1", { children: seo?.h1 ?? `Стоматологи ${city.nameIn}` }), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Стаж, рейтинг и отзывы пациентов. Стоимость приёма — «от», точную цену называет клиника."
			})]
		}),
		/* @__PURE__ */ jsx(CatalogLayout, {
			...cat,
			options,
			mode: "doctors",
			total: /* @__PURE__ */ jsx("b", { children: doctors.total > 0 ? `Найдено: ${doctorsWord(doctors.total)}` : "Ничего не найдено" }),
			children: cat.loading ? /* @__PURE__ */ jsx("div", {
				className: "grid grid--doctors grid--2",
				children: Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, {
					h: 220,
					r: 20
				}, i))
			}) : doctors.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
				title: "Врачей по таким условиям нет",
				text: "Измените направление или уберите часть фильтров.",
				action: /* @__PURE__ */ jsx(Button, {
					variant: "outline",
					onClick: () => cat.apply({}),
					children: "Сбросить фильтры"
				})
			}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
				className: "grid grid--doctors grid--2",
				children: doctors.data.map((d) => /* @__PURE__ */ jsx(DoctorCard, { doctor: d }, d.id))
			}), /* @__PURE__ */ jsx(Pagination, { page: doctors })] })
		})
	] });
}
//#endregion
export { DoctorsIndex as default };

//# sourceMappingURL=Index-bKb1YH0c.js.map