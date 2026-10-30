import { t as Icon } from "./Icon-_sloiNX5.js";
import { a as can } from "../app.js";
import { n as Kpis, o as STATUS, r as PageHead } from "./Dash-C8plSzIc.js";
import { Link, usePage } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Dashboard.tsx
/** Типы очереди модерации: ключ из контроллера, название и тип для фильтра на странице модерации. */
var QUEUE_TYPES = [
	{
		key: "clinics",
		label: "Клиники",
		type: "clinic"
	},
	{
		key: "doctors",
		label: "Врачи",
		type: "doctor"
	},
	{
		key: "photos",
		label: "Фото",
		type: "photo"
	},
	{
		key: "documents",
		label: "Документы",
		type: "document"
	},
	{
		key: "reviews",
		label: "Отзывы",
		type: "review"
	}
];
function Dashboard({ kpi, queue, audit, clinics_by_status }) {
	const user = usePage().props.auth?.user;
	const linkIf = (permission, href) => can(user, permission) ? href : void 0;
	const revenueRub = Math.round(kpi.revenue_30d / 100);
	const kpis = [
		{
			label: "Пользователи",
			value: kpi.users,
			hint: `+${kpi.users_new_30d} за 30 дн.`,
			href: linkIf("admin.users", "/admin/users")
		},
		{
			label: "Клиники в каталоге",
			value: kpi.clinics,
			hint: `всего ${kpi.clinics_total}`,
			href: linkIf("admin.clinics", "/admin/clinics?status=published")
		},
		{
			label: "Врачи",
			value: kpi.doctors,
			href: linkIf("admin.doctors", "/admin/doctors")
		},
		{
			label: "Записи (30 дн.)",
			value: kpi.appointments_30d,
			hint: `предстоящих: ${kpi.appointments_upcoming}`,
			href: linkIf("admin.appointments", "/admin/appointments")
		},
		{
			label: "Выручка 30 дн.",
			value: `${revenueRub.toLocaleString("ru-RU")} ₽`,
			href: linkIf("admin.finance", "/admin/finance")
		},
		{
			label: "Активная реклама",
			value: kpi.active_promotions,
			href: linkIf("admin.promotions", "/admin/promotions")
		},
		{
			label: "Заявки 30 дн.",
			value: kpi.leads_30d,
			href: linkIf("admin.analytics", "/admin/analytics")
		},
		{
			label: "Жалобы",
			value: kpi.complaints,
			href: linkIf("admin.complaints", "/admin/complaints")
		}
	];
	const statuses = Object.entries(clinics_by_status).map(([status, count]) => ({
		label: STATUS[status]?.label ?? "Другой статус",
		value: count,
		href: linkIf("admin.clinics", `/admin/clinics?status=${status}`)
	}));
	const queueItems = QUEUE_TYPES.map((t) => ({
		label: t.label,
		value: queue[t.key],
		href: linkIf("admin.moderation", `/admin/moderation?type=${t.type}`)
	}));
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Админ-панель",
				text: "Метрики платформы, модерация и быстрые ссылки."
			}),
			/* @__PURE__ */ jsx(Kpis, { items: kpis }),
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
				}), /* @__PURE__ */ jsx(Kpis, {
					items: statuses,
					muted: true,
					balanced: false
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
				}), /* @__PURE__ */ jsx(Kpis, {
					items: queueItems,
					muted: true,
					balanced: false
				})]
			}),
			audit.length > 0 ? /* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						style: { margin: 0 },
						children: "Последние действия"
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
			}) : null
		]
	});
}
//#endregion
export { Dashboard as default };

//# sourceMappingURL=Dashboard-BNl_NxZ6.js.map