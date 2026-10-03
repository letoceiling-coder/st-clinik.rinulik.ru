import { t as Icon } from "./Icon-DBH8JZC9.js";
import { c as priceFrom, t as clinicsWord } from "./format-Cjg0FGVI.js";
import { i as LinkButton } from "./Button-D4s3iLUi.js";
import { a as Alert, c as Breadcrumbs, f as SectionHead, l as EmptyState, n as useCity } from "../app.js";
import { t as ClinicCard } from "./ClinicCard-DDz1EaqG.js";
import { t as ConcernChips } from "./Tiles-yXDMQSCy.js";
import { Link, usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Concerns/Show.tsx
function ConcernShow({ concern, specialty, services, clinics, clinics_total, other_concerns, breadcrumbs }) {
	const city = useCity();
	const { seo } = usePage().props;
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Breadcrumbs, { items: breadcrumbs }),
		/* @__PURE__ */ jsxs("header", {
			className: "container page-head page-head--icon",
			children: [/* @__PURE__ */ jsx("span", {
				className: "tile__icon tile__icon--lg",
				children: /* @__PURE__ */ jsx(Icon, {
					name: concern.icon ?? "tooth",
					size: 36
				})
			}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", { children: seo?.h1 ?? `${concern.name}: куда обратиться в ${city.nameIn}` }), concern.hint ? /* @__PURE__ */ jsx("p", {
				className: "text-muted page-head__lead",
				children: concern.hint
			}) : null] })]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "container two-col",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "stack-lg",
				children: [
					/* @__PURE__ */ jsxs(Alert, {
						tone: "warning",
						icon: "alert",
						children: [/* @__PURE__ */ jsx("b", { children: "Это справочная информация, а не диагноз." }), " Причину проблемы определяет только врач после осмотра. При сильной боли, отёке лица, температуре или затруднённом дыхании обратитесь в неотложную помощь."]
					}),
					concern.advice ? /* @__PURE__ */ jsxs("section", {
						className: "card",
						"aria-labelledby": "advice",
						children: [/* @__PURE__ */ jsx("h2", {
							id: "advice",
							className: "card-title",
							children: "Что делать"
						}), /* @__PURE__ */ jsx("p", { children: concern.advice })]
					}) : null,
					services.length > 0 ? /* @__PURE__ */ jsxs("section", {
						"aria-labelledby": "c-services",
						children: [
							/* @__PURE__ */ jsx("h2", {
								id: "c-services",
								className: "card-title",
								children: "Чем это лечат и сколько стоит"
							}),
							/* @__PURE__ */ jsx("ul", {
								className: "price-list",
								children: services.map((s) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
									href: city.path("clinics", { service: s.slug }),
									className: "price-row",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "price-row__name",
											children: /* @__PURE__ */ jsx("b", { children: s.name })
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
								children: "Цена «от». Окончательная стоимость определяется после осмотра."
							})
						]
					}) : null
				]
			}), /* @__PURE__ */ jsxs("aside", {
				className: "stack",
				children: [specialty ? /* @__PURE__ */ jsxs("div", {
					className: "card card--muted",
					children: [
						/* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted",
							children: "Подходящее направление"
						}),
						/* @__PURE__ */ jsx("h2", {
							style: {
								fontSize: "var(--fs-lg)",
								margin: "4px 0 12px"
							},
							children: specialty.name
						}),
						/* @__PURE__ */ jsx(LinkButton, {
							href: city.direction(specialty.slug),
							variant: "dark",
							size: "sm",
							children: "Открыть направление"
						}),
						specialty.restrictions ? /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted",
							style: { marginTop: 12 },
							children: specialty.restrictions
						}) : null
					]
				}) : null, other_concerns.length > 0 ? /* @__PURE__ */ jsxs("div", {
					className: "card",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						style: { fontSize: "var(--fs-lg)" },
						children: "Другие запросы"
					}), /* @__PURE__ */ jsx(ConcernChips, {
						concerns: other_concerns,
						scroll: false
					})]
				}) : null]
			})]
		}),
		/* @__PURE__ */ jsx("section", {
			className: "section",
			"aria-labelledby": "c-clinics",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container",
				children: [/* @__PURE__ */ jsx(SectionHead, {
					title: /* @__PURE__ */ jsx("span", {
						id: "c-clinics",
						children: "Клиники, куда можно обратиться"
					}),
					text: clinics_total > 0 ? `Найдено: ${clinicsWord(clinics_total)}` : void 0,
					action: specialty ? /* @__PURE__ */ jsx(LinkButton, {
						href: city.path("clinics", { specialty: specialty.slug }),
						variant: "dark",
						size: "sm",
						children: "Все клиники"
					}) : void 0
				}), clinics.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Пока нет подходящих клиник" }) : /* @__PURE__ */ jsx("div", {
					className: "grid grid--cards",
					children: clinics.map((c) => /* @__PURE__ */ jsx(ClinicCard, {
						clinic: c,
						layout: "tile"
					}, c.id))
				})]
			})
		})
	] });
}
//#endregion
export { ConcernShow as default };

//# sourceMappingURL=Show-Cc-u7svt.js.map