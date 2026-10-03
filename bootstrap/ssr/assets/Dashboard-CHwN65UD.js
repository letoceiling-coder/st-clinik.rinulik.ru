import { n as Kpis, r as PageHead } from "./Dash-CaoYUPpG.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Dashboard.tsx
function Dashboard({ kpi, queue, audit }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Админ-панель",
				text: "Очередь модерации и ключевые метрики прототипа."
			}),
			/* @__PURE__ */ jsx(Kpis, { items: [
				{
					label: "Пользователи",
					value: kpi.users
				},
				{
					label: "Клиники",
					value: kpi.clinics
				},
				{
					label: "Врачи",
					value: kpi.doctors
				},
				{
					label: "Отзывы",
					value: kpi.reviews
				},
				{
					label: "Заявки 30 дн.",
					value: kpi.leads_30d
				},
				{
					label: "Жалобы",
					value: kpi.complaints
				}
			] }),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsxs("h2", {
						className: "card-title",
						style: { margin: 0 },
						children: ["Очередь · ", queue.total]
					}), /* @__PURE__ */ jsx(Link, {
						href: "/admin/moderation",
						className: "link",
						children: "Открыть"
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "kpi-grid",
					children: [
						"clinics",
						"doctors",
						"photos",
						"documents",
						"reviews"
					].map((k) => /* @__PURE__ */ jsxs("div", {
						className: "kpi card card--muted",
						children: [/* @__PURE__ */ jsx("dt", { children: k }), /* @__PURE__ */ jsx("dd", { children: queue[k] })]
					}, k))
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Последний аудит"
				}), audit.map((a) => /* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsxs("span", { children: [
						a.action,
						" · ",
						a.user
					] }), /* @__PURE__ */ jsx("span", {
						className: "text-xs text-muted",
						children: a.at
					})]
				}, a.id))]
			})
		]
	});
}
//#endregion
export { Dashboard as default };

//# sourceMappingURL=Dashboard-CHwN65UD.js.map