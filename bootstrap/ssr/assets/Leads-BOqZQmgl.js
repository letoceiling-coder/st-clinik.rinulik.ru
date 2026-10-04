import { n as Button } from "./Button-DsM_qe4F.js";
import { b as TextArea, l as EmptyState, y as SelectField } from "../app.js";
import { i as PagerSafe, o as StatusBadge, r as PageHead, t as FilterBar } from "./Dash-BUI7tnGJ.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Leads.tsx
function Leads({ leads, statuses, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Заявки",
				text: "Не запрашивайте диагнозы и анализы через чат сервиса."
			}),
			/* @__PURE__ */ jsx(FilterBar, { children: /* @__PURE__ */ jsxs(SelectField, {
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
			}) }),
			leads.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Заявок нет" }) : /* @__PURE__ */ jsx("div", {
				className: "stack-lg",
				children: leads.data.map((l) => /* @__PURE__ */ jsx(LeadRow, {
					lead: l,
					statuses
				}, l.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: leads })
		]
	});
}
function LeadRow({ lead, statuses }) {
	const form = useForm({
		status: lead.status,
		clinic_note: lead.clinic_note ?? ""
	});
	return /* @__PURE__ */ jsxs("article", {
		className: "card stack",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "row row--between",
			children: [/* @__PURE__ */ jsxs("div", { children: [
				/* @__PURE__ */ jsx("b", { children: lead.name }),
				" · ",
				lead.phone,
				/* @__PURE__ */ jsx("div", {
					className: "text-sm text-muted",
					children: [
						lead.service,
						lead.doctor,
						lead.concern,
						lead.is_child ? "ребёнок" : null
					].filter(Boolean).join(" · ")
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "text-xs text-muted",
					children: [
						lead.preferred_date,
						" ",
						lead.preferred_time,
						" · ",
						lead.created_at
					]
				}),
				lead.comment ? /* @__PURE__ */ jsx("p", {
					className: "text-sm",
					children: lead.comment
				}) : null
			] }), /* @__PURE__ */ jsx(StatusBadge, { status: lead.status })]
		}), /* @__PURE__ */ jsxs("form", {
			className: "form-grid",
			onSubmit: (e) => {
				e.preventDefault();
				form.put(`/clinic-cabinet/leads/${lead.id}`);
			},
			children: [
				/* @__PURE__ */ jsx(SelectField, {
					label: "Статус",
					value: form.data.status,
					onChange: (e) => form.setData("status", e.target.value),
					children: Object.entries(statuses).map(([k, v]) => /* @__PURE__ */ jsx("option", {
						value: k,
						children: v
					}, k))
				}),
				/* @__PURE__ */ jsx(TextArea, {
					className: "span-2",
					label: "Заметка клиники",
					value: form.data.clinic_note,
					onChange: (e) => form.setData("clinic_note", e.target.value)
				}),
				/* @__PURE__ */ jsx(Button, {
					type: "submit",
					size: "sm",
					loading: form.processing,
					children: "Обновить"
				})
			]
		})]
	});
}
//#endregion
export { Leads as default };

//# sourceMappingURL=Leads-BOqZQmgl.js.map