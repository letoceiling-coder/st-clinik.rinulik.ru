import { t as CompareView } from "./CollectionViews-WYquJPOp.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Collections/Compare.tsx
function Compare() {
	return /* @__PURE__ */ jsxs("div", {
		className: "container page-head",
		style: { paddingBottom: "var(--space-12)" },
		children: [
			/* @__PURE__ */ jsx("h1", { children: "Сравнение" }),
			/* @__PURE__ */ jsx("p", {
				className: "text-muted",
				style: { marginTop: 8 },
				children: "Цены указаны «от». Итоговую стоимость называет врач после осмотра."
			}),
			/* @__PURE__ */ jsx("div", {
				style: { marginTop: 24 },
				children: /* @__PURE__ */ jsx(CompareView, {})
			})
		]
	});
}
//#endregion
export { Compare as default };

//# sourceMappingURL=Compare-Drhh8Sl1.js.map