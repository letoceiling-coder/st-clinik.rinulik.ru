import { t as Icon } from "./Icon-DBH8JZC9.js";
import { d as yearsWord, l as priceFrom, o as money, u as reviewsWord } from "./format-BPZIj7DQ.js";
import { n as Button } from "./Button-DsM_qe4F.js";
import { a as Alert, c as Breadcrumbs, d as Pagination, i as useLead, l as EmptyState, s as Badge } from "../app.js";
import { n as FavoriteButton, t as CompareButton } from "./CollectionButtons-A7pQv1vL.js";
import { n as DoctorArt } from "./PhotoArt-Byn0MeDK.js";
import { t as ClinicCard } from "./ClinicCard-Cw1BZp_2.js";
import { t as DoctorCard } from "./DoctorCard-B2GdFBgT.js";
import { r as RatingSummary } from "./ClinicParts-D-uNCRCG.js";
import { t as ReviewCard } from "./ReviewCard-DFFXdP3W.js";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Doctors/Show.tsx
function DoctorShow({ doctor, clinic, prices, reviews, distribution, colleagues, breadcrumbs }) {
	const lead = useLead();
	const total = Object.values(distribution).reduce((a, b) => a + b, 0);
	const open = () => clinic && lead.open({
		slug: clinic.slug,
		name: clinic.name,
		phone: clinic.phone,
		doctorId: doctor.id,
		doctors: [{
			id: doctor.id,
			name: doctor.name
		}],
		source: "doctor_page"
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Breadcrumbs, { items: breadcrumbs }),
		/* @__PURE__ */ jsxs("div", {
			className: "container doctor-top",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "doctor-top__photo",
					children: /* @__PURE__ */ jsx(DoctorArt, { seed: doctor.art_seed })
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "doctor-top__info",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "clinic-head__badges",
							children: [doctor.is_verified ? /* @__PURE__ */ jsx(Badge, {
								tone: "success",
								icon: "shield",
								children: "Врач проверен"
							}) : null, doctor.accepts_children ? /* @__PURE__ */ jsx(Badge, {
								tone: "primary",
								children: doctor.children_age_from ? `Принимает детей с ${doctor.children_age_from} лет` : "Принимает детей"
							}) : null]
						}),
						/* @__PURE__ */ jsx("h1", { children: doctor.name }),
						/* @__PURE__ */ jsx("p", {
							className: "clinic-head__tagline",
							children: doctor.position
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "clinic-head__meta",
							children: [doctor.reviews_count > 0 ? /* @__PURE__ */ jsxs("a", {
								href: "#reviews",
								className: "rating",
								children: [
									/* @__PURE__ */ jsx(Icon, {
										name: "star",
										size: 22
									}),
									doctor.rating.toFixed(1).replace(".", ","),
									/* @__PURE__ */ jsx("span", {
										className: "rating__count",
										children: reviewsWord(doctor.reviews_count)
									})
								]
							}) : /* @__PURE__ */ jsx("span", {
								className: "rating__count",
								children: "Пока нет отзывов"
							}), /* @__PURE__ */ jsxs("span", {
								className: "meta-item",
								children: [
									/* @__PURE__ */ jsx(Icon, {
										name: "award",
										size: 18
									}),
									"Стаж ",
									yearsWord(doctor.experience_years)
								]
							})]
						}),
						doctor.specialties.length > 0 ? /* @__PURE__ */ jsx("ul", {
							className: "tags",
							"aria-label": "Специализация",
							children: doctor.specialties.map((s) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("span", {
								className: "chip chip--soft",
								children: s.name
							}) }, s.slug))
						}) : null,
						doctor.schedule_days && doctor.schedule_days.length > 0 ? /* @__PURE__ */ jsxs("p", {
							className: "meta-item",
							children: [
								/* @__PURE__ */ jsx(Icon, {
									name: "calendar",
									size: 18
								}),
								"Принимает: ",
								doctor.schedule_days.join(", ")
							]
						}) : null
					]
				}),
				/* @__PURE__ */ jsxs("aside", {
					className: "booking card card--shadow",
					"aria-label": "Запись к врачу",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "booking__price",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-sm text-muted",
								children: "Первичный приём"
							}),
							/* @__PURE__ */ jsx("b", { children: priceFrom(doctor.consult_price, "по запросу") }),
							/* @__PURE__ */ jsx("span", {
								className: "text-xs text-muted",
								children: "Окончательную стоимость называет клиника."
							})
						]
					}), clinic ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Button, {
						size: "lg",
						block: true,
						onClick: open,
						children: "Записаться к врачу"
					}), /* @__PURE__ */ jsxs("div", {
						className: "booking__row",
						children: [/* @__PURE__ */ jsx(CompareButton, {
							type: "doctor",
							id: doctor.id,
							name: doctor.name
						}), /* @__PURE__ */ jsx(FavoriteButton, {
							type: "doctor",
							id: doctor.id,
							name: doctor.name,
							floating: false
						})]
					})] }) : null]
				})
			]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "container clinic-body",
			children: [
				doctor.bio ? /* @__PURE__ */ jsxs("section", {
					className: "block",
					"aria-labelledby": "bio-h",
					children: [/* @__PURE__ */ jsx("h2", {
						id: "bio-h",
						children: "О враче"
					}), /* @__PURE__ */ jsx("p", {
						className: "lead-text",
						children: doctor.bio
					})]
				}) : null,
				(doctor.education?.length ?? 0) > 0 || doctor.achievements.length > 0 ? /* @__PURE__ */ jsxs("section", {
					className: "block two-col two-col--even",
					"aria-label": "Образование и достижения",
					children: [doctor.education && doctor.education.length > 0 ? /* @__PURE__ */ jsxs("div", {
						className: "card",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "card-title",
							children: "Образование"
						}), /* @__PURE__ */ jsx("ul", {
							className: "check-list",
							children: doctor.education.map((e) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx(Icon, {
								name: "file",
								size: 18
							}), e] }, e))
						})]
					}) : null, doctor.achievements.length > 0 ? /* @__PURE__ */ jsxs("div", {
						className: "card",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "card-title",
							children: "Достижения"
						}), /* @__PURE__ */ jsx("ul", {
							className: "check-list",
							children: doctor.achievements.map((e) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx(Icon, {
								name: "award",
								size: 18
							}), e] }, e))
						})]
					}) : null]
				}) : null,
				clinic ? /* @__PURE__ */ jsxs("section", {
					className: "block",
					"aria-labelledby": "clinic-h",
					children: [/* @__PURE__ */ jsx("h2", {
						id: "clinic-h",
						children: "Где принимает"
					}), /* @__PURE__ */ jsx(ClinicCard, { clinic })]
				}) : null,
				prices.length > 0 ? /* @__PURE__ */ jsxs("section", {
					className: "block",
					"aria-labelledby": "dp-h",
					children: [
						/* @__PURE__ */ jsx("h2", {
							id: "dp-h",
							children: "Услуги врача и цены клиники"
						}),
						/* @__PURE__ */ jsx("ul", {
							className: "price-list",
							children: prices.map((p) => /* @__PURE__ */ jsxs("li", {
								className: "price-row price-row--static",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "price-row__name",
										children: /* @__PURE__ */ jsx("b", { children: p.name })
									}),
									/* @__PURE__ */ jsx("span", { className: "price-row__meta" }),
									/* @__PURE__ */ jsx("b", {
										className: "price-row__price",
										children: p.price_to && p.price_to > p.price_from ? `${money(p.price_from)} – ${money(p.price_to)}` : priceFrom(p.price_from)
									})
								]
							}, p.slug))
						}),
						/* @__PURE__ */ jsx(Alert, {
							tone: "muted",
							icon: "info",
							children: "Цены «от». Итоговую стоимость определяет врач после осмотра."
						})
					]
				}) : null,
				/* @__PURE__ */ jsxs("section", {
					id: "reviews",
					className: "block",
					"aria-labelledby": "reviews-h",
					children: [
						/* @__PURE__ */ jsx("h2", {
							id: "reviews-h",
							children: "Отзывы о враче"
						}),
						/* @__PURE__ */ jsx(RatingSummary, {
							rating: doctor.rating,
							count: total || doctor.reviews_count,
							distribution
						}),
						reviews.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
							icon: "thumb",
							title: "Отзывов пока нет",
							text: "Оставить отзыв можно на странице клиники, указав этого врача."
						}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
							className: "stack-lg",
							children: reviews.data.map((r) => /* @__PURE__ */ jsx(ReviewCard, {
								review: r,
								showClinic: true
							}, r.id))
						}), /* @__PURE__ */ jsx(Pagination, {
							page: reviews,
							only: ["reviews"],
							param: "reviews_page",
							scrollTo: "#reviews"
						})] })
					]
				}),
				colleagues.length > 0 ? /* @__PURE__ */ jsxs("section", {
					className: "block",
					"aria-labelledby": "col-h",
					children: [/* @__PURE__ */ jsx("h2", {
						id: "col-h",
						children: "Другие врачи клиники"
					}), /* @__PURE__ */ jsx("div", {
						className: "grid grid--doctors",
						children: colleagues.map((d) => /* @__PURE__ */ jsx(DoctorCard, { doctor: d }, d.id))
					})]
				}) : null
			]
		})
	] });
}
//#endregion
export { DoctorShow as default };

//# sourceMappingURL=Show-DXzAlJgt.js.map