import { t as Icon } from "./Icon-DQahs-u2.js";
import { c as plural, i as doctorsWord, l as priceFrom, n as cx, s as phoneHref, u as reviewsWord } from "./format-BPZIj7DQ.js";
import { i as LinkButton, n as Button } from "./Button-D8Mzgn6o.js";
import { E as Modal, l as Badge, o as useLead } from "../app.js";
import { n as FavoriteButton, t as CompareButton } from "./CollectionButtons-B_nEL-42.js";
import { n as clinicPhoto, t as CLINIC_CARD_DEMO_KINDS } from "./demo-images-B26oc1SN.js";
import { n as DoctorArt, r as PhotoArt, t as DemoImg } from "./PhotoArt-ICkoZAxa.js";
import { Link, usePage } from "@inertiajs/react";
import { useEffect, useId, useMemo, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { A11y, Keyboard, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
//#region resources/js/components/ClinicCardGallery.tsx
function ClinicCardSlide({ slide, clinic, priority, eager }) {
	if (slide.url) return /* @__PURE__ */ jsx(DemoImg, {
		src: slide.url,
		alt: slide.caption ?? clinic.name,
		loading: priority || eager ? "eager" : "lazy",
		className: "clinic-card__photo",
		aspect: "unset"
	});
	const fallbackSrc = clinicPhoto(slide.art_seed, slide.kind);
	return /* @__PURE__ */ jsx(DemoImg, {
		src: fallbackSrc,
		alt: slide.caption ?? clinic.name,
		loading: priority || eager ? "eager" : "lazy",
		className: "clinic-card__photo",
		aspect: "unset"
	});
}
function ClinicCardGallery({ clinic, priority }) {
	const slides = useMemo(() => {
		if (clinic.photos.length >= 2) return clinic.photos;
		const demo = CLINIC_CARD_DEMO_KINDS.map((kind, index) => ({
			kind,
			caption: null,
			art_seed: clinic.art_seed + index,
			url: null
		}));
		if (clinic.photos.length === 1) return [clinic.photos[0], ...demo.slice(0, 3)];
		return demo;
	}, [clinic.art_seed, clinic.photos]);
	if (!(slides.length > 1)) {
		const slide = slides[0];
		return /* @__PURE__ */ jsx("div", {
			className: "clinic-card__gallery clinic-card__gallery--single",
			children: slide.url ? /* @__PURE__ */ jsx(ClinicCardSlide, {
				slide,
				clinic,
				priority,
				eager: true
			}) : /* @__PURE__ */ jsx(PhotoArt, {
				seed: slide.art_seed,
				kind: slide.kind,
				priority,
				className: "clinic-card__photo"
			})
		});
	}
	return /* @__PURE__ */ jsx("div", {
		className: cx("clinic-card__gallery", "clinic-card__gallery--swiper"),
		onClick: (event) => event.stopPropagation(),
		onPointerDown: (event) => event.stopPropagation(),
		children: /* @__PURE__ */ jsx(Swiper, {
			modules: [
				Pagination,
				A11y,
				Keyboard
			],
			slidesPerView: 1,
			spaceBetween: 0,
			pagination: {
				clickable: true,
				dynamicBullets: false,
				bulletElement: "button"
			},
			keyboard: { enabled: true },
			a11y: {
				enabled: true,
				paginationBulletMessage: "Фото {{index}}",
				prevSlideMessage: "Предыдущее фото",
				nextSlideMessage: "Следующее фото"
			},
			className: "clinic-card__swiper",
			children: slides.map((slide, index) => /* @__PURE__ */ jsx(SwiperSlide, { children: /* @__PURE__ */ jsx(ClinicCardSlide, {
				slide,
				clinic,
				priority: priority && index === 0,
				eager: index === 0
			}) }, `${slide.kind}-${slide.art_seed}-${index}`))
		})
	});
}
//#endregion
//#region resources/js/components/ClinicCard.tsx
function ClinicCardPrices({ clinic, layout, href, expanded, onExpandedChange }) {
	const listId = useId();
	const previewCount = layout === "tile" ? 2 : 3;
	const services = clinic.top_services;
	const total = clinic.services_count ?? services.length;
	const hidden = Math.max(total - previewCount, services.length - previewCount);
	const canExpand = services.length > previewCount || total > previewCount;
	useEffect(() => {
		if (!expanded) return;
		const onKeyDown = (event) => {
			if (event.key === "Escape") onExpandedChange(false);
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [expanded, onExpandedChange]);
	if (services.length === 0 && !clinic.min_price) return null;
	const toggle = (event) => {
		event.preventDefault();
		event.stopPropagation();
		onExpandedChange(!expanded);
	};
	return /* @__PURE__ */ jsx("div", {
		className: cx("clinic-card__prices-wrap", expanded && "is-open"),
		children: /* @__PURE__ */ jsxs("div", {
			className: cx("clinic-card__prices", expanded && "is-expanded", canExpand && !expanded && "has-more"),
			children: [/* @__PURE__ */ jsxs("div", {
				className: "clinic-card__prices-head",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "clinic-card__prices-label",
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "ruble",
						size: 16
					}), "Приём и диагностика"]
				}), clinic.min_price ? /* @__PURE__ */ jsx("strong", {
					className: "clinic-card__prices-from",
					children: priceFrom(clinic.min_price)
				}) : null]
			}), services.length > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
				id: listId,
				className: "clinic-card__prices-body",
				children: /* @__PURE__ */ jsx("ul", {
					className: "clinic-card__prices-list",
					"aria-label": "Услуги и цены",
					children: services.map((service, index) => /* @__PURE__ */ jsxs("li", {
						"aria-hidden": !expanded && index >= previewCount ? true : void 0,
						children: [/* @__PURE__ */ jsx("span", {
							className: "clinic-card__prices-name",
							children: service.name
						}), /* @__PURE__ */ jsx("b", { children: priceFrom(service.price_from) })]
					}, service.slug))
				})
			}), canExpand ? /* @__PURE__ */ jsxs("div", {
				className: "clinic-card__prices-more",
				children: [/* @__PURE__ */ jsxs("button", {
					type: "button",
					className: "clinic-card__prices-toggle",
					"aria-expanded": expanded,
					"aria-controls": listId,
					onClick: toggle,
					children: [/* @__PURE__ */ jsx(Icon, {
						name: expanded ? "chevron-up" : "chevron-down",
						size: 16
					}), expanded ? "Свернуть" : hidden > 0 ? `Ещё ${hidden} ${plural(hidden, [
						"услуга",
						"услуги",
						"услуг"
					])}` : "Показать все"]
				}), expanded ? /* @__PURE__ */ jsxs(Link, {
					href: `${href}#prices`,
					className: "clinic-card__prices-all link-arrow",
					onClick: (e) => e.stopPropagation(),
					children: [total > services.length ? `${services.length} из ${total}` : "Все цены", /* @__PURE__ */ jsx(Icon, {
						name: "arrow-right",
						size: 16
					})]
				}) : null]
			}) : null] }) : null]
		})
	});
}
function DoctorAvatarStack({ doctors, total }) {
	const visible = doctors.slice(0, 3);
	const extra = Math.max(total - visible.length, 0);
	return /* @__PURE__ */ jsxs("div", {
		className: "avatar-stack",
		"aria-label": doctorsWord(total),
		children: [visible.map((doctor) => /* @__PURE__ */ jsx("span", {
			className: "avatar-stack__item",
			children: /* @__PURE__ */ jsx(DoctorArt, {
				seed: doctor.art_seed,
				photoUrl: doctor.photo_url,
				name: doctor.name
			})
		}, doctor.slug)), extra > 0 ? /* @__PURE__ */ jsx("span", {
			className: "avatar-stack__more",
			"aria-hidden": "true",
			children: /* @__PURE__ */ jsx("span", {
				className: "avatar-stack__more-ring",
				children: /* @__PURE__ */ jsx("span", {
					className: "avatar-stack__more-inner",
					children: /* @__PURE__ */ jsxs("span", {
						className: "avatar-stack__more-count",
						children: ["+", extra]
					})
				})
			})
		}) : null]
	});
}
function promoOfferIcon(offer) {
	if (offer.icon && offer.icon in {
		user: 1,
		card: 1,
		percent: 1,
		sparkle: 1,
		flash: 1
	}) return offer.icon;
	if (offer.id === "free-consult" || offer.slug?.includes("konsultaciya")) return "user";
	if (offer.id === "cashback" || offer.slug?.includes("keshbek")) return "card";
	if (offer.id === "treatment-discount" || offer.slug?.includes("skidka")) return "percent";
	const title = offer.title.toLowerCase();
	if (title.includes("консульт")) return "user";
	if (title.includes("кешб") || title.includes("cashback")) return "card";
	if (title.includes("скид")) return "percent";
	return "sparkle";
}
function ClinicCardPromoStrip({ offers, layout, onSelect, premiumGrid }) {
	if (!offers?.length) return null;
	const visible = offers.slice(0, 3);
	return /* @__PURE__ */ jsx("div", {
		className: cx("clinic-card__promos", layout === "tile" && "clinic-card__promos--tile", premiumGrid && "clinic-card__promos--premium-grid"),
		"aria-label": "Акции и бонусы",
		"data-count": visible.length,
		children: /* @__PURE__ */ jsx("ul", {
			className: "clinic-card__promos-list",
			children: visible.map((offer) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "clinic-card__promo-btn",
				onClick: () => onSelect(offer),
				children: [/* @__PURE__ */ jsx(Icon, {
					name: promoOfferIcon(offer),
					size: 14,
					"aria-hidden": true
				}), /* @__PURE__ */ jsx("span", { children: offer.title })]
			}) }, offer.id))
		})
	});
}
function ClinicFeatures({ clinic, limit = 5, onOfferClick }) {
	const items = [];
	if (clinic.same_day) {
		const detail = clinic.same_day_offer;
		items.push({
			icon: "flash",
			label: detail?.title ?? "Запись на сегодня",
			offer: detail ? {
				id: detail.code,
				code: detail.code,
				title: detail.title,
				description: detail.description,
				slug: null,
				icon: "flash"
			} : void 0
		});
	}
	if (clinic.has_installment) items.push({
		icon: "percent",
		label: clinic.installment_months ? `Рассрочка до ${clinic.installment_months} мес.` : "Рассрочка"
	});
	if (clinic.accepts_dms) items.push({
		icon: "shield",
		label: "ДМС"
	});
	if (clinic.has_sedation) items.push({
		icon: "moon",
		label: "Седация"
	});
	if (clinic.has_anesthesia) items.push({
		icon: "moon",
		label: "Наркоз"
	});
	if (clinic.has_microscope) items.push({
		icon: "microscope",
		label: "Микроскоп"
	});
	if (clinic.has_ct) items.push({
		icon: "scale",
		label: "КТ"
	});
	return /* @__PURE__ */ jsx("ul", {
		className: "feature-list",
		"aria-label": "Особенности клиники",
		children: items.slice(0, limit).map((i) => /* @__PURE__ */ jsx("li", { children: i.offer && onOfferClick ? /* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "feature-list__btn",
			onClick: () => onOfferClick(i.offer),
			children: [/* @__PURE__ */ jsx(Icon, {
				name: i.icon,
				size: 15
			}), i.label]
		}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Icon, {
			name: i.icon,
			size: 15
		}), i.label] }) }, i.label))
	});
}
function ClinicCard({ clinic, layout = "row", priority, interactive = true }) {
	const lead = useLead();
	const { display } = usePage().props;
	const premiumSkinClass = display?.premium_clinic_card_class ?? "clinic-card--premium-ivory";
	const premiumVariant = display?.premium_clinic_card_variant ?? "ivory_gold";
	const isTile = layout === "tile";
	const href = `/clinics/${clinic.slug}`;
	const isPremium = Boolean(clinic.card_premium);
	const premiumLightLayout = premiumVariant === "ivory_gold" || premiumVariant === "avito_blue";
	const premiumPromoGrid = isPremium && premiumLightLayout;
	const premiumBookArrow = isPremium && premiumLightLayout;
	const [pricesOpen, setPricesOpen] = useState(false);
	const [promoDetail, setPromoDetail] = useState(null);
	const open = () => lead.open({
		slug: clinic.slug,
		name: clinic.name,
		phone: clinic.phone,
		source: "catalog"
	});
	return /* @__PURE__ */ jsxs("article", {
		className: cx("clinic-card", isTile && "clinic-card--tile", interactive && "clinic-card--interactive", pricesOpen && "clinic-card--prices-open", isPremium && premiumSkinClass),
		"aria-labelledby": `clinic-${clinic.id}`,
		children: [
			interactive ? /* @__PURE__ */ jsx(Link, {
				href,
				className: "clinic-card__hit",
				"aria-label": `Открыть «${clinic.name}»`,
				tabIndex: -1
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "clinic-card__aside",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "clinic-card__media",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ jsx(ClinicCardGallery, {
							clinic,
							priority
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "clinic-card__badges",
							children: [clinic.is_24_7 ? /* @__PURE__ */ jsx(Badge, {
								tone: "dark",
								children: "24/7"
							}) : null, clinic.accepts_children ? /* @__PURE__ */ jsx(Badge, {
								tone: "primary",
								children: clinic.children_age_from ? `Дети с ${clinic.children_age_from}` : "Дети"
							}) : null]
						}),
						isPremium ? /* @__PURE__ */ jsxs("div", {
							className: "clinic-card__premium-badge",
							"aria-label": "Премиальное размещение",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "clinic-card__premium-badge-main",
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "crown",
									size: 13,
									"aria-hidden": true
								}), /* @__PURE__ */ jsx("span", { children: "Премиум" })]
							}), /* @__PURE__ */ jsx("span", {
								className: "clinic-card__premium-badge-sub",
								children: "Премиум-размещение"
							})]
						}) : null
					]
				}), !isTile ? /* @__PURE__ */ jsx(ClinicCardPromoStrip, {
					offers: clinic.promo_offers ?? [],
					layout,
					onSelect: setPromoDetail,
					premiumGrid: premiumPromoGrid
				}) : null]
			}),
			/* @__PURE__ */ jsx(FavoriteButton, {
				type: "clinic",
				id: clinic.id,
				name: clinic.name
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "clinic-card__body",
				children: [
					isTile ? /* @__PURE__ */ jsx(ClinicCardPromoStrip, {
						offers: clinic.promo_offers ?? [],
						layout,
						onSelect: setPromoDetail,
						premiumGrid: premiumPromoGrid
					}) : null,
					/* @__PURE__ */ jsxs("div", {
						className: "clinic-card__summary",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "clinic-card__head",
								children: [/* @__PURE__ */ jsx("h3", {
									id: `clinic-${clinic.id}`,
									className: "clinic-card__title",
									children: /* @__PURE__ */ jsx(Link, {
										href,
										children: clinic.name
									})
								}), /* @__PURE__ */ jsx("div", {
									className: "clinic-card__rating",
									children: clinic.reviews_count > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("span", {
										className: "rating",
										children: [/* @__PURE__ */ jsx(Icon, {
											name: "star",
											size: 18
										}), clinic.rating.toFixed(1).replace(".", ",")]
									}), /* @__PURE__ */ jsx(Link, {
										href: `${href}#reviews`,
										className: "rating__count",
										children: reviewsWord(clinic.reviews_count)
									})] }) : /* @__PURE__ */ jsx("span", {
										className: "rating__count",
										children: "Пока нет отзывов"
									})
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "clinic-card__flags",
								children: [
									clinic.is_promoted ? /* @__PURE__ */ jsx(Badge, {
										tone: "warning",
										icon: "sparkle",
										children: "Реклама"
									}) : null,
									clinic.is_verified ? /* @__PURE__ */ jsx(Badge, {
										tone: "success",
										icon: "shield",
										children: "Проверена"
									}) : null,
									clinic.license.confirmed ? /* @__PURE__ */ jsx(Badge, {
										tone: "info",
										children: "Лицензия подтверждена"
									}) : null,
									clinic.achievements.slice(0, 1).map((a) => /* @__PURE__ */ jsx(Badge, {
										icon: "award",
										children: a
									}, a))
								]
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "clinic-card__address",
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "pin",
									size: 16
								}), /* @__PURE__ */ jsxs("span", { children: [
									clinic.address,
									clinic.district ? /* @__PURE__ */ jsxs("span", {
										className: "text-muted",
										children: [" · ", clinic.district]
									}) : null,
									clinic.metro ? /* @__PURE__ */ jsxs("span", {
										className: "text-muted",
										children: [" · м. ", clinic.metro]
									}) : null
								] })]
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "clinic-card__schedule",
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "clock",
									size: 16
								}), /* @__PURE__ */ jsx("span", { children: clinic.today })]
							})
						]
					}),
					/* @__PURE__ */ jsx(ClinicCardPrices, {
						clinic,
						layout,
						href,
						expanded: pricesOpen,
						onExpandedChange: setPricesOpen
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "clinic-card__extras",
						children: [
							/* @__PURE__ */ jsx(ClinicFeatures, {
								clinic,
								limit: isTile ? 3 : 5,
								onOfferClick: setPromoDetail
							}),
							!isTile && clinic.doctors_preview.length > 0 ? /* @__PURE__ */ jsx("div", {
								className: "clinic-card__doctors",
								children: /* @__PURE__ */ jsx(DoctorAvatarStack, {
									doctors: clinic.doctors_preview,
									total: clinic.doctors_count
								})
							}) : null,
							!isTile && clinic.payment_methods.length > 0 ? /* @__PURE__ */ jsxs("p", {
								className: "clinic-card__pay text-xs text-muted",
								children: ["Оплата: ", clinic.payment_methods.join(", ")]
							}) : null
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "clinic-card__actions",
						children: /* @__PURE__ */ jsxs("div", {
							className: "clinic-card__buttons",
							children: [
								!isTile ? /* @__PURE__ */ jsx(LinkButton, {
									href,
									variant: "outline",
									size: "sm",
									className: "clinic-card__details",
									children: "Подробнее"
								}) : null,
								/* @__PURE__ */ jsx(CompareButton, {
									type: "clinic",
									id: clinic.id,
									name: clinic.name,
									compact: isTile
								}),
								clinic.phone ? /* @__PURE__ */ jsx("a", {
									className: "btn btn--outline btn--icon btn--round",
									href: phoneHref(clinic.phone),
									"aria-label": `Позвонить в «${clinic.name}»`,
									children: /* @__PURE__ */ jsx(Icon, {
										name: "phone",
										size: 20
									})
								}) : null,
								/* @__PURE__ */ jsx(Button, {
									size: isTile ? "sm" : "md",
									onClick: open,
									iconRight: premiumBookArrow ? "arrow-right" : void 0,
									children: "Записаться"
								})
							]
						})
					})
				]
			}),
			/* @__PURE__ */ jsxs(Modal, {
				open: promoDetail !== null,
				onClose: () => setPromoDetail(null),
				title: promoDetail?.title ?? "Акция",
				children: [/* @__PURE__ */ jsx("p", {
					className: "text-muted",
					children: promoDetail?.description || "Подробности уточняйте при записи в клинику."
				}), /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					style: { marginTop: 16 },
					children: [/* @__PURE__ */ jsx(Button, {
						type: "button",
						onClick: () => {
							setPromoDetail(null);
							open();
						},
						children: "Записаться"
					}), /* @__PURE__ */ jsx(LinkButton, {
						href,
						variant: "outline",
						onClick: () => setPromoDetail(null),
						children: "О клинике"
					})]
				})]
			})
		]
	});
}
function ClinicCardSkeleton() {
	return /* @__PURE__ */ jsxs("div", {
		className: "clinic-card",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ jsx("div", {
			className: "clinic-card__media skeleton",
			style: { borderRadius: 16 }
		}), /* @__PURE__ */ jsxs("div", {
			className: "clinic-card__body",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "skeleton",
					style: {
						height: 24,
						width: "60%"
					}
				}),
				/* @__PURE__ */ jsx("span", {
					className: "skeleton",
					style: {
						height: 16,
						width: "85%"
					}
				}),
				/* @__PURE__ */ jsx("span", {
					className: "skeleton",
					style: {
						height: 16,
						width: "40%"
					}
				}),
				/* @__PURE__ */ jsx("span", {
					className: "skeleton",
					style: { height: 70 }
				}),
				/* @__PURE__ */ jsx("span", {
					className: "skeleton",
					style: {
						height: 52,
						width: 180
					}
				})
			]
		})]
	});
}
//#endregion
export { ClinicCardSkeleton as n, ClinicFeatures as r, ClinicCard as t };

//# sourceMappingURL=ClinicCard-zFOmpmd8.js.map