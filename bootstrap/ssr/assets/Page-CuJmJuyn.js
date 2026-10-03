import { r as dateRu } from "./format-Cjg0FGVI.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Page.tsx
function Page({ page }) {
	return /* @__PURE__ */ jsxs("article", {
		className: "container page-head",
		style: { paddingBottom: "var(--space-16)" },
		children: [
			/* @__PURE__ */ jsx("h1", { children: page.title }),
			page.updated_at ? /* @__PURE__ */ jsxs("p", {
				className: "text-muted text-sm",
				style: { marginTop: 8 },
				children: ["Обновлено: ", dateRu(page.updated_at)]
			}) : null,
			/* @__PURE__ */ jsx("div", {
				className: "prose",
				style: { marginTop: 24 },
				dangerouslySetInnerHTML: { __html: page.html }
			})
		]
	});
}
//#endregion
export { Page as default };

//# sourceMappingURL=Page-CuJmJuyn.js.map