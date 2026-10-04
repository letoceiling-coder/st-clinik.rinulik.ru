import { t as Icon } from "./Icon-DBH8JZC9.js";
import { i as doctorsWord, l as priceFrom, t as clinicsWord, u as reviewsWord } from "./format-BPZIj7DQ.js";
import { i as LinkButton } from "./Button-DsM_qe4F.js";
import { f as SectionHead, n as useCity, r as SearchBox } from "../app.js";
import { t as HERO_PHOTOS } from "./demo-images-CwyQSe03.js";
import { t as ClinicCard } from "./ClinicCard-DDWUGGqt.js";
import { t as DoctorCard } from "./DoctorCard-IUFtL7lg.js";
import { t as ReviewCard } from "./ReviewCard-DFFXdP3W.js";
import { n as SpecialtyCircles, r as SpecialtyTile, t as ConcernChips } from "./Tiles-CdLD_ZE2.js";
import { Link } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Home.tsx
var TRUST = [
	{
		icon: "shield",
		title: "Проверяем лицензии",
		text: "Модераторы сверяют документы клиник и отмечают подтверждённые профили."
	},
	{
		icon: "thumb",
		title: "Отзывы после модерации",
		text: "Публикуем только личный опыт пациентов: без рекламы, диагнозов и персональных данных."
	},
	{
		icon: "ruble",
		title: "Честные цены «от»",
		text: "Показываем минимальные цены клиник. Итоговую стоимость называет врач после осмотра."
	}
];
function Home({ stats, concerns, popular_services, specialties, top_clinics, top_doctors, latest_reviews }) {
	const city = useCity();
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("section", {
			className: "hero",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container hero__grid",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "hero__copy",
					children: [
						/* @__PURE__ */ jsx("p", {
							className: "eyebrow",
							children: "Стоматологии по всей России"
						}),
						/* @__PURE__ */ jsxs("h1", { children: [
							"Найдите стоматолога",
							/* @__PURE__ */ jsx("br", {}),
							city.nameIn
						] }),
						/* @__PURE__ */ jsx("p", {
							className: "hero__lead",
							children: "Сравнивайте клиники и врачей по цене, рейтингу и отзывам. Записывайтесь онлайн или по телефону."
						}),
						/* @__PURE__ */ jsx(SearchBox, { variant: "hero" }),
						/* @__PURE__ */ jsxs("div", {
							className: "hero__quick",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "text-muted text-sm",
									children: "Часто ищут:"
								}),
								/* @__PURE__ */ jsx(Link, {
									href: city.path("clinics", { same_day: 1 }),
									className: "chip chip--soft",
									children: "Запись на сегодня"
								}),
								/* @__PURE__ */ jsx(Link, {
									href: city.path("clinics", { is_24_7: 1 }),
									className: "chip chip--soft",
									children: "Круглосуточно"
								}),
								/* @__PURE__ */ jsx(Link, {
									href: city.path("clinics", { children: 1 }),
									className: "chip chip--soft",
									children: "Детская стоматология"
								}),
								/* @__PURE__ */ jsx(Link, {
									href: city.path("clinics", { installment: 1 }),
									className: "chip chip--soft",
									children: "Рассрочка"
								})
							]
						}),
						/* @__PURE__ */ jsxs("dl", {
							className: "hero__stats hero__stats--inline",
							"aria-label": "Сервис в цифрах",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Клиник" }), /* @__PURE__ */ jsx("dd", { children: stats.clinics })] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Врачей" }), /* @__PURE__ */ jsx("dd", { children: stats.doctors })] }),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: "Отзывов" }), /* @__PURE__ */ jsx("dd", { children: stats.reviews })] })
							]
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "hero__visual",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "hero__photo hero__photo--main",
							children: /* @__PURE__ */ jsx("img", {
								src: HERO_PHOTOS[0],
								alt: "",
								width: 640,
								height: 400,
								loading: "eager",
								decoding: "async"
							})
						}),
						/* @__PURE__ */ jsx("div", {
							className: "hero__photo hero__photo--sub hero__photo--a",
							children: /* @__PURE__ */ jsx("img", {
								src: HERO_PHOTOS[1],
								alt: "",
								width: 320,
								height: 200,
								loading: "lazy",
								decoding: "async"
							})
						}),
						/* @__PURE__ */ jsx("div", {
							className: "hero__photo hero__photo--sub hero__photo--b",
							children: /* @__PURE__ */ jsx("img", {
								src: HERO_PHOTOS[2],
								alt: "",
								width: 320,
								height: 200,
								loading: "lazy",
								decoding: "async"
							})
						})
					]
				})]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section section--tight",
			"aria-labelledby": "concerns-h",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [/* @__PURE__ */ jsx(SectionHead, {
					title: /* @__PURE__ */ jsx("span", {
						id: "concerns-h",
						children: "С чем чаще обращаются"
					}),
					text: "Выберите, что беспокоит, — подскажем направление и подходящие клиники."
				}), /* @__PURE__ */ jsx(ConcernChips, { concerns })]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section",
			"aria-labelledby": "dir-h",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [
					/* @__PURE__ */ jsx(SectionHead, {
						title: /* @__PURE__ */ jsx("span", {
							id: "dir-h",
							children: "Направления стоматологии"
						}),
						action: /* @__PURE__ */ jsxs(Link, {
							href: city.path("directions"),
							className: "link-arrow hide-mobile",
							children: ["Все направления ", /* @__PURE__ */ jsx(Icon, {
								name: "arrow-right",
								size: 18
							})]
						})
					}),
					/* @__PURE__ */ jsx(SpecialtyCircles, { specialties }),
					/* @__PURE__ */ jsx("div", {
						className: "grid grid--tiles hide-mobile",
						style: { marginTop: 28 },
						children: specialties.map((s) => /* @__PURE__ */ jsx(SpecialtyTile, { s }, s.slug))
					})
				]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section section--muted",
			"aria-labelledby": "clinics-h",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [
					/* @__PURE__ */ jsx(SectionHead, {
						title: /* @__PURE__ */ jsx("span", {
							id: "clinics-h",
							children: "Клиники с высоким рейтингом"
						}),
						text: `${clinicsWord(stats.clinics)} ${city.nameIn}. Показываем лучшие по оценкам пациентов.`,
						action: /* @__PURE__ */ jsx(LinkButton, {
							href: city.path("clinics"),
							variant: "dark",
							size: "sm",
							className: "hide-mobile btn--compact",
							children: "Все клиники"
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "grid grid--cards",
						children: top_clinics.map((c, i) => /* @__PURE__ */ jsx(ClinicCard, {
							clinic: c,
							layout: "tile",
							priority: i < 3
						}, c.id))
					}),
					/* @__PURE__ */ jsx("div", {
						className: "show-mobile",
						style: { marginTop: 20 },
						children: /* @__PURE__ */ jsx(LinkButton, {
							href: city.path("clinics"),
							variant: "dark",
							block: true,
							children: "Все клиники"
						})
					})
				]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section",
			"aria-labelledby": "services-h",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [/* @__PURE__ */ jsx(SectionHead, {
					title: /* @__PURE__ */ jsx("span", {
						id: "services-h",
						children: "Популярные услуги и цены"
					}),
					text: "Минимальные цены клиник города. Итоговая стоимость определяется после осмотра.",
					action: /* @__PURE__ */ jsxs(Link, {
						href: city.path("prices"),
						className: "link-arrow hide-mobile",
						children: ["Весь прайс ", /* @__PURE__ */ jsx(Icon, {
							name: "arrow-right",
							size: 18
						})]
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "grid grid--services",
					children: popular_services.map((s) => /* @__PURE__ */ jsxs(Link, {
						href: city.path("clinics", { service: s.slug }),
						className: "service-card card card--link",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs text-muted",
								children: s.specialty
							}),
							/* @__PURE__ */ jsx("b", { children: s.name }),
							/* @__PURE__ */ jsx("span", {
								className: "service-card__price",
								children: priceFrom(s.price_from)
							}),
							/* @__PURE__ */ jsx("span", {
								className: "text-xs text-muted",
								children: s.clinics > 0 ? `в ${clinicsWord(s.clinics)}` : "нет предложений"
							})
						]
					}, s.slug))
				})]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section section--muted",
			"aria-labelledby": "docs-h",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [/* @__PURE__ */ jsx(SectionHead, {
					title: /* @__PURE__ */ jsx("span", {
						id: "docs-h",
						children: "Врачи с лучшими отзывами"
					}),
					text: `${doctorsWord(stats.doctors)} принимают ${city.nameIn}.`,
					action: /* @__PURE__ */ jsxs(Link, {
						href: city.path("doctors"),
						className: "link-arrow hide-mobile",
						children: ["Все врачи ", /* @__PURE__ */ jsx(Icon, {
							name: "arrow-right",
							size: 18
						})]
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "grid grid--doctors",
					children: top_doctors.map((d) => /* @__PURE__ */ jsx(DoctorCard, { doctor: d }, d.id))
				})]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section",
			"aria-labelledby": "reviews-h",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [/* @__PURE__ */ jsx(SectionHead, {
					title: /* @__PURE__ */ jsx("span", {
						id: "reviews-h",
						children: "Свежие отзывы пациентов"
					}),
					text: `${reviewsWord(stats.reviews)} прошли модерацию.`,
					action: /* @__PURE__ */ jsxs(Link, {
						href: city.path("reviews"),
						className: "link-arrow hide-mobile",
						children: ["Все отзывы ", /* @__PURE__ */ jsx(Icon, {
							name: "arrow-right",
							size: 18
						})]
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "grid grid--reviews",
					children: latest_reviews.map((r) => /* @__PURE__ */ jsx(ReviewCard, {
						review: r,
						showClinic: true,
						canReport: false
					}, r.id))
				})]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section section--muted",
			"aria-labelledby": "trust-h",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [/* @__PURE__ */ jsx(SectionHead, { title: /* @__PURE__ */ jsx("span", {
					id: "trust-h",
					children: "Как мы помогаем выбрать"
				}) }), /* @__PURE__ */ jsx("div", {
					className: "grid grid--trust",
					children: TRUST.map((t) => /* @__PURE__ */ jsxs("div", {
						className: "trust card",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "tile__icon",
								children: /* @__PURE__ */ jsx(Icon, {
									name: t.icon,
									size: 26
								})
							}),
							/* @__PURE__ */ jsx("h3", { children: t.title }),
							/* @__PURE__ */ jsx("p", {
								className: "text-muted",
								children: t.text
							})
						]
					}, t.title))
				})]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section",
			children: /* @__PURE__ */ jsx("div", {
				className: "container",
				children: /* @__PURE__ */ jsxs("div", {
					className: "cta",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", { children: "У вас стоматологическая клиника?" }), /* @__PURE__ */ jsx("p", { children: "Подключите профиль, получайте заявки от пациентов и отвечайте на отзывы в личном кабинете." })] }), /* @__PURE__ */ jsx(LinkButton, {
						href: "/for-clinics",
						size: "lg",
						variant: "dark",
						children: "Подключить клинику"
					})]
				})
			})
		})
	] });
}
//#endregion
export { Home as default };

//# sourceMappingURL=Home-C6cPq7Yr.js.map