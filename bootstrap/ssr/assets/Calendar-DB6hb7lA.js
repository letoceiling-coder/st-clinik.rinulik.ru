import { t as Icon } from "./Icon-DQahs-u2.js";
import { n as cx } from "./format-BP5psl3Q.js";
import { n as Button } from "./Button-B5alqlNe.js";
import { C as TextArea, D as Modal, S as SelectField, b as PhoneField, d as EmptyState, l as Badge, w as TextField } from "../app.js";
import { r as PageHead, s as StatusBadge } from "./Dash-1ijSGeUC.js";
import { router, useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Calendar.tsx
var ROW_PX = 28;
var MONTH_WEEKDAYS = [
	"Пн",
	"Вт",
	"Ср",
	"Чт",
	"Пт",
	"Сб",
	"Вс"
];
function formatLocalDate(d) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseLocalDate(iso) {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, m - 1, d, 12, 0, 0, 0);
}
function calendarQuery(anchor, extra = {}) {
	const branch = new URL(window.location.href).searchParams.get("branch");
	const params = {
		anchor,
		...extra
	};
	if (branch) params.branch = branch;
	Object.keys(params).forEach((key) => {
		if (params[key] === void 0 || params[key] === null || params[key] === "") delete params[key];
	});
	return params;
}
function navigateCalendar(anchor, extra = {}) {
	router.get("/clinic-cabinet/calendar", calendarQuery(anchor, extra), {
		preserveScroll: true,
		preserveState: false
	});
}
function navParams(view, anchor, focusDay, doctorId) {
	return {
		view,
		day: focusDay,
		doctor_id: doctorId ?? void 0
	};
}
function shiftPeriod(view, anchor, weekStart, focusDay, delta, doctorId) {
	if (view === "day") {
		const d = parseLocalDate(focusDay);
		d.setDate(d.getDate() + delta);
		const next = formatLocalDate(d);
		navigateCalendar(next, navParams("day", next, next, doctorId));
		return;
	}
	if (view === "month") {
		const d = parseLocalDate(anchor);
		d.setDate(1);
		d.setMonth(d.getMonth() + delta);
		const next = formatLocalDate(d);
		navigateCalendar(next, navParams("month", next, next, doctorId));
		return;
	}
	const monday = parseLocalDate(weekStart);
	monday.setDate(monday.getDate() + delta * 7);
	const newWeekStart = formatLocalDate(monday);
	const focus = parseLocalDate(focusDay);
	const oldMonday = parseLocalDate(weekStart);
	const offset = Math.round((focus.getTime() - oldMonday.getTime()) / 864e5);
	const newFocus = parseLocalDate(newWeekStart);
	newFocus.setDate(newFocus.getDate() + Math.max(0, Math.min(6, offset)));
	navigateCalendar(newWeekStart, navParams("week", newWeekStart, formatLocalDate(newFocus), doctorId));
}
function goToday(view, doctorId) {
	const today = formatLocalDate(/* @__PURE__ */ new Date());
	navigateCalendar(today, navParams(view, today, today, doctorId));
}
function defaultStartsAt(date, hour = 10, minute = 0) {
	return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function parseLocalDateTime(value) {
	const [datePart, timePart] = value.split("T");
	const [y, m, d] = datePart.split("-").map(Number);
	const [hh, mm] = (timePart ?? "00:00").split(":").map(Number);
	return new Date(y, m - 1, d, hh, mm, 0, 0);
}
function gridRowCount(grid) {
	return (grid.end_minutes - grid.start_minutes) / grid.step_minutes;
}
function eventPosition(startsAt, durationMinutes, grid) {
	const start = parseLocalDateTime(startsAt);
	const dayStartMin = grid.start_minutes;
	const dayEndMin = grid.end_minutes;
	const startMin = start.getHours() * 60 + start.getMinutes();
	const endMin = startMin + durationMinutes;
	if (endMin <= dayStartMin || startMin >= dayEndMin) return null;
	const top = (Math.max(startMin, dayStartMin) - dayStartMin) / grid.step_minutes * ROW_PX;
	const height = (Math.min(endMin, dayEndMin) - Math.max(startMin, dayStartMin)) / grid.step_minutes * ROW_PX - 2;
	return {
		top,
		height: Math.max(height, 26)
	};
}
function hourLabels(grid) {
	const labels = [];
	const firstHour = Math.floor(grid.start_minutes / 60);
	const lastHour = Math.ceil(grid.end_minutes / 60);
	for (let h = firstHour; h < lastHour; h++) labels.push(`${String(h).padStart(2, "0")}:00`);
	return labels;
}
function minutesFromGridOffset(grid, slotIndex) {
	return grid.start_minutes + slotIndex * grid.step_minutes;
}
function isWithinWorkingHours(day, minutesFromMidnight) {
	if (!day.schedule.is_working) return false;
	return minutesFromMidnight >= day.schedule.open_minutes && minutesFromMidnight < day.schedule.close_minutes;
}
function closedOverlayStyle(grid, openMinutes, closeMinutes, bodyHeight) {
	const gridStart = grid.start_minutes;
	const beforeHeight = Math.max(0, (openMinutes - gridStart) / grid.step_minutes * ROW_PX);
	const afterTop = Math.max(0, (closeMinutes - gridStart) / grid.step_minutes * ROW_PX);
	const afterHeight = Math.max(0, bodyHeight - afterTop);
	return {
		before: beforeHeight > 0 ? { height: beforeHeight } : null,
		after: afterHeight > 0 ? {
			top: afterTop,
			height: afterHeight
		} : null
	};
}
function defaultOpenTime(day, grid) {
	if (day.schedule.is_working && day.schedule.open) {
		const [h, m] = day.schedule.open.split(":").map(Number);
		return defaultStartsAt(day.date, h, m);
	}
	const hour = Math.floor(grid.start_minutes / 60);
	const minute = grid.start_minutes % 60;
	return defaultStartsAt(day.date, hour, minute);
}
function Calendar({ anchor, week_start, period_label, focus_day, view, doctor_id, days, doctors, services, statuses, transitions = {}, reschedule_requests = [], durations, grid }) {
	const [creatingFor, setCreatingFor] = useState(null);
	const [creatingStartsAt, setCreatingStartsAt] = useState(null);
	const [editing, setEditing] = useState(null);
	const visibleDays = useMemo(() => {
		if (view === "day") return days.filter((d) => d.date === focus_day);
		if (view === "week") return days.slice(0, 7);
		return days;
	}, [
		days,
		focus_day,
		view
	]);
	const monthWeeks = useMemo(() => {
		if (view !== "month") return [];
		const weeks = [];
		for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
		return weeks;
	}, [days, view]);
	const total = useMemo(() => {
		if (view === "month") return days.filter((d) => d.in_month !== false).reduce((sum, d) => sum + d.appointments.length, 0);
		return visibleDays.reduce((sum, d) => sum + d.appointments.length, 0);
	}, [
		days,
		visibleDays,
		view
	]);
	const rows = gridRowCount(grid);
	const bodyHeight = rows * ROW_PX;
	const hourBlockPx = 60 / grid.step_minutes * ROW_PX;
	const modalOpen = creatingFor !== null || editing !== null;
	const modalTitle = editing ? "Редактирование записи" : "Новая запись";
	const closeModal = () => {
		setCreatingFor(null);
		setCreatingStartsAt(null);
		setEditing(null);
	};
	const openCreate = (date, startsAt) => {
		const day = days.find((d) => d.date === date);
		if (day && !day.schedule.is_working) return;
		setEditing(null);
		setCreatingFor(date);
		setCreatingStartsAt(startsAt ?? (day ? defaultOpenTime(day, grid) : defaultStartsAt(date)));
	};
	const openDayView = (date) => {
		navigateCalendar(date, navParams("day", date, date, doctor_id));
	};
	const handleEmptySlotClick = (day, offsetY, column) => {
		if (!day.schedule.is_working) return;
		const y = offsetY - column.getBoundingClientRect().top;
		const minutes = minutesFromGridOffset(grid, Math.max(0, Math.min(rows - 1, Math.floor(y / ROW_PX))));
		if (!isWithinWorkingHours(day, minutes)) return;
		const hour = Math.floor(minutes / 60);
		const minute = minutes % 60;
		openCreate(day.date, defaultStartsAt(day.date, hour, minute));
	};
	const formDefaults = editing ? {
		patient_name: editing.patient_name,
		patient_phone: editing.patient_phone,
		starts_at: editing.starts_at,
		duration_minutes: editing.duration_minutes,
		doctor_id: editing.doctor_id ? String(editing.doctor_id) : "",
		service_id: editing.service_id ? String(editing.service_id) : "",
		status: editing.status,
		notes: editing.notes ?? ""
	} : {
		patient_name: "",
		patient_phone: "",
		starts_at: creatingStartsAt ?? defaultStartsAt(creatingFor ?? focus_day),
		duration_minutes: 30,
		doctor_id: doctor_id ? String(doctor_id) : "",
		service_id: "",
		status: "confirmed",
		notes: ""
	};
	const prevLabel = view === "day" ? "Предыдущий день" : view === "month" ? "Предыдущий месяц" : "Предыдущая неделя";
	const nextLabel = view === "day" ? "Следующий день" : view === "month" ? "Следующий месяц" : "Следующая неделя";
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Календарь записей",
				text: "Неделя, день или месяц. Прошедшие приёмы отображаются со статусами. Клик по слоту — новая запись.",
				action: /* @__PURE__ */ jsxs(Button, {
					type: "button",
					size: "sm",
					onClick: () => {
						const day = days.find((d) => d.date === focus_day) ?? visibleDays[0];
						if (day) openCreate(day.date);
					},
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "plus",
						size: 18
					}), " Новая запись"]
				})
			}),
			reschedule_requests.length > 0 ? /* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", { children: "Запросы на перенос" }), reschedule_requests.map((a) => /* @__PURE__ */ jsxs("div", {
					className: "row row--between row--wrap",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: a.patient_name }), /* @__PURE__ */ jsxs("div", {
						className: "text-sm text-muted",
						children: [
							a.date_label,
							" → ",
							a.requested_label,
							a.doctor ? ` · ${a.doctor}` : ""
						]
					})] }), /* @__PURE__ */ jsxs("div", {
						className: "row",
						children: [/* @__PURE__ */ jsx(Button, {
							size: "sm",
							onClick: () => router.post(`/clinic-cabinet/calendar/${a.id}/reschedule/approve`),
							children: "Подтвердить"
						}), /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "outline",
							onClick: () => router.post(`/clinic-cabinet/calendar/${a.id}/reschedule/reject`),
							children: "Отклонить"
						})]
					})]
				}, a.id))]
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "cal-toolbar card row row--between row--wrap",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "row row--wrap cal-toolbar__nav",
						children: [
							/* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "outline",
								size: "sm",
								onClick: () => shiftPeriod(view, anchor, week_start, focus_day, -1, doctor_id),
								"aria-label": prevLabel,
								children: /* @__PURE__ */ jsx(Icon, {
									name: "chevron-left",
									size: 18
								})
							}),
							/* @__PURE__ */ jsx("strong", {
								className: "cal-toolbar__label",
								children: period_label
							}),
							/* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "outline",
								size: "sm",
								onClick: () => shiftPeriod(view, anchor, week_start, focus_day, 1, doctor_id),
								"aria-label": nextLabel,
								children: /* @__PURE__ */ jsx(Icon, {
									name: "chevron-right",
									size: 18
								})
							}),
							/* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "ghost",
								size: "sm",
								className: "cal-toolbar__today",
								onClick: () => goToday(view, doctor_id),
								children: "Сегодня"
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "row row--wrap cal-toolbar__filters",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "cal-view-toggle",
							role: "group",
							"aria-label": "Режим календаря",
							children: [
								/* @__PURE__ */ jsx(Button, {
									type: "button",
									size: "sm",
									variant: view === "month" ? "primary" : "outline",
									onClick: () => navigateCalendar(focus_day, navParams("month", focus_day, focus_day, doctor_id)),
									children: "Месяц"
								}),
								/* @__PURE__ */ jsx(Button, {
									type: "button",
									size: "sm",
									variant: view === "week" ? "primary" : "outline",
									onClick: () => navigateCalendar(week_start, navParams("week", week_start, focus_day, doctor_id)),
									children: "Неделя"
								}),
								/* @__PURE__ */ jsx(Button, {
									type: "button",
									size: "sm",
									variant: view === "day" ? "primary" : "outline",
									onClick: () => navigateCalendar(focus_day, navParams("day", focus_day, focus_day, doctor_id)),
									children: "День"
								})
							]
						}), /* @__PURE__ */ jsxs(SelectField, {
							label: "",
							"aria-label": "Врач",
							className: "cal-toolbar__doctor",
							value: doctor_id ? String(doctor_id) : "",
							onChange: (e) => {
								const id = e.target.value;
								navigateCalendar(anchor, { ...navParams(view, anchor, focus_day, id ? Number(id) : null) });
							},
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Все врачи"
							}), doctors.map((d) => /* @__PURE__ */ jsx("option", {
								value: d.id,
								children: d.name
							}, d.id))]
						})]
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "text-sm text-muted",
						children: ["Записей: ", total]
					})
				]
			}),
			view === "month" ? /* @__PURE__ */ jsxs("div", {
				className: "cal-month card",
				children: [/* @__PURE__ */ jsx("div", {
					className: "cal-month__weekdays",
					children: MONTH_WEEKDAYS.map((w) => /* @__PURE__ */ jsx("span", { children: w }, w))
				}), monthWeeks.map((week) => /* @__PURE__ */ jsx("div", {
					className: "cal-month__week",
					children: week.map((day) => {
						const preview = day.appointments.slice(0, 3);
						const more = day.appointments.length - preview.length;
						return /* @__PURE__ */ jsxs("div", {
							className: cx("cal-month__cell", day.in_month === false && "cal-month__cell--muted", day.is_today && "cal-month__cell--today", !day.schedule.is_working && "cal-month__cell--off"),
							children: [/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "cal-month__cell-top",
								onClick: () => openDayView(day.date),
								children: [/* @__PURE__ */ jsx("span", { children: day.label_short ?? day.date.slice(-2) }), /* @__PURE__ */ jsx("span", {
									className: "cal-month__count",
									children: day.appointments.length || ""
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "cal-month__items",
								children: [preview.map((a) => /* @__PURE__ */ jsxs("button", {
									type: "button",
									className: cx("cal-month__chip", a.source === "lead" && "cal-month__chip--lead"),
									title: `${a.time_label} ${a.patient_name} — ${a.status_label}`,
									onClick: (e) => {
										e.stopPropagation();
										setCreatingFor(null);
										setEditing(a);
									},
									children: [
										a.time_label,
										" ",
										a.patient_name
									]
								}, a.id)), more > 0 ? /* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "cal-month__more",
									onClick: () => openDayView(day.date),
									children: ["ещё ", more]
								}) : null]
							})]
						}, day.date);
					})
				}, week[0]?.date ?? week.map((d) => d.date).join("-")))]
			}) : /* @__PURE__ */ jsx("div", {
				className: "cal-grid-wrap card",
				children: /* @__PURE__ */ jsxs("div", {
					className: "cal-grid",
					style: { "--cal-cols": visibleDays.length },
					children: [/* @__PURE__ */ jsxs("div", {
						className: "cal-grid__head",
						children: [/* @__PURE__ */ jsx("div", { className: "cal-grid__gutter" }), visibleDays.map((day) => /* @__PURE__ */ jsxs("div", {
							className: cx("cal-grid__day-head", day.is_today && "cal-grid__day-head--today", !day.schedule.is_working && "cal-grid__day-head--off"),
							children: [/* @__PURE__ */ jsxs("div", {
								className: "cal-grid__day-head-main",
								children: [/* @__PURE__ */ jsx("span", { children: day.label }), /* @__PURE__ */ jsx("span", {
									className: "cal-grid__day-hours text-xs text-muted",
									children: day.schedule.hours_label
								})]
							}), /* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "ghost",
								size: "sm",
								disabled: !day.schedule.is_working,
								onClick: () => openCreate(day.date),
								children: "+"
							})]
						}, day.date))]
					}), /* @__PURE__ */ jsxs("div", {
						className: "cal-grid__body",
						children: [/* @__PURE__ */ jsx("div", {
							className: "cal-grid__times",
							style: { height: bodyHeight },
							children: hourLabels(grid).map((label) => /* @__PURE__ */ jsx("div", {
								className: "cal-grid__time",
								style: { height: hourBlockPx },
								children: label
							}, label))
						}), /* @__PURE__ */ jsx("div", {
							className: "cal-grid__cols",
							style: { gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` },
							children: visibleDays.map((day) => {
								const overlays = day.schedule.is_working ? closedOverlayStyle(grid, day.schedule.open_minutes, day.schedule.close_minutes, bodyHeight) : {
									before: { height: bodyHeight },
									after: null
								};
								return /* @__PURE__ */ jsxs("div", {
									className: cx("cal-grid__col", day.is_today && "cal-grid__col--today", !day.schedule.is_working && "cal-grid__col--closed"),
									style: { height: bodyHeight },
									onClick: (e) => {
										if (e.target.closest(".cal-grid__event")) return;
										handleEmptySlotClick(day, e.clientY, e.currentTarget);
									},
									children: [
										/* @__PURE__ */ jsx("div", {
											className: "cal-grid__lines",
											"aria-hidden": true,
											style: { backgroundSize: `100% ${ROW_PX}px` }
										}),
										overlays.before ? /* @__PURE__ */ jsx("div", {
											className: "cal-grid__closed cal-grid__closed--before",
											style: overlays.before,
											"aria-hidden": true
										}) : null,
										overlays.after ? /* @__PURE__ */ jsx("div", {
											className: "cal-grid__closed cal-grid__closed--after",
											style: overlays.after,
											"aria-hidden": true
										}) : null,
										!day.schedule.is_working ? /* @__PURE__ */ jsx("div", {
											className: "cal-grid__closed-label",
											children: "Выходной"
										}) : null,
										day.appointments.map((a) => {
											const pos = eventPosition(a.starts_at, a.duration_minutes, grid);
											if (!pos) return null;
											return /* @__PURE__ */ jsxs("button", {
												type: "button",
												className: cx("cal-grid__event", a.source === "lead" && "cal-grid__event--lead", a.is_past && "cal-grid__event--past"),
												style: {
													top: pos.top,
													height: pos.height
												},
												onClick: (e) => {
													e.stopPropagation();
													setCreatingFor(null);
													setEditing(a);
												},
												children: [
													/* @__PURE__ */ jsx("span", {
														className: "cal-grid__event-time",
														children: a.time_label
													}),
													/* @__PURE__ */ jsx("span", {
														className: "cal-grid__event-name",
														children: a.patient_name
													}),
													a.source === "lead" ? /* @__PURE__ */ jsx("span", {
														className: "cal-grid__lead-badge",
														children: /* @__PURE__ */ jsx(Badge, {
															tone: "info",
															children: "Из заявки"
														})
													}) : null,
													/* @__PURE__ */ jsx("span", {
														className: "cal-grid__event-meta text-xs text-muted",
														children: [a.service, a.doctor].filter(Boolean).join(" · ")
													}),
													/* @__PURE__ */ jsx(StatusBadge, {
														status: a.status,
														label: a.status_label
													})
												]
											}, a.id);
										})
									]
								}, day.date);
							})
						})]
					})]
				})
			}),
			/* @__PURE__ */ jsx(Modal, {
				open: modalOpen,
				onClose: closeModal,
				title: modalTitle,
				wide: true,
				children: /* @__PURE__ */ jsx(AppointmentForm, {
					defaults: formDefaults,
					doctors,
					services,
					statuses,
					transitions,
					durations,
					appointment: editing,
					onCancel: closeModal,
					onSubmit: (data) => {
						if (editing) router.put(`/clinic-cabinet/calendar/${editing.id}`, data, { onSuccess: closeModal });
						else router.post("/clinic-cabinet/calendar", data, { onSuccess: closeModal });
					}
				}, editing ? `edit-${editing.id}` : `create-${creatingFor}-${creatingStartsAt}`)
			}),
			total === 0 && !modalOpen ? /* @__PURE__ */ jsx(EmptyState, {
				title: "Записей не найдено",
				text: "Переключите период, снимите фильтр по врачу или создайте запись вручную."
			}) : null
		]
	});
}
function AppointmentForm({ defaults, doctors, services, statuses, transitions, durations, appointment, onCancel, onSubmit }) {
	const form = useForm(defaults);
	return /* @__PURE__ */ jsxs("form", {
		className: "form-grid",
		onSubmit: (e) => {
			e.preventDefault();
			onSubmit(form.data);
		},
		children: [
			/* @__PURE__ */ jsx(TextField, {
				label: "Имя пациента",
				value: String(form.data.patient_name),
				onChange: (e) => form.setData("patient_name", e.target.value),
				required: true
			}),
			/* @__PURE__ */ jsx(PhoneField, {
				label: "Телефон",
				value: String(form.data.patient_phone),
				onChange: (e) => form.setData("patient_phone", e.target.value),
				required: true
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Дата и время",
				type: "datetime-local",
				value: String(form.data.starts_at),
				onChange: (e) => form.setData("starts_at", e.target.value),
				required: true
			}),
			/* @__PURE__ */ jsx(SelectField, {
				label: "Длительность",
				value: String(form.data.duration_minutes),
				onChange: (e) => form.setData("duration_minutes", Number(e.target.value)),
				children: durations.map((m) => /* @__PURE__ */ jsxs("option", {
					value: m,
					children: [m, " мин"]
				}, m))
			}),
			/* @__PURE__ */ jsxs(SelectField, {
				label: "Врач",
				value: String(form.data.doctor_id),
				onChange: (e) => form.setData("doctor_id", e.target.value),
				children: [/* @__PURE__ */ jsx("option", {
					value: "",
					children: "Не выбран"
				}), doctors.map((d) => /* @__PURE__ */ jsx("option", {
					value: d.id,
					children: d.name
				}, d.id))]
			}),
			/* @__PURE__ */ jsxs(SelectField, {
				label: "Услуга",
				value: String(form.data.service_id),
				onChange: (e) => form.setData("service_id", e.target.value),
				children: [/* @__PURE__ */ jsx("option", {
					value: "",
					children: "Не выбрана"
				}), services.map((s) => /* @__PURE__ */ jsx("option", {
					value: s.id,
					children: s.name
				}, s.id))]
			}),
			/* @__PURE__ */ jsx(SelectField, {
				label: "Статус",
				value: String(form.data.status),
				onChange: (e) => form.setData("status", e.target.value),
				children: Object.entries(statuses).map(([k, v]) => /* @__PURE__ */ jsx("option", {
					value: k,
					children: v
				}, k))
			}),
			/* @__PURE__ */ jsx(TextArea, {
				className: "span-2",
				label: "Заметка",
				value: String(form.data.notes),
				maxLength: 500,
				onChange: (e) => form.setData("notes", e.target.value)
			}),
			appointment?.history?.length ? /* @__PURE__ */ jsx("ul", {
				className: "span-2 text-sm text-muted",
				children: appointment.history.map((h) => /* @__PURE__ */ jsxs("li", { children: [
					h.at,
					" · ",
					h.to_label,
					" · ",
					h.actor,
					h.comment ? ` — ${h.comment}` : ""
				] }, h.id))
			}) : null,
			appointment ? /* @__PURE__ */ jsx("div", {
				className: "row row--wrap span-2",
				children: (transitions[appointment.status] ?? []).map((to) => /* @__PURE__ */ jsx(Button, {
					type: "button",
					size: "sm",
					variant: to === "cancelled" || to === "no_show" ? "outline" : "ghost",
					onClick: () => router.post(`/clinic-cabinet/calendar/${appointment.id}/status`, { status: to }, { onSuccess: onCancel }),
					children: statuses[to] ?? to
				}, to))
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				children: [/* @__PURE__ */ jsx(Button, {
					type: "submit",
					loading: form.processing,
					children: "Сохранить"
				}), /* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "outline",
					onClick: onCancel,
					children: "Отмена"
				})]
			})
		]
	});
}
//#endregion
export { Calendar as default };

//# sourceMappingURL=Calendar-DB6hb7lA.js.map