import { n as Button } from "./Button-C2BxTtRt.js";
import { C as SelectField, T as TextField, w as TextArea, y as Check } from "../app.js";
import { a as Panel, r as PageHead } from "./Dash-C8plSzIc.js";
import { Link, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Assistant.tsx
var emptyKb = {
	question: "",
	answer: "",
	city_id: "",
	is_active: true,
	sort: 100
};
function AdminAssistant({ settings, metrics, recentConversations, kbEntries, cities }) {
	const form = useForm({
		...settings,
		system_prompt: settings.system_prompt ?? "",
		stream_responses: settings.stream_responses ?? true,
		max_messages_per_conversation: settings.max_messages_per_conversation ?? 40,
		max_messages_per_ip_per_day: settings.max_messages_per_ip_per_day ?? 80,
		assistant_lead_broadcast_count: settings.assistant_lead_broadcast_count ?? 3,
		assistant_lead_exclusive_first: settings.assistant_lead_exclusive_first ?? true
	});
	const [editId, setEditId] = useState(null);
	const kbForm = useForm({ ...emptyKb });
	const submit = (e) => {
		e.preventDefault();
		form.put("/admin/assistant");
	};
	const startEdit = (entry) => {
		setEditId(entry.id);
		kbForm.setData({
			question: entry.question,
			answer: entry.answer,
			city_id: entry.city_id ?? "",
			is_active: entry.is_active,
			sort: entry.sort
		});
	};
	const submitKb = (e) => {
		e.preventDefault();
		const payload = {
			...kbForm.data,
			city_id: kbForm.data.city_id === "" ? null : Number(kbForm.data.city_id)
		};
		if (editId) kbForm.transform(() => payload).put(`/admin/assistant/kb/${editId}`, { onSuccess: () => {
			setEditId(null);
			kbForm.reset();
			kbForm.setData({ ...emptyKb });
		} });
		else kbForm.transform(() => payload).post("/admin/assistant/kb", { onSuccess: () => {
			kbForm.reset();
			kbForm.setData({ ...emptyKb });
		} });
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(PageHead, {
			title: "AI-ассистент",
			text: "OpenRouter, инструменты каталога, FAQ, pgvector/HNSW для FAQ, SSE-поток OpenRouter, рассылка лида по клиникам города, суточный бюджет — в интеграциях."
		}),
		/* @__PURE__ */ jsx(Panel, {
			title: "Статистика (7 дней)",
			children: /* @__PURE__ */ jsxs("div", {
				className: "kpi-grid",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "kpi",
						children: [/* @__PURE__ */ jsx("span", {
							className: "kpi__label",
							children: "Диалоги"
						}), /* @__PURE__ */ jsx("span", {
							className: "kpi__value",
							children: metrics.conversations_7d
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi",
						children: [/* @__PURE__ */ jsx("span", {
							className: "kpi__label",
							children: "Сообщения"
						}), /* @__PURE__ */ jsx("span", {
							className: "kpi__value",
							children: metrics.messages_7d
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi",
						children: [/* @__PURE__ */ jsx("span", {
							className: "kpi__label",
							children: "Лиды"
						}), /* @__PURE__ */ jsx("span", {
							className: "kpi__value",
							children: metrics.leads_7d
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi",
						children: [/* @__PURE__ */ jsx("span", {
							className: "kpi__label",
							children: "Конверсия"
						}), /* @__PURE__ */ jsx("span", {
							className: "kpi__value",
							children: metrics.conversion_7d != null ? `${metrics.conversion_7d}%` : "—"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi",
						children: [/* @__PURE__ */ jsx("span", {
							className: "kpi__label",
							children: "OpenRouter сегодня"
						}), /* @__PURE__ */ jsxs("span", {
							className: "kpi__value",
							children: ["$", metrics.openrouter_usd_today]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi",
						children: [/* @__PURE__ */ jsx("span", {
							className: "kpi__label",
							children: "Чанки каталога"
						}), /* @__PURE__ */ jsx("span", {
							className: "kpi__value",
							children: metrics.kb_catalog_chunks
						})]
					})
				]
			})
		}),
		/* @__PURE__ */ jsx("form", {
			onSubmit: submit,
			children: /* @__PURE__ */ jsxs(Panel, {
				title: "Публичный виджет и MAX-бот",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "form-grid",
					children: [
						/* @__PURE__ */ jsx(Check, {
							label: "Ассистент включён",
							checked: form.data.enabled,
							onChange: (e) => form.setData("enabled", e.target.checked)
						}),
						/* @__PURE__ */ jsx(Check, {
							label: "Mock-режим (без OpenRouter)",
							checked: form.data.mock_mode,
							onChange: (e) => form.setData("mock_mode", e.target.checked)
						}),
						/* @__PURE__ */ jsx(Check, {
							label: "Потоковый ответ в виджете (SSE)",
							checked: form.data.stream_responses,
							onChange: (e) => form.setData("stream_responses", e.target.checked)
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Лимит сообщений в диалоге",
							type: "number",
							value: form.data.max_messages_per_conversation,
							onChange: (e) => form.setData("max_messages_per_conversation", Number(e.target.value))
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Лимит сообщений с IP за сутки",
							type: "number",
							value: form.data.max_messages_per_ip_per_day,
							onChange: (e) => form.setData("max_messages_per_ip_per_day", Number(e.target.value))
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Сколько клиник получают лид при «любая клиника»",
							type: "number",
							min: 1,
							max: 5,
							value: form.data.assistant_lead_broadcast_count,
							onChange: (e) => form.setData("assistant_lead_broadcast_count", Number(e.target.value))
						}),
						/* @__PURE__ */ jsx(Check, {
							label: "Эксклюзив: первая клиника «Беру в работу» закрепляет пациента",
							checked: form.data.assistant_lead_exclusive_first,
							onChange: (e) => form.setData("assistant_lead_exclusive_first", e.target.checked)
						}),
						/* @__PURE__ */ jsx(TextArea, {
							label: "Приветствие",
							value: form.data.greeting,
							onChange: (e) => form.setData("greeting", e.target.value),
							rows: 4,
							maxLength: 2e3
						}),
						/* @__PURE__ */ jsx(TextArea, {
							label: "Дисклеймер (медицина, 103/112)",
							value: form.data.disclaimer,
							onChange: (e) => form.setData("disclaimer", e.target.value),
							rows: 3,
							maxLength: 2e3
						}),
						/* @__PURE__ */ jsx(TextArea, {
							label: "System prompt (пусто — шаблон по умолчанию)",
							value: form.data.system_prompt,
							onChange: (e) => form.setData("system_prompt", e.target.value),
							rows: 6,
							maxLength: 8e3
						})
					]
				}), /* @__PURE__ */ jsx("div", {
					className: "form-actions",
					children: /* @__PURE__ */ jsx(Button, {
						type: "submit",
						disabled: form.processing,
						children: "Сохранить"
					})
				})]
			})
		}),
		/* @__PURE__ */ jsxs(Panel, {
			title: "База знаний (FAQ)",
			children: [/* @__PURE__ */ jsxs("form", {
				onSubmit: submitKb,
				className: "form-grid",
				children: [
					/* @__PURE__ */ jsx(TextField, {
						label: "Вопрос",
						value: kbForm.data.question,
						onChange: (e) => kbForm.setData("question", e.target.value),
						maxLength: 500,
						required: true
					}),
					/* @__PURE__ */ jsx(TextArea, {
						label: "Ответ",
						value: kbForm.data.answer,
						onChange: (e) => kbForm.setData("answer", e.target.value),
						rows: 4,
						maxLength: 5e3,
						required: true
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Город (пусто — все города)",
						value: kbForm.data.city_id,
						onChange: (e) => kbForm.setData("city_id", e.target.value),
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Вся платформа"
						}), cities.map((c) => /* @__PURE__ */ jsx("option", {
							value: c.id,
							children: c.name
						}, c.id))]
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Порядок",
						type: "number",
						value: kbForm.data.sort,
						onChange: (e) => kbForm.setData("sort", Number(e.target.value))
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Активна",
						checked: kbForm.data.is_active,
						onChange: (e) => kbForm.setData("is_active", e.target.checked)
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "form-actions",
						children: [editId ? /* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "ghost",
							onClick: () => setEditId(null),
							children: "Отмена"
						}) : null, /* @__PURE__ */ jsx(Button, {
							type: "submit",
							disabled: kbForm.processing,
							children: editId ? "Сохранить запись" : "Добавить запись"
						})]
					})
				]
			}), /* @__PURE__ */ jsx("ul", {
				className: "dash-list",
				style: { marginTop: 16 },
				children: kbEntries.map((entry) => /* @__PURE__ */ jsxs("li", { children: [
					/* @__PURE__ */ jsx("strong", { children: entry.question }),
					entry.city ? ` · ${entry.city}` : " · вся платформа",
					!entry.is_active ? " · скрыта" : "",
					/* @__PURE__ */ jsxs("div", {
						className: "text-sm text-muted",
						children: [entry.answer.slice(0, 120), entry.answer.length > 120 ? "…" : ""]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "form-actions",
						style: { marginTop: 6 },
						children: [/* @__PURE__ */ jsx(Button, {
							type: "button",
							size: "sm",
							variant: "ghost",
							onClick: () => startEdit(entry),
							children: "Изменить"
						}), /* @__PURE__ */ jsx(Button, {
							type: "button",
							size: "sm",
							variant: "ghost",
							onClick: () => {
								if (confirm("Удалить запись?")) router.delete(`/admin/assistant/kb/${entry.id}`);
							},
							children: "Удалить"
						})]
					})
				] }, entry.id))
			})]
		}),
		/* @__PURE__ */ jsx(Panel, {
			title: "Недавние диалоги",
			children: recentConversations.length === 0 ? /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Пока нет сохранённых диалогов."
			}) : /* @__PURE__ */ jsx("ul", {
				className: "dash-list",
				children: recentConversations.map((row) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
					href: `/admin/assistant/conversations/${row.public_id}`,
					children: [
						row.channel,
						row.city ? ` · ${row.city}` : "",
						" · ",
						row.messages_count,
						" сообщ.",
						row.last_message_at ? ` · ${new Date(row.last_message_at).toLocaleString("ru-RU")}` : ""
					]
				}) }, row.public_id))
			})
		})
	] });
}
//#endregion
export { AdminAssistant as default };

//# sourceMappingURL=Assistant-D0RyWCAl.js.map