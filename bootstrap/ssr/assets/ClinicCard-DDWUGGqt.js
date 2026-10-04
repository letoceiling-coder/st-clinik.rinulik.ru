import { t as Icon } from "./Icon-DBH8JZC9.js";
import { c as plural, i as doctorsWord, l as priceFrom, n as cx, s as phoneHref, u as reviewsWord } from "./format-BPZIj7DQ.js";
import { i as LinkButton, n as Button } from "./Button-DsM_qe4F.js";
import { i as useLead, s as Badge } from "../app.js";
import { n as FavoriteButton, t as CompareButton } from "./CollectionButtons-A7pQv1vL.js";
import { n as DoctorArt, r as PhotoArt, t as DemoImg } from "./PhotoArt-Cckquo9q.js";
import { Link } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useId, useState } from "react";
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
function ClinicFeatures({ clinic, limit = 5 }) {
	const items = [];
	if (clinic.same_day) items.push({
		icon: "flash",
		label: "Запись на сегодня"
	});
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
		children: items.slice(0, limit).map((i) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx(Icon, {
			name: i.icon,
			size: 15
		}), i.label] }, i.label))
	});
}
function ClinicCard({ clinic, layout = "row", priority, interactive = true }) {
	const lead = useLead();
	const isTile = layout === "tile";
	const href = `/clinics/${clinic.slug}`;
	const photo = clinic.photos[0];
	const [pricesOpen, setPricesOpen] = useState(false);
	const open = () => lead.open({
		slug: clinic.slug,
		name: clinic.name,
		phone: clinic.phone,
		source: "catalog"
	});
	return /* @__PURE__ */ jsxs("article", {
		className: cx("clinic-card", isTile && "clinic-card--tile", interactive && "clinic-card--interactive", pricesOpen && "clinic-card--prices-open"),
		"aria-labelledby": `clinic-${clinic.id}`,
		children: [
			interactive ? /* @__PURE__ */ jsx(Link, {
				href,
				className: "clinic-card__hit",
				"aria-label": `Открыть «${clinic.name}»`,
				tabIndex: -1
			}) : null,
			/* @__PURE__ */ jsxs(Link, {
				href,
				className: "clinic-card__media",
				tabIndex: -1,
				"aria-hidden": "true",
				children: [photo?.url ? /* @__PURE__ */ jsx(DemoImg, {
					src: photo.url,
					aspect: "4/3",
					loading: priority ? "eager" : "lazy",
					className: "clinic-card__photo"
				}) : /* @__PURE__ */ jsx(PhotoArt, {
					seed: photo?.art_seed ?? clinic.art_seed,
					kind: photo?.kind ?? "interior",
					priority,
					className: "clinic-card__photo"
				}), /* @__PURE__ */ jsxs("div", {
					className: "clinic-card__badges",
					children: [clinic.is_24_7 ? /* @__PURE__ */ jsx(Badge, {
						tone: "dark",
						children: "24/7"
					}) : null, clinic.accepts_children ? /* @__PURE__ */ jsx(Badge, {
						tone: "primary",
						children: clinic.children_age_from ? `Дети с ${clinic.children_age_from}` : "Дети"
					}) : null]
				})]
			}),
			/* @__PURE__ */ jsx(FavoriteButton, {
				type: "clinic",
				id: clinic.id,
				name: clinic.name
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "clinic-card__body",
				children: [
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
								limit: isTile ? 3 : 5
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
									children: "Записаться"
								})
							]
						})
					})
				]
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

//# sourceMappingURL=ClinicCard-DDWUGGqt.js.map