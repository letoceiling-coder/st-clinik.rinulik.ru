import { t as Icon } from "./Icon-_sloiNX5.js";
import { n as Button } from "./Button-C2BxTtRt.js";
import { _ as EmptyState, w as Check } from "../app.js";
import { r as PageHead } from "./Dash-C_HMp027.js";
import { t as ModerationCard } from "./ModerationCard-CZ4TOH-W.js";
import { Link, useForm, usePage } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Moderation.tsx
function Moderation({ queue, typeLabels, content_moderation_settings }) {
	const activeType = new URLSearchParams(usePage().url.split("?")[1] ?? "").get("type") ?? "";
	const counts = queue.reduce((acc, item) => ({
		...acc,
		[item.type]: (acc[item.type] ?? 0) + 1
	}), {});
	const visible = activeType ? queue.filter((item) => item.type === activeType) : queue;
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Модерация",
				text: "Здесь проверяются материалы, которые клиники и пациенты добавили на сайт: карточки клиник, врачи, фото, документы и отзывы. Пока материал не одобрен, посетители его не видят. При отклонении автор получит вашу причину."
			}),
			/* @__PURE__ */ jsxs("nav", {
				className: "dict-tabs",
				"aria-label": "Тип материалов",
				children: [/* @__PURE__ */ jsxs(Link, {
					href: "/admin/moderation",
					className: activeType ? "chip" : "chip is-active",
					preserveScroll: true,
					children: ["Все · ", queue.length]
				}), Object.entries(typeLabels).map(([type, label]) => /* @__PURE__ */ jsxs(Link, {
					href: `/admin/moderation?type=${type}`,
					className: type === activeType ? "chip is-active" : "chip",
					preserveScroll: true,
					children: [
						label,
						" · ",
						counts[type] ?? 0
					]
				}, type))]
			}),
			visible.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
				icon: "check",
				title: activeType ? "Здесь всё проверено" : "Очередь пуста",
				text: "Новые материалы появятся здесь автоматически."
			}) : visible.map((item) => /* @__PURE__ */ jsx(ModerationCard, { item }, `${item.type}-${item.id}`)),
			/* @__PURE__ */ jsx(ModerationSettings, { initial: content_moderation_settings })
		]
	});
}
function ModerationSettings({ initial }) {
	const settings = useForm({ ...initial });
	return /* @__PURE__ */ jsxs("details", {
		className: "card mod-settings",
		children: [/* @__PURE__ */ jsxs("summary", { children: [/* @__PURE__ */ jsx(Icon, {
			name: "settings",
			size: 18
		}), " Настройки модерации"] }), /* @__PURE__ */ jsxs("form", {
			className: "stack",
			onSubmit: (e) => {
				e.preventDefault();
				settings.post("/admin/moderation/settings", { preserveScroll: true });
			},
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: "Что отправлять на ручную проверку, прежде чем показать на сайте."
				}),
				/* @__PURE__ */ jsx(Check, {
					label: "Проверять ответы клиник на отзывы",
					checked: settings.data.moderate_review_replies,
					onChange: (e) => settings.setData("moderate_review_replies", e.target.checked)
				}),
				/* @__PURE__ */ jsx(Check, {
					label: "Проверять все рекламные заказы клиник (включая поднятие в выдаче)",
					checked: settings.data.moderate_promotions,
					onChange: (e) => settings.setData("moderate_promotions", e.target.checked)
				}),
				/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Button, {
					type: "submit",
					size: "sm",
					loading: settings.processing,
					children: "Сохранить настройки"
				}) })
			]
		})]
	});
}
//#endregion
export { Moderation as default };

//# sourceMappingURL=Moderation-BrrZzYeo.js.map