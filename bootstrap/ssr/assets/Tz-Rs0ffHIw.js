import { r as dateRu } from "./format-BPZIj7DQ.js";
import { i as LinkButton } from "./Button-D8Mzgn6o.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Tz.tsx
function Tz({ page, demo_links = [] }) {
	return /* @__PURE__ */ jsxs("article", {
		className: "container page-head tz-page",
		style: { paddingBottom: "var(--space-16)" },
		children: [
			demo_links.length > 0 ? /* @__PURE__ */ jsx("div", {
				className: "tz-demo-links row row--wrap",
				style: {
					gap: 10,
					marginBottom: 20
				},
				children: demo_links.map((link) => /* @__PURE__ */ jsx(LinkButton, {
					href: link.href,
					variant: "dark",
					size: "sm",
					children: link.label
				}, link.href))
			}) : null,
			page.updated_at ? /* @__PURE__ */ jsxs("p", {
				className: "text-muted text-sm",
				style: { marginBottom: 16 },
				children: ["Обновлено: ", dateRu(page.updated_at)]
			}) : null,
			/* @__PURE__ */ jsx("div", {
				className: "prose prose-tz",
				dangerouslySetInnerHTML: { __html: page.html }
			})
		]
	});
}
//#endregion
export { Tz as default };

//# sourceMappingURL=Tz-Rs0ffHIw.js.map