import { n as Button } from "./Button-C2BxTtRt.js";
import { C as SelectField, T as TextField, u as Badge, w as TextArea, y as Check } from "../app.js";
import { a as Panel, c as Table, r as PageHead } from "./Dash-C8plSzIc.js";
import { Link, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Broadcasts.tsx
var TONE = {
	draft: void 0,
	scheduled: "info",
	running: "primary",
	paused: "warning",
	completed: "success",
	cancelled: "danger"
};
function AdminBroadcasts({ broadcasts, cities, channels, statuses, roles, pending_clinic, clinic_settings }) {
	const [creating, setCreating] = useState(broadcasts.data.length === 0);
	const settingsForm = useForm({ ...clinic_settings });
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Рассылки",
				text: "Новости и акции платформы для подписчиков: email, MAX и Web Push. Учитываются настройки «Новости платформы» в профиле и стоп-лист.",
				action: /* @__PURE__ */ jsx(Button, {
					icon: "plus",
					onClick: () => setCreating((v) => !v),
					children: creating ? "Скрыть форму" : "Новая рассылка"
				})
			}),
			/* @__PURE__ */ jsx(Panel, {
				title: "Рассылки клиник — лимиты",
				children: /* @__PURE__ */ jsxs("form", {
					className: "stack",
					onSubmit: (e) => {
						e.preventDefault();
						settingsForm.put("/admin/broadcasts/clinic-settings");
					},
					children: [
						/* @__PURE__ */ jsx(Check, {
							label: "Функция включена",
							checked: settingsForm.data.enabled,
							onChange: (e) => settingsForm.setData("enabled", e.target.checked)
						}),
						/* @__PURE__ */ jsx(Check, {
							label: "Только при активном продвижении",
							checked: settingsForm.data.requires_active_promotion,
							onChange: (e) => settingsForm.setData("requires_active_promotion", e.target.checked)
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Макс. рассылок в неделю на клинику",
							type: "number",
							value: String(settingsForm.data.max_per_week),
							onChange: (e) => settingsForm.setData("max_per_week", Number(e.target.value))
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Макс. длина текста",
							type: "number",
							value: String(settingsForm.data.max_body_length),
							onChange: (e) => settingsForm.setData("max_body_length", Number(e.target.value))
						}),
						/* @__PURE__ */ jsx(Button, {
							type: "submit",
							size: "sm",
							loading: settingsForm.processing,
							children: "Сохранить лимиты"
						})
					]
				})
			}),
			pending_clinic.length > 0 ? /* @__PURE__ */ jsx(Panel, {
				title: "На модерации (клиники)",
				children: /* @__PURE__ */ jsx(Table, {
					headers: [
						"Клиника",
						"Тема",
						"Получателей",
						""
					],
					children: pending_clinic.map((b) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", { children: b.clinic }),
						/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx(Link, {
							href: `/admin/broadcasts/${b.id}`,
							className: "link",
							children: b.name
						}), /* @__PURE__ */ jsx("div", {
							className: "text-xs text-muted",
							children: b.body
						})] }),
						/* @__PURE__ */ jsx("td", { children: b.recipients_total }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => router.post(`/admin/broadcasts/${b.id}/moderate`, { decision: "approve" }),
							children: "Одобрить"
						}) })
					] }, b.id))
				})
			}) : null,
			creating ? /* @__PURE__ */ jsx(CreateForm, {
				cities,
				channels,
				roles
			}) : null,
			broadcasts.data.length > 0 ? /* @__PURE__ */ jsx(Table, {
				headers: [
					"Рассылка",
					"Статус",
					"Получатели",
					"Отправлено",
					"Ошибки",
					"Переходы",
					""
				],
				children: broadcasts.data.map((b) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx(Link, {
						href: `/admin/broadcasts/${b.id}`,
						className: "link",
						children: /* @__PURE__ */ jsx("b", { children: b.name })
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted",
						children: [
							b.channels.map((ch) => channels[ch] ?? ch).join(", "),
							" · ",
							b.created_at,
							b.scheduled_at ? ` · запуск ${b.scheduled_at}` : null
						]
					})] }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Badge, {
						tone: TONE[b.status],
						children: statuses[b.status] ?? b.status
					}) }),
					/* @__PURE__ */ jsx("td", { children: b.recipients_total }),
					/* @__PURE__ */ jsx("td", { children: b.sent_count }),
					/* @__PURE__ */ jsx("td", { children: b.failed_count }),
					/* @__PURE__ */ jsx("td", { children: b.click_count }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Link, {
						href: `/admin/broadcasts/${b.id}`,
						className: "link text-sm",
						children: "Открыть"
					}) })
				] }, b.id))
			}) : null
		]
	});
}
function CreateForm({ cities, channels, roles }) {
	const form = useForm({
		name: "",
		body: "",
		button_label: "",
		button_url: "",
		channels: ["email"],
		filters: {
			city_id: "",
			roles: ["user"],
			active_within_days: ""
		}
	});
	const toggleChannel = (key) => {
		const set = new Set(form.data.channels);
		if (set.has(key)) set.delete(key);
		else set.add(key);
		form.setData("channels", [...set]);
	};
	const toggleRole = (key) => {
		const set = new Set(form.data.filters.roles);
		if (set.has(key)) set.delete(key);
		else set.add(key);
		form.setData("filters", {
			...form.data.filters,
			roles: [...set]
		});
	};
	const submit = (e) => {
		e.preventDefault();
		form.post("/admin/broadcasts");
	};
	return /* @__PURE__ */ jsx(Panel, {
		title: "Новая рассылка",
		children: /* @__PURE__ */ jsxs("form", {
			className: "stack",
			onSubmit: submit,
			children: [
				/* @__PURE__ */ jsx(TextField, {
					label: "Название (тема)",
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
					rows: 6,
					required: true
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					children: [/* @__PURE__ */ jsx(TextField, {
						label: "Подпись кнопки",
						value: form.data.button_label,
						onChange: (e) => form.setData("button_label", e.target.value),
						error: form.errors.button_label
					}), /* @__PURE__ */ jsx(TextField, {
						label: "Ссылка кнопки",
						value: form.data.button_url,
						onChange: (e) => form.setData("button_url", e.target.value),
						error: form.errors.button_url,
						placeholder: "https://"
					})]
				}),
				/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("p", {
						className: "label",
						children: "Каналы"
					}),
					/* @__PURE__ */ jsx("div", {
						className: "row row--wrap",
						children: Object.entries(channels).map(([key, label]) => /* @__PURE__ */ jsx(Check, {
							label,
							checked: form.data.channels.includes(key),
							onChange: () => toggleChannel(key)
						}, key))
					}),
					form.errors.channels ? /* @__PURE__ */ jsx("p", {
						className: "field-error",
						children: form.errors.channels
					}) : null
				] }),
				/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("p", {
						className: "label",
						children: "Аудитория"
					}),
					/* @__PURE__ */ jsx("div", {
						className: "row row--wrap",
						children: Object.entries(roles).map(([key, label]) => /* @__PURE__ */ jsx(Check, {
							label,
							checked: form.data.filters.roles.includes(key),
							onChange: () => toggleRole(key)
						}, key))
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "row row--wrap",
						style: { marginTop: 12 },
						children: [/* @__PURE__ */ jsxs(SelectField, {
							label: "Город",
							value: String(form.data.filters.city_id),
							onChange: (e) => form.setData("filters", {
								...form.data.filters,
								city_id: e.target.value ? Number(e.target.value) : ""
							}),
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Все города"
							}), cities.map((c) => /* @__PURE__ */ jsx("option", {
								value: c.id,
								children: c.name
							}, c.id))]
						}), /* @__PURE__ */ jsx(TextField, {
							label: "Активность, дней",
							value: form.data.filters.active_within_days,
							onChange: (e) => form.setData("filters", {
								...form.data.filters,
								active_within_days: e.target.value
							}),
							placeholder: "0 — без фильтра"
						})]
					})
				] }),
				/* @__PURE__ */ jsx(Button, {
					type: "submit",
					loading: form.processing,
					children: "Создать черновик"
				})
			]
		})
	});
}
//#endregion
export { AdminBroadcasts as default };

//# sourceMappingURL=Broadcasts-BUAqtMak.js.map