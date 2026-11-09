import { c as phoneHref } from "./format-BP5psl3Q.js";
import { n as Button } from "./Button-C2BxTtRt.js";
import { D as SearchInput, O as SelectField, T as CitySearchField, p as Alert } from "../app.js";
import { c as Table, i as PagerSafe, r as PageHead, s as StatusBadge, t as FilterBar } from "./Dash-C_HMp027.js";
import { router } from "@inertiajs/react";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/UnclaimedLeads.tsx
function LeadActions({ lead, statuses }) {
	const [status, setStatus] = useState(lead.status);
	const [note, setNote] = useState(lead.note ?? "");
	const [saving, setSaving] = useState(false);
	const dirty = status !== lead.status || note !== (lead.note ?? "");
	return /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [
			/* @__PURE__ */ jsx("select", {
				className: "select select--sm",
				"aria-label": "Статус заявки",
				value: status,
				onChange: (e) => setStatus(e.target.value),
				children: Object.entries(statuses).map(([k, v]) => /* @__PURE__ */ jsx("option", {
					value: k,
					children: v
				}, k))
			}),
			/* @__PURE__ */ jsx("input", {
				className: "input input--sm",
				"aria-label": "Заметка",
				placeholder: "Заметка: с кем говорили, что решили",
				maxLength: 500,
				value: note,
				onChange: (e) => setNote(e.target.value)
			}),
			/* @__PURE__ */ jsx(Button, {
				size: "sm",
				variant: "outline",
				disabled: !dirty,
				loading: saving,
				onClick: () => router.put(`/admin/leads/unclaimed/${lead.id}`, {
					status,
					note
				}, {
					preserveScroll: true,
					onStart: () => setSaving(true),
					onFinish: () => setSaving(false)
				}),
				children: "Сохранить"
			})
		]
	});
}
function UnclaimedLeads({ leads, statuses, active_count, cities, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Заявки без владельца",
				text: `В работе: ${active_count}. Пациенты оставили заявки в клиники, у которых ещё нет кабинета.`
			}),
			/* @__PURE__ */ jsx(Alert, {
				tone: "info",
				icon: "info",
				children: "Позвоните в клинику по номеру из карточки и передайте заявку, затем перезвоните пациенту. Это хороший повод предложить клинике забрать карточку: заявки сразу появятся у неё в кабинете."
			}),
			/* @__PURE__ */ jsxs(FilterBar, { children: [
				/* @__PURE__ */ jsx(SearchInput, {
					name: "q",
					defaultValue: filters.q,
					placeholder: "Пациент, телефон или клиника"
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "status",
					label: "Статус",
					defaultValue: filters.status ?? "active",
					children: [
						/* @__PURE__ */ jsx("option", {
							value: "active",
							children: "В работе"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "all",
							children: "Все"
						}),
						Object.entries(statuses).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))
					]
				}),
				/* @__PURE__ */ jsx(CitySearchField, {
					cities,
					defaultValue: filters.city ?? ""
				})
			] }),
			leads.data.length === 0 ? /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Заявок не найдено."
			}) : /* @__PURE__ */ jsx(Table, {
				headers: [
					"Дата",
					"Пациент",
					"Клиника",
					"Запрос",
					"Статус",
					"Действия"
				],
				children: leads.data.map((lead) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("td", { children: lead.created_at }),
					/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("b", { children: lead.name }), /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("a", {
						className: "link",
						href: phoneHref(lead.phone),
						children: lead.phone
					}) })] }),
					/* @__PURE__ */ jsx("td", { children: lead.clinic ? /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsx("a", {
							className: "link",
							href: `/clinics/${lead.clinic.slug}`,
							target: "_blank",
							rel: "noopener",
							children: lead.clinic.name
						}),
						/* @__PURE__ */ jsx("div", {
							className: "text-xs text-muted",
							children: lead.clinic.city
						}),
						lead.clinic.phone ? /* @__PURE__ */ jsx("a", {
							className: "text-xs link",
							href: phoneHref(lead.clinic.phone),
							children: lead.clinic.phone
						}) : null
					] }) : "—" }),
					/* @__PURE__ */ jsxs("td", {
						className: "text-sm",
						children: [
							lead.service ?? "Консультация",
							lead.preferred ? /* @__PURE__ */ jsxs("div", {
								className: "text-xs text-muted",
								children: ["Удобно: ", lead.preferred]
							}) : null,
							lead.comment ? /* @__PURE__ */ jsx("div", {
								className: "text-xs text-muted",
								children: lead.comment
							}) : null
						]
					}),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StatusBadge, {
						status: lead.status,
						label: lead.status_label
					}) }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(LeadActions, {
						lead,
						statuses
					}) })
				] }, lead.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: leads })
		]
	});
}
//#endregion
export { UnclaimedLeads as default };

//# sourceMappingURL=UnclaimedLeads-BRZwdq19.js.map