import { n as Button } from "./Button-C2BxTtRt.js";
import { S as SelectField, d as EmptyState, l as Badge, v as Check, w as TextField } from "../app.js";
import { r as PageHead } from "./Dash-BqP8YCar.js";
import { router, useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/DoctorSchedules.tsx
function DoctorSchedules({ doctors, weekdays, slot_minutes, kinds }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [/* @__PURE__ */ jsx(PageHead, {
			title: "Расписание врачей",
			text: "Недельный шаблон, перерывы и исключения. Если шаблона нет — используются часы филиала.",
			action: /* @__PURE__ */ jsx("a", {
				className: "link",
				href: "/clinic-cabinet/schedule",
				children: "График филиала"
			})
		}), doctors.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
			title: "Нет врачей",
			text: "Сначала добавьте врача в филиал."
		}) : doctors.map((d) => /* @__PURE__ */ jsx(DoctorCard, {
			doctor: d,
			weekdays,
			slotMinutes: slot_minutes,
			kinds
		}, d.id))]
	});
}
function DoctorCard({ doctor, weekdays, slotMinutes, kinds }) {
	const form = useForm({ days: Object.fromEntries(doctor.days.map((d) => [d.weekday, d])) });
	const extra = useForm({
		kind: "day_off",
		date_from: "",
		date_to: "",
		start_time: "09:00",
		end_time: "14:00",
		comment: ""
	});
	const setDay = (n, patch) => {
		form.setData("days", {
			...form.data.days,
			[n]: {
				...form.data.days[n],
				...patch
			}
		});
	};
	const submit = (e) => {
		e.preventDefault();
		form.put(`/clinic-cabinet/schedule/doctors/${doctor.id}`);
	};
	return /* @__PURE__ */ jsxs("article", {
		className: "card stack doc-sched",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "row row--between",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: doctor.name }), /* @__PURE__ */ jsxs("div", {
					className: "text-sm text-muted",
					children: [doctor.position, doctor.home ? "" : " · из другого филиала"]
				})] }), /* @__PURE__ */ jsxs(Badge, { children: [doctor.days.filter((d) => d.enabled).length, " дн."] })]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "doc-sched__days",
				onSubmit: submit,
				children: [weekdays.map((w) => {
					const day = form.data.days[w.n];
					if (!day) return null;
					return /* @__PURE__ */ jsxs("div", {
						className: "doc-sched__day",
						children: [/* @__PURE__ */ jsx(Check, {
							label: w.label,
							checked: day.enabled,
							onChange: (e) => setDay(w.n, { enabled: e.target.checked })
						}), /* @__PURE__ */ jsxs("div", {
							className: "doc-sched__times",
							children: [
								/* @__PURE__ */ jsx(TextField, {
									label: "С",
									type: "time",
									value: day.start_time,
									onChange: (e) => setDay(w.n, { start_time: e.target.value })
								}),
								/* @__PURE__ */ jsx(TextField, {
									label: "До",
									type: "time",
									value: day.end_time,
									onChange: (e) => setDay(w.n, { end_time: e.target.value })
								}),
								/* @__PURE__ */ jsx(TextField, {
									label: "Перерыв с",
									type: "time",
									value: day.break_start,
									onChange: (e) => setDay(w.n, { break_start: e.target.value })
								}),
								/* @__PURE__ */ jsx(TextField, {
									label: "Перерыв до",
									type: "time",
									value: day.break_end,
									onChange: (e) => setDay(w.n, { break_end: e.target.value })
								}),
								/* @__PURE__ */ jsx(SelectField, {
									label: "Шаг",
									value: String(day.slot_minutes),
									onChange: (e) => setDay(w.n, { slot_minutes: Number(e.target.value) }),
									children: slotMinutes.map((m) => /* @__PURE__ */ jsxs("option", {
										value: m,
										children: [m, " мин"]
									}, m))
								})
							]
						})]
					}, w.n);
				}), /* @__PURE__ */ jsx(Button, {
					type: "submit",
					loading: form.processing,
					children: "Сохранить шаблон"
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "stack",
				children: [
					/* @__PURE__ */ jsx("h3", { children: "Исключения" }),
					doctor.exceptions.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "Нет выходных и отпусков."
					}) : /* @__PURE__ */ jsx("ul", {
						className: "stack",
						children: doctor.exceptions.map((e) => /* @__PURE__ */ jsxs("li", {
							className: "row row--between",
							children: [/* @__PURE__ */ jsxs("span", { children: [
								e.kind_label,
								": ",
								e.date_from,
								e.date_to !== e.date_from ? ` — ${e.date_to}` : "",
								e.start_time ? ` ${e.start_time}–${e.end_time}` : "",
								e.comment ? ` · ${e.comment}` : ""
							] }), /* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => router.delete(`/clinic-cabinet/schedule/exceptions/${e.id}`),
								children: "Удалить"
							})]
						}, e.id))
					}),
					/* @__PURE__ */ jsxs("form", {
						className: "form-grid",
						onSubmit: (e) => {
							e.preventDefault();
							extra.post(`/clinic-cabinet/schedule/doctors/${doctor.id}/exceptions`, { onSuccess: () => extra.reset() });
						},
						children: [
							/* @__PURE__ */ jsx(SelectField, {
								label: "Тип",
								value: extra.data.kind,
								onChange: (e) => extra.setData("kind", e.target.value),
								children: Object.entries(kinds).map(([k, v]) => /* @__PURE__ */ jsx("option", {
									value: k,
									children: v
								}, k))
							}),
							/* @__PURE__ */ jsx(TextField, {
								label: "С",
								type: "date",
								value: extra.data.date_from,
								onChange: (e) => extra.setData("date_from", e.target.value)
							}),
							/* @__PURE__ */ jsx(TextField, {
								label: "По",
								type: "date",
								value: extra.data.date_to,
								onChange: (e) => extra.setData("date_to", e.target.value)
							}),
							extra.data.kind === "hours" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(TextField, {
								label: "С",
								type: "time",
								value: extra.data.start_time,
								onChange: (e) => extra.setData("start_time", e.target.value)
							}), /* @__PURE__ */ jsx(TextField, {
								label: "До",
								type: "time",
								value: extra.data.end_time,
								onChange: (e) => extra.setData("end_time", e.target.value)
							})] }) : null,
							/* @__PURE__ */ jsx(TextField, {
								label: "Комментарий",
								value: extra.data.comment,
								onChange: (e) => extra.setData("comment", e.target.value)
							}),
							/* @__PURE__ */ jsx(Button, {
								type: "submit",
								size: "sm",
								loading: extra.processing,
								children: "Добавить"
							})
						]
					})
				]
			})
		]
	});
}
//#endregion
export { DoctorSchedules as default };

//# sourceMappingURL=DoctorSchedules-BoMOM3QY.js.map