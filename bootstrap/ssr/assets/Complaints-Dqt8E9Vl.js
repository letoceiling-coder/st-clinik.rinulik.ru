import { n as Button } from "./Button-DsM_qe4F.js";
import { x as SelectField } from "../app.js";
import { a as StatusBadge, i as PagerSafe, r as PageHead, t as FilterBar } from "./Dash-C-3tSNHh.js";
import { router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Complaints.tsx
function Complaints({ complaints, filters }) {
	const decide = (id, decision) => {
		const resolution = prompt("Резолюция:") ?? "";
		router.post(`/admin/complaints/${id}/resolve`, {
			decision,
			resolution
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, { title: "Жалобы на отзывы" }),
			/* @__PURE__ */ jsx(FilterBar, { children: /* @__PURE__ */ jsxs(SelectField, {
				name: "status",
				label: "Статус",
				defaultValue: filters.status,
				children: [
					/* @__PURE__ */ jsx("option", {
						value: "open",
						children: "Открытые"
					}),
					/* @__PURE__ */ jsx("option", {
						value: "upheld",
						children: "Подтверждённые"
					}),
					/* @__PURE__ */ jsx("option", {
						value: "rejected",
						children: "Отклонённые"
					}),
					/* @__PURE__ */ jsx("option", {
						value: "all",
						children: "Все"
					})
				]
			}) }),
			complaints.data.map((c) => /* @__PURE__ */ jsxs("article", {
				className: "card stack",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "row row--between",
						children: [/* @__PURE__ */ jsx("b", { children: c.reason }), /* @__PURE__ */ jsx(StatusBadge, { status: c.status })]
					}),
					/* @__PURE__ */ jsx("p", { children: c.comment }),
					/* @__PURE__ */ jsxs("p", {
						className: "text-sm text-muted",
						children: [
							c.reporter,
							" (",
							c.reporter_role,
							") · ",
							c.created_at
						]
					}),
					c.review ? /* @__PURE__ */ jsxs("blockquote", {
						className: "card card--muted",
						children: [
							c.review.author,
							" · ",
							c.review.clinic,
							/* @__PURE__ */ jsx("br", {}),
							c.review.body
						]
					}) : null,
					c.status === "open" ? /* @__PURE__ */ jsxs("div", {
						className: "row",
						children: [/* @__PURE__ */ jsx(Button, {
							size: "sm",
							onClick: () => decide(c.id, "uphold"),
							children: "Скрыть отзыв"
						}), /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "secondary",
							onClick: () => decide(c.id, "reject"),
							children: "Оставить отзыв"
						})]
					}) : /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: c.resolution
					})
				]
			}, c.id)),
			/* @__PURE__ */ jsx(PagerSafe, { page: complaints })
		]
	});
}
//#endregion
export { Complaints as default };

//# sourceMappingURL=Complaints-Dqt8E9Vl.js.map