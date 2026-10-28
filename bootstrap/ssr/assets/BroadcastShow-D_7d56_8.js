import { i as LinkButton, n as Button } from "./Button-C2BxTtRt.js";
import { C as TextArea, S as SelectField, l as Badge, s as Alert, v as Check, w as TextField } from "../app.js";
import { a as Panel, c as Table, i as PagerSafe, r as PageHead } from "./Dash-BqP8YCar.js";
import { router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/BroadcastShow.tsx
function BroadcastShow(props) {
	const { broadcast, by_channel, estimate, channels, statuses, cities, roles, recipients } = props;
	const [preview, setPreview] = useState(null);
	const scheduleForm = useForm({ scheduled_at: broadcast.scheduled_at ?? "" });
	const form = useForm({
		name: broadcast.name,
		body: broadcast.body,
		button_label: broadcast.button_label ?? "",
		button_url: broadcast.button_url ?? "",
		channels: broadcast.channels,
		filters: {
			city_id: broadcast.filters.city_id ?? "",
			roles: broadcast.filters.roles ?? ["user"],
			active_within_days: broadcast.filters.active_within_days ? String(broadcast.filters.active_within_days) : ""
		}
	});
	const post = (url) => router.post(url, {}, { preserveScroll: true });
	const save = (e) => {
		e.preventDefault();
		form.put(`/admin/broadcasts/${broadcast.id}`);
	};
	const loadPreview = async () => {
		const token = document.querySelector("meta[name=\"csrf-token\"]")?.getAttribute("content");
		const res = await fetch(`/admin/broadcasts/${broadcast.id}/preview`, {
			method: "POST",
			headers: {
				"X-CSRF-TOKEN": token ?? "",
				Accept: "application/json"
			}
		});
		if (res.ok) setPreview(await res.json());
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: broadcast.name,
				text: `Создана ${broadcast.created_at ?? "—"}. Оценка аудитории: ~${estimate.count} пользователей.`,
				action: /* @__PURE__ */ jsx(LinkButton, {
					href: "/admin/broadcasts",
					variant: "ghost",
					children: "К списку"
				})
			}),
			broadcast.sender_type === "clinic" ? /* @__PURE__ */ jsxs(Alert, {
				tone: "info",
				children: [
					"Рассылка клиники ",
					broadcast.clinic_name ?? "",
					". Модерация: ",
					broadcast.moderation_status ?? "—",
					broadcast.moderation_note ? ` · ${broadcast.moderation_note}` : ""
				]
			}) : null,
			broadcast.sender_type === "clinic" && broadcast.moderation_status === "pending" ? /* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				children: [/* @__PURE__ */ jsx(Button, {
					size: "sm",
					onClick: () => router.post(`/admin/broadcasts/${broadcast.id}/moderate`, { decision: "approve" }),
					children: "Одобрить"
				}), /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: "danger",
					onClick: () => {
						const note = window.prompt("Причина отклонения для клиники");
						if (note) router.post(`/admin/broadcasts/${broadcast.id}/moderate`, {
							decision: "reject",
							note
						});
					},
					children: "Отклонить"
				})]
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				children: [/* @__PURE__ */ jsx(Badge, {
					tone: broadcast.status === "running" ? "primary" : void 0,
					children: statuses[broadcast.status] ?? broadcast.status
				}), /* @__PURE__ */ jsxs("span", {
					className: "text-sm text-muted",
					children: [
						"Отправлено ",
						broadcast.sent_count,
						" · ошибок ",
						broadcast.failed_count,
						" · переходов ",
						broadcast.click_count
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				children: [
					/* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => post(`/admin/broadcasts/${broadcast.id}/test`),
						children: "Тест себе"
					}),
					/* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: loadPreview,
						children: "Предпросмотр"
					}),
					/* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => post(`/admin/broadcasts/${broadcast.id}/build`),
						children: "Обновить список"
					}),
					broadcast.status === "draft" || broadcast.status === "scheduled" || broadcast.status === "paused" ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						onClick: () => post(`/admin/broadcasts/${broadcast.id}/start`),
						children: "Запустить"
					}) : null,
					broadcast.status === "running" ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => post(`/admin/broadcasts/${broadcast.id}/pause`),
						children: "Пауза"
					}) : null,
					broadcast.status !== "completed" && broadcast.status !== "cancelled" ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "danger",
						onClick: () => post(`/admin/broadcasts/${broadcast.id}/cancel`),
						children: "Отменить"
					}) : null
				]
			}),
			broadcast.status === "draft" ? /* @__PURE__ */ jsx(Panel, {
				title: "Отложенный запуск",
				children: /* @__PURE__ */ jsxs("form", {
					className: "row row--wrap",
					onSubmit: (e) => {
						e.preventDefault();
						scheduleForm.post(`/admin/broadcasts/${broadcast.id}/schedule`);
					},
					children: [/* @__PURE__ */ jsx(TextField, {
						label: "Дата и время",
						type: "datetime-local",
						value: scheduleForm.data.scheduled_at,
						onChange: (e) => scheduleForm.setData("scheduled_at", e.target.value),
						error: scheduleForm.errors.scheduled_at
					}), /* @__PURE__ */ jsx(Button, {
						type: "submit",
						size: "sm",
						loading: scheduleForm.processing,
						children: "Запланировать"
					})]
				})
			}) : null,
			preview ? /* @__PURE__ */ jsxs(Alert, {
				tone: "info",
				children: [/* @__PURE__ */ jsx("b", { children: preview.subject }), /* @__PURE__ */ jsx("pre", {
					style: {
						whiteSpace: "pre-wrap",
						margin: "8px 0 0"
					},
					children: preview.plain
				})]
			}) : null,
			broadcast.is_editable ? /* @__PURE__ */ jsx(Panel, {
				title: "Содержание и аудитория",
				children: /* @__PURE__ */ jsxs("form", {
					className: "stack",
					onSubmit: save,
					children: [
						/* @__PURE__ */ jsx(TextField, {
							label: "Название",
							value: form.data.name,
							onChange: (e) => form.setData("name", e.target.value),
							error: form.errors.name
						}),
						/* @__PURE__ */ jsx(TextArea, {
							label: "Текст",
							value: form.data.body,
							maxLength: 8e3,
							onChange: (e) => form.setData("body", e.target.value),
							error: form.errors.body,
							rows: 6
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "row row--wrap",
							children: [/* @__PURE__ */ jsx(TextField, {
								label: "Подпись кнопки",
								value: form.data.button_label,
								onChange: (e) => form.setData("button_label", e.target.value)
							}), /* @__PURE__ */ jsx(TextField, {
								label: "Ссылка",
								value: form.data.button_url,
								onChange: (e) => form.setData("button_url", e.target.value)
							})]
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
						/* @__PURE__ */ jsxs(SelectField, {
							label: "Город",
							value: String(form.data.filters.city_id),
							onChange: (e) => form.setData("filters", {
								...form.data.filters,
								city_id: e.target.value ? Number(e.target.value) : ""
							}),
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Все"
							}), cities.map((c) => /* @__PURE__ */ jsx("option", {
								value: c.id,
								children: c.name
							}, c.id))]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "row row--wrap",
							children: Object.entries(roles).map(([key, label]) => /* @__PURE__ */ jsx(Check, {
								label,
								checked: form.data.filters.roles.includes(key),
								onChange: () => {
									const set = new Set(form.data.filters.roles);
									if (set.has(key)) set.delete(key);
									else set.add(key);
									form.setData("filters", {
										...form.data.filters,
										roles: [...set]
									});
								}
							}, key))
						}),
						/* @__PURE__ */ jsx(Button, {
							type: "submit",
							loading: form.processing,
							children: "Сохранить"
						})
					]
				})
			}) : /* @__PURE__ */ jsx(Panel, {
				title: "Текст",
				children: /* @__PURE__ */ jsx("p", {
					style: { whiteSpace: "pre-wrap" },
					children: broadcast.body
				})
			}),
			/* @__PURE__ */ jsx(Panel, {
				title: "По каналам",
				children: /* @__PURE__ */ jsx(Table, {
					headers: [
						"Канал",
						"В очереди / всего",
						"Отправлено",
						"Ошибки",
						"Переходы"
					],
					children: Object.entries(by_channel).map(([ch, row]) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", { children: channels[ch] ?? ch }),
						/* @__PURE__ */ jsx("td", { children: row.total }),
						/* @__PURE__ */ jsx("td", { children: row.sent }),
						/* @__PURE__ */ jsx("td", { children: row.failed }),
						/* @__PURE__ */ jsx("td", { children: row.clicks })
					] }, ch))
				})
			}),
			recipients.data.length > 0 ? /* @__PURE__ */ jsxs(Panel, {
				title: "Получатели",
				children: [/* @__PURE__ */ jsx(Table, {
					headers: [
						"Пользователь",
						"Канал",
						"Статус",
						"Отправлено",
						"Клик",
						"Ошибка"
					],
					children: recipients.data.map((r) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", { children: r.user ?? "—" }),
						/* @__PURE__ */ jsx("td", { children: channels[r.channel] ?? r.channel }),
						/* @__PURE__ */ jsx("td", { children: r.status }),
						/* @__PURE__ */ jsx("td", { children: r.sent_at ?? "—" }),
						/* @__PURE__ */ jsx("td", { children: r.clicked_at ?? "—" }),
						/* @__PURE__ */ jsx("td", {
							className: "text-xs text-muted",
							children: r.error ?? ""
						})
					] }, r.id))
				}), /* @__PURE__ */ jsx(PagerSafe, { links: recipients.links })]
			}) : null,
			estimate.sample.length > 0 ? /* @__PURE__ */ jsx(Panel, {
				title: "Пример аудитории",
				children: /* @__PURE__ */ jsx("ul", {
					className: "text-sm",
					children: estimate.sample.map((u) => /* @__PURE__ */ jsxs("li", { children: [
						u.name,
						" ",
						u.email ? `· ${u.email}` : ""
					] }, u.id))
				})
			}) : null
		]
	});
}
//#endregion
export { BroadcastShow as default };

//# sourceMappingURL=BroadcastShow-D_7d56_8.js.map