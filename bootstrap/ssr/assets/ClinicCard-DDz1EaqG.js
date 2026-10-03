import { t as Icon } from "./Icon-DBH8JZC9.js";
import { c as priceFrom, i as doctorsWord, l as reviewsWord, n as cx, s as phoneHref } from "./format-Cjg0FGVI.js";
import { n as Button } from "./Button-D4s3iLUi.js";
import { i as useLead, s as Badge } from "../app.js";
import { n as FavoriteButton, t as CompareButton } from "./CollectionButtons-BeMeUc6q.js";
import { n as DoctorArt, r as PhotoArt, t as DemoImg } from "./PhotoArt-Ds-2t9uu.js";
import { Link } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/ClinicCard.tsx
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
function ClinicCard({ clinic, layout = "row", priority }) {
	const lead = useLead();
	const href = `/clinics/${clinic.slug}`;
	const photo = clinic.photos[0];
	const open = () => lead.open({
		slug: clinic.slug,
		name: clinic.name,
		phone: clinic.phone,
		source: "catalog"
	});
	return /* @__PURE__ */ jsxs("article", {
		className: cx("clinic-card", layout === "tile" && "clinic-card--tile"),
		"aria-labelledby": `clinic-${clinic.id}`,
		children: [
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
					}),
					clinic.top_services.length > 0 ? /* @__PURE__ */ jsx("ul", {
						className: "clinic-card__services",
						"aria-label": "Услуги и цены",
						children: clinic.top_services.map((s) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("span", { children: s.name }), /* @__PURE__ */ jsx("b", { children: priceFrom(s.price_from) })] }, s.slug))
					}) : null,
					/* @__PURE__ */ jsx(ClinicFeatures, { clinic }),
					clinic.doctors_preview.length > 0 ? /* @__PURE__ */ jsxs("div", {
						className: "clinic-card__doctors",
						children: [/* @__PURE__ */ jsx("div", {
							className: "avatar-stack",
							"aria-hidden": "true",
							children: clinic.doctors_preview.map((d) => /* @__PURE__ */ jsx("span", {
								className: "avatar-stack__item",
								children: /* @__PURE__ */ jsx(DoctorArt, { seed: d.art_seed })
							}, d.slug))
						}), /* @__PURE__ */ jsx("span", {
							className: "text-sm text-muted",
							children: doctorsWord(clinic.doctors_count)
						})]
					}) : null,
					clinic.payment_methods.length > 0 ? /* @__PURE__ */ jsxs("p", {
						className: "clinic-card__pay text-xs text-muted",
						children: ["Оплата: ", clinic.payment_methods.join(", ")]
					}) : null,
					/* @__PURE__ */ jsxs("div", {
						className: "clinic-card__actions",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "clinic-card__price",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-xs text-muted",
								children: "Приём и диагностика"
							}), /* @__PURE__ */ jsx("b", { children: priceFrom(clinic.min_price) })]
						}), /* @__PURE__ */ jsxs("div", {
							className: "clinic-card__buttons",
							children: [
								/* @__PURE__ */ jsx(CompareButton, {
									type: "clinic",
									id: clinic.id,
									name: clinic.name
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
									onClick: open,
									children: "Записаться"
								})
							]
						})]
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

//# sourceMappingURL=ClinicCard-DDz1EaqG.js.map