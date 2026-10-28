import { t as Icon } from "./Icon-_sloiNX5.js";
import { n as cx } from "./format-BP5psl3Q.js";
import { i as LinkButton } from "./Button-C2BxTtRt.js";
import { d as EmptyState, s as Alert } from "../app.js";
import { n as Kpis, r as PageHead, s as StatusBadge } from "./Dash-cIdZIfDR.js";
import { Link } from "@inertiajs/react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/ProfileWizard.tsx
/**
* Мастер заполнения профиля: прогресс, один «следующий шаг» с наибольшим эффектом и чек-лист со ссылками.
* Пункты, отправленные на модерацию, не считаются задачей — они ждут проверки.
*/
function ProfileWizard({ percent, items }) {
	const [showAll, setShowAll] = useState(false);
	const next = items.filter((i) => !i.done && !i.pending).sort((a, b) => b.weight - a.weight)[0];
	const doneCount = items.filter((i) => i.done).length;
	if (percent >= 100) return /* @__PURE__ */ jsxs("section", {
		className: "card wizard wizard--done",
		children: [/* @__PURE__ */ jsx(Icon, {
			name: "check-circle",
			size: 28
		}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: "Профиль заполнен полностью" }), /* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted",
			children: "Карточка показывается выше в каталоге. Обновляйте цены и фото хотя бы раз в квартал."
		})] })]
	});
	return /* @__PURE__ */ jsxs("section", {
		className: "card wizard",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "wizard__head",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					style: { margin: 0 },
					children: "Заполните профиль — получите больше пациентов"
				}), /* @__PURE__ */ jsxs("p", {
					className: "text-sm text-muted",
					children: [
						"Выполнено ",
						doneCount,
						" из ",
						items.length,
						". Чем полнее профиль, тем выше карточка в каталоге и тем чаще её выбирают."
					]
				})] }), /* @__PURE__ */ jsxs("span", {
					className: "wizard__percent",
					children: [percent, "%"]
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "wizard__bar",
				role: "progressbar",
				"aria-valuenow": percent,
				"aria-valuemin": 0,
				"aria-valuemax": 100,
				"aria-label": "Заполненность профиля",
				children: /* @__PURE__ */ jsx("span", { style: { width: `${percent}%` } })
			}),
			next ? /* @__PURE__ */ jsxs("div", {
				className: "wizard__next",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "wizard__next-label",
						children: [
							"Следующий шаг · +",
							next.weight,
							"%"
						]
					}),
					/* @__PURE__ */ jsx("b", { children: next.label }),
					next.why ? /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: next.why
					}) : null,
					next.href ? /* @__PURE__ */ jsxs(Link, {
						href: next.href,
						className: "btn btn--primary btn--sm",
						children: [next.progress ? `Сейчас ${next.progress} — дополнить` : "Заполнить", /* @__PURE__ */ jsx(Icon, {
							name: "arrow-right",
							size: 16
						})]
					}) : null
				]
			}) : /* @__PURE__ */ jsx("p", {
				className: "text-sm",
				children: "Остальное уже на модерации — после проверки процент обновится."
			}),
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "wizard__toggle",
				onClick: () => setShowAll((v) => !v),
				"aria-expanded": showAll,
				children: [showAll ? "Скрыть чек-лист" : "Весь чек-лист", /* @__PURE__ */ jsx(Icon, {
					name: showAll ? "chevron-up" : "chevron-down",
					size: 16
				})]
			}),
			showAll ? /* @__PURE__ */ jsx("ul", {
				className: "wizard__list",
				children: items.map((i) => /* @__PURE__ */ jsxs("li", {
					className: cx("wizard__item", i.done && "is-done", i.pending && "is-pending"),
					children: [/* @__PURE__ */ jsx(Icon, {
						name: i.done ? "check-circle" : i.pending ? "clock" : "plus",
						size: 18
					}), /* @__PURE__ */ jsxs("span", {
						className: "wizard__item-text",
						children: [i.href && !i.done ? /* @__PURE__ */ jsx(Link, {
							href: i.href,
							className: "link",
							children: i.label
						}) : i.label, /* @__PURE__ */ jsx("span", {
							className: "text-xs text-muted",
							children: i.done ? "готово" : i.pending ? "на проверке у модератора" : [i.progress, `+${i.weight}%`].filter(Boolean).join(" · ")
						})]
					})]
				}, i.key))
			}) : null
		]
	});
}
//#endregion
//#region resources/js/pages/Cabinet/Dashboard.tsx
function Dashboard({ completeness, kpi, moderation, recent_leads, subscription }) {
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
			subscription ? /* @__PURE__ */ jsxs(Alert, {
				tone: "muted",
				children: [
					"Тариф «",
					subscription.tariff,
					"» до ",
					subscription.ends_at,
					" (",
					subscription.days_left,
					" дн.).",
					" ",
					/* @__PURE__ */ jsx(Link, {
						href: "/clinic-cabinet/payments",
						className: "link",
						children: "Платежи"
					})
				]
			}) : null,
			/* @__PURE__ */ jsx(ProfileWizard, {
				percent,
				items: completeness.items ?? []
			}),
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
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Модерация"
				}), /* @__PURE__ */ jsxs("div", {
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
				})]
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

//# sourceMappingURL=Dashboard-D8o3nXIB.js.map