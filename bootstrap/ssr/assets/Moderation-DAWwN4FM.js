import { n as Button } from "./Button-B5alqlNe.js";
import { C as TextArea, d as EmptyState, v as Check } from "../app.js";
import { r as PageHead } from "./Dash-1ijSGeUC.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Moderation.tsx
function Moderation({ queue, typeLabels, content_moderation_settings }) {
	const settings = useForm({ ...content_moderation_settings });
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Очередь модерации",
				text: `${queue.length} объектов ждут решения.`
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					settings.post("/admin/moderation/settings");
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "h3",
						children: "Настройки"
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Модерировать ответы клиник на отзывы",
						checked: settings.data.moderate_review_replies,
						onChange: (e) => settings.setData("moderate_review_replies", e.target.checked)
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Модерировать все рекламные заказы (включая буст)",
						checked: settings.data.moderate_promotions,
						onChange: (e) => settings.setData("moderate_promotions", e.target.checked)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						size: "sm",
						loading: settings.processing,
						children: "Сохранить"
					})
				]
			}),
			queue.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Очередь пуста" }) : queue.map((item) => /* @__PURE__ */ jsx(Card, {
				item,
				label: typeLabels[item.type] ?? item.type
			}, `${item.type}-${item.id}`))
		]
	});
}
function Card({ item, label }) {
	const form = useForm({
		decision: "approve",
		note: ""
	});
	const send = (decision) => {
		form.transform((d) => ({
			...d,
			decision
		}));
		form.post(`/admin/moderation/${item.type}/${item.id}`);
	};
	return /* @__PURE__ */ jsxs("article", {
		className: "card stack mod-card",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "row row--between",
				children: /* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("span", {
						className: "badge badge--primary",
						children: label
					}),
					/* @__PURE__ */ jsx("h2", { children: item.title }),
					/* @__PURE__ */ jsxs("p", {
						className: "text-sm text-muted",
						children: [
							item.meta,
							" · ",
							item.at
						]
					})
				] })
			}),
			item.body ? /* @__PURE__ */ jsx("p", { children: item.body }) : null,
			item.image ? /* @__PURE__ */ jsx("img", {
				src: item.image,
				alt: "",
				style: {
					maxWidth: 280,
					borderRadius: 12
				}
			}) : null,
			item.has_file ? /* @__PURE__ */ jsx("a", {
				className: "link",
				href: `/admin/moderation/documents/${item.id}`,
				children: "Открыть файл"
			}) : null,
			/* @__PURE__ */ jsx(TextArea, {
				label: "Комментарий при отклонении",
				value: form.data.note,
				maxLength: 500,
				onChange: (e) => form.setData("note", e.target.value),
				error: form.errors.note
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row",
				children: [/* @__PURE__ */ jsx(Button, {
					size: "sm",
					loading: form.processing,
					onClick: () => send("approve"),
					children: "Одобрить"
				}), /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: "danger",
					loading: form.processing,
					onClick: () => send("reject"),
					children: "Отклонить"
				})]
			})
		]
	});
}
//#endregion
export { Moderation as default };

//# sourceMappingURL=Moderation-DAWwN4FM.js.map