import { t as Icon } from "./Icon-DQahs-u2.js";
import { d as yearsWord, l as priceFrom, n as cx, u as reviewsWord } from "./format-BPZIj7DQ.js";
import { n as Button } from "./Button-D8Mzgn6o.js";
import { i as useLead, s as Badge } from "../app.js";
import { n as FavoriteButton, t as CompareButton } from "./CollectionButtons-BKdZIxph.js";
import { n as DoctorArt } from "./PhotoArt-BefU5AAo.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/DoctorCard.tsx
function DoctorCard({ doctor, compact }) {
	const lead = useLead();
	const href = `/doctors/${doctor.slug}`;
	return /* @__PURE__ */ jsxs("article", {
		className: cx("doctor-card", compact && "doctor-card--compact"),
		"aria-labelledby": `doctor-${doctor.id}`,
		children: [
			/* @__PURE__ */ jsx(Link, {
				href,
				className: "doctor-card__photo",
				tabIndex: -1,
				"aria-hidden": "true",
				children: /* @__PURE__ */ jsx(DoctorArt, {
					seed: doctor.art_seed,
					photoUrl: doctor.photo_url,
					name: doctor.name
				})
			}),
			/* @__PURE__ */ jsx(FavoriteButton, {
				type: "doctor",
				id: doctor.id,
				name: doctor.name
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "doctor-card__body",
				children: [
					/* @__PURE__ */ jsx("h3", {
						id: `doctor-${doctor.id}`,
						className: "doctor-card__name",
						children: /* @__PURE__ */ jsx(Link, {
							href,
							children: doctor.name
						})
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-muted text-sm",
						children: doctor.position
					}),
					/* @__PURE__ */ jsx("div", {
						className: "row row--wrap",
						style: { gap: 8 },
						children: doctor.reviews_count > 0 ? /* @__PURE__ */ jsxs("span", {
							className: "rating",
							children: [
								/* @__PURE__ */ jsx(Icon, {
									name: "star",
									size: 17
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
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "doctor-card__meta",
						children: [
							/* @__PURE__ */ jsxs(Badge, {
								icon: "award",
								children: ["Стаж ", yearsWord(doctor.experience_years)]
							}),
							doctor.is_verified ? /* @__PURE__ */ jsx(Badge, {
								tone: "success",
								icon: "shield",
								children: "Проверен"
							}) : null,
							doctor.accepts_children ? /* @__PURE__ */ jsx(Badge, {
								tone: "primary",
								children: doctor.children_age_from ? `Дети с ${doctor.children_age_from}` : "Принимает детей"
							}) : null
						]
					}),
					doctor.clinic ? /* @__PURE__ */ jsxs("p", {
						className: "doctor-card__clinic text-sm",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "pin",
							size: 15
						}), /* @__PURE__ */ jsx(Link, {
							href: `/clinics/${doctor.clinic.slug}`,
							className: "link-arrow",
							style: { fontWeight: 600 },
							children: doctor.clinic.name
						})]
					}) : null,
					!compact ? /* @__PURE__ */ jsxs("div", {
						className: "doctor-card__actions",
						children: [/* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs text-muted",
								children: "Приём"
							}),
							/* @__PURE__ */ jsx("br", {}),
							/* @__PURE__ */ jsx("b", { children: priceFrom(doctor.consult_price, "по запросу") })
						] }), /* @__PURE__ */ jsxs("div", {
							className: "row",
							children: [/* @__PURE__ */ jsx(CompareButton, {
								type: "doctor",
								id: doctor.id,
								name: doctor.name,
								compact: true
							}), doctor.clinic ? /* @__PURE__ */ jsx(Button, {
								size: "sm",
								onClick: () => lead.open({
									slug: doctor.clinic.slug,
									name: doctor.clinic.name,
									doctorId: doctor.id,
									doctors: [{
										id: doctor.id,
										name: doctor.name
									}],
									source: "doctor"
								}),
								children: "Записаться"
							}) : null]
						})]
					}) : null
				]
			})
		]
	});
}
//#endregion
export { DoctorCard as t };

//# sourceMappingURL=DoctorCard-DD2yuAuy.js.map