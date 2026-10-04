import { n as Button } from "./Button-DsM_qe4F.js";
import { b as TextArea, l as EmptyState, m as Stars, x as TextField } from "../app.js";
import { o as StatusBadge, r as PageHead } from "./Dash-BUI7tnGJ.js";
import { Link, router, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
//#region resources/js/pages/Account/Reviews.tsx
function Reviews({ reviews }) {
	const [edit, setEdit] = useState(null);
	const form = useForm({
		rating: 5,
		title: "",
		body: ""
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [/* @__PURE__ */ jsx(PageHead, {
			title: "Мои отзывы",
			text: "Опубликованный отзыв нельзя править — только удалить и написать новый. Без диагнозов и персональных данных."
		}), reviews.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Вы ещё не оставляли отзывов" }) : reviews.map((r) => /* @__PURE__ */ jsxs("article", {
			className: "card stack",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsxs("div", { children: [r.clinic ? /* @__PURE__ */ jsx(Link, {
						href: `/clinics/${r.clinic.slug}`,
						className: "link",
						children: r.clinic.name
					}) : null, /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted",
						children: [r.created_at, r.is_verified_visit ? " · подтверждённый визит" : ""]
					})] }), /* @__PURE__ */ jsx(StatusBadge, { status: r.status })]
				}),
				/* @__PURE__ */ jsx(Stars, { value: r.rating }),
				r.title ? /* @__PURE__ */ jsx("b", { children: r.title }) : null,
				/* @__PURE__ */ jsx("p", { children: r.body }),
				r.moderation_note ? /* @__PURE__ */ jsxs("p", {
					className: "text-sm text-muted",
					children: ["Комментарий модератора: ", r.moderation_note]
				}) : null,
				r.reply ? /* @__PURE__ */ jsxs("p", {
					className: "review-reply",
					children: ["Ответ клиники: ", r.reply]
				}) : null,
				/* @__PURE__ */ jsxs("div", {
					className: "row",
					children: [["pending", "rejected"].includes(r.status) ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "secondary",
						onClick: () => {
							setEdit(r.id);
							form.setData({
								rating: r.rating,
								title: r.title ?? "",
								body: r.body
							});
						},
						children: "Изменить"
					}) : null, /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => confirm("Удалить отзыв?") && router.delete(`/account/reviews/${r.id}`),
						children: "Удалить"
					})]
				}),
				edit === r.id ? /* @__PURE__ */ jsxs("form", {
					className: "stack",
					onSubmit: (e) => {
						e.preventDefault();
						form.put(`/account/reviews/${r.id}`, { onSuccess: () => setEdit(null) });
					},
					children: [
						/* @__PURE__ */ jsx(TextField, {
							label: "Заголовок",
							value: form.data.title,
							onChange: (e) => form.setData("title", e.target.value)
						}),
						/* @__PURE__ */ jsx(TextArea, {
							label: "Текст",
							required: true,
							minLength: 40,
							value: form.data.body,
							onChange: (e) => form.setData("body", e.target.value),
							error: form.errors.body
						}),
						/* @__PURE__ */ jsx(Button, {
							type: "submit",
							size: "sm",
							loading: form.processing,
							children: "Отправить на проверку"
						})
					]
				}) : null
			]
		}, r.id))]
	});
}
//#endregion
export { Reviews as default };

//# sourceMappingURL=Reviews-mdvlNk2P.js.map