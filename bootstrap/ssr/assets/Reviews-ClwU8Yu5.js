import { n as Button } from "./Button-C2BxTtRt.js";
import { C as TextArea, S as SelectField, d as EmptyState, g as Stars } from "../app.js";
import { i as PagerSafe, r as PageHead, s as StatusBadge, t as FilterBar } from "./Dash-BqP8YCar.js";
import { useForm } from "@inertiajs/react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Reviews.tsx
function Reviews({ reviews, reasons, filters }) {
	const [open, setOpen] = useState(null);
	const reply = useForm({ reply_text: "" });
	const complain = useForm({
		reason: Object.keys(reasons)[0] ?? "",
		comment: ""
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Отзывы",
				text: "Отвечайте вежливо. Жалоба не снимает отзыв до решения модератора."
			}),
			/* @__PURE__ */ jsx(FilterBar, { children: /* @__PURE__ */ jsxs(SelectField, {
				name: "filter",
				label: "Фильтр",
				defaultValue: filters.filter ?? "",
				children: [/* @__PURE__ */ jsx("option", {
					value: "",
					children: "Все"
				}), /* @__PURE__ */ jsx("option", {
					value: "unanswered",
					children: "Без ответа"
				})]
			}) }),
			reviews.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Отзывов нет" }) : reviews.data.map((r) => {
				const replyPublished = Boolean(r.reply && (r.reply_status === "published" || r.reply_status === null));
				const canReply = r.status === "published" && !replyPublished && r.reply_status !== "pending";
				return /* @__PURE__ */ jsxs("article", {
					className: "card stack",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "row row--between",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: r.author_name }), /* @__PURE__ */ jsxs("div", {
								className: "text-xs text-muted",
								children: [
									r.created_at,
									" · ",
									r.doctor ?? r.service ?? "клиника"
								]
							})] }), /* @__PURE__ */ jsx(StatusBadge, { status: r.status })]
						}),
						/* @__PURE__ */ jsx(Stars, { value: r.rating }),
						/* @__PURE__ */ jsx("p", { children: r.body }),
						replyPublished ? /* @__PURE__ */ jsx("p", {
							className: "review-reply",
							children: r.reply
						}) : null,
						r.reply_status === "pending" && r.reply ? /* @__PURE__ */ jsxs("p", {
							className: "text-sm text-muted",
							children: ["Ответ на модерации: ", r.reply]
						}) : null,
						r.reply_status === "rejected" ? /* @__PURE__ */ jsxs("p", {
							className: "text-sm text-danger",
							children: ["Ответ отклонён: ", r.reply_moderation_note ?? "исправьте текст и отправьте снова."]
						}) : null,
						canReply ? /* @__PURE__ */ jsxs("form", {
							className: "stack",
							onSubmit: (e) => {
								e.preventDefault();
								reply.post(`/clinic-cabinet/reviews/${r.id}/reply`, { onSuccess: () => reply.reset() });
							},
							children: [/* @__PURE__ */ jsx(TextArea, {
								label: "Ответ клиники",
								value: reply.data.reply_text,
								maxLength: 1e3,
								onChange: (e) => reply.setData("reply_text", e.target.value),
								error: reply.errors.reply_text
							}), /* @__PURE__ */ jsx(Button, {
								type: "submit",
								size: "sm",
								loading: reply.processing,
								children: r.reply_status === "rejected" ? "Отправить снова" : "Опубликовать ответ"
							})]
						}) : null,
						r.complaint ? /* @__PURE__ */ jsxs("p", {
							className: "text-sm text-muted",
							children: ["Жалоба: ", r.complaint.status]
						}) : /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => setOpen(open === r.id ? null : r.id),
							children: "Пожаловаться"
						}),
						open === r.id ? /* @__PURE__ */ jsxs("form", {
							className: "stack",
							onSubmit: (e) => {
								e.preventDefault();
								complain.post(`/clinic-cabinet/reviews/${r.id}/complaint`, { onSuccess: () => setOpen(null) });
							},
							children: [
								/* @__PURE__ */ jsx(SelectField, {
									label: "Причина",
									value: complain.data.reason,
									onChange: (e) => complain.setData("reason", e.target.value),
									children: Object.entries(reasons).map(([k, v]) => /* @__PURE__ */ jsx("option", {
										value: k,
										children: v
									}, k))
								}),
								/* @__PURE__ */ jsx(TextArea, {
									label: "Комментарий",
									value: complain.data.comment,
									maxLength: 500,
									onChange: (e) => complain.setData("comment", e.target.value),
									error: complain.errors.comment
								}),
								/* @__PURE__ */ jsx(Button, {
									type: "submit",
									size: "sm",
									variant: "dark",
									loading: complain.processing,
									children: "Отправить жалобу"
								})
							]
						}) : null
					]
				}, r.id);
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: reviews })
		]
	});
}
//#endregion
export { Reviews as default };

//# sourceMappingURL=Reviews-ClwU8Yu5.js.map