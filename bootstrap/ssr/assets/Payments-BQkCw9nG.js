import { n as Button } from "./Button-C2BxTtRt.js";
import { c as Alert, y as Check } from "../app.js";
import { r as PageHead } from "./Dash-C8plSzIc.js";
import { router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Payments.tsx
function Payments({ subscription, tariffs, payments, autorenew_available }) {
	const [autoRenewCheckout, setAutoRenewCheckout] = useState(false);
	const renewForm = useForm({ auto_renew: subscription?.auto_renew ?? false });
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(PageHead, { title: "Тариф и платежи" }), /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "page-title",
				children: "Тариф и платежи"
			}),
			subscription ? /* @__PURE__ */ jsxs(Alert, {
				tone: subscription.is_trial ? "success" : void 0,
				children: [
					subscription.is_trial ? "Пробный период: " : "",
					"тариф «",
					subscription.tariff,
					"» до ",
					subscription.ends_at,
					" (осталось ",
					subscription.days_left,
					" дн.)",
					subscription.is_trial ? " По окончании выберите тариф ниже — автоматического списания не будет." : ""
				]
			}) : /* @__PURE__ */ jsx(Alert, {
				tone: "warning",
				children: "Нет активной подписки. Выберите тариф для публикации и расширенных функций."
			}),
			autorenew_available && subscription?.can_autorenew ? /* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					renewForm.put("/clinic-cabinet/payments/auto-renew");
				},
				children: [/* @__PURE__ */ jsx(Check, {
					label: "Автопродление тарифа (списание с сохранённой карты)",
					checked: renewForm.data.auto_renew,
					onChange: (e) => renewForm.setData("auto_renew", e.target.checked)
				}), /* @__PURE__ */ jsx(Button, {
					type: "submit",
					variant: "outline",
					size: "sm",
					loading: renewForm.processing,
					children: "Сохранить"
				})]
			}) : null,
			/* @__PURE__ */ jsx("div", {
				className: "stack",
				children: tariffs.map((t) => /* @__PURE__ */ jsxs("div", {
					className: "card stack",
					children: [
						/* @__PURE__ */ jsx("strong", { children: t.name }),
						/* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted",
							children: t.description
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "text-sm",
							children: [
								t.price_rub.toLocaleString("ru-RU"),
								" ₽ · ",
								t.duration_days,
								" дн."
							]
						}),
						autorenew_available ? /* @__PURE__ */ jsx(Check, {
							label: "Сохранить карту для автопродления",
							checked: autoRenewCheckout,
							onChange: (e) => setAutoRenewCheckout(e.target.checked)
						}) : null,
						/* @__PURE__ */ jsx(Button, {
							type: "button",
							onClick: () => router.post(`/clinic-cabinet/payments/tariffs/${t.id}/checkout`, autorenew_available && autoRenewCheckout ? { auto_renew: true } : {}),
							children: "Оплатить картой"
						})
					]
				}, t.id))
			}),
			payments.length > 0 ? /* @__PURE__ */ jsxs("div", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "История платежей"
				}), /* @__PURE__ */ jsx("ul", {
					className: "stack text-sm",
					children: payments.map((p) => /* @__PURE__ */ jsxs("li", {
						className: "row row--between row--wrap",
						children: [/* @__PURE__ */ jsx("span", { children: p.description ?? p.kind }), /* @__PURE__ */ jsxs("span", { children: [
							p.amount_rub.toLocaleString("ru-RU"),
							" ₽ · ",
							p.status,
							" ",
							p.paid_at ? `· ${p.paid_at}` : ""
						] })]
					}, p.id))
				})]
			}) : null
		]
	})] });
}
//#endregion
export { Payments as default };

//# sourceMappingURL=Payments-BQkCw9nG.js.map