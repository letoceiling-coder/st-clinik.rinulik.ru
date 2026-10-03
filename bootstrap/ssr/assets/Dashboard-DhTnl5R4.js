import { i as LinkButton } from "./Button-D4s3iLUi.js";
import { a as Alert, l as EmptyState } from "../app.js";
import { a as StatusBadge, n as Kpis, r as PageHead } from "./Dash-CaoYUPpG.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Dashboard.tsx
function Dashboard({ completeness, kpi, moderation, recent_leads }) {
	const percent = completeness.percent ?? 0;
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Обзор филиала",
				text: "Полнота профиля влияет на выдачу в каталоге и скорость модерации."
			}),
			moderation.clinic === "rejected" ? /* @__PURE__ */ jsxs(Alert, {
				tone: "danger",
				children: ["Отклонено: ", moderation.clinic_note]
			}) : null,
			moderation.clinic === "pending" ? /* @__PURE__ */ jsx(Alert, {
				tone: "warning",
				children: "Филиал на модерации."
			}) : null,
			/* @__PURE__ */ jsx(Kpis, { items: [
				{
					label: "Заявки за 30 дней",
					value: kpi.leads_30d
				},
				{
					label: "Новые заявки",
					value: kpi.leads_new
				},
				{
					label: "Просмотры",
					value: kpi.views
				},
				{
					label: "Рейтинг",
					value: kpi.rating.toFixed(1).replace(".", ",")
				},
				{
					label: "Отзывы",
					value: kpi.reviews,
					hint: kpi.unanswered ? `без ответа: ${kpi.unanswered}` : void 0
				},
				{
					label: "Заполненность",
					value: `${percent}%`
				}
			] }),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Модерация"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "row row--wrap",
						children: [/* @__PURE__ */ jsx(StatusBadge, { status: moderation.clinic }), /* @__PURE__ */ jsxs("span", {
							className: "text-sm text-muted",
							children: [
								"врачи: ",
								moderation.doctors_pending,
								" · фото: ",
								moderation.photos_pending,
								" · документы: ",
								moderation.documents_pending
							]
						})]
					}),
					completeness.items?.some((i) => !i.done) ? /* @__PURE__ */ jsxs("p", {
						className: "text-sm text-muted",
						children: [
							"Чтобы улучшить карточку: ",
							completeness.items.filter((i) => !i.done).map((i) => i.label).join(", "),
							"."
						]
					}) : null
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						style: { margin: 0 },
						children: "Последние заявки"
					}), /* @__PURE__ */ jsx(Link, {
						href: "/clinic-cabinet/leads",
						className: "link",
						children: "Все заявки"
					})]
				}), recent_leads.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Заявок пока нет" }) : recent_leads.map((l) => /* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: l.name }), /* @__PURE__ */ jsxs("div", {
						className: "text-sm text-muted",
						children: [
							l.service ?? l.phone,
							" · ",
							l.created_at
						]
					})] }), /* @__PURE__ */ jsx(StatusBadge, { status: l.status })]
				}, l.id))]
			}),
			/* @__PURE__ */ jsx(LinkButton, {
				href: "/clinic-cabinet/stats",
				variant: "outline",
				children: "Открыть статистику"
			})
		]
	});
}
//#endregion
export { Dashboard as default };

//# sourceMappingURL=Dashboard-DhTnl5R4.js.map