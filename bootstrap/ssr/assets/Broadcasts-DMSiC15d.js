import { n as Button } from "./Button-C2BxTtRt.js";
import { T as TextField, c as Alert, u as Badge, w as TextArea, y as Check } from "../app.js";
import { a as Panel, c as Table, r as PageHead } from "./Dash-C8plSzIc.js";
import { router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Broadcasts.tsx
function CabinetBroadcasts({ broadcasts, followers_count, may_broadcast, limits, channels, moderation_labels }) {
	const [creating, setCreating] = useState(false);
	const form = useForm({
		name: "",
		body: "",
		button_label: "Подробнее",
		button_url: "",
		channels: ["email"]
	});
	const submit = (e) => {
		e.preventDefault();
		form.post("/clinic-cabinet/broadcasts");
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Рассылки подписчикам",
				text: `Подписчиков: ${followers_count}. Контакты подписчиков скрыты — видны только агрегированная статистика.`
			}),
			!may_broadcast ? /* @__PURE__ */ jsx(Alert, {
				tone: "warning",
				children: "Рассылки доступны при активном тарифе продвижения. Оформите продвижение в разделе «Продвижение»."
			}) : /* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: [
					"Лимит: ",
					limits.used_this_week,
					" / ",
					limits.max_per_week,
					" рассылок на модерацию в неделю. Текст до ",
					limits.max_body_length,
					" символов, без телефонов и email в тексте."
				]
			}),
			may_broadcast ? /* @__PURE__ */ jsx(Button, {
				icon: "plus",
				onClick: () => setCreating((v) => !v),
				children: creating ? "Скрыть форму" : "Новая рассылка"
			}) : null,
			creating ? /* @__PURE__ */ jsx(Panel, {
				title: "Черновик",
				children: /* @__PURE__ */ jsxs("form", {
					className: "stack",
					onSubmit: submit,
					children: [
						/* @__PURE__ */ jsx(TextField, {
							label: "Тема",
							value: form.data.name,
							onChange: (e) => form.setData("name", e.target.value),
							error: form.errors.name,
							required: true
						}),
						/* @__PURE__ */ jsx(TextArea, {
							label: "Текст",
							value: form.data.body,
							maxLength: 8e3,
							onChange: (e) => form.setData("body", e.target.value),
							error: form.errors.body,
							rows: 5,
							required: true
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Кнопка",
							value: form.data.button_label,
							onChange: (e) => form.setData("button_label", e.target.value)
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Ссылка",
							value: form.data.button_url,
							onChange: (e) => form.setData("button_url", e.target.value),
							placeholder: "https://"
						}),
						/* @__PURE__ */ jsx("div", {
							className: "row row--wrap",
							children: Object.entries(channels).map(([key, label]) => /* @__PURE__ */ jsx(Check, {
								label,
								checked: form.data.channels.includes(key),
								onChange: () => {
									const set = new Set(form.data.channels);
									if (set.has(key)) set.delete(key);
									else set.add(key);
									form.setData("channels", [...set]);
								}
							}, key))
						}),
						/* @__PURE__ */ jsx(Button, {
							type: "submit",
							loading: form.processing,
							children: "Сохранить черновик"
						})
					]
				})
			}) : null,
			/* @__PURE__ */ jsx(Table, {
				headers: [
					"Рассылка",
					"Модерация",
					"Статус",
					"Получатели",
					"Отправлено",
					"Переходы",
					""
				],
				children: broadcasts.map((b) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("b", { children: b.name }), /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: b.created_at
					})] }),
					/* @__PURE__ */ jsx("td", { children: b.moderation_status ? /* @__PURE__ */ jsx(Badge, { children: moderation_labels[b.moderation_status] ?? b.moderation_status }) : "—" }),
					/* @__PURE__ */ jsx("td", { children: b.status }),
					/* @__PURE__ */ jsx("td", { children: b.recipients_total }),
					/* @__PURE__ */ jsx("td", { children: b.sent_count }),
					/* @__PURE__ */ jsx("td", { children: b.click_count }),
					/* @__PURE__ */ jsxs("td", {
						className: "row row--wrap",
						children: [b.moderation_status === null || b.moderation_status === "rejected" ? /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => router.post(`/clinic-cabinet/broadcasts/${b.id}/submit`),
							children: "На модерацию"
						}) : null, b.moderation_status === "approved" && b.status !== "running" && b.status !== "completed" ? /* @__PURE__ */ jsx(Button, {
							size: "sm",
							onClick: () => router.post(`/clinic-cabinet/broadcasts/${b.id}/start`),
							children: "Отправить"
						}) : null]
					})
				] }, b.id))
			})
		]
	});
}
//#endregion
export { CabinetBroadcasts as default };

//# sourceMappingURL=Broadcasts-DMSiC15d.js.map