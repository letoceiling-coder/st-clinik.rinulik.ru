import { i as LinkButton, n as Button } from "./Button-C2BxTtRt.js";
import { C as SelectField, T as TextField, c as Alert, v as Tabs, w as TextArea, x as PhoneField, y as Check } from "../app.js";
import { a as Panel, r as PageHead } from "./Dash-C8plSzIc.js";
import { useForm, useHttp } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/OfferTemplate.tsx
var FIELDS = [
	{
		key: "web_title",
		label: "Заголовок страницы КП"
	},
	{
		key: "web_body",
		label: "Текст страницы КП",
		rows: 12,
		hint: "Пустая строка — новый абзац, «# » и «## » — заголовки, «- » — пункт списка, **жирный**. Ссылки становятся кликабельными."
	},
	{
		key: "email_subject",
		label: "Тема письма"
	},
	{
		key: "email_body",
		label: "Текст письма",
		rows: 8,
		hint: "Из него собираются HTML и текстовая версии. Ссылка на отписку добавится автоматически, если не вставить {unsubscribe_link}."
	},
	{
		key: "sms_text",
		label: "SMS",
		rows: 2,
		hint: "Не больше 2 SMS (134 знака кириллицей). Используйте {offer_link} — это короткая ссылка."
	},
	{
		key: "messenger_text",
		label: "MAX, VK, Telegram, WhatsApp",
		rows: 5,
		hint: "Менеджер копирует и отправляет вручную."
	},
	{
		key: "call_script",
		label: "Скрипт звонка (необязательно)",
		rows: 5
	}
];
var contentOf = (source, defaults) => Object.fromEntries(FIELDS.map(({ key }) => [key, source?.content?.[key] ?? (source ? "" : defaults[key])]));
function AdminOfferTemplate({ template, defaults, variables, sample_clinics, sms_limit }) {
	const form = useForm({
		name: template?.name ?? "",
		is_active: template?.is_active ?? true,
		...contentOf(template, defaults)
	});
	const [focused, setFocused] = useState("web_body");
	const refs = useRef({});
	const [clinicId, setClinicId] = useState(sample_clinics[0]?.id ?? "");
	const [tab, setTab] = useState("web");
	const preview = useHttp({
		...contentOf(template, defaults),
		clinic_id: ""
	});
	const test = useForm({
		channel: "email",
		phone: ""
	});
	const content = Object.fromEntries(FIELDS.map(({ key }) => [key, form.data[key]]));
	const contentKey = JSON.stringify(content);
	useEffect(() => {
		if (clinicId === "") return;
		const timer = setTimeout(() => {
			preview.transform(() => ({
				...content,
				clinic_id: clinicId
			}));
			preview.post("/admin/offers/templates/preview").catch(() => void 0);
		}, 400);
		return () => clearTimeout(timer);
	}, [contentKey, clinicId]);
	const insert = (variable) => {
		const el = refs.current[focused];
		const value = form.data[focused];
		const start = el?.selectionStart ?? value.length;
		const end = el?.selectionEnd ?? value.length;
		form.setData(focused, value.slice(0, start) + variable + value.slice(end));
		requestAnimationFrame(() => {
			el?.focus();
			el?.setSelectionRange(start + variable.length, start + variable.length);
		});
	};
	const submit = (e) => {
		e.preventDefault();
		if (template) form.put(`/admin/offers/templates/${template.id}`, { preserveScroll: true });
		else form.post("/admin/offers/templates");
	};
	const sendTest = () => {
		if (clinicId === "") return;
		test.transform((d) => ({
			...d,
			...content,
			clinic_id: clinicId
		}));
		test.post("/admin/offers/templates/test", { preserveScroll: true });
	};
	const rendered = preview.response;
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [/* @__PURE__ */ jsx(PageHead, {
			title: template ? `Шаблон: ${template.name}` : "Новый шаблон КП",
			text: template ? `Текущая версия v${template.version}. Каждое сохранение с изменённым текстом — новая версия; уже сформированные КП не меняются.` : "Пример текста уже заполнен — поправьте его под себя.",
			action: /* @__PURE__ */ jsx(LinkButton, {
				href: "/admin/offers?tab=templates",
				variant: "ghost",
				children: "Все шаблоны"
			})
		}), /* @__PURE__ */ jsxs("div", {
			className: "offers-editor",
			children: [/* @__PURE__ */ jsxs("form", {
				className: "stack",
				onSubmit: submit,
				children: [
					/* @__PURE__ */ jsx(Panel, { children: /* @__PURE__ */ jsxs("div", {
						className: "offers-form-grid",
						children: [/* @__PURE__ */ jsx(TextField, {
							label: "Название шаблона",
							value: form.data.name,
							onChange: (e) => form.setData("name", e.target.value),
							error: form.errors.name,
							required: true
						}), /* @__PURE__ */ jsx("div", {
							className: "offers-form-grid__action",
							children: /* @__PURE__ */ jsx(Check, {
								label: "Доступен для кампаний",
								checked: form.data.is_active,
								onChange: (e) => form.setData("is_active", e.target.checked)
							})
						})]
					}) }),
					/* @__PURE__ */ jsx(Panel, {
						title: "Переменные",
						children: /* @__PURE__ */ jsxs("div", {
							className: "stack",
							children: [/* @__PURE__ */ jsx("p", {
								className: "text-xs text-muted",
								children: "Нажмите, чтобы вставить в поле, где стоит курсор. Значения подставятся для каждой клиники."
							}), /* @__PURE__ */ jsx("div", {
								className: "offers-vars",
								children: Object.entries(variables).map(([key, label]) => /* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "chip offers-vars__chip",
									title: label,
									onClick: () => insert(key),
									children: [/* @__PURE__ */ jsx("code", { children: key }), /* @__PURE__ */ jsx("span", {
										className: "text-xs text-muted",
										children: label
									})]
								}, key))
							})]
						})
					}),
					/* @__PURE__ */ jsx(Panel, {
						title: "Текст по каналам",
						children: /* @__PURE__ */ jsx("div", {
							className: "stack",
							children: FIELDS.map(({ key, label, rows, hint }) => {
								const common = {
									label,
									hint,
									value: form.data[key],
									error: form.errors[key],
									onFocus: () => setFocused(key)
								};
								return rows ? /* @__PURE__ */ jsx(TextArea, {
									...common,
									rows,
									ref: (el) => void (refs.current[key] = el),
									onChange: (e) => form.setData(key, e.target.value)
								}, key) : /* @__PURE__ */ jsx(TextField, {
									...common,
									ref: (el) => void (refs.current[key] = el),
									onChange: (e) => form.setData(key, e.target.value)
								}, key);
							})
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "row offers-save",
						children: [/* @__PURE__ */ jsx(Button, {
							type: "submit",
							loading: form.processing,
							children: template ? "Сохранить" : "Создать шаблон"
						}), template && form.isDirty ? /* @__PURE__ */ jsx("span", {
							className: "text-sm text-muted",
							children: "Есть несохранённые изменения"
						}) : null]
					}),
					template && template.versions.length > 1 ? /* @__PURE__ */ jsx(Panel, {
						title: "История версий",
						children: /* @__PURE__ */ jsx("ul", {
							className: "offers-versions",
							children: template.versions.map((v) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsxs("span", { children: [
								/* @__PURE__ */ jsxs("b", { children: ["v", v.version] }),
								" ",
								/* @__PURE__ */ jsxs("span", {
									className: "text-sm text-muted",
									children: [
										"· ",
										v.at,
										" · ",
										v.by ?? "система"
									]
								})
							] }), v.version !== template.version ? /* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => FIELDS.forEach(({ key }) => form.setData(key, v.content[key] ?? "")),
								children: "Взять текст"
							}) : /* @__PURE__ */ jsx("span", {
								className: "text-xs text-muted",
								children: "текущая"
							})] }, v.version))
						})
					}) : null
				]
			}), /* @__PURE__ */ jsxs("aside", {
				className: "offers-editor__preview stack",
				children: [/* @__PURE__ */ jsx(Panel, {
					title: "Предпросмотр",
					children: /* @__PURE__ */ jsxs("div", {
						className: "stack",
						children: [
							/* @__PURE__ */ jsxs(SelectField, {
								label: "На примере организации",
								value: clinicId,
								onChange: (e) => setClinicId(e.target.value === "" ? "" : Number(e.target.value)),
								children: [sample_clinics.length === 0 ? /* @__PURE__ */ jsx("option", {
									value: "",
									children: "Нет клиник для примера"
								}) : null, sample_clinics.map((c) => /* @__PURE__ */ jsx("option", {
									value: c.id,
									children: c.name
								}, c.id))]
							}),
							/* @__PURE__ */ jsx(Tabs, {
								label: "Канал предпросмотра",
								value: tab,
								onChange: setTab,
								items: [
									{
										key: "web",
										label: "Страница"
									},
									{
										key: "email",
										label: "Email"
									},
									{
										key: "sms",
										label: "SMS"
									},
									{
										key: "messenger",
										label: "Чаты"
									},
									{
										key: "call",
										label: "Звонок"
									}
								]
							}),
							!rendered ? /* @__PURE__ */ jsx("p", {
								className: "text-sm text-muted",
								children: preview.processing ? "Собираем предпросмотр…" : "Выберите организацию для предпросмотра."
							}) : tab === "web" ? /* @__PURE__ */ jsxs("div", {
								className: "offers-preview",
								children: [/* @__PURE__ */ jsx("h3", { children: rendered.web_title }), /* @__PURE__ */ jsx("div", {
									className: "offers-preview__body",
									dangerouslySetInnerHTML: { __html: rendered.web_html }
								})]
							}) : tab === "email" ? /* @__PURE__ */ jsxs("div", {
								className: "offers-preview",
								children: [/* @__PURE__ */ jsxs("p", {
									className: "text-sm",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "text-muted",
											children: "Тема:"
										}),
										" ",
										/* @__PURE__ */ jsx("b", { children: rendered.email_subject })
									]
								}), /* @__PURE__ */ jsx("div", {
									className: "offers-preview__body",
									dangerouslySetInnerHTML: { __html: rendered.email_html.replaceAll("{unsubscribe_link}", "<i>ссылка отписки</i>") }
								})]
							}) : tab === "sms" ? /* @__PURE__ */ jsxs("div", {
								className: "stack",
								children: [/* @__PURE__ */ jsx("pre", {
									className: "offers-plain",
									children: rendered.sms
								}), /* @__PURE__ */ jsxs("p", {
									className: `text-xs ${rendered.sms_segments > sms_limit ? "offers-warn" : "text-muted"}`,
									children: [
										rendered.sms_length,
										" знаков · ",
										rendered.sms_segments,
										" SMS",
										rendered.sms_segments > sms_limit ? ` — больше ${sms_limit}, сократите текст` : ""
									]
								})]
							}) : /* @__PURE__ */ jsx("pre", {
								className: "offers-plain",
								children: (tab === "messenger" ? rendered.messenger : rendered.call_script) || "Текст не задан."
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-xs text-muted",
								children: "Ссылки в предпросмотре условные — настоящие создаются вместе с КП."
							})
						]
					})
				}), /* @__PURE__ */ jsx(Panel, {
					title: "Тест себе",
					children: /* @__PURE__ */ jsxs("div", {
						className: "stack",
						children: [
							/* @__PURE__ */ jsxs(SelectField, {
								label: "Канал",
								value: test.data.channel,
								onChange: (e) => test.setData("channel", e.target.value),
								children: [/* @__PURE__ */ jsx("option", {
									value: "email",
									children: "Email на мой адрес"
								}), /* @__PURE__ */ jsx("option", {
									value: "sms",
									children: "SMS на номер"
								})]
							}),
							test.data.channel === "sms" ? /* @__PURE__ */ jsx(PhoneField, {
								label: "Телефон",
								value: test.data.phone,
								onChange: (e) => test.setData("phone", e.target.value),
								error: test.errors.phone
							}) : null,
							/* @__PURE__ */ jsx(Alert, {
								tone: "muted",
								children: "Отправляется текущий текст из редактора, даже несохранённый. Письмо уходит через почту для КП из раздела «Интеграции»."
							}),
							/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Button, {
								variant: "outline",
								icon: "send",
								onClick: sendTest,
								loading: test.processing,
								disabled: clinicId === "",
								children: "Отправить тест"
							}) })
						]
					})
				})]
			})]
		})]
	});
}
//#endregion
export { AdminOfferTemplate as default };

//# sourceMappingURL=OfferTemplate-XPmOutNN.js.map