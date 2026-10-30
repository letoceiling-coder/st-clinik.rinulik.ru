import { n as Button } from "./Button-C2BxTtRt.js";
import { c as Alert, y as Check } from "../app.js";
import { r as PageHead } from "./Dash-C8plSzIc.js";
import { useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Settings.tsx
function Settings({ notification_preferences, notification_channel_labels, assistant_leads }) {
	const notifyForm = useForm({ preferences: notification_preferences.map((row) => ({
		key: row.key,
		channels: [...row.channels]
	})) });
	const assistantForm = useForm({ accepts_assistant_leads: assistant_leads.accepts });
	const toggleChannel = (rowIndex, channel) => {
		const channels = [...notifyForm.data.preferences[rowIndex]?.channels ?? []];
		const next = channels.includes(channel) ? channels.filter((c) => c !== channel) : [...channels, channel];
		const prefs = [...notifyForm.data.preferences];
		prefs[rowIndex] = {
			...prefs[rowIndex],
			channels: next
		};
		notifyForm.setData("preferences", prefs);
	};
	const saveNotify = (e) => {
		e.preventDefault();
		notifyForm.put("/clinic-cabinet/settings/notifications");
	};
	const saveAssistant = (e) => {
		e.preventDefault();
		assistantForm.put("/clinic-cabinet/settings/assistant-leads");
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Настройки",
				text: "Уведомления для вашего аккаунта и параметры филиала."
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: saveNotify,
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Уведомления в кабинете"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "Снимите все галочки у типа события, чтобы не получать такие уведомления."
					}),
					/* @__PURE__ */ jsx("div", {
						className: "stack",
						children: notification_preferences.map((row, rowIndex) => /* @__PURE__ */ jsxs("div", {
							className: "stack",
							children: [/* @__PURE__ */ jsx("strong", {
								className: "text-sm",
								children: row.label
							}), /* @__PURE__ */ jsx("div", {
								className: "row row--wrap",
								children: row.available.map((channel) => /* @__PURE__ */ jsx(Check, {
									label: notification_channel_labels[channel] ?? channel,
									checked: notifyForm.data.preferences[rowIndex]?.channels.includes(channel) ?? false,
									onChange: () => toggleChannel(rowIndex, channel)
								}, `${row.key}-${channel}`))
							})]
						}, row.key))
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: notifyForm.processing,
						children: "Сохранить уведомления"
					})
				]
			}),
			assistant_leads.enabled ? /* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: saveAssistant,
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Лиды AI-ассистента"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "Если включено, филиал может получать рассылку заявок от ассистента на сайте (первый принявший забирает лид)."
					}),
					assistant_leads.can_manage ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Check, {
						label: "Принимать лиды ассистента для текущего филиала",
						checked: assistantForm.data.accepts_assistant_leads,
						onChange: (e) => assistantForm.setData("accepts_assistant_leads", e.target.checked)
					}), /* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: assistantForm.processing,
						children: "Сохранить"
					})] }) : /* @__PURE__ */ jsxs(Alert, {
						tone: "info",
						children: [assistant_leads.accepts ? "Приём лидов включён." : "Приём лидов выключен.", " Изменить может владелец или администратор."]
					})
				]
			}) : /* @__PURE__ */ jsxs("div", {
				className: "card stack text-sm text-muted",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Лиды AI-ассистента"
				}), /* @__PURE__ */ jsx("p", { children: "Подключите тариф с функцией «Лиды ассистента», чтобы участвовать в рассылке заявок." })]
			})
		]
	});
}
//#endregion
export { Settings as default };

//# sourceMappingURL=Settings-B6Iln2or.js.map