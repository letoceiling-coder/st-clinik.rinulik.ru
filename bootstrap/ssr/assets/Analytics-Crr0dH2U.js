import { c as Table, r as PageHead } from "./Dash-mdaQWR8t.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Analytics.tsx
function Analytics({ days, funnel, totals, by_city, metrika_configured, metrika_goals }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Аналитика",
				text: metrika_configured ? "Воронка по событиям на сайте и цели Метрики (счётчик из интеграций)." : "Счётчик Яндекс.Метрики не настроен — события пишутся только в базу."
			}),
			/* @__PURE__ */ jsx("div", {
				className: "row row--wrap",
				children: [
					7,
					30,
					90
				].map((d) => /* @__PURE__ */ jsxs(Link, {
					href: `/admin/analytics?days=${d}`,
					className: d === days ? "btn btn--primary btn--sm" : "btn btn--ghost btn--sm",
					children: [d, " дн."]
				}, d))
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Воронка записи"
				}), /* @__PURE__ */ jsx(Table, {
					headers: [
						"Этап",
						"События",
						"% от визитов"
					],
					children: funnel.map((row) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", { children: row.label }),
						/* @__PURE__ */ jsx("td", { children: row.count }),
						/* @__PURE__ */ jsxs("td", { children: [row.rate, "%"] })
					] }, row.event))
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Все события"
				}), /* @__PURE__ */ jsx(Table, {
					headers: ["Событие", "Количество"],
					children: totals.map((row) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("td", { children: row.label }), /* @__PURE__ */ jsx("td", { children: row.count })] }, row.event))
				})]
			}),
			metrika_configured && metrika_goals.length > 0 ? /* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Цели Яндекс.Метрики"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "Создайте в Метрике JavaScript-цели с идентификаторами как в таблице — сайт шлёт reachGoal при тех же событиях."
					}),
					/* @__PURE__ */ jsx(Table, {
						headers: ["ID цели", "Описание"],
						children: metrika_goals.map((g) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", { children: g.id }) }), /* @__PURE__ */ jsx("td", { children: g.label })] }, g.id))
					})
				]
			}) : null,
			by_city.length > 0 ? /* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "По городам (топ)"
				}), /* @__PURE__ */ jsx(Table, {
					headers: ["Город", "События"],
					children: by_city.map((row) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("td", { children: row.city }), /* @__PURE__ */ jsx("td", { children: row.count })] }, row.city))
				})]
			}) : null
		]
	});
}
//#endregion
export { Analytics as default };

//# sourceMappingURL=Analytics-Crr0dH2U.js.map