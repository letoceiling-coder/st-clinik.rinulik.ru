import { t as Icon } from "./Icon-DQahs-u2.js";
import { i as LinkButton, n as Button } from "./Button-B5alqlNe.js";
import { s as Alert, v as Check, w as TextField } from "../app.js";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Offer/Claim.tsx
function Step({ n, done, active, title, children }) {
	return /* @__PURE__ */ jsxs("li", {
		className: `claim-step${done ? " is-done" : ""}${active ? " is-active" : ""}`,
		children: [/* @__PURE__ */ jsx("span", {
			className: "claim-step__n",
			"aria-hidden": "true",
			children: done ? /* @__PURE__ */ jsx(Icon, {
				name: "check",
				size: 16
			}) : n
		}), /* @__PURE__ */ jsxs("div", {
			className: "claim-step__body",
			children: [/* @__PURE__ */ jsx("b", { children: title }), active ? children : null]
		})]
	});
}
function OfferClaim({ offer_token, clinic_name, organization_name, authenticated, email_verified, email, register_url, verify_url, agreement_url, trial, sms }) {
	const { flash } = usePage().props;
	const form = useForm({
		confirm: false,
		agreement: false,
		publish: false,
		code: ""
	});
	const claimUrl = `/offer/${offer_token}/claim`;
	const needsCode = sms.required && !sms.verified;
	const submit = (e) => {
		e.preventDefault();
		form.post(claimUrl, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsx("div", {
		className: "container narrow stack",
		children: /* @__PURE__ */ jsxs("div", {
			className: "card card--shadow stack claim-card",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "auth-card__title",
					children: "Подключение клиники"
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "text-muted",
					children: [
						"«",
						clinic_name,
						"»",
						organization_name !== clinic_name ? ` · ${organization_name}` : "",
						". Карточка уже подготовлена — осталось подтвердить, что вы представляете клинику."
					]
				}),
				trial.enabled ? /* @__PURE__ */ jsxs("div", {
					className: "claim-trial",
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "sparkle",
						size: 20
					}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsxs("b", { children: [trial.days, " дней бесплатно"] }), " — пробный период начнётся после проверки карточки модератором. Без привязки карты."] })]
				}) : trial.reason ? /* @__PURE__ */ jsxs(Alert, {
					tone: "muted",
					children: [trial.reason, " Подключение и бесплатное размещение доступны."]
				}) : null,
				flash?.error ? /* @__PURE__ */ jsx(Alert, {
					tone: "warning",
					children: flash.error
				}) : null,
				flash?.success ? /* @__PURE__ */ jsx(Alert, {
					tone: "success",
					children: flash.success
				}) : null,
				/* @__PURE__ */ jsxs("ol", {
					className: "claim-steps",
					children: [
						/* @__PURE__ */ jsxs(Step, {
							n: 1,
							done: authenticated,
							active: !authenticated,
							title: "Вход в кабинет клиники",
							children: [/* @__PURE__ */ jsx("p", {
								className: "text-sm text-muted",
								children: "Войдите или зарегистрируйтесь — доступ к кабинету получит только этот аккаунт."
							}), /* @__PURE__ */ jsxs("div", {
								className: "cluster",
								children: [/* @__PURE__ */ jsx(LinkButton, {
									href: `/login?intended=${encodeURIComponent(`/offer/${offer_token}/claim`)}`,
									children: "Войти"
								}), /* @__PURE__ */ jsx(LinkButton, {
									href: register_url,
									variant: "outline",
									children: "Зарегистрироваться"
								})]
							})]
						}),
						/* @__PURE__ */ jsxs(Step, {
							n: 2,
							done: authenticated && email_verified,
							active: authenticated && !email_verified,
							title: "Подтверждение e-mail",
							children: [/* @__PURE__ */ jsxs("p", {
								className: "text-sm text-muted",
								children: [
									"Мы отправили письмо на ",
									email ?? "ваш e-mail",
									". Перейдите по ссылке из письма — вы вернётесь сюда."
								]
							}), /* @__PURE__ */ jsx(LinkButton, {
								href: verify_url,
								variant: "outline",
								children: "Отправить письмо ещё раз"
							})]
						}),
						sms.required ? /* @__PURE__ */ jsxs(Step, {
							n: 3,
							done: sms.verified,
							active: authenticated && email_verified && !sms.verified,
							title: "Код из SMS на номер клиники",
							children: [/* @__PURE__ */ jsxs("p", {
								className: "text-sm text-muted",
								children: [
									"Код придёт на номер клиники ",
									sms.phone,
									" из её карточки — так мы убедимся, что вы представляете клинику."
								]
							}), /* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "outline",
								size: "sm",
								onClick: () => router.post(`${claimUrl}/code`, {}, { preserveScroll: true }),
								children: "Получить код"
							})]
						}) : null,
						/* @__PURE__ */ jsx(Step, {
							n: sms.required ? 4 : 3,
							done: false,
							active: authenticated && email_verified,
							title: "Соглашение и публикация",
							children: /* @__PURE__ */ jsxs("form", {
								onSubmit: submit,
								className: "stack",
								children: [
									needsCode ? /* @__PURE__ */ jsx(TextField, {
										label: "Код из SMS",
										inputMode: "numeric",
										autoComplete: "one-time-code",
										maxLength: 6,
										value: form.data.code,
										onChange: (e) => form.setData("code", e.target.value.replace(/\D/g, "")),
										error: form.errors.code
									}) : null,
									/* @__PURE__ */ jsx(Check, {
										checked: form.data.confirm,
										onChange: (e) => form.setData("confirm", e.target.checked),
										error: form.errors.confirm,
										label: "Подтверждаю, что уполномочен(а) представлять эту клинику"
									}),
									/* @__PURE__ */ jsx(Check, {
										checked: form.data.agreement,
										onChange: (e) => form.setData("agreement", e.target.checked),
										error: form.errors.agreement,
										label: /* @__PURE__ */ jsxs(Fragment, { children: [
											"Принимаю",
											" ",
											/* @__PURE__ */ jsx("a", {
												href: agreement_url,
												className: "link",
												target: "_blank",
												rel: "noopener",
												children: "соглашение с клиникой"
											})
										] })
									}),
									/* @__PURE__ */ jsx(Check, {
										checked: form.data.publish,
										onChange: (e) => form.setData("publish", e.target.checked),
										error: form.errors.publish,
										label: "Согласен(на) на публикацию карточки клиники в каталоге после проверки модератором"
									}),
									/* @__PURE__ */ jsx(Button, {
										type: "submit",
										block: true,
										size: "lg",
										loading: form.processing,
										disabled: needsCode && form.data.code.length < 6,
										children: trial.enabled ? `Подключить и начать ${trial.days} дней бесплатно` : "Подключить клинику"
									})
								]
							})
						})
					]
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

//# sourceMappingURL=Claim-Bg-kW8bw.js.map