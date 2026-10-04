import { c as Breadcrumbs, f as SectionHead, n as useCity } from "../app.js";
import { r as SpecialtyTile, t as ConcernChips } from "./Tiles-CdLD_ZE2.js";
import { usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Directions/Index.tsx
function DirectionsIndex({ specialties, concerns, breadcrumbs }) {
	const city = useCity();
	const { seo } = usePage().props;
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Breadcrumbs, { items: breadcrumbs }),
		/* @__PURE__ */ jsxs("header", {
			className: "container page-head",
			children: [/* @__PURE__ */ jsx("h1", { children: seo?.h1 ?? `Направления стоматологии ${city.nameIn}` }), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Выберите направление, чтобы увидеть услуги, цены и клиники, которые ими занимаются."
			})]
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section section--tight",
			"aria-labelledby": "c-h",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [/* @__PURE__ */ jsx(SectionHead, { title: /* @__PURE__ */ jsx("span", {
					id: "c-h",
					children: "С чем чаще обращаются"
				}) }), /* @__PURE__ */ jsx(ConcernChips, { concerns })]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section",
			"aria-label": "Все направления",
			children: /* @__PURE__ */ jsx("div", {
				className: "container",
				children: /* @__PURE__ */ jsx("div", {
					className: "grid grid--tiles",
					children: specialties.map((s) => /* @__PURE__ */ jsx(SpecialtyTile, { s }, s.slug))
				})
			})
		})
	] });
}
//#endregion
export { DirectionsIndex as default };

//# sourceMappingURL=Index-DayQOtsm.js.map