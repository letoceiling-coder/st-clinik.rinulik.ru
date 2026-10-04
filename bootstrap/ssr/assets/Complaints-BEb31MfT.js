import { n as Button } from "./Button-DsM_qe4F.js";
import { y as SelectField } from "../app.js";
import { i as PagerSafe, o as StatusBadge, r as PageHead, t as FilterBar } from "./Dash-BUI7tnGJ.js";
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
				className: "card stack complaint-card",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "row row--between row--wrap complaint-card__head",
						children: [/* @__PURE__ */ jsx("b", {
							className: "complaint-card__reason",
							children: c.reason
						}), /* @__PURE__ */ jsx(StatusBadge, { status: c.status })]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "complaint-card__comment",
						children: c.comment
					}),
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
						className: "card card--muted complaint-card__review",
						children: [
							c.review.author,
							" · ",
							c.review.clinic,
							/* @__PURE__ */ jsx("br", {}),
							c.review.body
						]
					}) : null,
					c.status === "open" ? /* @__PURE__ */ jsxs("div", {
						className: "row card-actions",
						children: [/* @__PURE__ */ jsx(Button, {
							size: "sm",
							block: true,
							className: "card-actions__btn",
							onClick: () => decide(c.id, "uphold"),
							children: "Скрыть отзыв"
						}), /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "secondary",
							block: true,
							className: "card-actions__btn",
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

//# sourceMappingURL=Complaints-BEb31MfT.js.map