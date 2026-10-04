import { i as LinkButton } from "./Button-DsM_qe4F.js";
import { _ as CitySearchField, v as SearchInput, y as SelectField } from "../app.js";
import { a as STATUS, i as PagerSafe, o as StatusBadge, r as PageHead, s as Table, t as FilterBar } from "./Dash-BUI7tnGJ.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Clinics.tsx
function Clinics({ clinics, cities, statuses, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Клиники",
				text: `Найдено: ${clinics.total}`
			}),
			/* @__PURE__ */ jsxs(FilterBar, { children: [
				/* @__PURE__ */ jsx(SearchInput, {
					name: "q",
					defaultValue: filters.q,
					placeholder: "Название или адрес"
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "status",
					label: "Статус",
					defaultValue: filters.status ?? "",
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: "Все"
					}), statuses.map((s) => /* @__PURE__ */ jsx("option", {
						value: s,
						children: STATUS[s]?.label ?? s
					}, s))]
				}),
				/* @__PURE__ */ jsx(CitySearchField, {
					cities,
					defaultValue: filters.city ?? ""
				})
			] }),
			clinics.data.length === 0 ? /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Клиники не найдены. Измените фильтры или поисковый запрос."
			}) : /* @__PURE__ */ jsx(Table, {
				headers: [
					"Клиника",
					"Город",
					"Организация",
					"Статус",
					"Рейтинг",
					"Профиль",
					""
				],
				children: clinics.data.map((c) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("b", { children: c.name }), /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: c.address
					})] }),
					/* @__PURE__ */ jsx("td", { children: c.city ?? "—" }),
					/* @__PURE__ */ jsx("td", {
						className: "text-sm",
						children: c.organization ?? "—"
					}),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("div", {
						className: "table-cell-content",
						children: [/* @__PURE__ */ jsx(StatusBadge, { status: c.status }), c.is_verified ? /* @__PURE__ */ jsx("span", {
							className: "text-xs text-muted",
							children: "Проверена"
						}) : null]
					}) }),
					/* @__PURE__ */ jsxs("td", { children: [c.rating > 0 ? c.rating.toFixed(1) : "—", /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted",
						children: [c.reviews_count, " отз."]
					})] }),
					/* @__PURE__ */ jsxs("td", { children: [c.completeness, "%"] }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(LinkButton, {
						href: `/admin/clinics/${c.id}`,
						size: "sm",
						variant: "outline",
						children: "Открыть"
					}) })
				] }, c.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: clinics })
		]
	});
}
//#endregion
export { Clinics as default };

//# sourceMappingURL=Clinics-CzPfYQnr.js.map