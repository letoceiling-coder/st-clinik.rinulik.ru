import { n as Button } from "./Button-D4s3iLUi.js";
import { l as EmptyState, x as TextArea } from "../app.js";
import { r as PageHead } from "./Dash-CaoYUPpG.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Moderation.tsx
function Moderation({ queue, typeLabels }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [/* @__PURE__ */ jsx(PageHead, {
			title: "Очередь модерации",
			text: `${queue.length} объектов ждут решения.`
		}), queue.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Очередь пуста" }) : queue.map((item) => /* @__PURE__ */ jsx(Card, {
			item,
			label: typeLabels[item.type] ?? item.type
		}, `${item.type}-${item.id}`))]
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

//# sourceMappingURL=Moderation-DoCqAO1q.js.map