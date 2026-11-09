import { t as Icon } from "./Icon-_sloiNX5.js";
import { i as LinkButton, n as Button } from "./Button-C2BxTtRt.js";
import { A as TextField, C as Tabs, E as PhoneField, k as TextArea, p as Alert, w as Check } from "../app.js";
import { t as FileDropzone } from "./FileDropzone-CZ2V2XXS.js";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Clinics/Claim.tsx
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
function AgreementChecks({ authority, agreement, errors, onChange, agreementUrl }) {
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Check, {
		checked: authority,
		onChange: (e) => onChange("authority", e.target.checked),
		error: errors.authority,
		label: "Подтверждаю, что уполномочен(а) представлять эту клинику"
	}), /* @__PURE__ */ jsx(Check, {
		checked: agreement,
		onChange: (e) => onChange("agreement", e.target.checked),
		error: errors.agreement,
		label: /* @__PURE__ */ jsxs(Fragment, { children: [
			"Принимаю",
			" ",
			/* @__PURE__ */ jsx("a", {
				href: agreementUrl,
				className: "link",
				target: "_blank",
				rel: "noopener",
				children: "соглашение с клиникой"
			})
		] })
	})] });
}
function ClinicClaim({ clinic, authenticated, email_verified, email, blocked_reason, register_url, verify_url, agreement_url, privacy_url, trial, sms, pending }) {
	const { flash } = usePage().props;
	const base = `/clinics/${clinic.slug}/claim`;
	const ready = authenticated && email_verified && blocked_reason === null;
	const [mode, setMode] = useState(sms.available ? "sms" : "document");
	const smsForm = useForm({
		code: "",
		authority: false,
		agreement: false
	});
	const docForm = useForm({
		position: pending?.position ?? "",
		phone: "",
		comment: "",
		document: null,
		authority: false,
		agreement: false,
		consent: false
	});
	const submitSms = (e) => {
		e.preventDefault();
		smsForm.post(`${base}/sms`, { preserveScroll: true });
	};
	const submitDocument = (e) => {
		e.preventDefault();
		docForm.post(base, {
			preserveScroll: true,
			forceFormData: true
		});
	};
	return /* @__PURE__ */ jsx("div", {
		className: "container narrow stack",
		children: /* @__PURE__ */ jsxs("div", {
			className: "card card--shadow stack claim-card",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "auth-card__title",
					children: "Это ваша клиника?"
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "text-muted",
					children: [
						"«",
						clinic.name,
						"»",
						clinic.address ? `, ${clinic.address}` : "",
						". Подтвердите, что представляете клинику, — и управляйте карточкой сами: цены, врачи, фото, ответы на отзывы и заявки пациентов."
					]
				}),
				trial.enabled ? /* @__PURE__ */ jsxs("div", {
					className: "claim-trial",
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "sparkle",
						size: 20
					}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsxs("b", { children: [trial.days, " дней бесплатно"] }), " — расширенный тариф включится сразу после подтверждения прав. Без привязки карты."] })]
				}) : null,
				flash?.error ? /* @__PURE__ */ jsx(Alert, {
					tone: "warning",
					children: flash.error
				}) : null,
				flash?.success ? /* @__PURE__ */ jsx(Alert, {
					tone: "success",
					children: flash.success
				}) : null,
				authenticated && blocked_reason ? /* @__PURE__ */ jsx(Alert, {
					tone: "warning",
					children: blocked_reason
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
								children: "Войдите или зарегистрируйтесь — доступ к карточке получит только этот аккаунт."
							}), /* @__PURE__ */ jsxs("div", {
								className: "cluster",
								children: [/* @__PURE__ */ jsx(LinkButton, {
									href: `/login?intended=${encodeURIComponent(base)}`,
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
						/* @__PURE__ */ jsxs(Step, {
							n: 3,
							done: false,
							active: ready,
							title: "Подтверждение прав",
							children: [
								pending ? /* @__PURE__ */ jsxs(Alert, {
									tone: "info",
									icon: "clock",
									children: [
										"Заявка на проверке с ",
										pending.submitted_at,
										". Модератор сверит документ и сообщит о решении. Можно отправить уточнённые данные — заявка обновится."
									]
								}) : null,
								sms.available ? /* @__PURE__ */ jsx(Tabs, {
									label: "Способ подтверждения",
									value: mode,
									onChange: setMode,
									items: [{
										key: "sms",
										label: "Код по SMS — сразу"
									}, {
										key: "document",
										label: "Документ — модератору"
									}]
								}) : null,
								sms.available && mode === "sms" ? /* @__PURE__ */ jsxs("form", {
									onSubmit: submitSms,
									className: "stack",
									children: [
										/* @__PURE__ */ jsxs("p", {
											className: "text-sm text-muted",
											children: [
												"Код придёт на номер ",
												sms.phone,
												" из карточки клиники. Права откроются сразу после ввода кода."
											]
										}),
										/* @__PURE__ */ jsx(Button, {
											type: "button",
											variant: "outline",
											size: "sm",
											onClick: () => router.post(`${base}/code`, {}, { preserveScroll: true }),
											children: "Получить код"
										}),
										/* @__PURE__ */ jsx(TextField, {
											label: "Код из SMS",
											inputMode: "numeric",
											autoComplete: "one-time-code",
											maxLength: 6,
											value: smsForm.data.code,
											onChange: (e) => smsForm.setData("code", e.target.value.replace(/\D/g, "")),
											error: smsForm.errors.code
										}),
										/* @__PURE__ */ jsx(AgreementChecks, {
											authority: smsForm.data.authority,
											agreement: smsForm.data.agreement,
											errors: smsForm.errors,
											onChange: (key, value) => smsForm.setData(key, value),
											agreementUrl: agreement_url
										}),
										/* @__PURE__ */ jsx(Button, {
											type: "submit",
											block: true,
											loading: smsForm.processing,
											disabled: smsForm.data.code.length < 6,
											children: "Подтвердить и перейти в кабинет"
										})
									]
								}) : /* @__PURE__ */ jsxs("form", {
									onSubmit: submitDocument,
									className: "stack",
									noValidate: true,
									children: [
										/* @__PURE__ */ jsx("p", {
											className: "text-sm text-muted",
											children: "Приложите документ, подтверждающий полномочия: выписку из ЕГРЮЛ, где вы указаны руководителем, или доверенность от клиники. Документ увидит только модератор."
										}),
										/* @__PURE__ */ jsx(TextField, {
											label: "Ваша должность",
											required: true,
											autoComplete: "organization-title",
											value: docForm.data.position,
											onChange: (e) => docForm.setData("position", e.target.value),
											error: docForm.errors.position
										}),
										/* @__PURE__ */ jsx(PhoneField, {
											label: "Телефон для связи с модератором",
											required: true,
											value: docForm.data.phone,
											onChange: (e) => docForm.setData("phone", e.target.value),
											error: docForm.errors.phone
										}),
										/* @__PURE__ */ jsx(FileDropzone, {
											label: "Документ",
											accept: ".pdf,.jpg,.jpeg,.png",
											hint: "PDF, JPG или PNG, до 8 МБ",
											value: docForm.data.document,
											onChange: (file) => docForm.setData("document", file),
											error: docForm.errors.document
										}),
										/* @__PURE__ */ jsx(TextArea, {
											label: "Комментарий",
											hint: "Необязательно",
											rows: 3,
											maxLength: 1e3,
											value: docForm.data.comment,
											onChange: (e) => docForm.setData("comment", e.target.value),
											error: docForm.errors.comment
										}),
										/* @__PURE__ */ jsx(AgreementChecks, {
											authority: docForm.data.authority,
											agreement: docForm.data.agreement,
											errors: docForm.errors,
											onChange: (key, value) => docForm.setData(key, value),
											agreementUrl: agreement_url
										}),
										/* @__PURE__ */ jsx(Check, {
											checked: docForm.data.consent,
											onChange: (e) => docForm.setData("consent", e.target.checked),
											error: docForm.errors.consent,
											label: /* @__PURE__ */ jsxs(Fragment, { children: [
												"Согласен(на) на",
												" ",
												/* @__PURE__ */ jsx("a", {
													href: privacy_url,
													className: "link",
													target: "_blank",
													rel: "noopener",
													children: "обработку персональных данных"
												})
											] })
										}),
										/* @__PURE__ */ jsx(Button, {
											type: "submit",
											block: true,
											loading: docForm.processing,
											children: pending ? "Обновить заявку" : "Отправить на проверку"
										})
									]
								})
							]
						})
					]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-center",
					children: /* @__PURE__ */ jsx(Link, {
						href: `/clinics/${clinic.slug}`,
						className: "link",
						children: "Вернуться к карточке клиники"
					})
				})
			]
		})
	});
}
//#endregion
export { ClinicClaim as default };

//# sourceMappingURL=Claim-CSslVYvr.js.map