import { C as SelectField } from "../app.js";
import { c as Table, i as PagerSafe, r as PageHead, t as FilterBar } from "./Dash-C8plSzIc.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Audit.tsx
function Audit({ logs, sections, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, { title: "Журнал аудита" }),
			/* @__PURE__ */ jsx(FilterBar, { children: /* @__PURE__ */ jsxs(SelectField, {
				name: "section",
				label: "Раздел",
				defaultValue: filters.section ?? "",
				children: [/* @__PURE__ */ jsx("option", {
					value: "",
					children: "Все разделы"
				}), Object.entries(sections).map(([key, label]) => /* @__PURE__ */ jsx("option", {
					value: key,
					children: label
				}, key))]
			}) }),
			/* @__PURE__ */ jsx(Table, {
				headers: [
					"Когда",
					"Кто",
					"Действие",
					"Результат",
					"Объект"
				],
				children: logs.data.map((l) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("td", { children: l.at }),
					/* @__PURE__ */ jsxs("td", { children: [l.user, /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: l.ip
					})] }),
					/* @__PURE__ */ jsx("td", { children: l.action }),
					/* @__PURE__ */ jsx("td", { children: l.result ?? "—" }),
					/* @__PURE__ */ jsxs("td", { children: [l.subject ?? "—", l.meta ? /* @__PURE__ */ jsxs("details", {
						className: "text-xs text-muted",
						children: [/* @__PURE__ */ jsx("summary", { children: "Подробности" }), /* @__PURE__ */ jsx("code", {
							style: { overflowWrap: "anywhere" },
							children: JSON.stringify(l.meta)
						})]
					}) : null] })
				] }, l.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: logs })
		]
	});
}
//#endregion
export { Audit as default };

//# sourceMappingURL=Audit-DkAcbx4_.js.map