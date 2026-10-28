import { s as money } from "./format-BP5psl3Q.js";
import { i as LinkButton, n as Button } from "./Button-C2BxTtRt.js";
import { C as TextArea, S as SelectField, s as Alert, v as Check, w as TextField } from "../app.js";
import { o as STATUS, s as StatusBadge } from "./Dash-BqP8YCar.js";
import { n as useClinicProfileForm, t as ClinicProfileFields } from "./ClinicProfileFields-DPwNqPUN.js";
import { Link, router, useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/ClinicShow.tsx
var DAYS = {
	mon: "Пн",
	tue: "Вт",
	wed: "Ср",
	thu: "Чт",
	fri: "Пт",
	sat: "Сб",
	sun: "Вс"
};
function date(value) {
	return value ? new Date(value).toLocaleString("ru-RU", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	}) : "—";
}
function scheduleText(clinic) {
	if (clinic.is_24_7) return "Круглосуточно";
	if (!clinic.schedule || Object.keys(clinic.schedule).length === 0) return "Не заполнен";
	return Object.entries(DAYS).map(([key, label]) => clinic.schedule?.[key] ? `${label} ${clinic.schedule[key].open}–${clinic.schedule[key].close}` : `${label} выходной`).join(" · ");
}
function ClinicShow({ clinic, statuses, seoAuto, branchForm, ...options }) {
	const settings = useForm({
		status: clinic.status,
		is_verified: clinic.is_verified,
		moderation_note: clinic.moderation_note ?? "",
		seo_title: clinic.seo_title ?? "",
		seo_description: clinic.seo_description ?? ""
	});
	const { form: profile, prepare } = useClinicProfileForm(branchForm, options.propertyTypes);
	const saveProfile = (e) => {
		e.preventDefault();
		prepare();
		profile.put(`/admin/clinics/${clinic.id}/profile`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "page-head page-head--dash",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						style: { marginBottom: 8 },
						children: /* @__PURE__ */ jsx(Link, {
							href: "/admin/clinics",
							className: "link",
							children: "← К списку клиник"
						})
					}),
					/* @__PURE__ */ jsx("h1", { children: clinic.name }),
					/* @__PURE__ */ jsx("p", {
						className: "text-muted",
						children: [
							clinic.city,
							clinic.district,
							clinic.address
						].filter(Boolean).join(" · ")
					})
				] }), /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					style: { gap: 8 },
					children: [/* @__PURE__ */ jsx(StatusBadge, { status: clinic.status }), /* @__PURE__ */ jsx(LinkButton, {
						href: `/clinics/${clinic.slug}`,
						variant: "outline",
						size: "sm",
						target: "_blank",
						children: "Страница на сайте"
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("dl", {
				className: "kpi-grid",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Рейтинг" }), /* @__PURE__ */ jsx("dd", { children: clinic.rating > 0 ? clinic.rating.toFixed(1) : "—" })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Отзывы" }), /* @__PURE__ */ jsx("dd", { children: clinic.reviews_count })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Заполненность" }), /* @__PURE__ */ jsxs("dd", { children: [clinic.completeness, "%"] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Врачи" }), /* @__PURE__ */ jsx("dd", { children: clinic.stats.doctors })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Услуги с ценами" }), /* @__PURE__ */ jsx("dd", { children: clinic.stats.services })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Фото" }), /* @__PURE__ */ jsx("dd", { children: clinic.stats.photos })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Заявки" }), /* @__PURE__ */ jsx("dd", { children: clinic.stats.leads })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Цены от" }), /* @__PURE__ */ jsx("dd", { children: clinic.stats.min_price ? money(clinic.stats.min_price) : "—" })]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Сводка"
					}),
					/* @__PURE__ */ jsxs("dl", {
						className: "detail-list",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Организация" }), /* @__PURE__ */ jsxs("dd", { children: [clinic.organization ?? "—", clinic.organization_status && clinic.organization_status !== "active" ? ` (${clinic.organization_status})` : ""] })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Владелец" }), /* @__PURE__ */ jsx("dd", { children: clinic.owner ? `${clinic.owner.name} · ${clinic.owner.email}` : "Не подключён — клиника добавлена без владельца" })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Контакты" }), /* @__PURE__ */ jsx("dd", { children: [
								clinic.phone,
								clinic.email,
								clinic.website
							].filter(Boolean).join(" · ") || "—" })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "График" }), /* @__PURE__ */ jsx("dd", { children: scheduleText(clinic) })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Источник" }), /* @__PURE__ */ jsx("dd", { children: clinic.parsed ? /* @__PURE__ */ jsxs(Fragment, { children: [
								"Импорт из парсера ",
								date(clinic.parsed.imported_at),
								" ·",
								" ",
								/* @__PURE__ */ jsx("a", {
									className: "link",
									href: clinic.parsed.source_url,
									target: "_blank",
									rel: "noreferrer",
									children: "карточка на Яндекс Картах"
								})
							] }) : "Добавлена вручную или владельцем" })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Создана / изменена" }), /* @__PURE__ */ jsxs("dd", { children: [
								date(clinic.created_at),
								" / ",
								date(clinic.updated_at)
							] })] })
						]
					}),
					clinic.stats.photos === 0 || clinic.stats.services === 0 ? /* @__PURE__ */ jsx(Alert, {
						tone: "muted",
						children: "Фото, цены, врачи и график заполняются в кабинете клиники. Пока у клиники нет владельца, их можно взять из спарсенной карточки при импорте."
					}) : null
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					settings.put(`/admin/clinics/${clinic.id}`, { preserveScroll: true });
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						style: { margin: 0 },
						children: "Модерация и SEO"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "form-grid",
						children: [
							/* @__PURE__ */ jsx(SelectField, {
								label: "Статус",
								value: settings.data.status,
								onChange: (e) => settings.setData("status", e.target.value),
								children: statuses.map((s) => /* @__PURE__ */ jsx("option", {
									value: s,
									children: STATUS[s]?.label ?? s
								}, s))
							}),
							/* @__PURE__ */ jsx(Check, {
								label: "Проверена",
								checked: settings.data.is_verified,
								onChange: (e) => settings.setData("is_verified", e.target.checked)
							}),
							/* @__PURE__ */ jsx(TextField, {
								className: "span-2",
								label: "SEO title",
								maxLength: 160,
								placeholder: seoAuto.title,
								hint: settings.data.seo_title ? "Задан вручную — заменяет автоматический." : "Пусто — на сайте используется автоматический заголовок по SEO-шаблону (виден в поле серым).",
								value: settings.data.seo_title,
								onChange: (e) => settings.setData("seo_title", e.target.value),
								error: settings.errors.seo_title
							}),
							/* @__PURE__ */ jsx(TextArea, {
								className: "span-2",
								label: "SEO description",
								maxLength: 400,
								placeholder: seoAuto.description,
								hint: settings.data.seo_description ? "Задано вручную — заменяет автоматическое описание." : "Пусто — используется автоматическое описание по SEO-шаблону.",
								value: settings.data.seo_description,
								onChange: (e) => settings.setData("seo_description", e.target.value),
								error: settings.errors.seo_description
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "row row--wrap span-2",
								style: { gap: 8 },
								children: [/* @__PURE__ */ jsx(Button, {
									type: "button",
									size: "sm",
									variant: "outline",
									icon: "sparkle",
									onClick: () => settings.setData((d) => ({
										...d,
										seo_title: seoAuto.title,
										seo_description: seoAuto.description
									})),
									children: "Подставить автоматические"
								}), settings.data.seo_title || settings.data.seo_description ? /* @__PURE__ */ jsx(Button, {
									type: "button",
									size: "sm",
									variant: "ghost",
									onClick: () => settings.setData((d) => ({
										...d,
										seo_title: "",
										seo_description: ""
									})),
									children: "Вернуть автоматические"
								}) : null]
							}),
							/* @__PURE__ */ jsx(TextArea, {
								className: "span-2",
								label: "Заметка модерации",
								value: settings.data.moderation_note,
								maxLength: 500,
								onChange: (e) => settings.setData("moderation_note", e.target.value)
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "row row--wrap",
						style: { gap: 8 },
						children: [/* @__PURE__ */ jsx(Button, {
							type: "submit",
							loading: settings.processing,
							children: "Сохранить модерацию и SEO"
						}), /* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "danger",
							onClick: () => confirm("Удалить клинику без возможности восстановления?") && router.delete(`/admin/clinics/${clinic.id}`),
							children: "Удалить"
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "stack-lg",
				onSubmit: saveProfile,
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "row row--between row--wrap",
						style: { gap: 8 },
						children: [/* @__PURE__ */ jsx("h2", {
							style: { margin: 0 },
							children: "Профиль клиники"
						}), /* @__PURE__ */ jsx(Button, {
							type: "submit",
							loading: profile.processing,
							children: "Сохранить профиль"
						})]
					}),
					Object.keys(profile.errors).length > 0 ? /* @__PURE__ */ jsxs(Alert, {
						tone: "danger",
						children: ["Не сохранено: ", [...new Set(Object.values(profile.errors))].slice(0, 3).join(" ")]
					}) : null,
					/* @__PURE__ */ jsx(ClinicProfileFields, {
						form: profile,
						options,
						phoneRequired: false,
						showCoordinates: true
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						size: "lg",
						loading: profile.processing,
						children: "Сохранить профиль"
					})
				]
			})
		]
	});
}
//#endregion
export { ClinicShow as default };

//# sourceMappingURL=ClinicShow-CgTclVoA.js.map