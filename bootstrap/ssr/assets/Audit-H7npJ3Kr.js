import { v as SearchInput } from "../app.js";
import { i as PagerSafe, r as PageHead, s as Table, t as FilterBar } from "./Dash-BbiOlhfn.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Audit.tsx
function Audit({ logs, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, { title: "Журнал аудита" }),
			/* @__PURE__ */ jsx(FilterBar, { children: /* @__PURE__ */ jsx(SearchInput, {
				name: "action",
				defaultValue: filters.action,
				placeholder: "Действие, например clinic."
			}) }),
			/* @__PURE__ */ jsx(Table, {
				headers: [
					"Когда",
					"Кто",
					"Действие",
					"Объект"
				],
				children: logs.data.map((l) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("td", { children: l.at }),
					/* @__PURE__ */ jsxs("td", { children: [l.user, /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: l.ip
					})] }),
					/* @__PURE__ */ jsx("td", { children: l.action }),
					/* @__PURE__ */ jsxs("td", { children: [l.subject ?? "—", l.meta ? /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: JSON.stringify(l.meta)
					}) : null] })
				] }, l.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: logs })
		]
	});
}
//#endregion
export { Audit as default };

//# sourceMappingURL=Audit-H7npJ3Kr.js.map