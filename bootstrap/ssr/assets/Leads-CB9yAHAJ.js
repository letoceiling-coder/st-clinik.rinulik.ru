import { n as Button } from "./Button-D4s3iLUi.js";
import { b as SelectField, l as EmptyState } from "../app.js";
import { a as StatusBadge, i as PagerSafe, o as Table, r as PageHead, t as FilterBar } from "./Dash-CaoYUPpG.js";
import { Link, router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Account/Leads.tsx
function Leads({ leads, statuses, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Заявки и записи",
				text: "Статус обновляет клиника. Мы не храним диагнозы и меддокументы."
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
			leads.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
				title: "Заявок нет",
				text: "Отправьте заявку со страницы клиники или врача."
			}) : /* @__PURE__ */ jsx(Table, {
				headers: [
					"Клиника",
					"Когда",
					"Статус",
					""
				],
				children: leads.data.map((l) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [l.clinic ? /* @__PURE__ */ jsx(Link, {
						href: `/clinics/${l.clinic.slug}`,
						className: "link",
						children: l.clinic.name
					}) : "—", /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: l.doctor?.name ?? l.service ?? l.clinic?.address
					})] }),
					/* @__PURE__ */ jsx("td", { children: [l.preferred_date, l.preferred_time].filter(Boolean).join(" ") || l.created_at }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StatusBadge, { status: l.status }) }),
					/* @__PURE__ */ jsxs("td", {
						className: "actions",
						children: [l.can_cancel ? /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => router.post(`/account/leads/${l.id}/cancel`),
							children: "Отменить"
						}) : null, l.can_review && l.clinic ? /* @__PURE__ */ jsx(Link, {
							href: `/clinics/${l.clinic.slug}#reviews`,
							className: "link text-sm",
							children: "Отзыв"
						}) : null]
					})
				] }, l.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: leads })
		]
	});
}
//#endregion
export { Leads as default };

//# sourceMappingURL=Leads-CB9yAHAJ.js.map