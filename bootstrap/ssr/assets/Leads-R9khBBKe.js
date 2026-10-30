import { t as Icon } from "./Icon-_sloiNX5.js";
import { n as cx } from "./format-BP5psl3Q.js";
import { n as Button } from "./Button-C2BxTtRt.js";
import { C as SelectField, T as TextField, f as EmptyState, v as Tabs, w as TextArea } from "../app.js";
import { i as PagerSafe, r as PageHead, s as StatusBadge } from "./Dash-C8plSzIc.js";
import { router, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Leads.tsx
/** Через сколько минут без ответа заявка считается «горящей». */
var URGENT_AFTER_MIN = 15;
function minutesSince(iso, now) {
	return iso ? Math.max(0, Math.round((now - new Date(iso).getTime()) / 6e4)) : 0;
}
function duration(minutes) {
	if (minutes < 60) return `${Math.max(1, minutes)} мин`;
	if (minutes < 1440) return `${Math.floor(minutes / 60)} ч ${minutes % 60 ? `${minutes % 60} мин` : ""}`.trim();
	return `${Math.floor(minutes / 1440)} дн`;
}
/** Текущее время, обновляемое раз в 30 секунд, — для живых таймеров ожидания. */
function useNow() {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 3e4);
		return () => window.clearInterval(timer);
	}, []);
	return now;
}
function Leads({ leads, statuses, cancelReasons, staff, tabs, tab, response, filters }) {
	const now = useNow();
	const visit = (params) => router.get("/clinic-cabinet/leads", Object.fromEntries(Object.entries({
		tab,
		mine: filters.mine,
		...params
	}).filter(([, v]) => v)), {
		preserveState: true,
		preserveScroll: true
	});
	const speedTone = response.median_minutes === null ? "muted" : response.median_minutes <= 15 ? "good" : response.median_minutes <= 60 ? "warn" : "bad";
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Заявки",
				text: "Перезванивайте как можно быстрее: пациент, которому ответили за 15 минут, записывается в разы чаще."
			}),
			/* @__PURE__ */ jsxs("section", {
				className: cx("card leads-speed", `leads-speed--${speedTone}`),
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "leads-speed__main",
						children: [/* @__PURE__ */ jsx("span", {
							className: "leads-speed__label",
							children: "Среднее время ответа за 30 дней"
						}), /* @__PURE__ */ jsx("b", {
							className: "leads-speed__value",
							children: response.median_label ?? "нет данных"
						})]
					}),
					/* @__PURE__ */ jsxs("dl", {
						className: "leads-speed__facts",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Ждут ответа" }), /* @__PURE__ */ jsx("dd", {
								className: cx(response.waiting > 0 && "is-alert"),
								children: response.waiting
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Отвечено" }), /* @__PURE__ */ jsx("dd", { children: response.answered_percent !== null ? `${response.answered_percent}%` : "—" })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Заявок" }), /* @__PURE__ */ jsx("dd", { children: response.sample })] })
						]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "leads-speed__hint text-xs",
						children: response.reliable ? "Показатель виден пациентам на странице клиники — быстрый ответ повышает доверие." : "Когда наберётся не меньше 3 отвеченных заявок, скорость ответа появится на странице клиники."
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "leads-toolbar",
				children: [/* @__PURE__ */ jsx(Tabs, {
					label: "Заявки",
					value: tab,
					onChange: (key) => visit({
						tab: key,
						status: void 0
					}),
					items: [
						{
							key: "active",
							label: "Требуют действий",
							count: tabs.active
						},
						{
							key: "booked",
							label: "Записаны",
							count: tabs.booked
						},
						{
							key: "closed",
							label: "Закрытые",
							count: tabs.closed
						},
						{
							key: "all",
							label: "Все",
							count: tabs.all
						}
					]
				}), /* @__PURE__ */ jsxs("label", {
					className: "leads-mine",
					children: [/* @__PURE__ */ jsx("input", {
						type: "checkbox",
						checked: filters.mine === "1",
						onChange: (e) => visit({ mine: e.target.checked ? "1" : void 0 })
					}), "Только мои"]
				})]
			}),
			leads.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
				title: tab === "active" ? "Все заявки обработаны" : "Заявок нет",
				text: tab === "active" ? "Новые заявки появятся здесь, а уведомление придёт в кабинет и выбранные каналы." : void 0
			}) : /* @__PURE__ */ jsx("div", {
				className: "stack",
				children: leads.data.map((l) => /* @__PURE__ */ jsx(LeadCard, {
					lead: l,
					statuses,
					cancelReasons,
					staff,
					now
				}, l.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: leads })
		]
	});
}
function LeadCard({ lead, statuses, cancelReasons, staff, now }) {
	const [open, setOpen] = useState(false);
	const form = useForm({
		status: lead.status,
		clinic_note: lead.clinic_note ?? "",
		assigned_to: lead.assigned_to ? String(lead.assigned_to) : "",
		callback_at: lead.callback_at ?? "",
		cancel_reason: lead.cancel_reason ?? ""
	});
	const waiting = lead.status === "new" ? minutesSince(lead.created_at_iso, now) : null;
	const urgent = waiting !== null && waiting >= URGENT_AFTER_MIN;
	const quick = (changes) => {
		router.put(`/clinic-cabinet/leads/${lead.id}`, {
			...form.data,
			assigned_to: form.data.assigned_to || null,
			callback_at: form.data.callback_at || null,
			cancel_reason: form.data.cancel_reason || null,
			...changes
		}, { preserveScroll: true });
	};
	const inHour = () => {
		const d = new Date(Date.now() + 36e5);
		const pad = (n) => String(n).padStart(2, "0");
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	};
	return /* @__PURE__ */ jsxs("article", {
		className: cx("card lead-card", urgent && "lead-card--urgent", lead.status === "new" && "lead-card--new"),
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "lead-card__head",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "lead-card__who",
					children: [/* @__PURE__ */ jsx("b", { children: lead.name }), /* @__PURE__ */ jsx("span", {
						className: "text-sm text-muted",
						children: [
							lead.service,
							lead.doctor,
							lead.concern,
							lead.is_child ? "ребёнок" : null
						].filter(Boolean).join(" · ") || "Без уточнения услуги"
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "lead-card__state",
					children: [/* @__PURE__ */ jsx(StatusBadge, {
						status: lead.status,
						label: lead.status_label
					}), waiting !== null ? /* @__PURE__ */ jsxs("span", {
						className: cx("lead-timer", urgent && "is-urgent"),
						children: [
							/* @__PURE__ */ jsx(Icon, {
								name: "clock",
								size: 14
							}),
							" ждёт ",
							duration(waiting)
						]
					}) : lead.response_minutes !== null ? /* @__PURE__ */ jsxs("span", {
						className: "text-xs text-muted",
						children: ["ответили за ", duration(lead.response_minutes)]
					}) : null]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "lead-card__meta text-sm",
				children: [
					lead.preferred_date ? /* @__PURE__ */ jsxs("span", { children: [
						/* @__PURE__ */ jsx(Icon, {
							name: "calendar",
							size: 14
						}),
						" Хочет: ",
						lead.preferred_date,
						" ",
						lead.preferred_time ?? ""
					] }) : null,
					lead.callback_at ? /* @__PURE__ */ jsxs("span", {
						className: cx(lead.callback_overdue && "is-alert"),
						children: [
							/* @__PURE__ */ jsx(Icon, {
								name: "phone",
								size: 14
							}),
							" Перезвонить: ",
							lead.callback_at.replace("T", " "),
							lead.callback_overdue ? " — просрочено" : ""
						]
					}) : null,
					lead.assignee ? /* @__PURE__ */ jsxs("span", { children: [
						/* @__PURE__ */ jsx(Icon, {
							name: "user",
							size: 14
						}),
						" ",
						lead.assignee
					] }) : null,
					/* @__PURE__ */ jsxs("span", {
						className: "text-muted",
						children: ["Получена ", lead.created_at]
					})
				]
			}),
			lead.comment ? /* @__PURE__ */ jsxs("p", {
				className: "lead-card__comment text-sm",
				children: [
					"«",
					lead.comment,
					"»"
				]
			}) : null,
			lead.assistant_broadcast ? /* @__PURE__ */ jsx("p", {
				className: "text-xs text-muted",
				children: "Заявка от AI-ассистента · отправлена нескольким клиникам города — кто первым возьмёт в работу, того и пациент."
			}) : null,
			lead.taken_by_other_clinic ? /* @__PURE__ */ jsx("p", {
				className: "text-xs text-muted",
				children: "Пациента уже взяла в работу другая клиника."
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "lead-card__actions",
				children: [
					/* @__PURE__ */ jsxs("a", {
						className: "btn btn--primary btn--sm",
						href: `tel:${lead.phone.replace(/[^\d+]/g, "")}`,
						children: [
							/* @__PURE__ */ jsx(Icon, {
								name: "phone",
								size: 16
							}),
							" ",
							lead.phone
						]
					}),
					lead.can_take_in_work ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						onClick: () => router.post(`/clinic-cabinet/leads/${lead.id}/accept`, {}, { preserveScroll: true }),
						children: "Беру в работу"
					}) : null,
					["new", "no_answer"].includes(lead.status) ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "outline",
						onClick: () => quick({
							status: "contacted",
							callback_at: ""
						}),
						children: "Связались"
					}) : null,
					[
						"new",
						"contacted",
						"no_answer"
					].includes(lead.status) ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "outline",
						onClick: () => quick({
							status: "no_answer",
							callback_at: inHour()
						}),
						children: "Не дозвонились · через час"
					}) : null,
					lead.preferred_date && !lead.has_appointment && [
						"new",
						"contacted",
						"no_answer",
						"confirmed"
					].includes(lead.status) ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "outline",
						onClick: () => router.post(`/clinic-cabinet/leads/${lead.id}/appointment`),
						children: "Записать в календарь"
					}) : [
						"new",
						"contacted",
						"no_answer"
					].includes(lead.status) ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "outline",
						onClick: () => quick({
							status: "confirmed",
							callback_at: ""
						}),
						children: "Записан"
					}) : null,
					lead.has_appointment ? /* @__PURE__ */ jsx("a", {
						className: "btn btn--ghost btn--sm",
						href: "/clinic-cabinet/calendar",
						children: "Открыть в календаре"
					}) : null,
					/* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => setOpen((v) => !v),
						"aria-expanded": open,
						children: open ? "Скрыть" : "Подробнее"
					})
				]
			}),
			open ? /* @__PURE__ */ jsxs("form", {
				className: "form-grid lead-card__form",
				onSubmit: (e) => {
					e.preventDefault();
					form.transform((d) => ({
						...d,
						assigned_to: d.assigned_to || null,
						callback_at: d.callback_at || null,
						cancel_reason: d.cancel_reason || null
					}));
					form.put(`/clinic-cabinet/leads/${lead.id}`, { preserveScroll: true });
				},
				children: [
					/* @__PURE__ */ jsx(SelectField, {
						label: "Статус",
						value: form.data.status,
						onChange: (e) => form.setData("status", e.target.value),
						error: form.errors.status,
						children: Object.entries(statuses).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Ответственный",
						value: form.data.assigned_to,
						onChange: (e) => form.setData("assigned_to", e.target.value),
						error: form.errors.assigned_to,
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Не назначен"
						}), staff.map((s) => /* @__PURE__ */ jsx("option", {
							value: s.id,
							children: s.name
						}, s.id))]
					}),
					[
						"new",
						"contacted",
						"no_answer"
					].includes(form.data.status) ? /* @__PURE__ */ jsx(TextField, {
						label: "Перезвонить",
						type: "datetime-local",
						value: form.data.callback_at,
						onChange: (e) => form.setData("callback_at", e.target.value),
						error: form.errors.callback_at
					}) : null,
					form.data.status === "cancelled" ? /* @__PURE__ */ jsxs(SelectField, {
						label: "Причина отказа",
						value: form.data.cancel_reason,
						onChange: (e) => form.setData("cancel_reason", e.target.value),
						error: form.errors.cancel_reason,
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Не указана"
						}), Object.entries(cancelReasons).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))]
					}) : null,
					/* @__PURE__ */ jsx(TextArea, {
						className: "span-2",
						label: "Заметка клиники",
						hint: "Видна только сотрудникам клиники.",
						maxLength: 500,
						value: form.data.clinic_note,
						onChange: (e) => form.setData("clinic_note", e.target.value)
					}),
					/* @__PURE__ */ jsx("div", {
						className: "span-2",
						children: /* @__PURE__ */ jsx(Button, {
							type: "submit",
							size: "sm",
							loading: form.processing,
							children: "Сохранить"
						})
					})
				]
			}) : null
		]
	});
}
//#endregion
export { Leads as default };

//# sourceMappingURL=Leads-R9khBBKe.js.map