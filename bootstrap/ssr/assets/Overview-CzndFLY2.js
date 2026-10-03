import { i as LinkButton } from "./Button-D4s3iLUi.js";
import { l as EmptyState } from "../app.js";
import { a as StatusBadge, n as Kpis, r as PageHead } from "./Dash-CaoYUPpG.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Account/Overview.tsx
function Overview({ counts, leads, notifications }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Личный кабинет",
				text: "Заявки, избранное и отзывы в одном месте."
			}),
			/* @__PURE__ */ jsx(Kpis, { items: [
				{
					label: "Активные записи",
					value: counts.active_leads
				},
				{
					label: "Избранное",
					value: counts.favorites
				},
				{
					label: "Сравнение",
					value: counts.compare
				},
				{
					label: "Мои отзывы",
					value: counts.reviews
				},
				{
					label: "Непрочитанные",
					value: counts.unread
				}
			] }),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						style: { margin: 0 },
						children: "Последние заявки"
					}), /* @__PURE__ */ jsx(Link, {
						href: "/account/leads",
						className: "link",
						children: "Все заявки"
					})]
				}), leads.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
					title: "Заявок пока нет",
					text: "Найдите клинику и отправьте заявку на приём.",
					action: /* @__PURE__ */ jsx(LinkButton, {
						href: "/",
						children: "На главную"
					})
				}) : /* @__PURE__ */ jsx("ul", {
					className: "stack",
					children: leads.map((l) => /* @__PURE__ */ jsxs("li", {
						className: "row row--between",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: l.clinic?.name ?? "Клиника" }), /* @__PURE__ */ jsxs("div", {
							className: "text-sm text-muted",
							children: [
								l.service ?? l.clinic?.address,
								" · ",
								l.created_at
							]
						})] }), /* @__PURE__ */ jsx(StatusBadge, { status: l.status })]
					}, l.id))
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						style: { margin: 0 },
						children: "Уведомления"
					}), /* @__PURE__ */ jsx(Link, {
						href: "/account/notifications",
						className: "link",
						children: "Все"
					})]
				}), notifications.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-muted",
					children: "Пока тихо."
				}) : notifications.map((n) => /* @__PURE__ */ jsxs(Link, {
					href: n.url || "/account/notifications",
					className: "stack",
					style: { opacity: n.read ? .7 : 1 },
					children: [/* @__PURE__ */ jsx("b", { children: n.title }), /* @__PURE__ */ jsxs("span", {
						className: "text-sm text-muted",
						children: [
							n.body,
							" · ",
							n.at
						]
					})]
				}, n.id))]
			})
		]
	});
}
//#endregion
export { Overview as default };

//# sourceMappingURL=Overview-CzndFLY2.js.map