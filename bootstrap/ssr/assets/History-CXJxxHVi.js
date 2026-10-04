import { n as Button } from "./Button-DsM_qe4F.js";
import { l as EmptyState } from "../app.js";
import { r as PageHead } from "./Dash-C-3tSNHh.js";
import { Link, router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Account/History.tsx
function History({ entries }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [/* @__PURE__ */ jsx(PageHead, {
			title: "История просмотров",
			text: "Последние клиники, врачи и поисковые запросы.",
			action: entries.length ? /* @__PURE__ */ jsx(Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => router.delete("/account/history"),
				children: "Очистить"
			}) : null
		}), entries.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "История пуста" }) : /* @__PURE__ */ jsx("ul", {
			className: "stack",
			children: entries.map((e) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
				href: e.url,
				className: "card card--link",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "text-xs text-muted",
						children: [
							e.kind,
							" · ",
							e.at
						]
					}),
					/* @__PURE__ */ jsx("b", { children: e.label }),
					e.sub ? /* @__PURE__ */ jsx("div", {
						className: "text-sm text-muted",
						children: e.sub
					}) : null
				]
			}) }, e.id))
		})]
	});
}
//#endregion
export { History as default };

//# sourceMappingURL=History-CXJxxHVi.js.map