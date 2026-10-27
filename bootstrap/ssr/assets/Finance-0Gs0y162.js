import { n as Button } from "./Button-D8Mzgn6o.js";
import { v as Check, x as SelectField } from "../app.js";
import { r as PageHead } from "./Dash-mdaQWR8t.js";
import { Link, router, useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Finance.tsx
function Finance({ kpi, payments, chart, monetization_settings }) {
	const settings = useForm({ ...monetization_settings });
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(PageHead, { title: "Финансы" }), /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "row row--between row--wrap",
				children: [/* @__PURE__ */ jsx("h1", {
					className: "page-title",
					children: "Финансы"
				}), /* @__PURE__ */ jsx(Link, {
					href: "/admin/tariffs",
					className: "text-sm",
					children: "Тарифы"
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid grid--3",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "card",
						children: [/* @__PURE__ */ jsx("div", {
							className: "text-sm text-muted",
							children: "Выручка за период"
						}), /* @__PURE__ */ jsxs("strong", { children: [(kpi.revenue_period / 100).toLocaleString("ru-RU"), " ₽"] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "card",
						children: [/* @__PURE__ */ jsx("div", {
							className: "text-sm text-muted",
							children: "Сегодня"
						}), /* @__PURE__ */ jsxs("strong", { children: [(kpi.revenue_today / 100).toLocaleString("ru-RU"), " ₽"] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "card",
						children: [/* @__PURE__ */ jsx("div", {
							className: "text-sm text-muted",
							children: "Средний чек"
						}), /* @__PURE__ */ jsxs("strong", { children: [(kpi.avg_check / 100).toLocaleString("ru-RU"), " ₽"] })]
					})
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: [
					"Тарифы: ",
					(kpi.tariff_revenue / 100).toLocaleString("ru-RU"),
					" ₽ · Продвижение: ",
					(kpi.promotion_revenue / 100).toLocaleString("ru-RU"),
					" ₽ · Неуспешных: ",
					kpi.failed_count
				]
			}),
			chart.length > 0 ? /* @__PURE__ */ jsxs("div", {
				className: "card text-sm",
				children: [/* @__PURE__ */ jsx("strong", { children: "Доход за 30 дней (коп.)" }), /* @__PURE__ */ jsx("ul", { children: chart.map((row) => /* @__PURE__ */ jsxs("li", { children: [
					row.date,
					": ",
					(row.total / 100).toLocaleString("ru-RU"),
					" ₽"
				] }, row.date)) })]
			}) : null,
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					settings.put("/admin/finance/settings");
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Монетизация"
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Требовать активный тариф для публикации в каталоге",
						checked: settings.data.require_active_tariff_for_catalog,
						onChange: (e) => settings.setData("require_active_tariff_for_catalog", e.target.checked)
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Назначать базовый тариф новому филиалу",
						checked: settings.data.auto_assign_default_tariff,
						onChange: (e) => settings.setData("auto_assign_default_tariff", e.target.checked)
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "После окончания платного тарифа",
						value: settings.data.expire_action,
						onChange: (e) => settings.setData("expire_action", e.target.value),
						children: [
							/* @__PURE__ */ jsx("option", {
								value: "downgrade",
								children: "Перевести на базовый"
							}),
							/* @__PURE__ */ jsx("option", {
								value: "hide",
								children: "Скрыть клинику"
							}),
							/* @__PURE__ */ jsx("option", {
								value: "none",
								children: "Только пометить подписку"
							})
						]
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Автопродление тарифов (RebillId Т‑Банка)",
						checked: settings.data.autorenew_enabled,
						onChange: (e) => settings.setData("autorenew_enabled", e.target.checked)
					}),
					/* @__PURE__ */ jsx(SelectField, {
						label: "Списывать за N дней до окончания",
						value: String(settings.data.autorenew_charge_days_before),
						onChange: (e) => settings.setData("autorenew_charge_days_before", Number(e.target.value)),
						children: [
							0,
							1,
							3,
							7
						].map((d) => /* @__PURE__ */ jsxs("option", {
							value: d,
							children: [d, " дн."]
						}, d))
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: settings.processing,
						children: "Сохранить"
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Платежи"
				}), /* @__PURE__ */ jsx("ul", {
					className: "stack text-sm",
					children: payments.map((p) => /* @__PURE__ */ jsxs("li", {
						className: "row row--between row--wrap",
						children: [/* @__PURE__ */ jsxs("span", { children: [
							"#",
							p.id,
							" ",
							p.description ?? p.kind,
							" · ",
							p.clinic ?? "—"
						] }), /* @__PURE__ */ jsxs("span", {
							className: "row row--wrap",
							children: [
								p.amount_rub.toLocaleString("ru-RU"),
								" ₽ · ",
								p.status,
								" ",
								p.paid_at ? `· ${p.paid_at}` : "",
								p.refundable_amount > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "link text-sm",
									onClick: () => router.post(`/admin/finance/payments/${p.id}/refund`),
									children: "Полный возврат"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "link text-sm",
									onClick: () => {
										const rub = window.prompt(`Частичный возврат (₽), доступно ${(p.refundable_amount / 100).toLocaleString("ru-RU")}`);
										if (rub === null || rub.trim() === "") return;
										const kopecks = Math.round(Number(rub.replace(",", ".")) * 100);
										if (!Number.isFinite(kopecks) || kopecks <= 0) return;
										router.post(`/admin/finance/payments/${p.id}/refund`, { amount: kopecks });
									},
									children: "Частичный"
								})] }) : null,
								p.refunded_amount > 0 ? /* @__PURE__ */ jsxs("span", {
									className: "text-muted",
									children: [
										" · возвращено ",
										(p.refunded_amount / 100).toLocaleString("ru-RU"),
										" ₽"
									]
								}) : null
							]
						})]
					}, p.id))
				})]
			})
		]
	})] });
}
//#endregion
export { Finance as default };

//# sourceMappingURL=Finance-0Gs0y162.js.map