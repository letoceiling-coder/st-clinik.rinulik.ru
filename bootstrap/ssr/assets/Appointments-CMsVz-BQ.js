import { S as SelectField, w as TextField, x as SearchInput, y as CitySearchField } from "../app.js";
import { c as Table, i as PagerSafe, r as PageHead, s as StatusBadge, t as FilterBar } from "./Dash-1ijSGeUC.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Appointments.tsx
function Appointments({ appointments, statuses, cities, clinics, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Записи",
				text: `Найдено: ${appointments.total}. Онлайн-запись и записи из кабинета клиник.`
			}),
			/* @__PURE__ */ jsxs(FilterBar, { children: [
				/* @__PURE__ */ jsx(SearchInput, {
					name: "q",
					defaultValue: filters.q,
					placeholder: "Пациент или телефон"
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "status",
					label: "Статус",
					defaultValue: filters.status ?? "",
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: "Все"
					}), Object.entries(statuses).map(([k, v]) => /* @__PURE__ */ jsx("option", {
						value: k,
						children: v
					}, k))]
				}),
				/* @__PURE__ */ jsx(CitySearchField, {
					cities,
					defaultValue: filters.city ?? ""
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "clinic",
					label: "Клиника",
					defaultValue: filters.clinic ?? "",
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: "Все"
					}), clinics.map((c) => /* @__PURE__ */ jsx("option", {
						value: c.id,
						children: c.name
					}, c.id))]
				}),
				/* @__PURE__ */ jsx(TextField, {
					name: "from",
					type: "date",
					label: "С",
					defaultValue: filters.from ?? ""
				}),
				/* @__PURE__ */ jsx(TextField, {
					name: "to",
					type: "date",
					label: "По",
					defaultValue: filters.to ?? ""
				})
			] }),
			appointments.data.length === 0 ? /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Записей не найдено."
			}) : /* @__PURE__ */ jsx(Table, {
				headers: [
					"Дата",
					"Пациент",
					"Клиника",
					"Врач",
					"Статус",
					"Источник"
				],
				children: appointments.data.map((a) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("td", { children: a.starts_at }),
					/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("b", { children: a.patient_name }), /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: a.patient_phone
					})] }),
					/* @__PURE__ */ jsxs("td", { children: [a.clinic ?? "—", /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: a.city
					})] }),
					/* @__PURE__ */ jsx("td", { children: a.doctor ?? "—" }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StatusBadge, {
						status: a.status,
						label: a.status_label
					}) }),
					/* @__PURE__ */ jsx("td", {
						className: "text-sm",
						children: a.source
					})
				] }, a.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: appointments })
		]
	});
}
//#endregion
export { Appointments as default };

//# sourceMappingURL=Appointments-CMsVz-BQ.js.map