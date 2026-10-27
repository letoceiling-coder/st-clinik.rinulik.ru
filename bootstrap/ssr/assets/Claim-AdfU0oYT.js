import { i as LinkButton, n as Button } from "./Button-B5alqlNe.js";
import { s as Alert, v as Check } from "../app.js";
import { Link, useForm, usePage } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Offer/Claim.tsx
function OfferClaim({ offer_token, clinic_name, organization_name, authenticated, register_url }) {
	const { flash } = usePage().props;
	const form = useForm({ confirm: false });
	const submit = (e) => {
		e.preventDefault();
		form.post(`/offer/${offer_token}/claim`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsx("div", {
		className: "container narrow stack",
		children: /* @__PURE__ */ jsxs("div", {
			className: "card card--shadow stack",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "auth-card__title",
					children: "Подключить черновик"
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "text-muted",
					children: [
						"Вы забираете управление организацией «",
						organization_name,
						"» и филиалом «",
						clinic_name,
						"» на платформе СтомКлиник."
					]
				}),
				flash?.error ? /* @__PURE__ */ jsx(Alert, {
					tone: "warning",
					children: flash.error
				}) : null,
				authenticated ? /* @__PURE__ */ jsxs("form", {
					onSubmit: submit,
					className: "stack",
					children: [/* @__PURE__ */ jsx(Check, {
						checked: form.data.confirm,
						onChange: (e) => form.setData("confirm", e.target.checked),
						error: form.errors.confirm,
						label: "Подтверждаю, что уполномочен(а) представлять эту клинику"
					}), /* @__PURE__ */ jsx(Button, {
						type: "submit",
						block: true,
						loading: form.processing,
						children: "Забрать черновик в кабинет"
					})]
				}) : /* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [/* @__PURE__ */ jsx("p", {
						className: "text-sm",
						children: "Войдите или зарегистрируйте кабинет клиники, чтобы подтвердить подключение."
					}), /* @__PURE__ */ jsxs("div", {
						className: "cluster",
						children: [/* @__PURE__ */ jsx(LinkButton, {
							href: `/login?intended=${encodeURIComponent(`/offer/${offer_token}/claim`)}`,
							children: "Войти"
						}), /* @__PURE__ */ jsx(LinkButton, {
							href: register_url,
							variant: "outline",
							children: "Регистрация клиники"
						})]
					})]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-center",
					children: /* @__PURE__ */ jsx(Link, {
						href: `/offer/${offer_token}`,
						className: "link",
						children: "Вернуться к предложению"
					})
				})
			]
		})
	});
}
//#endregion
export { OfferClaim as default };

//# sourceMappingURL=Claim-AdfU0oYT.js.map