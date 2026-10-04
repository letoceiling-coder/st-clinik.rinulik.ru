import { t as Icon } from "./Icon-DBH8JZC9.js";
import { l as priceFrom, t as clinicsWord } from "./format-BPZIj7DQ.js";
import { i as LinkButton } from "./Button-DsM_qe4F.js";
import { a as Alert, c as Breadcrumbs, f as SectionHead, l as EmptyState, n as useCity } from "../app.js";
import { t as ClinicCard } from "./ClinicCard-LXJPXRDT.js";
import { t as DoctorCard } from "./DoctorCard-IUFtL7lg.js";
import { t as ConcernChips } from "./Tiles-CdLD_ZE2.js";
import { Link, usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Directions/Show.tsx
function DirectionShow({ specialty, services, clinics, clinics_total, doctors, concerns, breadcrumbs }) {
	const city = useCity();
	const { seo } = usePage().props;
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Breadcrumbs, { items: breadcrumbs }),
		/* @__PURE__ */ jsxs("header", {
			className: "container page-head page-head--icon",
			children: [/* @__PURE__ */ jsx("span", {
				className: "tile__icon tile__icon--lg",
				children: /* @__PURE__ */ jsx(Icon, {
					name: specialty.icon ?? "tooth",
					size: 36
				})
			}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", { children: seo?.h1 ?? `${specialty.name} ${city.nameIn}` }), specialty.description ? /* @__PURE__ */ jsx("p", {
				className: "text-muted page-head__lead",
				children: specialty.description
			}) : null] })]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "container two-col",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "stack-lg",
				children: [specialty.when_to_apply ? /* @__PURE__ */ jsxs("section", {
					className: "card",
					"aria-labelledby": "when",
					children: [/* @__PURE__ */ jsx("h2", {
						id: "when",
						className: "card-title",
						children: "Когда обращаться"
					}), /* @__PURE__ */ jsx("p", { children: specialty.when_to_apply })]
				}) : null, /* @__PURE__ */ jsxs("section", {
					"aria-labelledby": "svc",
					children: [
						/* @__PURE__ */ jsx("h2", {
							id: "svc",
							className: "card-title",
							children: "Услуги и цены"
						}),
						services.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
							icon: "list",
							title: "Услуги скоро появятся"
						}) : /* @__PURE__ */ jsx("ul", {
							className: "price-list",
							children: services.map((s) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
								href: city.path("clinics", { service: s.slug }),
								className: "price-row",
								children: [
									/* @__PURE__ */ jsxs("span", {
										className: "price-row__name",
										children: [/* @__PURE__ */ jsx("b", { children: s.name }), s.description ? /* @__PURE__ */ jsx("span", {
											className: "text-sm text-muted",
											children: s.description
										}) : null]
									}),
									/* @__PURE__ */ jsx("span", {
										className: "price-row__meta text-sm text-muted",
										children: s.clinics > 0 ? clinicsWord(s.clinics) : "—"
									}),
									/* @__PURE__ */ jsx("b", {
										className: "price-row__price",
										children: priceFrom(s.price_from)
									}),
									/* @__PURE__ */ jsx(Icon, {
										name: "chevron-right",
										size: 18
									})
								]
							}) }, s.slug))
						}),
						/* @__PURE__ */ jsx("p", {
							className: "text-xs text-muted",
							style: { marginTop: 12 },
							children: "Цена «от». Окончательная стоимость определяется после осмотра и составления плана лечения."
						})
					]
				})]
			}), /* @__PURE__ */ jsxs("aside", {
				className: "stack",
				children: [specialty.restrictions ? /* @__PURE__ */ jsxs(Alert, {
					tone: "warning",
					icon: "alert",
					children: [
						/* @__PURE__ */ jsx("b", { children: "Ограничения приёма." }),
						" ",
						specialty.restrictions
					]
				}) : null, concerns.length > 0 ? /* @__PURE__ */ jsxs("div", {
					className: "card",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						style: { fontSize: "var(--fs-lg)" },
						children: "С чем обращаются"
					}), /* @__PURE__ */ jsx(ConcernChips, {
						concerns,
						scroll: false
					})]
				}) : null]
			})]
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section",
			"aria-labelledby": "dir-clinics",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [/* @__PURE__ */ jsx(SectionHead, {
					title: /* @__PURE__ */ jsx("span", {
						id: "dir-clinics",
						children: "Клиники по направлению"
					}),
					text: clinics_total > 0 ? `Найдено: ${clinicsWord(clinics_total)}` : void 0,
					action: /* @__PURE__ */ jsx(LinkButton, {
						href: city.path("clinics", { specialty: specialty.slug }),
						variant: "dark",
						size: "sm",
						children: "Все клиники"
					})
				}), clinics.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Пока нет клиник по этому направлению" }) : /* @__PURE__ */ jsx("div", {
					className: "grid grid--cards",
					children: clinics.map((c) => /* @__PURE__ */ jsx(ClinicCard, {
						clinic: c,
						layout: "tile"
					}, c.id))
				})]
			})
		}),
		doctors.length > 0 ? /* @__PURE__ */ jsx("section", {
			className: "section section--muted",
			"aria-labelledby": "dir-doctors",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [/* @__PURE__ */ jsx(SectionHead, {
					title: /* @__PURE__ */ jsx("span", {
						id: "dir-doctors",
						children: "Врачи"
					}),
					action: /* @__PURE__ */ jsxs(Link, {
						href: city.path("doctors", { specialty: specialty.slug }),
						className: "link-arrow",
						children: ["Все врачи ", /* @__PURE__ */ jsx(Icon, {
							name: "arrow-right",
							size: 18
						})]
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "grid grid--doctors",
					children: doctors.map((d) => /* @__PURE__ */ jsx(DoctorCard, { doctor: d }, d.id))
				})]
			})
		}) : null
	] });
}
//#endregion
export { DirectionShow as default };

//# sourceMappingURL=Show-CG2TSMvF.js.map