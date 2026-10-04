import { n as Kpis, r as PageHead } from "./Dash-BbiOlhfn.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Stats.tsx
function Stats({ series, statuses, conversion, top_services, views, rating, reviews }) {
	const max = Math.max(1, ...series.map((s) => s.value));
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Статистика",
				text: "Заявки за 30 дней, конверсия и популярные услуги."
			}),
			/* @__PURE__ */ jsx(Kpis, { items: [
				{
					label: "Заявки",
					value: conversion.total
				},
				{
					label: "Подтверждено",
					value: conversion.confirmed
				},
				{
					label: "Конверсия",
					value: `${conversion.percent}%`
				},
				{
					label: "Просмотры",
					value: views
				},
				{
					label: "Рейтинг",
					value: rating.toFixed(1).replace(".", ",")
				},
				{
					label: "Отзывы",
					value: reviews
				}
			] }),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Заявки по дням"
				}), /* @__PURE__ */ jsx("div", {
					className: "chart",
					"aria-hidden": "true",
					children: series.map((s) => /* @__PURE__ */ jsx("span", {
						title: `${s.date}: ${s.value}`,
						style: { height: `${s.value / max * 100}%` }
					}, s.date))
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "two-col two-col--even",
				children: [/* @__PURE__ */ jsxs("section", {
					className: "card stack",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Статусы"
					}), statuses.map((s) => /* @__PURE__ */ jsxs("div", {
						className: "row row--between",
						children: [/* @__PURE__ */ jsx("span", { children: s.label }), /* @__PURE__ */ jsx("b", { children: s.count })]
					}, s.key))]
				}), /* @__PURE__ */ jsxs("section", {
					className: "card stack",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Топ услуг в заявках"
					}), top_services.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "text-muted",
						children: "Пока нет данных."
					}) : top_services.map((s) => /* @__PURE__ */ jsxs("div", {
						className: "row row--between",
						children: [/* @__PURE__ */ jsx("span", { children: s.name }), /* @__PURE__ */ jsx("b", { children: s.count })]
					}, s.name))]
				})]
			})
		]
	});
}
//#endregion
export { Stats as default };

//# sourceMappingURL=Stats-BdfiTKRb.js.map