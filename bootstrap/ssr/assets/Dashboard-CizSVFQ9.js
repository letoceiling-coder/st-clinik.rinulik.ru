import { t as Icon } from "./Icon-_sloiNX5.js";
import { n as Kpis, o as STATUS, r as PageHead } from "./Dash-cIdZIfDR.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Dashboard.tsx
function Dashboard({ kpi, queue, audit, clinics_by_status }) {
	const revenueRub = Math.round(kpi.revenue_30d / 100);
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Админ-панель",
				text: "Метрики платформы, модерация и быстрые ссылки."
			}),
			/* @__PURE__ */ jsx(Kpis, { items: [
				{
					label: "Пользователи",
					value: kpi.users,
					hint: `+${kpi.users_new_30d} за 30 дн.`
				},
				{
					label: "Клиники в каталоге",
					value: kpi.clinics,
					hint: `всего ${kpi.clinics_total}`
				},
				{
					label: "Врачи",
					value: kpi.doctors
				},
				{
					label: "Записи (30 дн.)",
					value: kpi.appointments_30d,
					hint: `предстоящих: ${kpi.appointments_upcoming}`
				},
				{
					label: "Выручка 30 дн.",
					value: `${revenueRub.toLocaleString("ru-RU")} ₽`
				},
				{
					label: "Активная реклама",
					value: kpi.active_promotions
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
			/* @__PURE__ */ jsxs("nav", {
				className: "quick-links",
				"aria-label": "Быстрые ссылки",
				children: [
					/* @__PURE__ */ jsxs(Link, {
						href: "/admin/appointments",
						className: "quick-links__item",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "calendar",
							size: 18
						}), "Все записи"]
					}),
					/* @__PURE__ */ jsxs(Link, {
						href: "/admin/reports",
						className: "quick-links__item",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "file",
							size: 18
						}), "Отчёты CSV"]
					}),
					/* @__PURE__ */ jsxs(Link, {
						href: "/admin/finance",
						className: "quick-links__item",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "ruble",
							size: 18
						}), "Финансы"]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Клиники по статусам"
				}), /* @__PURE__ */ jsx("div", {
					className: "kpi-grid",
					children: Object.entries(clinics_by_status).map(([status, count]) => /* @__PURE__ */ jsxs("div", {
						className: "kpi card card--muted",
						children: [/* @__PURE__ */ jsx("dt", { children: STATUS[status]?.label ?? status }), /* @__PURE__ */ jsx("dd", { children: count })]
					}, status))
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsxs("h2", {
						className: "card-title",
						style: { margin: 0 },
						children: ["Очередь модерации · ", queue.total]
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
				children: [/* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						style: { margin: 0 },
						children: "Последний аудит"
					}), /* @__PURE__ */ jsx(Link, {
						href: "/admin/audit",
						className: "link",
						children: "Журнал"
					})]
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

//# sourceMappingURL=Dashboard-CizSVFQ9.js.map