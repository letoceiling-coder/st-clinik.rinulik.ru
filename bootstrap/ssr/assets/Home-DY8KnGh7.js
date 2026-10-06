import { t as Icon } from "./Icon-DQahs-u2.js";
import { i as doctorsWord, l as priceFrom, n as cx, o as money, t as clinicsWord, u as reviewsWord } from "./format-BPZIj7DQ.js";
import { i as LinkButton, n as Button } from "./Button-D8Mzgn6o.js";
import { f as SectionHead, g as Check, n as useCity, w as Modal } from "../app.js";
import { t as HERO_PHOTOS } from "./demo-images-CwyQSe03.js";
import { t as ClinicCard } from "./ClinicCard-ChPAtBVA.js";
import { t as DoctorCard } from "./DoctorCard-DD2yuAuy.js";
import { t as AdSlot } from "./AdSlot-BWHf9w1U.js";
import { t as ReviewCard } from "./ReviewCard-DMd-uulm.js";
import { n as SpecialtyCircles, r as SpecialtyTile, t as ConcernChips } from "./Tiles-_iQru-fi.js";
import { Link, router } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/ServicePickerModal.tsx
function ServicePickerModal({ open, onClose, services, initialSelected = [], onApply, title = "Выберите услуги" }) {
	const [selected, setSelected] = useState(initialSelected);
	const [q, setQ] = useState("");
	useEffect(() => {
		if (open) {
			setSelected(initialSelected);
			setQ("");
		}
	}, [open, initialSelected.join(",")]);
	const groups = useMemo(() => {
		const needle = q.trim().toLowerCase();
		const filtered = needle ? services.filter((s) => s.name.toLowerCase().includes(needle) || s.group.toLowerCase().includes(needle)) : services;
		const map = /* @__PURE__ */ new Map();
		filtered.forEach((s) => {
			const list = map.get(s.group) ?? [];
			list.push(s);
			map.set(s.group, list);
		});
		return [...map.entries()];
	}, [services, q]);
	const toggle = (slug) => setSelected((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);
	const submit = () => {
		onApply(selected);
		onClose();
	};
	return /* @__PURE__ */ jsx(Modal, {
		open,
		onClose,
		title,
		wide: true,
		footer: /* @__PURE__ */ jsxs("div", {
			className: "service-picker__footer",
			children: [/* @__PURE__ */ jsx("span", {
				className: "text-sm text-muted",
				children: selected.length ? `Выбрано: ${selected.length}` : "Можно выбрать несколько услуг"
			}), /* @__PURE__ */ jsxs("div", {
				className: "service-picker__footer-actions",
				children: [/* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "ghost",
					onClick: () => setSelected([]),
					disabled: selected.length === 0,
					children: "Сбросить"
				}), /* @__PURE__ */ jsx(Button, {
					type: "button",
					onClick: submit,
					disabled: selected.length === 0,
					children: "Показать клиники"
				})]
			})]
		}),
		children: /* @__PURE__ */ jsxs("div", {
			className: "service-picker",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "service-picker__search",
				children: [/* @__PURE__ */ jsx(Icon, {
					name: "search",
					size: 20
				}), /* @__PURE__ */ jsx("input", {
					type: "search",
					className: "service-picker__input",
					placeholder: "Поиск услуги…",
					value: q,
					onChange: (e) => setQ(e.target.value),
					autoFocus: true
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "service-picker__groups",
				children: [groups.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-muted",
					children: "Ничего не найдено."
				}) : null, groups.map(([group, items]) => /* @__PURE__ */ jsxs("section", {
					className: "service-picker__group",
					children: [/* @__PURE__ */ jsx("h3", { children: group }), /* @__PURE__ */ jsx("div", {
						className: "service-picker__list",
						children: items.map((s) => /* @__PURE__ */ jsxs("label", {
							className: cx("service-picker__item", selected.includes(s.slug) && "is-active"),
							children: [/* @__PURE__ */ jsx(Check, {
								checked: selected.includes(s.slug),
								onChange: () => toggle(s.slug),
								label: s.name
							}), s.price_from ? /* @__PURE__ */ jsx("span", {
								className: "service-picker__price",
								children: money(s.price_from)
							}) : null]
						}, s.slug))
					})]
				}, group))]
			})]
		})
	});
}
//#endregion
//#region resources/js/components/HeroServiceFinder.tsx
function HeroServiceFinder({ services, chips, stats }) {
	const city = useCity();
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState([]);
	const go = (slugs, sameDay = false) => {
		const query = {};
		if (slugs.length === 1) query.service = slugs[0];
		else if (slugs.length > 1) query.services = slugs.join(",");
		if (sameDay) query.same_day = "1";
		router.get(city.path("clinics", query));
	};
	const onChip = (chip) => {
		if (chip.services?.length) {
			go(chip.services);
			return;
		}
		const query = {};
		if (chip.specialty) query.specialty = chip.specialty;
		if (chip.flag) query[chip.flag] = "1";
		router.get(city.path("clinics", query));
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
		className: "hero-finder card",
		children: [
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "hero-finder__search",
				onClick: () => setOpen(true),
				"aria-label": "Выбрать услуги",
				children: [/* @__PURE__ */ jsx(Icon, {
					name: "search",
					size: 22
				}), /* @__PURE__ */ jsx("span", { children: "Что беспокоит или какая услуга?" })]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "hero-finder__chips",
				"aria-label": "Популярные запросы",
				children: chips.map((chip) => /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "chip chip--soft",
					onClick: () => onChip(chip),
					children: chip.label
				}, chip.label))
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "button",
				block: true,
				size: "lg",
				className: "hero-finder__cta",
				onClick: () => go(selected.length ? selected : [], true),
				children: "Найти время на сегодня"
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "hero-finder__meta",
				children: [clinicsWord(stats.clinics), stats.same_day > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
					" ",
					"· свободное время уже сегодня в ",
					/* @__PURE__ */ jsx("b", { children: stats.same_day }),
					" из них"
				] }) : null]
			})
		]
	}), /* @__PURE__ */ jsx(ServicePickerModal, {
		open,
		onClose: () => setOpen(false),
		services,
		initialSelected: selected,
		onApply: (slugs) => {
			setSelected(slugs);
			go(slugs);
		}
	})] });
}
//#endregion
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
function Home({ stats, concerns, popular_services, catalog_services, hero_chips, specialties, top_clinics, top_doctors, latest_reviews, banner_home }) {
	const city = useCity();
	const [servicePickerOpen, setServicePickerOpen] = useState(false);
	const [pickerSeed, setPickerSeed] = useState([]);
	const openServicePicker = (slug) => {
		setPickerSeed(slug ? [slug] : []);
		setServicePickerOpen(true);
	};
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
						/* @__PURE__ */ jsx(HeroServiceFinder, {
							services: catalog_services,
							chips: hero_chips,
							stats: {
								clinics: stats.clinics,
								same_day: stats.same_day
							}
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
			children: /* @__PURE__ */ jsx("div", {
				className: "container",
				children: /* @__PURE__ */ jsx(AdSlot, {
					banners: banner_home,
					slot: "home",
					demoWhenEmpty: true
				})
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
				children: [
					/* @__PURE__ */ jsx(SectionHead, {
						title: /* @__PURE__ */ jsx("span", {
							id: "services-h",
							children: "Популярные услуги и цены"
						}),
						text: "Выберите одну или несколько услуг — покажем клиники с этими позициями в прайсе.",
						action: /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "link-arrow hide-mobile",
							onClick: () => openServicePicker(),
							children: ["Все услуги ", /* @__PURE__ */ jsx(Icon, {
								name: "arrow-right",
								size: 18
							})]
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "grid grid--services",
						children: popular_services.map((s) => /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "service-card card card--link",
							onClick: () => openServicePicker(s.slug),
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
					}),
					/* @__PURE__ */ jsx("div", {
						className: "show-mobile",
						style: { marginTop: 16 },
						children: /* @__PURE__ */ jsx(LinkButton, {
							href: city.path("prices"),
							variant: "outline",
							block: true,
							children: "Весь прайс"
						})
					})
				]
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
		}),
		/* @__PURE__ */ jsx(ServicePickerModal, {
			open: servicePickerOpen,
			onClose: () => setServicePickerOpen(false),
			services: catalog_services,
			initialSelected: pickerSeed,
			onApply: (slugs) => {
				const query = {};
				if (slugs.length === 1) query.service = slugs[0];
				else if (slugs.length > 1) query.services = slugs.join(",");
				router.get(city.path("clinics", query));
			}
		})
	] });
}
//#endregion
export { Home as default };

//# sourceMappingURL=Home-DY8KnGh7.js.map