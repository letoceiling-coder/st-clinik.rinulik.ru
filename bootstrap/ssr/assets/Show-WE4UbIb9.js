import { t as Icon } from "./Icon-_sloiNX5.js";
import { s as money } from "./format-BP5psl3Q.js";
import { n as Button, t as AnchorButton } from "./Button-C2BxTtRt.js";
import { C as TextArea, b as PhoneField, s as Alert, v as Check, w as TextField } from "../app.js";
import { t as ClinicCard } from "./ClinicCard-BNgGJWfR.js";
import { Link, useForm, usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Offer/Show.tsx
function OfferShow({ offer, clinic, stats, tariffs, plans, prepared, extra_html, trial, preview_url, about_url, demo_url, claim_url, manager }) {
	const { flash } = usePage().props;
	const form = useForm({
		name: "",
		phone: "",
		email: "",
		position: "",
		comment: "",
		consent: false
	});
	const submit = (e) => {
		e.preventDefault();
		form.post(`/offer/${offer.token}/apply`, {
			preserveScroll: true,
			onSuccess: () => form.reset()
		});
	};
	const sent = offer.applied || Boolean(flash?.success);
	return /* @__PURE__ */ jsxs("div", {
		className: "container offer-page",
		children: [
			/* @__PURE__ */ jsxs("section", {
				className: "offer-hero card",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "offer-hero__text stack",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "offer-hero__eyebrow text-sm",
							children: ["Персональное предложение", stats.city ? ` · ${stats.city}` : ""]
						}),
						/* @__PURE__ */ jsx("h1", {
							className: "offer-hero__title",
							children: offer.title
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "offer-hero__actions",
							children: [claim_url ? /* @__PURE__ */ jsx(AnchorButton, {
								href: claim_url,
								size: "lg",
								children: trial.enabled ? `Попробовать бесплатно ${trial.days} дней` : "Подключить клинику"
							}) : /* @__PURE__ */ jsx(AnchorButton, {
								href: "#connect",
								size: "lg",
								children: "Подключиться"
							}), demo_url ? /* @__PURE__ */ jsx(AnchorButton, {
								href: demo_url,
								size: "lg",
								variant: "outline",
								icon: "eye",
								children: "Демо-кабинет клиники"
							}) : null]
						}),
						/* @__PURE__ */ jsxs("ul", {
							className: "offer-links",
							children: [/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("a", {
								className: "link",
								href: preview_url,
								target: "_blank",
								rel: "noopener",
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "globe",
									size: 16
								}), " Как будет выглядеть страница клиники"]
							}) }), /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("a", {
								className: "link",
								href: about_url,
								target: "_blank",
								rel: "noopener",
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "file",
									size: 16
								}), " Подробнее о сервисе и возможностях"]
							}) })]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "text-xs text-muted",
							children: "Демо-кабинет открывается без регистрации и только для просмотра — данные заявок в нём примерные."
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "offer-hero__preview",
					"aria-label": "Так клиника выглядит в каталоге",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "text-xs text-muted",
						children: [
							"Так «",
							clinic.name,
							"» увидят пациенты"
						]
					}), /* @__PURE__ */ jsx(ClinicCard, {
						clinic,
						layout: "tile",
						interactive: false
					})]
				})]
			}),
			flash?.error ? /* @__PURE__ */ jsx(Alert, {
				tone: "warning",
				children: flash.error
			}) : null,
			/* @__PURE__ */ jsxs("section", {
				className: "offer-stats",
				"aria-label": "Клиника и город",
				children: [
					/* @__PURE__ */ jsx(Stat, {
						label: "Рейтинг на Яндекс Картах",
						value: stats.yandex_rating ? stats.yandex_rating.toFixed(1).replace(".", ",") : "—",
						hint: `${stats.yandex_reviews} отзывов`
					}),
					/* @__PURE__ */ jsx(Stat, {
						label: `Стоматологий${stats.city ? ` в городе ${stats.city}` : ""}`,
						value: String(stats.competitors),
						hint: "ваши конкуренты за пациента"
					}),
					/* @__PURE__ */ jsx(Stat, {
						label: "Клиник уже на СтомКлиник",
						value: String(stats.platform_clinics),
						hint: "в этом городе"
					}),
					/* @__PURE__ */ jsx(Stat, {
						label: "Просмотров карточек клиник",
						value: stats.platform_views,
						hint: "в этом городе"
					})
				]
			}),
			offer.html ? /* @__PURE__ */ jsx("article", {
				className: "offer-body card",
				dangerouslySetInnerHTML: { __html: offer.html }
			}) : null,
			extra_html ? /* @__PURE__ */ jsxs("section", {
				className: "offer-extra card",
				"aria-label": "Специальное предложение",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "offer-extra__badge",
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "sparkle",
						size: 16
					}), " Специально для вас"]
				}), /* @__PURE__ */ jsx("div", {
					className: "offer-body",
					dangerouslySetInnerHTML: { __html: extra_html }
				})]
			}) : null,
			/* @__PURE__ */ jsxs("section", {
				className: "stack",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "offer-section-title",
						children: "Мы уже подготовили вашу карточку"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "Данные собраны из открытых источников. После подключения вы сможете проверить и дополнить их в кабинете."
					}),
					/* @__PURE__ */ jsx("ul", {
						className: "offer-prepared",
						children: prepared.map((item) => /* @__PURE__ */ jsxs("li", {
							className: item.done ? "is-done" : "",
							children: [/* @__PURE__ */ jsx(Icon, {
								name: item.done ? "check-circle" : "plus",
								size: 20
							}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("b", { children: item.label }), /* @__PURE__ */ jsx("span", {
								className: "text-sm text-muted",
								children: item.done ? item.value ?? "заполнено" : "добавите в кабинете"
							})] })]
						}, item.label))
					})
				]
			}),
			plans.length > 0 ? /* @__PURE__ */ jsxs("section", {
				className: "stack",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "offer-section-title",
						children: "Тарифы"
					}),
					trial.enabled ? /* @__PURE__ */ jsxs("p", {
						className: "text-sm",
						children: [/* @__PURE__ */ jsxs("b", { children: [
							"Первые ",
							trial.days,
							" дней — бесплатно"
						] }), " с полным набором возможностей, без привязки карты."]
					}) : null,
					/* @__PURE__ */ jsx("div", {
						className: "offer-tariffs",
						children: plans.map((t) => /* @__PURE__ */ jsxs("div", {
							className: "offer-tariff card",
							children: [
								/* @__PURE__ */ jsx("b", { children: t.name }),
								t.description ? /* @__PURE__ */ jsx("p", {
									className: "text-sm text-muted",
									children: t.description
								}) : null,
								/* @__PURE__ */ jsxs("div", {
									className: "offer-tariff__price",
									children: [t.is_free ? "Бесплатно" : money(t.price), t.is_free ? null : /* @__PURE__ */ jsxs("span", {
										className: "text-sm text-muted",
										children: [
											" / ",
											t.days,
											" дн."
										]
									})]
								}),
								/* @__PURE__ */ jsx("ul", {
									className: "offer-tariff__list",
									children: [...t.features, ...t.limits].map((f) => /* @__PURE__ */ jsxs("li", { children: [
										/* @__PURE__ */ jsx(Icon, {
											name: "check",
											size: 16
										}),
										" ",
										f
									] }, f))
								})
							]
						}, t.name))
					})
				]
			}) : null,
			tariffs.length > 0 ? /* @__PURE__ */ jsxs("section", {
				className: "stack",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "offer-section-title",
						children: "Продвижение в каталоге"
					}),
					/* @__PURE__ */ jsx("div", {
						className: "offer-tariffs",
						children: tariffs.map((t) => /* @__PURE__ */ jsxs("div", {
							className: "offer-tariff card",
							children: [
								/* @__PURE__ */ jsx("b", { children: t.name }),
								t.description ? /* @__PURE__ */ jsx("p", {
									className: "text-sm text-muted",
									children: t.description
								}) : null,
								/* @__PURE__ */ jsxs("div", {
									className: "offer-tariff__price",
									children: [t.price !== null ? money(t.price) : "по запросу", /* @__PURE__ */ jsxs("span", {
										className: "text-sm text-muted",
										children: [
											" / ",
											t.days,
											" дн."
										]
									})]
								})
							]
						}, t.name))
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted",
						children: "Дополнительные пакеты поднимают карточку в выдаче. Цены указаны для вашего города."
					})
				]
			}) : null,
			/* @__PURE__ */ jsxs("section", {
				id: "connect",
				className: "offer-connect card",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [
						/* @__PURE__ */ jsx("h2", {
							className: "offer-section-title",
							children: "Подключиться"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted",
							children: claim_url ? "Можно сразу забрать черновик в кабинет (кнопка выше) или оставить заявку — менеджер поможет с подключением." : "Оставьте контакты — менеджер подтвердит, что вы представляете клинику, и передаст доступ к кабинету. Карточка уже заполнена, останется проверить данные."
						}),
						manager.name || manager.phone ? /* @__PURE__ */ jsxs("p", {
							className: "text-sm",
							children: [
								"Ваш менеджер: ",
								/* @__PURE__ */ jsx("b", { children: manager.name }),
								manager.phone ? /* @__PURE__ */ jsxs(Fragment, { children: [" · ", /* @__PURE__ */ jsx("a", {
									className: "link",
									href: `tel:${manager.phone.replace(/[^\d+]/g, "")}`,
									children: manager.phone
								})] }) : null
							]
						}) : null
					]
				}), sent ? /* @__PURE__ */ jsx(Alert, {
					tone: "success",
					icon: "check-circle",
					children: "Заявка отправлена. Менеджер свяжется с вами в рабочее время."
				}) : /* @__PURE__ */ jsxs("form", {
					className: "offer-connect__form",
					onSubmit: submit,
					noValidate: true,
					children: [
						/* @__PURE__ */ jsx(TextField, {
							label: "Имя",
							value: form.data.name,
							onChange: (e) => form.setData("name", e.target.value),
							error: form.errors.name,
							required: true,
							autoComplete: "name"
						}),
						/* @__PURE__ */ jsx(PhoneField, {
							label: "Телефон",
							value: form.data.phone,
							onChange: (e) => form.setData("phone", e.target.value),
							error: form.errors.phone,
							required: true
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Email",
							type: "email",
							value: form.data.email,
							onChange: (e) => form.setData("email", e.target.value),
							error: form.errors.email,
							autoComplete: "email"
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Должность",
							autoComplete: "organization-title",
							value: form.data.position,
							onChange: (e) => form.setData("position", e.target.value),
							error: form.errors.position,
							placeholder: "Главный врач, администратор…"
						}),
						/* @__PURE__ */ jsx(TextArea, {
							label: "Комментарий",
							className: "offer-connect__wide",
							rows: 3,
							maxLength: 2e3,
							value: form.data.comment,
							onChange: (e) => form.setData("comment", e.target.value),
							error: form.errors.comment
						}),
						/* @__PURE__ */ jsx(Check, {
							className: "offer-connect__wide",
							checked: form.data.consent,
							onChange: (e) => form.setData("consent", e.target.checked),
							error: form.errors.consent,
							label: /* @__PURE__ */ jsxs(Fragment, { children: [
								"Согласен на обработку персональных данных (имя, телефон, email) для связи по подключению —",
								" ",
								/* @__PURE__ */ jsx(Link, {
									href: "/consent",
									className: "link",
									target: "_blank",
									children: "согласие"
								})
							] })
						}),
						/* @__PURE__ */ jsx("div", {
							className: "offer-connect__wide",
							children: /* @__PURE__ */ jsx(Button, {
								type: "submit",
								size: "lg",
								loading: form.processing,
								children: "Отправить заявку"
							})
						})
					]
				})]
			})
		]
	});
}
function Stat({ label, value, hint }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "offer-stat card",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "text-sm text-muted",
				children: label
			}),
			/* @__PURE__ */ jsx("b", {
				className: "offer-stat__value",
				children: value
			}),
			hint ? /* @__PURE__ */ jsx("span", {
				className: "text-xs text-muted",
				children: hint
			}) : null
		]
	});
}
//#endregion
export { OfferShow as default };

//# sourceMappingURL=Show-WE4UbIb9.js.map