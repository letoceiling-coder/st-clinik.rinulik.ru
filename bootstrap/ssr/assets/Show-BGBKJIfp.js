import { n as Button } from "./Button-C2BxTtRt.js";
import { T as TextField, c as Alert, w as TextArea } from "../app.js";
import { s as StatusBadge } from "./Dash-C8plSzIc.js";
import { Link, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Booking/Show.tsx
function BookingShow({ appointment, history, cancel_url, reschedule_url }) {
	const cancel = useForm({ reason: "" });
	const move = useForm({
		starts_at: "",
		comment: ""
	});
	const [openMove, setOpenMove] = useState(false);
	const [slots, setSlots] = useState([]);
	const [day, setDay] = useState(appointment.starts_at.slice(0, 10));
	useEffect(() => {
		if (!openMove || !appointment.clinic) return;
		const q = new URLSearchParams({ date: day });
		if (appointment.doctor) q.set("doctor", String(appointment.doctor.id));
		if (appointment.service) q.set("service", String(appointment.service.id));
		fetch(`/api/v1/clinics/${appointment.clinic.slug}/slots?${q}`).then((r) => r.json()).then((json) => setSlots(json.data?.slots ?? []));
	}, [
		openMove,
		day,
		appointment.clinic,
		appointment.doctor,
		appointment.service
	]);
	return /* @__PURE__ */ jsx("div", {
		className: "container book",
		children: /* @__PURE__ */ jsxs("article", {
			className: "card appt-card",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsx("h1", { children: "Ваша запись" }), /* @__PURE__ */ jsx(StatusBadge, {
						status: appointment.status,
						label: appointment.status_label
					})]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "appt-card__when",
					children: appointment.starts_at.replace(" ", " в ")
				}),
				appointment.clinic ? /* @__PURE__ */ jsxs("p", { children: [
					/* @__PURE__ */ jsx(Link, {
						href: `/clinics/${appointment.clinic.slug}`,
						className: "link",
						children: appointment.clinic.name
					}),
					/* @__PURE__ */ jsx("br", {}),
					/* @__PURE__ */ jsx("span", {
						className: "text-muted",
						children: appointment.clinic.address
					})
				] }) : null,
				/* @__PURE__ */ jsxs("dl", {
					className: "book-sum",
					children: [
						appointment.doctor ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Врач" }), /* @__PURE__ */ jsx("dd", { children: appointment.doctor.name })] }) : null,
						appointment.service ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Услуга" }), /* @__PURE__ */ jsx("dd", { children: appointment.service.name })] }) : null,
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Пациент" }), /* @__PURE__ */ jsxs("dd", { children: [
							appointment.patient_name,
							", ",
							appointment.patient_phone
						] })] }),
						appointment.requested_starts_at ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Запрошен перенос" }), /* @__PURE__ */ jsx("dd", { children: appointment.requested_starts_at })] }) : null
					]
				}),
				appointment.can_reschedule ? openMove ? /* @__PURE__ */ jsxs("form", {
					className: "stack",
					onSubmit: (e) => {
						e.preventDefault();
						move.post(reschedule_url);
					},
					children: [
						/* @__PURE__ */ jsx(TextField, {
							label: "Новая дата",
							type: "date",
							value: day,
							onChange: (e) => setDay(e.target.value)
						}),
						/* @__PURE__ */ jsx("div", {
							className: "book-slots",
							children: slots.map((s) => /* @__PURE__ */ jsx("button", {
								type: "button",
								className: `book-slot ${move.data.starts_at === `${day} ${s.time}` ? "is-on" : ""}`,
								onClick: () => move.setData("starts_at", `${day} ${s.time}`),
								children: s.time
							}, s.time))
						}),
						move.errors.starts_at ? /* @__PURE__ */ jsx(Alert, {
							tone: "danger",
							children: move.errors.starts_at
						}) : null,
						/* @__PURE__ */ jsx(TextArea, {
							label: "Комментарий",
							value: move.data.comment,
							maxLength: 300,
							onChange: (e) => move.setData("comment", e.target.value)
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "row",
							children: [/* @__PURE__ */ jsx(Button, {
								type: "submit",
								loading: move.processing,
								children: "Отправить запрос"
							}), /* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "ghost",
								onClick: () => setOpenMove(false),
								children: "Отмена"
							})]
						})
					]
				}) : /* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "outline",
					onClick: () => setOpenMove(true),
					children: "Попросить перенос"
				}) : null,
				appointment.can_cancel ? /* @__PURE__ */ jsxs("form", {
					className: "stack",
					onSubmit: (e) => {
						e.preventDefault();
						cancel.post(cancel_url);
					},
					children: [/* @__PURE__ */ jsx(TextArea, {
						label: "Причина отмены",
						value: cancel.data.reason,
						maxLength: 300,
						onChange: (e) => cancel.setData("reason", e.target.value)
					}), /* @__PURE__ */ jsx(Button, {
						type: "submit",
						variant: "danger",
						loading: cancel.processing,
						children: "Отменить запись"
					})]
				}) : null,
				history.length > 0 ? /* @__PURE__ */ jsx("ul", {
					className: "stack text-sm",
					children: history.map((h) => /* @__PURE__ */ jsxs("li", { children: [
						h.at,
						" · ",
						h.to_label,
						" · ",
						h.actor,
						h.comment ? ` — ${h.comment}` : ""
					] }, h.id))
				}) : null
			]
		})
	});
}
//#endregion
export { BookingShow as default };

//# sourceMappingURL=Show-BGBKJIfp.js.map