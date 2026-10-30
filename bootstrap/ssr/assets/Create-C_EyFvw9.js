import { t as Icon } from "./Icon-_sloiNX5.js";
import { a as formatRuPhone, f as yearsWord, s as money, u as priceFrom } from "./format-BP5psl3Q.js";
import { n as Button } from "./Button-C2BxTtRt.js";
import { A as trackAnalyticsEvent, T as TextField, c as Alert, k as AnalyticsEvents, w as TextArea, x as PhoneField, y as Check } from "../app.js";
import { n as DoctorArt } from "./PhotoArt-C4p4XGJd.js";
import { Link, router, useForm } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Booking/Create.tsx
var WEEKDAYS = [
	"вс",
	"пн",
	"вт",
	"ср",
	"чт",
	"пт",
	"сб"
];
/** Сколько услуг показываем сразу; остальные — по кнопке, чтобы на телефоне не листать длинный список. */
var SERVICES_PREVIEW = 6;
var SECTION_IDS = [
	"book-service",
	"book-doctor",
	"book-date",
	"book-time",
	"book-contacts"
];
/** Плавно подводит к следующему шагу, когда он отрисуется. */
function scrollToSection(id) {
	window.setTimeout(() => {
		document.getElementById(id)?.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
	}, 80);
}
/** «сб, 31 октября» из даты YYYY-MM-DD. */
function humanDate(isoDate) {
	return (/* @__PURE__ */ new Date(`${isoDate}T12:00:00`)).toLocaleDateString("ru-RU", {
		weekday: "short",
		day: "numeric",
		month: "long"
	});
}
function iso(d) {
	return d.toISOString().slice(0, 10);
}
function addDays(isoDate, n) {
	const d = /* @__PURE__ */ new Date(`${isoDate}T12:00:00`);
	d.setDate(d.getDate() + n);
	return iso(d);
}
function BookingCreate({ clinic, branches, services, doctors, uses_doctors, initial, patient, horizon_days }) {
	useEffect(() => {
		trackAnalyticsEvent(AnalyticsEvents.bookingStart, { clinic_id: clinic.id }, clinic.city?.slug ?? null);
	}, [clinic.id, clinic.city?.slug]);
	const [serviceId, setServiceId] = useState(initial.service_id);
	const [doctorId, setDoctorId] = useState(initial.doctor_id);
	const [anyDoctor, setAnyDoctor] = useState(!initial.doctor_id && uses_doctors);
	const [from, setFrom] = useState(iso(/* @__PURE__ */ new Date()));
	const [date, setDate] = useState(null);
	const [time, setTime] = useState(null);
	const [days, setDays] = useState([]);
	const [slots, setSlots] = useState([]);
	const [loadingDays, setLoadingDays] = useState(false);
	const [loadingSlots, setLoadingSlots] = useState(false);
	const [showAllServices, setShowAllServices] = useState(false);
	const service = services.find((s) => s.id === serviceId) ?? null;
	const doctor = doctors.find((d) => d.id === doctorId) ?? null;
	const doctorReady = !uses_doctors || anyDoctor || doctorId !== null;
	const step = !doctorReady ? 1 : !date ? 2 : !time ? 3 : 4;
	const form = useForm({
		service_id: serviceId ?? "",
		doctor_id: anyDoctor || !doctorId ? "" : doctorId,
		starts_at: "",
		patient_name: patient?.name ?? "",
		patient_phone: formatRuPhone(patient?.phone ?? ""),
		is_child: false,
		notes: "",
		consent: false,
		website: ""
	});
	useEffect(() => {
		form.setData((d) => ({
			...d,
			service_id: serviceId ?? "",
			doctor_id: anyDoctor || !doctorId ? "" : doctorId,
			starts_at: date && time ? `${date} ${time}` : ""
		}));
	}, [
		serviceId,
		doctorId,
		anyDoctor,
		date,
		time
	]);
	useEffect(() => {
		const q = new URLSearchParams({
			from,
			days: "14"
		});
		if (serviceId) q.set("service", String(serviceId));
		if (doctorId && !anyDoctor) q.set("doctor", String(doctorId));
		setLoadingDays(true);
		fetch(`/api/v1/clinics/${clinic.slug}/slot-days?${q}`).then((r) => r.json()).then((json) => setDays(json.data ?? [])).finally(() => setLoadingDays(false));
	}, [
		clinic.slug,
		from,
		serviceId,
		doctorId,
		anyDoctor
	]);
	useEffect(() => {
		if (!date) {
			setSlots([]);
			return;
		}
		const q = new URLSearchParams({ date });
		if (serviceId) q.set("service", String(serviceId));
		if (doctorId && !anyDoctor) q.set("doctor", String(doctorId));
		setLoadingSlots(true);
		fetch(`/api/v1/clinics/${clinic.slug}/slots?${q}`).then((r) => r.json()).then((json) => setSlots(json.data?.slots ?? [])).finally(() => setLoadingSlots(false));
	}, [
		clinic.slug,
		date,
		serviceId,
		doctorId,
		anyDoctor
	]);
	useEffect(() => {
		if (date && days.length && !days.find((d) => d.date === date && d.count > 0)) {
			setDate(null);
			setTime(null);
		}
	}, [days, date]);
	const firstFree = useMemo(() => days.find((d) => d.count > 0)?.date ?? null, [days]);
	const submit = () => {
		form.post(`/clinics/${clinic.slug}/booking`);
	};
	const pickService = (id) => {
		setServiceId(id);
		setTime(null);
		scrollToSection(uses_doctors ? "book-doctor" : "book-date");
	};
	const pickDoctor = (id, any = false) => {
		setAnyDoctor(any);
		setDoctorId(id);
		setDate(null);
		setTime(null);
		scrollToSection("book-date");
	};
	const pickDate = (value) => {
		setDate(value);
		setTime(null);
		scrollToSection("book-time");
	};
	const pickTime = (value) => {
		setTime(value);
		scrollToSection("book-contacts");
	};
	const steps = [
		["Услуга", service?.name ?? "Консультация"],
		["Врач", uses_doctors ? anyDoctor ? "Любой свободный" : doctor?.name ?? "Выберите" : "Клиника"],
		["Дата", date ? humanDate(date) : "Выберите"],
		["Время", time ?? "Выберите"],
		["Контакты", "Имя и телефон"]
	];
	const currentStep = Math.min(step, steps.length - 1);
	const selectedIndex = services.findIndex((s) => s.id === serviceId);
	const visibleServices = !showAllServices && services.length > 7 ? services.filter((s, i) => i < SERVICES_PREVIEW || i === selectedIndex) : services;
	return /* @__PURE__ */ jsxs("div", {
		className: "container book",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "book__head",
				children: [
					/* @__PURE__ */ jsxs("p", {
						className: "text-sm text-muted",
						children: [/* @__PURE__ */ jsx(Link, {
							href: `/clinics/${clinic.slug}`,
							className: "link",
							children: clinic.name
						}), clinic.city ? ` · ${clinic.city.name}` : ""]
					}),
					/* @__PURE__ */ jsx("h1", { children: "Онлайн-запись" }),
					/* @__PURE__ */ jsx("p", {
						className: "text-muted",
						children: clinic.address
					})
				]
			}),
			branches.length > 1 ? /* @__PURE__ */ jsx("div", {
				className: "book__choice",
				children: branches.map((b) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					className: `book-card ${b.slug === clinic.slug ? "is-on" : ""}`,
					onClick: () => {
						if (b.slug !== clinic.slug) router.visit(`/clinics/${b.slug}/booking`);
					},
					children: [/* @__PURE__ */ jsx("span", {}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("b", { children: b.name }), /* @__PURE__ */ jsx("span", {
						className: "text-sm text-muted",
						children: b.address
					})] })]
				}, b.slug))
			}) : null,
			/* @__PURE__ */ jsxs("nav", {
				className: "book__steps",
				"aria-label": "Шаги записи",
				children: [/* @__PURE__ */ jsx("ol", {
					className: "book__step-list",
					children: steps.map(([title, value], i) => {
						const state = i === currentStep ? "is-current" : i < currentStep ? "is-done" : "";
						const skipped = i === 1 && !uses_doctors;
						return /* @__PURE__ */ jsx("li", {
							className: `book__step ${state}`,
							children: /* @__PURE__ */ jsxs("button", {
								type: "button",
								disabled: i > currentStep || skipped,
								"aria-current": i === currentStep ? "step" : void 0,
								onClick: () => scrollToSection(SECTION_IDS[i]),
								children: [/* @__PURE__ */ jsx("span", {
									className: "book__step-dot",
									"aria-hidden": "true",
									children: i < currentStep ? /* @__PURE__ */ jsx(Icon, {
										name: "check",
										size: 14,
										strokeWidth: 3
									}) : i + 1
								}), /* @__PURE__ */ jsxs("span", {
									className: "book__step-text",
									children: [/* @__PURE__ */ jsx("span", {
										className: "book__step-t",
										children: title
									}), /* @__PURE__ */ jsx("span", {
										className: "book__step-v",
										children: value
									})]
								})]
							})
						}, title);
					})
				}), /* @__PURE__ */ jsxs("p", {
					className: "book__now",
					children: [/* @__PURE__ */ jsxs("span", { children: [
						"Шаг ",
						currentStep + 1,
						" из ",
						steps.length
					] }), steps[currentStep][0]]
				})]
			}),
			services.length > 0 ? /* @__PURE__ */ jsxs("section", {
				className: "card stack book__section",
				id: "book-service",
				children: [
					/* @__PURE__ */ jsx("h2", { children: "Услуга" }),
					/* @__PURE__ */ jsxs("div", {
						className: "book__choice book__choice--2",
						children: [/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: `book-card ${serviceId === null ? "is-on" : ""}`,
							onClick: () => pickService(null),
							children: [/* @__PURE__ */ jsx("span", {}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("b", { children: "Консультация / осмотр" }), /* @__PURE__ */ jsx("span", {
								className: "text-sm text-muted",
								children: "30 мин, уточнит клиника"
							})] })]
						}), visibleServices.map((s) => /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: `book-card ${serviceId === s.id ? "is-on" : ""}`,
							onClick: () => pickService(s.id),
							children: [/* @__PURE__ */ jsx("span", {}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("b", { children: s.name }), /* @__PURE__ */ jsxs("span", {
								className: "text-sm text-muted",
								children: [
									s.duration,
									" мин · ",
									s.price_to ? `${money(s.price_from)}–${money(s.price_to)}` : priceFrom(s.price_from)
								]
							})] })]
						}, s.id))]
					}),
					services.length > 7 ? /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "book__more",
						onClick: () => setShowAllServices((v) => !v),
						children: [showAllServices ? "Свернуть список" : `Показать все услуги (${services.length + 1})`, /* @__PURE__ */ jsx(Icon, {
							name: showAllServices ? "chevron-up" : "chevron-down",
							size: 18
						})]
					}) : null
				]
			}) : null,
			uses_doctors ? /* @__PURE__ */ jsxs("section", {
				className: "card stack book__section",
				id: "book-doctor",
				children: [/* @__PURE__ */ jsx("h2", { children: "Врач" }), /* @__PURE__ */ jsxs("div", {
					className: "book__choice book__choice--2",
					children: [/* @__PURE__ */ jsxs("button", {
						type: "button",
						className: `book-card ${anyDoctor ? "is-on" : ""}`,
						onClick: () => pickDoctor(null, true),
						children: [/* @__PURE__ */ jsx("span", {}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("b", { children: "Любой свободный" }), /* @__PURE__ */ jsx("span", {
							className: "text-sm text-muted",
							children: "Подберём врача на выбранное время"
						})] })]
					}), doctors.map((d) => /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: `book-card ${!anyDoctor && doctorId === d.id ? "is-on" : ""}`,
						onClick: () => pickDoctor(d.id),
						children: [/* @__PURE__ */ jsx("span", {
							className: "book-card__photo",
							children: /* @__PURE__ */ jsx(DoctorArt, {
								seed: d.art_seed,
								photoUrl: d.photo_url,
								name: d.name
							})
						}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("b", { children: d.name }), /* @__PURE__ */ jsxs("span", {
							className: "text-sm text-muted",
							children: [d.position, d.experience_years ? ` · стаж ${yearsWord(d.experience_years)}` : ""]
						})] })]
					}, d.id))]
				})]
			}) : null,
			doctorReady ? /* @__PURE__ */ jsxs("section", {
				className: "card stack book__section",
				id: "book-date",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "book__section-head",
						children: [/* @__PURE__ */ jsx("h2", { children: "Дата" }), /* @__PURE__ */ jsxs("div", {
							className: "book__pager",
							children: [/* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-label": "Предыдущие дни",
								disabled: from <= iso(/* @__PURE__ */ new Date()),
								onClick: () => setFrom(addDays(from, -14)),
								children: /* @__PURE__ */ jsx(Icon, {
									name: "chevron-left",
									size: 20
								})
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-label": "Следующие дни",
								disabled: addDays(from, 14) > addDays(iso(/* @__PURE__ */ new Date()), horizon_days),
								onClick: () => setFrom(addDays(from, 14)),
								children: /* @__PURE__ */ jsx(Icon, {
									name: "chevron-right",
									size: 20
								})
							})]
						})]
					}),
					loadingDays ? /* @__PURE__ */ jsx("p", {
						className: "text-muted",
						children: "Считаем свободные дни…"
					}) : null,
					/* @__PURE__ */ jsx("div", {
						className: "book-days",
						children: days.map((d) => {
							const dt = /* @__PURE__ */ new Date(`${d.date}T12:00:00`);
							return /* @__PURE__ */ jsxs("button", {
								type: "button",
								className: `book-day ${date === d.date ? "is-on" : ""}`,
								disabled: d.count === 0,
								onClick: () => pickDate(d.date),
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "book-day__w",
										children: WEEKDAYS[dt.getDay()]
									}),
									/* @__PURE__ */ jsx("span", {
										className: "book-day__n",
										children: dt.getDate()
									}),
									/* @__PURE__ */ jsx("span", {
										className: "book-day__c",
										children: d.count ? `${d.count} св.` : "нет"
									})
								]
							}, d.date);
						})
					}),
					!loadingDays && !days.some((d) => d.count > 0) ? /* @__PURE__ */ jsx(Alert, { children: "На ближайшие дни свободных слотов нет. Попробуйте другого врача или оставьте заявку «перезвоните мне»." }) : null,
					!date && firstFree ? /* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "outline",
						size: "sm",
						icon: "flash",
						onClick: () => pickDate(firstFree),
						children: "Ближайшее свободное"
					}) : null
				]
			}) : null,
			date ? /* @__PURE__ */ jsxs("section", {
				className: "card stack book__section",
				id: "book-time",
				children: [
					/* @__PURE__ */ jsx("h2", { children: "Время" }),
					loadingSlots ? /* @__PURE__ */ jsx("p", {
						className: "text-muted",
						children: "Загружаем слоты…"
					}) : null,
					/* @__PURE__ */ jsx("div", {
						className: "book-slots",
						children: slots.map((s) => /* @__PURE__ */ jsx("button", {
							type: "button",
							className: `book-slot ${time === s.time ? "is-on" : ""}`,
							onClick: () => pickTime(s.time),
							children: s.time
						}, s.time))
					}),
					!loadingSlots && slots.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "text-muted",
						children: "На эту дату слотов нет."
					}) : null,
					form.errors.starts_at ? /* @__PURE__ */ jsx(Alert, {
						tone: "danger",
						children: form.errors.starts_at
					}) : null
				]
			}) : null,
			time ? /* @__PURE__ */ jsxs("section", {
				className: "card stack book__section",
				id: "book-contacts",
				children: [
					/* @__PURE__ */ jsx("h2", { children: "Контакты" }),
					/* @__PURE__ */ jsxs("dl", {
						className: "book-sum",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Когда" }), /* @__PURE__ */ jsxs("dd", { children: [
								date ? humanDate(date) : "",
								" в ",
								time
							] })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Где" }), /* @__PURE__ */ jsxs("dd", { children: [
								clinic.name,
								", ",
								clinic.address
							] })] }),
							doctor ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Врач" }), /* @__PURE__ */ jsx("dd", { children: doctor.name })] }) : /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Врач" }), /* @__PURE__ */ jsx("dd", { children: "Любой свободный" })] }),
							service ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Услуга" }), /* @__PURE__ */ jsxs("dd", { children: [
								service.name,
								", ",
								service.duration,
								" мин"
							] })] }) : null
						]
					}),
					/* @__PURE__ */ jsxs("form", {
						className: "form-grid",
						autoComplete: "on",
						onSubmit: (e) => {
							e.preventDefault();
							submit();
						},
						children: [
							/* @__PURE__ */ jsx(TextField, {
								label: "Ваше имя",
								required: true,
								autoComplete: "name",
								maxLength: 60,
								value: form.data.patient_name,
								onChange: (e) => form.setData("patient_name", e.target.value),
								error: form.errors.patient_name
							}),
							/* @__PURE__ */ jsx(PhoneField, {
								label: "Телефон",
								required: true,
								value: form.data.patient_phone,
								onChange: (e) => form.setData("patient_phone", e.target.value),
								error: form.errors.patient_phone
							}),
							/* @__PURE__ */ jsx(TextArea, {
								className: "span-2",
								label: "Комментарий",
								maxLength: 300,
								rows: 3,
								placeholder: "Например: удобнее после 18:00. Не указывайте диагнозы и данные документов.",
								value: form.data.notes,
								onChange: (e) => form.setData("notes", e.target.value),
								error: form.errors.notes
							}),
							/* @__PURE__ */ jsx(Check, {
								label: "Запись для ребёнка",
								checked: form.data.is_child,
								onChange: (e) => form.setData("is_child", e.target.checked)
							}),
							/* @__PURE__ */ jsx(Check, {
								label: "Согласен на обработку персональных данных",
								checked: form.data.consent,
								onChange: (e) => form.setData("consent", e.target.checked),
								error: form.errors.consent
							}),
							/* @__PURE__ */ jsx("input", {
								type: "text",
								name: "website",
								value: form.data.website,
								onChange: (e) => form.setData("website", e.target.value),
								className: "visually-hidden",
								tabIndex: -1,
								autoComplete: "off"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "book__submit span-2",
								children: /* @__PURE__ */ jsx(Button, {
									type: "submit",
									size: "lg",
									loading: form.processing,
									children: "Подтвердить запись"
								})
							})
						]
					})
				]
			}) : null
		]
	});
}
//#endregion
export { BookingCreate as default };

//# sourceMappingURL=Create-C_EyFvw9.js.map