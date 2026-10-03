import { t as Icon } from "./Icon-DBH8JZC9.js";
import { c as priceFrom, i as doctorsWord, l as reviewsWord, n as cx, s as phoneHref } from "./format-Cjg0FGVI.js";
import { i as LinkButton, n as Button, t as AnchorButton } from "./Button-D4s3iLUi.js";
import { S as TextField, a as Alert, b as SelectField, c as Breadcrumbs, d as Pagination, i as useLead, l as EmptyState, s as Badge, v as Check, x as TextArea } from "../app.js";
import { n as FavoriteButton, t as CompareButton } from "./CollectionButtons-BeMeUc6q.js";
import { r as ClinicFeatures, t as ClinicCard } from "./ClinicCard-DDz1EaqG.js";
import { t as DoctorCard } from "./DoctorCard-BO2YSSIl.js";
import { a as documentTitle, i as ScheduleView, n as PriceTable, r as RatingSummary, t as Gallery } from "./ClinicParts-C6-j6FfM.js";
import { t as ReviewCard } from "./ReviewCard-BB213JCW.js";
import { t as ConcernChips } from "./Tiles-yXDMQSCy.js";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
//#region resources/js/components/ReviewForm.tsx
function ReviewForm({ clinicSlug, doctors, services }) {
	const { auth } = usePage().props;
	const [hover, setHover] = useState(0);
	const form = useForm({
		rating: 0,
		title: "",
		body: "",
		visit_date: "",
		doctor_id: "",
		service_id: "",
		rules: false,
		consent: false
	});
	if (!auth.user) return /* @__PURE__ */ jsxs("div", {
		className: "card card--muted",
		children: [
			/* @__PURE__ */ jsx("h3", {
				className: "card-title",
				style: { marginBottom: 8 },
				children: "Были в этой клинике?"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-muted",
				style: { marginBottom: 16 },
				children: "Войдите, чтобы оставить отзыв. Отзывы публикуются после проверки модератором."
			}),
			/* @__PURE__ */ jsx(LinkButton, {
				href: "/login",
				variant: "dark",
				children: "Войти и написать отзыв"
			})
		]
	});
	const submit = (e) => {
		e.preventDefault();
		form.post(`/clinics/${clinicSlug}/reviews`, {
			preserveScroll: true,
			onSuccess: () => form.reset()
		});
	};
	const shown = hover || form.data.rating;
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		noValidate: true,
		className: "card stack",
		id: "review-form",
		"aria-labelledby": "review-form-title",
		children: [
			/* @__PURE__ */ jsx("h3", {
				id: "review-form-title",
				className: "card-title",
				style: { marginBottom: 0 },
				children: "Оставить отзыв"
			}),
			/* @__PURE__ */ jsxs(Alert, {
				tone: "muted",
				icon: "shield",
				children: [
					"Опишите свой опыт: что понравилось, как прошёл приём. Не указывайте диагнозы, результаты анализов и персональные данные — такие отзывы не публикуются. Подробнее в",
					" ",
					/* @__PURE__ */ jsx(Link, {
						href: "/review-rules",
						className: "link",
						children: "правилах отзывов"
					}),
					"."
				]
			}),
			/* @__PURE__ */ jsxs("fieldset", {
				style: {
					border: 0,
					padding: 0,
					margin: 0
				},
				children: [
					/* @__PURE__ */ jsxs("legend", {
						className: "field__label",
						style: { marginBottom: 8 },
						children: ["Ваша оценка ", /* @__PURE__ */ jsx("span", {
							className: "req",
							children: "*"
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "star-input",
						onMouseLeave: () => setHover(0),
						children: [
							1,
							2,
							3,
							4,
							5
						].map((n) => /* @__PURE__ */ jsxs("label", {
							onMouseEnter: () => setHover(n),
							className: n <= shown ? "is-on" : "",
							children: [
								/* @__PURE__ */ jsx("input", {
									type: "radio",
									name: "rating",
									value: n,
									checked: form.data.rating === n,
									onChange: () => form.setData("rating", n),
									className: "visually-hidden"
								}),
								/* @__PURE__ */ jsx(Icon, {
									name: "star",
									size: 34
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "visually-hidden",
									children: [n, " из 5"]
								})
							]
						}, n))
					}),
					form.errors.rating ? /* @__PURE__ */ jsx("p", {
						className: "field__error",
						role: "alert",
						children: form.errors.rating
					}) : null
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "form-grid",
				children: [
					/* @__PURE__ */ jsx(TextField, {
						label: "Заголовок",
						maxLength: 100,
						value: form.data.title,
						onChange: (e) => form.setData("title", e.target.value),
						error: form.errors.title
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Когда были на приёме",
						required: true,
						type: "date",
						max: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
						value: form.data.visit_date,
						onChange: (e) => form.setData("visit_date", e.target.value),
						error: form.errors.visit_date
					}),
					doctors.length > 0 ? /* @__PURE__ */ jsxs(SelectField, {
						label: "Врач",
						value: form.data.doctor_id,
						onChange: (e) => form.setData("doctor_id", e.target.value),
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Не указывать"
						}), doctors.map((d) => /* @__PURE__ */ jsx("option", {
							value: d.id,
							children: d.name
						}, d.id))]
					}) : null,
					services.length > 0 ? /* @__PURE__ */ jsxs(SelectField, {
						label: "Услуга",
						value: form.data.service_id,
						onChange: (e) => form.setData("service_id", e.target.value),
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Не указывать"
						}), services.map((s) => /* @__PURE__ */ jsx("option", {
							value: s.id,
							children: s.name
						}, s.id))]
					}) : null
				]
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "Ваш отзыв",
				required: true,
				rows: 6,
				maxLength: 3e3,
				value: form.data.body,
				onChange: (e) => form.setData("body", e.target.value),
				error: form.errors.body,
				hint: `${form.data.body.length}/3000 · не менее 40 символов`
			}),
			/* @__PURE__ */ jsx(Check, {
				checked: form.data.rules,
				onChange: (e) => form.setData("rules", e.target.checked),
				error: form.errors.rules,
				label: "Я описываю личный опыт и согласен с правилами публикации отзывов"
			}),
			/* @__PURE__ */ jsx(Check, {
				checked: form.data.consent,
				onChange: (e) => form.setData("consent", e.target.checked),
				error: form.errors.consent,
				label: "Согласен на обработку персональных данных и публикацию отзыва под именем и первой буквой фамилии"
			}),
			/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Button, {
				type: "submit",
				loading: form.processing,
				children: "Отправить на проверку"
			}) })
		]
	});
}
//#endregion
//#region resources/js/pages/Clinics/Show.tsx
var SECTIONS = [
	["about", "О клинике"],
	["doctors", "Врачи"],
	["prices", "Цены"],
	["reviews", "Отзывы"],
	["contacts", "Контакты"]
];
function ClinicShow({ clinic, reviews, review_filters, distribution, similar, concerns, review_options, breadcrumbs }) {
	const lead = useLead();
	const { url } = usePage();
	const [group, setGroup] = useState(0);
	const [section, setSection] = useState("about");
	const open = (extra = {}) => lead.open({
		slug: clinic.slug,
		name: clinic.name,
		phone: clinic.phone,
		doctors: review_options.doctors,
		services: review_options.services,
		source: "clinic_page",
		...extra
	});
	useEffect(() => {
		const ids = SECTIONS.map(([id]) => id);
		const io = new IntersectionObserver((entries) => {
			const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
			if (visible) setSection(visible.target.id);
		}, {
			rootMargin: "-30% 0px -60% 0px",
			threshold: [
				0,
				.2,
				.6
			]
		});
		ids.forEach((id) => {
			const el = document.getElementById(id);
			if (el) io.observe(el);
		});
		return () => io.disconnect();
	}, [url]);
	const filterReviews = (rating) => router.get(`/clinics/${clinic.slug}`, rating ? { rating } : {}, {
		preserveScroll: true,
		preserveState: true,
		replace: true,
		only: ["reviews", "review_filters"]
	});
	const activeRating = review_filters.rating ?? 0;
	const ratingCount = Object.values(distribution).reduce((a, b) => a + b, 0);
	const hasPrices = clinic.prices.length > 0;
	const currentGroup = clinic.prices[group] ?? clinic.prices[0];
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Breadcrumbs, { items: breadcrumbs }),
		/* @__PURE__ */ jsxs("div", {
			className: "container clinic-top",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "clinic-top__main",
				children: [/* @__PURE__ */ jsxs("header", {
					className: "clinic-head",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "clinic-head__badges",
							children: [
								clinic.is_verified ? /* @__PURE__ */ jsx(Badge, {
									tone: "success",
									icon: "shield",
									children: "Клиника проверена"
								}) : null,
								clinic.license.confirmed ? /* @__PURE__ */ jsx(Badge, {
									tone: "info",
									children: "Лицензия подтверждена"
								}) : null,
								clinic.is_24_7 ? /* @__PURE__ */ jsx(Badge, {
									tone: "dark",
									children: "Круглосуточно"
								}) : null,
								clinic.accepts_children ? /* @__PURE__ */ jsx(Badge, {
									tone: "primary",
									children: clinic.children_age_from ? `Дети с ${clinic.children_age_from} лет` : "Принимают детей"
								}) : null
							]
						}),
						/* @__PURE__ */ jsx("h1", { children: clinic.name }),
						clinic.tagline ? /* @__PURE__ */ jsx("p", {
							className: "clinic-head__tagline",
							children: clinic.tagline
						}) : null,
						/* @__PURE__ */ jsxs("div", {
							className: "clinic-head__meta",
							children: [
								clinic.reviews_count > 0 ? /* @__PURE__ */ jsxs("a", {
									href: "#reviews",
									className: "rating",
									children: [
										/* @__PURE__ */ jsx(Icon, {
											name: "star",
											size: 22
										}),
										clinic.rating.toFixed(1).replace(".", ","),
										/* @__PURE__ */ jsx("span", {
											className: "rating__count",
											children: reviewsWord(clinic.reviews_count)
										})
									]
								}) : /* @__PURE__ */ jsx("span", {
									className: "rating__count",
									children: "Пока нет отзывов"
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "meta-item",
									children: [
										/* @__PURE__ */ jsx(Icon, {
											name: "pin",
											size: 18
										}),
										clinic.address,
										clinic.district ? ` · ${clinic.district}` : "",
										clinic.metro ? ` · м. ${clinic.metro}` : ""
									]
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "meta-item",
									children: [/* @__PURE__ */ jsx(Icon, {
										name: "clock",
										size: 18
									}), clinic.today]
								})
							]
						})
					]
				}), /* @__PURE__ */ jsx(Gallery, {
					photos: clinic.photos,
					name: clinic.name
				})]
			}), /* @__PURE__ */ jsxs("aside", {
				className: "booking card card--shadow",
				"aria-label": "Запись в клинику",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "booking__price",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-sm text-muted",
								children: "Приём и диагностика"
							}),
							/* @__PURE__ */ jsx("b", { children: priceFrom(clinic.min_price) }),
							/* @__PURE__ */ jsx("span", {
								className: "text-xs text-muted",
								children: "Окончательную стоимость называет врач после осмотра."
							})
						]
					}),
					/* @__PURE__ */ jsx(Button, {
						size: "lg",
						block: true,
						onClick: () => open(),
						children: "Записаться онлайн"
					}),
					clinic.phone ? /* @__PURE__ */ jsx(AnchorButton, {
						href: phoneHref(clinic.phone),
						variant: "outline",
						block: true,
						icon: "phone",
						children: clinic.phone
					}) : null,
					/* @__PURE__ */ jsxs("div", {
						className: "booking__row",
						children: [/* @__PURE__ */ jsx(CompareButton, {
							type: "clinic",
							id: clinic.id,
							name: clinic.name
						}), /* @__PURE__ */ jsx(FavoriteButton, {
							type: "clinic",
							id: clinic.id,
							name: clinic.name,
							floating: false
						})]
					}),
					/* @__PURE__ */ jsx(ClinicFeatures, {
						clinic,
						limit: 8
					}),
					clinic.payment_methods.length > 0 ? /* @__PURE__ */ jsxs("p", {
						className: "text-sm text-muted",
						children: ["Оплата: ", clinic.payment_methods.join(", ")]
					}) : null
				]
			})]
		}),
		/* @__PURE__ */ jsx("nav", {
			className: "subnav",
			"aria-label": "Разделы страницы",
			children: /* @__PURE__ */ jsx("div", {
				className: "container",
				children: /* @__PURE__ */ jsx("ul", { children: SECTIONS.map(([id, label]) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("a", {
					href: `#${id}`,
					className: cx(section === id && "is-active"),
					"aria-current": section === id ? "true" : void 0,
					children: [
						label,
						id === "doctors" ? /* @__PURE__ */ jsxs("span", {
							className: "text-muted",
							children: [" ", clinic.doctors.length]
						}) : null,
						id === "reviews" ? /* @__PURE__ */ jsxs("span", {
							className: "text-muted",
							children: [" ", clinic.reviews_count]
						}) : null
					]
				}) }, id)) })
			})
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "container clinic-body",
			children: [
				/* @__PURE__ */ jsxs("section", {
					id: "about",
					className: "block",
					"aria-labelledby": "about-h",
					children: [
						/* @__PURE__ */ jsx("h2", {
							id: "about-h",
							children: "О клинике"
						}),
						clinic.description ? /* @__PURE__ */ jsx("p", {
							className: "lead-text",
							children: clinic.description
						}) : null,
						/* @__PURE__ */ jsxs("div", {
							className: "facts",
							children: [
								clinic.founded_year ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: clinic.founded_year }), /* @__PURE__ */ jsx("span", { children: "год основания" })] }) : null,
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: doctorsWord(clinic.doctors_count) }), /* @__PURE__ */ jsx("span", { children: "в клинике" })] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: clinic.specialties.length }), /* @__PURE__ */ jsx("span", { children: "направлений" })] })
							]
						}),
						clinic.specialties.length > 0 ? /* @__PURE__ */ jsx("ul", {
							className: "tags",
							"aria-label": "Направления",
							children: clinic.specialties.map((s) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("span", {
								className: "chip chip--soft",
								children: s.name
							}) }, s.slug))
						}) : null,
						clinic.achievements.length > 0 ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", { children: "Достижения и награды" }), /* @__PURE__ */ jsx("ul", {
							className: "check-list",
							children: clinic.achievements.map((a) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx(Icon, {
								name: "award",
								size: 20
							}), a] }, a))
						})] }) : null,
						clinic.restrictions ? /* @__PURE__ */ jsxs(Alert, {
							tone: "warning",
							icon: "alert",
							children: [
								/* @__PURE__ */ jsx("b", { children: "Ограничения приёма." }),
								" ",
								clinic.restrictions
							]
						}) : null,
						concerns.length > 0 ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", { children: "С чем обращаются в эту клинику" }), /* @__PURE__ */ jsx(ConcernChips, {
							concerns,
							scroll: false
						})] }) : null
					]
				}),
				/* @__PURE__ */ jsxs("section", {
					id: "doctors",
					className: "block",
					"aria-labelledby": "doctors-h",
					children: [/* @__PURE__ */ jsx("h2", {
						id: "doctors-h",
						children: "Врачи клиники"
					}), clinic.doctors.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
						icon: "users",
						title: "Врачи пока не добавлены"
					}) : /* @__PURE__ */ jsx("div", {
						className: "grid grid--doctors grid--2",
						children: clinic.doctors.map((d) => /* @__PURE__ */ jsx(DoctorCard, { doctor: {
							...d,
							clinic: d.clinic ?? {
								id: clinic.id,
								slug: clinic.slug,
								name: clinic.name,
								address: clinic.address,
								phone: clinic.phone,
								city: clinic.city,
								rating: clinic.rating,
								is_verified: clinic.is_verified,
								same_day: clinic.same_day
							}
						} }, d.id))
					})]
				}),
				/* @__PURE__ */ jsxs("section", {
					id: "prices",
					className: "block",
					"aria-labelledby": "prices-h",
					children: [/* @__PURE__ */ jsx("h2", {
						id: "prices-h",
						children: "Услуги и цены"
					}), !hasPrices ? /* @__PURE__ */ jsx(EmptyState, {
						icon: "ruble",
						title: "Прайс пока не опубликован",
						text: "Уточните стоимость по телефону или в заявке."
					}) : /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsx("div", {
							className: "chip-scroll",
							role: "tablist",
							"aria-label": "Группы услуг",
							children: clinic.prices.map((g, i) => /* @__PURE__ */ jsx("button", {
								role: "tab",
								"aria-selected": group === i,
								type: "button",
								className: cx("chip", group === i && "is-active"),
								onClick: () => setGroup(i),
								children: g.group
							}, g.group))
						}),
						/* @__PURE__ */ jsx(PriceTable, { items: currentGroup.items }),
						/* @__PURE__ */ jsx("p", {
							className: "text-xs text-muted",
							children: "Цены указаны «от». Окончательная стоимость определяется врачом после осмотра и согласования плана лечения. Не является публичной офертой."
						})
					] })]
				}),
				/* @__PURE__ */ jsxs("section", {
					id: "reviews",
					className: "block",
					"aria-labelledby": "reviews-h",
					children: [
						/* @__PURE__ */ jsx("h2", {
							id: "reviews-h",
							children: "Отзывы пациентов"
						}),
						/* @__PURE__ */ jsx(RatingSummary, {
							rating: clinic.rating,
							count: ratingCount || clinic.reviews_count,
							distribution,
							active: activeRating,
							onPick: filterReviews
						}),
						reviews.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
							icon: "thumb",
							title: activeRating ? "Нет отзывов с такой оценкой" : "Отзывов пока нет",
							text: "Поделитесь опытом после визита — отзыв появится после проверки модератором."
						}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
							className: "stack-lg",
							children: reviews.data.map((r) => /* @__PURE__ */ jsx(ReviewCard, { review: r }, r.id))
						}), /* @__PURE__ */ jsx(Pagination, {
							page: reviews,
							only: ["reviews", "review_filters"],
							keepScroll: true
						})] }),
						/* @__PURE__ */ jsx(ReviewForm, {
							clinicSlug: clinic.slug,
							doctors: review_options.doctors,
							services: review_options.services
						})
					]
				}),
				/* @__PURE__ */ jsxs("section", {
					id: "contacts",
					className: "block",
					"aria-labelledby": "contacts-h",
					children: [
						/* @__PURE__ */ jsx("h2", {
							id: "contacts-h",
							children: "Контакты и режим работы"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "two-col two-col--even",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "card",
								children: [/* @__PURE__ */ jsxs("ul", {
									className: "contact-list",
									children: [
										/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx(Icon, {
											name: "pin",
											size: 20
										}), /* @__PURE__ */ jsxs("span", { children: [clinic.address, clinic.metro ? /* @__PURE__ */ jsxs("span", {
											className: "text-muted",
											children: [" · м. ", clinic.metro]
										}) : null] })] }),
										clinic.phone ? /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx(Icon, {
											name: "phone",
											size: 20
										}), /* @__PURE__ */ jsx("a", {
											href: phoneHref(clinic.phone),
											className: "link",
											children: clinic.phone
										})] }) : null,
										clinic.email ? /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx(Icon, {
											name: "mail",
											size: 20
										}), /* @__PURE__ */ jsx("a", {
											href: `mailto:${clinic.email}`,
											className: "link",
											children: clinic.email
										})] }) : null,
										clinic.website ? /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx(Icon, {
											name: "globe",
											size: 20
										}), /* @__PURE__ */ jsx("a", {
											href: clinic.website,
											className: "link",
											rel: "nofollow noopener noreferrer",
											target: "_blank",
											children: clinic.website.replace(/^https?:\/\//, "")
										})] }) : null
									]
								}), clinic.lat && clinic.lng ? /* @__PURE__ */ jsxs("a", {
									className: "map-link",
									href: `https://yandex.ru/maps/?pt=${clinic.lng},${clinic.lat}&z=16&l=map`,
									target: "_blank",
									rel: "noopener noreferrer",
									children: [/* @__PURE__ */ jsx(Icon, {
										name: "pin",
										size: 18
									}), " Показать на карте"]
								}) : null]
							}), /* @__PURE__ */ jsx("div", {
								className: "card",
								children: /* @__PURE__ */ jsx(ScheduleView, { week: clinic.week })
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "card card--muted legal",
							children: [
								/* @__PURE__ */ jsx("h3", { children: "Юридическая информация" }),
								clinic.organization ? /* @__PURE__ */ jsx("p", { children: clinic.organization.legal_name ?? clinic.organization.name }) : null,
								clinic.license.number ? /* @__PURE__ */ jsxs("p", { children: [
									"Лицензия № ",
									clinic.license.number,
									clinic.license.issuer ? `, выдана: ${clinic.license.issuer}` : "",
									clinic.license.confirmed ? " — документ проверен модератором." : " — документ ещё не проверен."
								] }) : /* @__PURE__ */ jsx("p", { children: "Номер лицензии не указан." }),
								clinic.documents.length > 0 ? /* @__PURE__ */ jsx("ul", {
									className: "check-list",
									children: clinic.documents.map((d, i) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx(Icon, {
										name: "file",
										size: 18
									}), documentTitle(d)] }, i))
								}) : null,
								/* @__PURE__ */ jsx("p", {
									className: "text-xs text-muted",
									children: "Имеются противопоказания. Необходима консультация специалиста."
								})
							]
						})
					]
				}),
				similar.length > 0 ? /* @__PURE__ */ jsxs("section", {
					className: "block",
					"aria-labelledby": "similar-h",
					children: [/* @__PURE__ */ jsx("h2", {
						id: "similar-h",
						children: "Похожие клиники"
					}), /* @__PURE__ */ jsx("div", {
						className: "grid grid--cards",
						children: similar.map((c) => /* @__PURE__ */ jsx(ClinicCard, {
							clinic: c,
							layout: "tile"
						}, c.id))
					})]
				}) : null
			]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "sticky-cta",
			role: "region",
			"aria-label": "Быстрая запись",
			children: [
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: priceFrom(clinic.min_price) }), /* @__PURE__ */ jsx("span", {
					className: "text-xs text-muted",
					children: "приём и диагностика"
				})] }),
				clinic.phone ? /* @__PURE__ */ jsx("a", {
					className: "btn btn--outline btn--icon btn--round",
					href: phoneHref(clinic.phone),
					"aria-label": "Позвонить",
					children: /* @__PURE__ */ jsx(Icon, {
						name: "phone",
						size: 20
					})
				}) : null,
				/* @__PURE__ */ jsx(Button, {
					onClick: () => open(),
					children: "Записаться"
				})
			]
		})
	] });
}
//#endregion
export { ClinicShow as default };

//# sourceMappingURL=Show-LUJu56VM.js.map