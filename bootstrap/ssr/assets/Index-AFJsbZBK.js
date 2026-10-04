import { t as Icon } from "./Icon-DBH8JZC9.js";
import { l as priceFrom, t as clinicsWord } from "./format-BPZIj7DQ.js";
import { a as Alert, c as Breadcrumbs, l as EmptyState, n as useCity, y as SearchInput } from "../app.js";
import { Link, usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
//#region resources/js/pages/Prices/Index.tsx
function PricesIndex({ groups, breadcrumbs }) {
	const city = useCity();
	const { seo } = usePage().props;
	const [q, setQ] = useState("");
	const filtered = useMemo(() => {
		const needle = q.trim().toLowerCase();
		if (!needle) return groups;
		return groups.map((g) => ({
			...g,
			items: g.items.filter((i) => i.name.toLowerCase().includes(needle))
		})).filter((g) => g.items.length > 0);
	}, [groups, q]);
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Breadcrumbs, { items: breadcrumbs }),
		/* @__PURE__ */ jsxs("header", {
			className: "container page-head",
			children: [/* @__PURE__ */ jsx("h1", { children: seo?.h1 ?? `Цены на стоматологические услуги ${city.nameIn}` }), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Минимальные цены среди клиник города. Выберите услугу, чтобы сравнить предложения."
			})]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "container stack-lg",
			style: { paddingBottom: "var(--space-12)" },
			children: [
				/* @__PURE__ */ jsx(Alert, {
					tone: "warning",
					icon: "info",
					children: "Цены указаны «от» и приведены для ознакомления. Окончательная стоимость лечения определяется врачом после осмотра и согласования плана лечения."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "prices-tools",
					children: [/* @__PURE__ */ jsx("div", {
						className: "grow",
						children: /* @__PURE__ */ jsx(SearchInput, {
							label: "Найти услугу",
							placeholder: "Например, пломба или имплант",
							value: q,
							onChange: (e) => setQ(e.target.value)
						})
					}), /* @__PURE__ */ jsx("div", {
						className: "chip-scroll prices-tools__groups",
						children: groups.map((g) => /* @__PURE__ */ jsx("a", {
							href: `#g-${groups.indexOf(g)}`,
							className: "chip chip--soft",
							children: g.group ?? "Прочее"
						}, g.group))
					})]
				}),
				filtered.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
					title: "Услуга не найдена",
					text: "Попробуйте изменить запрос."
				}) : filtered.map((g) => /* @__PURE__ */ jsxs("section", {
					id: `g-${groups.findIndex((x) => x.group === g.group)}`,
					"aria-label": g.group ?? "Прочее",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: g.group ?? "Прочее"
					}), /* @__PURE__ */ jsx("ul", {
						className: "price-list",
						children: g.items.map((s) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
							href: city.path("clinics", { service: s.slug }),
							className: "price-row",
							children: [
								/* @__PURE__ */ jsxs("span", {
									className: "price-row__name",
									children: [/* @__PURE__ */ jsx("b", { children: s.name }), s.duration_min ? /* @__PURE__ */ jsxs("span", {
										className: "text-sm text-muted",
										children: [
											"около ",
											s.duration_min,
											" мин"
										]
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
					})]
				}, g.group))
			]
		})
	] });
}
//#endregion
export { PricesIndex as default };

//# sourceMappingURL=Index-AFJsbZBK.js.map