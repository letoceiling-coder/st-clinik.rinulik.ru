import { n as Button } from "./Button-C2BxTtRt.js";
import { C as SelectField, T as TextField, c as Alert, x as PhoneField, y as Check } from "../app.js";
import { r as PageHead } from "./Dash-C8plSzIc.js";
import { t as SocialOAuthButtons } from "./SocialOAuthButtons-BfmrBF_z.js";
import { router, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/lib/web-push.ts
function urlBase64ToUint8Array(base64String) {
	const base64 = (base64String + "=".repeat((4 - base64String.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
	const raw = window.atob(base64);
	const output = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
	return output;
}
async function subscribeToWebPush(publicKey) {
	if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
	if (await Notification.requestPermission() !== "granted") return false;
	const registration = await navigator.serviceWorker.register("/sw.js");
	await navigator.serviceWorker.ready;
	const json = (await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: urlBase64ToUint8Array(publicKey)
	})).toJSON();
	return (await fetch("/account/push-subscription", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			"X-Requested-With": "XMLHttpRequest",
			"X-XSRF-TOKEN": decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? "")
		},
		credentials: "same-origin",
		body: JSON.stringify({
			endpoint: json.endpoint,
			keys: json.keys
		})
	})).ok;
}
async function unsubscribeFromWebPush() {
	if (!("serviceWorker" in navigator)) return;
	const subscription = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
	if (!subscription) return;
	const endpoint = subscription.endpoint;
	await subscription.unsubscribe();
	await fetch("/account/push-subscription", {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			"X-Requested-With": "XMLHttpRequest",
			"X-XSRF-TOKEN": decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? "")
		},
		credentials: "same-origin",
		body: JSON.stringify({ endpoint })
	});
}
//#endregion
//#region resources/js/pages/Account/Profile.tsx
var providerLabels = {
	yandex: "Яндекс ID",
	vk: "VK ID",
	max: "MAX"
};
function Profile({ profile, cities, social_accounts, notification_preferences, web_push_subscribed, notification_channel_labels, clinic_follows, recent_deliveries }) {
	const { webpush } = usePage().props;
	const [pushBusy, setPushBusy] = useState(false);
	const [pushOn, setPushOn] = useState(web_push_subscribed);
	const notifyForm = useForm({ preferences: notification_preferences.map((row) => ({
		key: row.key,
		channels: [...row.channels]
	})) });
	const form = useForm({
		name: profile.name,
		phone: profile.phone ?? "",
		city_id: profile.city_id ?? "",
		notify_email: profile.notify_email,
		notify_leads: profile.notify_leads
	});
	const pwd = useForm({
		current_password: "",
		password: "",
		password_confirmation: ""
	});
	const emailForm = useForm({
		email: profile.pending_email ?? "",
		password: ""
	});
	const del = useForm({ password: "" });
	const save = (e) => {
		e.preventDefault();
		form.put("/account/profile");
	};
	const savePwd = (e) => {
		e.preventDefault();
		pwd.put("/account/password", { onSuccess: () => pwd.reset() });
	};
	const saveEmail = (e) => {
		e.preventDefault();
		emailForm.post("/account/email", { onSuccess: () => emailForm.reset("password") });
	};
	const linked = new Set(social_accounts.map((a) => a.provider));
	const toggleNotifyChannel = (rowIndex, channel) => {
		const row = notifyForm.data.preferences[rowIndex];
		const channels = row.channels.includes(channel) ? row.channels.filter((c) => c !== channel) : [...row.channels, channel];
		const next = [...notifyForm.data.preferences];
		next[rowIndex] = {
			...row,
			channels: channel === "in_app" ? channels.includes("in_app") ? channels : ["in_app", ...channels] : channels
		};
		notifyForm.setData("preferences", next);
	};
	const saveNotify = (e) => {
		e.preventDefault();
		notifyForm.put("/account/notification-preferences");
	};
	const togglePush = async () => {
		if (!webpush?.public_key) return;
		setPushBusy(true);
		try {
			if (pushOn) {
				await unsubscribeFromWebPush();
				setPushOn(false);
			} else {
				const ok = await subscribeToWebPush(webpush.public_key);
				setPushOn(ok);
			}
		} finally {
			setPushBusy(false);
		}
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Профиль",
				text: `Согласие на обработку данных: ${profile.consent_at ?? "не получено"} (${profile.consent_version ?? "—"}).`
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: save,
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Контакты"
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Имя",
						required: true,
						autoComplete: "name",
						maxLength: 60,
						value: form.data.name,
						onChange: (e) => form.setData("name", e.target.value),
						error: form.errors.name
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "E-mail",
						value: profile.placeholder_email ? "Не указан (вход через соцсеть)" : profile.email,
						disabled: true,
						hint: profile.pending_email ? `Ожидает подтверждения: ${profile.pending_email}` : profile.placeholder_email ? "Добавьте e-mail в блоке ниже." : "Смена e-mail — в блоке ниже."
					}),
					/* @__PURE__ */ jsx(PhoneField, {
						label: "Телефон",
						value: form.data.phone,
						onChange: (e) => form.setData("phone", e.target.value),
						error: form.errors.phone
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Город",
						value: form.data.city_id,
						onChange: (e) => form.setData("city_id", e.target.value),
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Не выбран"
						}), cities.map((c) => /* @__PURE__ */ jsx("option", {
							value: c.id,
							children: c.name
						}, c.id))]
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Письма на почту",
						checked: form.data.notify_email,
						onChange: (e) => form.setData("notify_email", e.target.checked)
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Уведомления о заявках",
						checked: form.data.notify_leads,
						onChange: (e) => form.setData("notify_leads", e.target.checked)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						children: "Сохранить"
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: saveNotify,
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Уведомления о записях"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "Выберите каналы для каждого типа события. «На сайте» всегда включено."
					}),
					webpush?.public_key ? /* @__PURE__ */ jsxs("div", {
						className: "row row--wrap row--between",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "text-sm",
							children: ["Push в браузере ", pushOn ? "подключён" : "не подключён"]
						}), /* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "outline",
							size: "sm",
							loading: pushBusy,
							onClick: togglePush,
							children: pushOn ? "Отключить push" : "Включить push"
						})]
					}) : null,
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
									disabled: channel === "in_app",
									onChange: () => toggleNotifyChannel(rowIndex, channel)
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
			recent_deliveries.length > 0 ? /* @__PURE__ */ jsxs("div", {
				className: "card stack",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Последние отправки"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "Журнал доставки уведомлений по каналам (email, MAX, push)."
					}),
					/* @__PURE__ */ jsx("ul", {
						className: "stack text-sm",
						children: recent_deliveries.map((row, i) => /* @__PURE__ */ jsxs("li", {
							className: "row row--wrap row--between",
							children: [/* @__PURE__ */ jsxs("span", { children: [
								row.event_label,
								" · ",
								notification_channel_labels[row.channel] ?? row.channel
							] }), /* @__PURE__ */ jsxs("span", {
								className: "text-muted",
								children: [row.status === "sent" ? "доставлено" : row.status === "failed" ? "ошибка" : row.status, row.at ? ` · ${row.at}` : ""]
							})]
						}, i))
					})
				]
			}) : null,
			clinic_follows.length > 0 ? /* @__PURE__ */ jsxs("div", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Подписки на клиники"
				}), clinic_follows.map((f) => /* @__PURE__ */ jsxs("div", {
					className: "row row--between row--wrap",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: f.name }), /* @__PURE__ */ jsxs("p", {
						className: "text-sm text-muted",
						children: ["с ", f.subscribed_at]
					})] }), /* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "outline",
						size: "sm",
						onClick: () => router.delete(`/account/clinic-follows/${f.id}`),
						children: "Отписаться"
					})]
				}, f.id))]
			}) : null,
			(profile.has_password || profile.placeholder_email) && /* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: saveEmail,
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: profile.placeholder_email ? "Добавить e-mail" : "Смена e-mail"
					}),
					profile.placeholder_email && /* @__PURE__ */ jsx(Alert, {
						tone: "info",
						children: "VK ID часто не передаёт почту. Укажите свой e-mail — пришлём ссылку для подтверждения."
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "E-mail",
						type: "email",
						autoComplete: "email",
						required: true,
						value: emailForm.data.email,
						onChange: (e) => emailForm.setData("email", e.target.value),
						error: emailForm.errors.email
					}),
					profile.has_password && /* @__PURE__ */ jsx(TextField, {
						label: "Текущий пароль",
						type: "password",
						autoComplete: "current-password",
						required: true,
						value: emailForm.data.password,
						onChange: (e) => emailForm.setData("password", e.target.value),
						error: emailForm.errors.password
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						variant: "dark",
						loading: emailForm.processing,
						children: "Отправить подтверждение"
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "card stack",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Привязанные входы"
					}),
					social_accounts.length === 0 && /* @__PURE__ */ jsx("p", {
						className: "text-muted text-sm",
						children: "Пока только пароль или вход не настроен."
					}),
					social_accounts.map((acc) => /* @__PURE__ */ jsxs("div", {
						className: "oauth-linked",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: providerLabels[acc.provider] ?? acc.provider }), /* @__PURE__ */ jsxs("p", {
							className: "text-sm text-muted",
							children: [
								acc.email ?? acc.name ?? "Привязано",
								" · ",
								acc.linked_at ?? "—"
							]
						})] }), acc.can_unlink ? /* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "outline",
							size: "sm",
							onClick: () => {
								if (confirm("Отвязать этот способ входа?")) router.delete(`/account/social/${acc.provider}`);
							},
							children: "Отвязать"
						}) : /* @__PURE__ */ jsx("span", {
							className: "text-sm text-muted",
							children: "Единственный вход"
						})]
					}, acc.provider)),
					/* @__PURE__ */ jsx(SocialOAuthButtons, {
						showHeading: false,
						providers: [
							"yandex",
							"vk",
							"max"
						].filter((key) => !linked.has(key))
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: savePwd,
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Пароль"
					}),
					!profile.has_password && /* @__PURE__ */ jsx(Alert, {
						tone: "info",
						children: "У вас вход только через соцсеть. Задайте пароль, чтобы отвязать провайдеры при необходимости."
					}),
					profile.has_password && /* @__PURE__ */ jsx(TextField, {
						label: "Текущий пароль",
						type: "password",
						autoComplete: "current-password",
						value: pwd.data.current_password,
						onChange: (e) => pwd.setData("current_password", e.target.value),
						error: pwd.errors.current_password
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Новый пароль",
						type: "password",
						autoComplete: "new-password",
						value: pwd.data.password,
						onChange: (e) => pwd.setData("password", e.target.value),
						error: pwd.errors.password
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Повторите пароль",
						type: "password",
						autoComplete: "new-password",
						value: pwd.data.password_confirmation,
						onChange: (e) => pwd.setData("password_confirmation", e.target.value)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						variant: "dark",
						loading: pwd.processing,
						children: "Обновить пароль"
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					if (confirm("Удалить аккаунт и персональные данные? Это нельзя отменить.")) del.delete("/account");
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Удаление аккаунта"
					}),
					/* @__PURE__ */ jsx(Alert, {
						tone: "warning",
						children: "Диагнозы и медицинские документы через сервис не собираются. Удаление стирает профиль, заявки и отзывы."
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Пароль для подтверждения",
						type: "password",
						value: del.data.password,
						onChange: (e) => del.setData("password", e.target.value),
						error: del.errors.password
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						variant: "danger",
						loading: del.processing,
						children: "Удалить аккаунт"
					})
				]
			})
		]
	});
}
//#endregion
export { Profile as default };

//# sourceMappingURL=Profile-CmiTy00a.js.map