import { n as Button } from "./Button-C2BxTtRt.js";
import { C as TextArea, D as Modal, _ as Tabs, d as EmptyState, s as Alert, w as TextField } from "../app.js";
import { c as Table, i as PagerSafe, r as PageHead, s as StatusBadge } from "./Dash-BqP8YCar.js";
import { Link, router, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Account/Appointments.tsx
function Appointments({ appointments, scope, counts }) {
	const [moving, setMoving] = useState(null);
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Мои записи",
				text: "Отмена и перенос — до начала приёма. Перенос подтверждает клиника."
			}),
			/* @__PURE__ */ jsx(Tabs, {
				label: "Период",
				value: scope,
				items: [{
					key: "upcoming",
					label: "Предстоящие",
					count: counts.upcoming
				}, {
					key: "past",
					label: "Прошедшие"
				}],
				onChange: (k) => router.get("/account/appointments", k === "past" ? { scope: "past" } : {})
			}),
			appointments.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
				title: scope === "upcoming" ? "Записей нет" : "Прошлых записей нет",
				text: "Запишитесь со страницы клиники."
			}) : /* @__PURE__ */ jsx(Table, {
				headers: [
					"Когда",
					"Клиника",
					"Статус",
					""
				],
				children: appointments.data.map((a) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("b", { children: a.starts_at.replace(" ", " в ") }), a.requested_starts_at ? /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted",
						children: ["Запрошен перенос на ", a.requested_starts_at]
					}) : null] }),
					/* @__PURE__ */ jsxs("td", { children: [a.clinic ? /* @__PURE__ */ jsx(Link, {
						href: `/clinics/${a.clinic.slug}`,
						className: "link",
						children: a.clinic.name
					}) : "—", /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: a.doctor?.name ?? a.service?.name ?? a.clinic?.address
					})] }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StatusBadge, {
						status: a.status,
						label: a.status_label
					}) }),
					/* @__PURE__ */ jsxs("td", {
						className: "actions",
						children: [a.can_reschedule ? /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => setMoving(a),
							children: "Перенести"
						}) : null, a.can_cancel ? /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => router.post(`/account/appointments/${a.id}/cancel`),
							children: "Отменить"
						}) : null]
					})
				] }, a.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: appointments }),
			moving ? /* @__PURE__ */ jsx(RescheduleModal, {
				appointment: moving,
				onClose: () => setMoving(null)
			}) : null
		]
	});
}
function RescheduleModal({ appointment, onClose }) {
	const form = useForm({
		starts_at: "",
		comment: ""
	});
	const [day, setDay] = useState(appointment.starts_at.slice(0, 10));
	const [slots, setSlots] = useState([]);
	useEffect(() => {
		if (!appointment.clinic) return;
		const q = new URLSearchParams({ date: day });
		if (appointment.doctor) q.set("doctor", String(appointment.doctor.id));
		fetch(`/api/v1/clinics/${appointment.clinic.slug}/slots?${q}`).then((r) => r.json()).then((json) => setSlots(json.data?.slots ?? []));
	}, [appointment, day]);
	return /* @__PURE__ */ jsx(Modal, {
		open: true,
		onClose,
		title: "Перенос записи",
		children: /* @__PURE__ */ jsxs("form", {
			className: "stack",
			onSubmit: (e) => {
				e.preventDefault();
				form.post(`/account/appointments/${appointment.id}/reschedule`, { onSuccess: onClose });
			},
			children: [
				/* @__PURE__ */ jsx(TextField, {
					label: "Дата",
					type: "date",
					value: day,
					onChange: (e) => setDay(e.target.value)
				}),
				/* @__PURE__ */ jsx("div", {
					className: "book-slots",
					children: slots.map((s) => /* @__PURE__ */ jsx("button", {
						type: "button",
						className: `book-slot ${form.data.starts_at === `${day} ${s.time}` ? "is-on" : ""}`,
						onClick: () => form.setData("starts_at", `${day} ${s.time}`),
						children: s.time
					}, s.time))
				}),
				form.errors.starts_at ? /* @__PURE__ */ jsx(Alert, {
					tone: "danger",
					children: form.errors.starts_at
				}) : null,
				/* @__PURE__ */ jsx(TextArea, {
					label: "Комментарий",
					value: form.data.comment,
					maxLength: 300,
					onChange: (e) => form.setData("comment", e.target.value)
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "row",
					children: [/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						children: "Отправить запрос"
					}), /* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "ghost",
						onClick: onClose,
						children: "Закрыть"
					})]
				})
			]
		})
	});
}
//#endregion
export { Appointments as default };

//# sourceMappingURL=Appointments-mrwLYGpT.js.map