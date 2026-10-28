import { t as Icon } from "./Icon-_sloiNX5.js";
import { i as LinkButton, n as Button, t as AnchorButton } from "./Button-C2BxTtRt.js";
import { C as TextArea, _ as Tabs, b as PhoneField, l as Badge, s as Alert, v as Check, w as TextField } from "../app.js";
import { a as Panel, c as Table, r as PageHead } from "./Dash-cIdZIfDR.js";
import { n as CopyLink, t as CopyButton } from "./CopyButton-ByUXubLU.js";
import { ApplicationsTab, OFFER_TONE, SectionPicker } from "./Offers-DfUDjywu.js";
import { Link, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/offers/OfferSendPanels.tsx
function xsrfToken() {
	const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : "";
}
/** Дополнительный текст об акциях и спецпредложениях + подсказка ИИ (принимается вручную). */
function ExtraPanel({ offerId, extra, disabled }) {
	const form = useForm({ extra_note: extra.text });
	const [suggestion, setSuggestion] = useState(null);
	const [aiError, setAiError] = useState(null);
	const [aiLoading, setAiLoading] = useState(false);
	const improve = async () => {
		setAiLoading(true);
		setAiError(null);
		try {
			const response = await fetch(`/admin/offers/${offerId}/improve`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"X-XSRF-TOKEN": xsrfToken()
				},
				body: JSON.stringify({ text: form.data.extra_note })
			});
			const json = await response.json();
			if (!response.ok || !json.text) throw new Error(json.message ?? "Не удалось получить вариант от ИИ.");
			setSuggestion(json.text);
		} catch (e) {
			setAiError(e instanceof Error ? e.message : "Не удалось получить вариант от ИИ.");
		} finally {
			setAiLoading(false);
		}
	};
	return /* @__PURE__ */ jsx(Panel, {
		title: "Дополнительное предложение",
		children: /* @__PURE__ */ jsxs("form", {
			className: "stack",
			onSubmit: (e) => {
				e.preventDefault();
				form.put(`/admin/offers/${offerId}/extra`, { preserveScroll: true });
			},
			children: [
				/* @__PURE__ */ jsxs("p", {
					className: "text-sm text-muted",
					children: [
						"Акции, бонусы, особые условия для этой клиники. Текст появится отдельным блоком на странице КП и подставится в письмо вместо ",
						"{extra}",
						"."
					]
				}),
				/* @__PURE__ */ jsx(TextArea, {
					label: "Текст предложения",
					rows: 4,
					maxLength: extra.max,
					value: form.data.extra_note,
					onChange: (e) => form.setData("extra_note", e.target.value),
					error: form.errors.extra_note,
					placeholder: "Например: при подключении до 30 ноября — 3 месяца тарифа «Профи» по цене двух и бесплатное оформление карточки.",
					disabled
				}),
				aiError ? /* @__PURE__ */ jsx(Alert, {
					tone: "warning",
					children: aiError
				}) : null,
				suggestion !== null ? /* @__PURE__ */ jsxs("div", {
					className: "offer-ai-suggestion",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "offer-ai-suggestion__label",
							children: [/* @__PURE__ */ jsx(Icon, {
								name: "sparkle",
								size: 16
							}), " Вариант от ИИ — проверьте факты перед сохранением"]
						}),
						/* @__PURE__ */ jsx("p", { children: suggestion }),
						/* @__PURE__ */ jsxs("div", {
							className: "row row--wrap",
							children: [/* @__PURE__ */ jsx(Button, {
								type: "button",
								size: "sm",
								onClick: () => {
									form.setData("extra_note", suggestion);
									setSuggestion(null);
								},
								children: "Подставить"
							}), /* @__PURE__ */ jsx(Button, {
								type: "button",
								size: "sm",
								variant: "ghost",
								onClick: () => setSuggestion(null),
								children: "Отклонить"
							})]
						})
					]
				}) : null,
				/* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					children: [/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						disabled,
						children: "Сохранить в КП"
					}), extra.ai_available ? /* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "outline",
						icon: "sparkle",
						loading: aiLoading,
						disabled: disabled || form.data.extra_note.trim() === "",
						onClick: improve,
						children: "Улучшить с ИИ"
					}) : /* @__PURE__ */ jsx("span", {
						className: "text-xs text-muted",
						children: "ИИ недоступен: добавьте ключ OpenRouter в Интеграциях."
					})]
				})
			]
		})
	});
}
/** Отправка КП одному получателю: показываются только каналы с подключённой интеграцией. */
function DispatchPanel({ offerId, channels, statuses, disabled }) {
	const [contacts, setContacts] = useState({});
	const [busy, setBusy] = useState(null);
	const send = (channel) => {
		const verb = channel.mode === "auto" ? `Отправить КП: ${channel.label}?` : `Отметить, что КП отправлено вручную: ${channel.label}?`;
		if (!window.confirm(verb)) return;
		setBusy(channel.key);
		router.post(`/admin/offers/${offerId}/send`, {
			channel: channel.key,
			contact: contacts[channel.key] ?? ""
		}, {
			preserveScroll: true,
			onFinish: () => setBusy(null)
		});
	};
	return /* @__PURE__ */ jsxs(Panel, {
		title: "Отправка КП",
		children: [
			disabled ? /* @__PURE__ */ jsx(Alert, {
				tone: "warning",
				children: "КП отозвано или истекло — отправка недоступна."
			}) : null,
			/* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				children: "Email и SMS отправляются автоматически. Для мессенджеров и звонка откроется готовый текст — после отправки отметьте её здесь."
			}),
			/* @__PURE__ */ jsx("div", {
				className: "offer-dispatch",
				children: channels.map((c) => {
					const needsContact = c.reason === "Нет подходящего контакта в карточке.";
					const blocked = !c.available && !needsContact;
					return /* @__PURE__ */ jsxs("div", {
						className: `offer-dispatch__item card${blocked ? " is-off" : ""}`,
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "row row--between",
								children: [/* @__PURE__ */ jsx("b", { children: c.label }), /* @__PURE__ */ jsx(Badge, {
									tone: c.mode === "auto" ? "info" : void 0,
									children: c.mode === "auto" ? "авто" : "вручную"
								})]
							}),
							c.contact ? /* @__PURE__ */ jsx("span", {
								className: "text-sm",
								children: c.contact
							}) : null,
							c.reason ? /* @__PURE__ */ jsx("span", {
								className: "text-xs text-muted",
								children: c.reason
							}) : null,
							needsContact && !disabled ? c.key === "email" ? /* @__PURE__ */ jsx(TextField, {
								"aria-label": `Контакт для канала ${c.label}`,
								placeholder: "email@clinic.ru",
								type: "email",
								value: contacts[c.key] ?? "",
								onChange: (e) => setContacts((prev) => ({
									...prev,
									[c.key]: e.target.value
								}))
							}) : /* @__PURE__ */ jsx(PhoneField, {
								"aria-label": `Номер для канала ${c.label}`,
								autoComplete: "off",
								value: contacts[c.key] ?? "",
								onChange: (e) => setContacts((prev) => ({
									...prev,
									[c.key]: e.target.value
								}))
							}) : null,
							c.last ? /* @__PURE__ */ jsxs("span", {
								className: "text-xs text-muted",
								children: [
									"Последняя: ",
									statuses[c.last.status] ?? c.last.status,
									c.last.at ? `, ${c.last.at}` : ""
								]
							}) : null,
							/* @__PURE__ */ jsxs("div", {
								className: "row row--wrap",
								children: [c.link && !disabled ? /* @__PURE__ */ jsx(AnchorButton, {
									href: c.link,
									target: "_blank",
									rel: "noopener",
									size: "sm",
									variant: "outline",
									icon: "external",
									children: c.key === "phone" ? "Позвонить" : "Открыть"
								}) : null, /* @__PURE__ */ jsx(Button, {
									size: "sm",
									disabled: disabled || blocked || needsContact && !(contacts[c.key] ?? "").trim(),
									loading: busy === c.key,
									onClick: () => send(c),
									children: c.mode === "auto" ? "Отправить" : "Отметить отправку"
								})]
							})
						]
					}, c.key);
				})
			})
		]
	});
}
//#endregion
//#region resources/js/pages/Admin/Offer.tsx
var duration = (sec) => sec < 60 ? `${sec} с` : `${Math.round(sec / 60)} мин`;
function AdminOffer(props) {
	const { offer, demo_links, applications, recipients, offer_statuses, application_statuses, recipient_statuses, channels } = props;
	const revoke = () => {
		if (window.confirm("Отозвать КП? Страница предложения и демо-кабинет перестанут открываться.")) router.post(`/admin/offers/${offer.id}/revoke`, {}, { preserveScroll: true });
	};
	const connect = () => {
		if (window.confirm("Отметить клинику подключённой? Демо-ссылки закроются, демо-заявки и записи удалятся.")) router.post(`/admin/offers/${offer.id}/connect`, {}, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: `КП: ${offer.clinic.name}`,
				text: /* @__PURE__ */ jsxs("span", {
					className: "row row--wrap offers-meta",
					children: [/* @__PURE__ */ jsx(Badge, {
						tone: OFFER_TONE[offer.status],
						children: offer_statuses[offer.status] ?? offer.status
					}), /* @__PURE__ */ jsxs("span", {
						className: "text-sm text-muted",
						children: [
							offer.clinic.city ?? "город не указан",
							" · создано ",
							offer.created_at,
							" · действует ",
							offer.available ? `до ${offer.expires_at ?? "—"}` : "нет"
						]
					})]
				}),
				action: /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap offers-head-actions",
					children: [
						/* @__PURE__ */ jsx(LinkButton, {
							href: "/admin/offers",
							variant: "ghost",
							children: "Все КП"
						}),
						offer.status !== "connected" && offer.status !== "revoked" ? /* @__PURE__ */ jsx(Button, {
							variant: "outline",
							icon: "check",
							onClick: connect,
							children: "Клиника подключилась"
						}) : null,
						offer.available ? /* @__PURE__ */ jsx(Button, {
							variant: "danger",
							onClick: revoke,
							children: "Отозвать"
						}) : null
					]
				})
			}),
			/* @__PURE__ */ jsx(Panel, {
				title: "Ссылки",
				children: /* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [
						/* @__PURE__ */ jsx(CopyLink, {
							label: "Страница КП",
							value: offer.url
						}),
						/* @__PURE__ */ jsx(CopyLink, {
							label: "Короткая ссылка (SMS, мессенджеры)",
							value: offer.short_url
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "text-xs text-muted",
							children: [
								"Просмотров: ",
								offer.views,
								offer.first_viewed_at ? ` · первый ${offer.first_viewed_at}` : "",
								offer.last_viewed_at ? ` · последний ${offer.last_viewed_at}` : "",
								" · ",
								/* @__PURE__ */ jsx(Link, {
									href: `/admin/clinics/${offer.clinic.id}`,
									className: "link",
									children: "Черновик клиники"
								})
							]
						}),
						offer.available ? /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(AnchorButton, {
							href: offer.url,
							target: "_blank",
							rel: "noopener",
							variant: "outline",
							size: "sm",
							icon: "external",
							children: "Открыть как клиника"
						}) }) : null
					]
				})
			}),
			/* @__PURE__ */ jsx(ExtraPanel, {
				offerId: offer.id,
				extra: props.extra,
				disabled: !offer.available
			}),
			/* @__PURE__ */ jsx(DispatchPanel, {
				offerId: offer.id,
				channels: props.dispatch,
				statuses: recipient_statuses,
				disabled: !offer.available
			}),
			/* @__PURE__ */ jsx(ContentPanel, { offer }),
			/* @__PURE__ */ jsx(Panel, {
				title: "Демо-кабинет",
				action: offer.available ? /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: "outline",
					icon: "refresh",
					onClick: () => router.post(`/admin/offers/${offer.id}/demo`, {}, { preserveScroll: true }),
					children: "Новая ссылка"
				}) : null,
				children: demo_links.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-muted",
					children: "Демо-ссылки нет."
				}) : /* @__PURE__ */ jsx("div", {
					className: "stack-lg",
					children: demo_links.map((l) => /* @__PURE__ */ jsx(DemoLinkItem, {
						link: l,
						sections: props.sections
					}, l.id))
				})
			}),
			/* @__PURE__ */ jsx(Panel, {
				title: "Заявки на подключение",
				children: /* @__PURE__ */ jsx(ApplicationsTab, {
					applications: { data: applications },
					statuses: application_statuses
				})
			}),
			recipients.length > 0 ? /* @__PURE__ */ jsx(Panel, {
				title: "Отправки в кампаниях",
				children: /* @__PURE__ */ jsx(Table, {
					headers: [
						"Кампания",
						"Канал",
						"Контакт",
						"Статус",
						"Отправлено"
					],
					children: recipients.map((r) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", { children: r.campaign ? /* @__PURE__ */ jsx(Link, {
							href: `/admin/campaigns/${r.campaign.id}`,
							className: "link",
							children: r.campaign.name
						}) : "—" }),
						/* @__PURE__ */ jsx("td", { children: channels[r.channel] ?? r.channel }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", { children: r.contact || "—" }) }),
						/* @__PURE__ */ jsxs("td", { children: [recipient_statuses[r.status] ?? r.status, r.error ? /* @__PURE__ */ jsx("div", {
							className: "text-xs text-muted",
							children: r.error
						}) : null] }),
						/* @__PURE__ */ jsx("td", { children: r.sent_at ?? "—" })
					] }, r.id))
				})
			}) : null
		]
	});
}
function ContentPanel({ offer }) {
	const [channel, setChannel] = useState("web");
	const [editing, setEditing] = useState(false);
	const s = offer.snapshot;
	const plain = {
		sms: s.sms,
		messenger: s.messenger,
		call: s.call_script ?? ""
	};
	return /* @__PURE__ */ jsx(Panel, {
		title: offer.is_customized ? "Текст КП (изменён для этой клиники)" : `Текст КП${offer.template ? ` · ${offer.template.name}, v${offer.template.version}` : ""}`,
		action: offer.available && offer.template ? /* @__PURE__ */ jsx(Button, {
			size: "sm",
			variant: "outline",
			icon: "edit",
			onClick: () => setEditing((v) => !v),
			children: editing ? "Закрыть правку" : "Изменить для этой клиники"
		}) : null,
		children: editing && offer.template ? /* @__PURE__ */ jsx(CustomizeForm, {
			offer,
			content: offer.template.content,
			onDone: () => setEditing(false)
		}) : /* @__PURE__ */ jsxs("div", {
			className: "stack",
			children: [/* @__PURE__ */ jsx(Tabs, {
				label: "Каналы",
				value: channel,
				onChange: setChannel,
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
						label: "Мессенджеры"
					},
					{
						key: "call",
						label: "Звонок"
					}
				]
			}), channel === "web" ? /* @__PURE__ */ jsxs("div", {
				className: "offers-preview",
				children: [/* @__PURE__ */ jsx("h3", { children: s.web_title }), /* @__PURE__ */ jsx("div", {
					className: "offers-preview__body",
					dangerouslySetInnerHTML: { __html: s.web_html }
				})]
			}) : channel === "email" ? /* @__PURE__ */ jsxs("div", {
				className: "offers-preview",
				children: [/* @__PURE__ */ jsxs("p", {
					className: "text-sm",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "text-muted",
							children: "Тема:"
						}),
						" ",
						/* @__PURE__ */ jsx("b", { children: s.email_subject })
					]
				}), /* @__PURE__ */ jsx("div", {
					className: "offers-preview__body",
					dangerouslySetInnerHTML: { __html: s.email_html.replaceAll("{unsubscribe_link}", "<i>персональная ссылка отписки</i>") }
				})]
			}) : /* @__PURE__ */ jsxs("div", {
				className: "stack",
				children: [
					/* @__PURE__ */ jsx("pre", {
						className: "offers-plain",
						children: plain[channel] || "Текст не задан."
					}),
					channel === "sms" ? /* @__PURE__ */ jsxs("p", {
						className: `text-xs ${offer.sms_segments > 2 ? "offers-warn" : "text-muted"}`,
						children: [
							s.sms.length,
							" знаков · ",
							offer.sms_segments,
							" SMS"
						]
					}) : null,
					plain[channel] ? /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(CopyButton, {
						value: plain[channel],
						label: "Копировать текст"
					}) }) : null
				]
			})]
		})
	});
}
function CustomizeForm({ offer, content, onDone }) {
	const form = useForm({
		...content,
		call_script: content.call_script ?? ""
	});
	const submit = (e) => {
		e.preventDefault();
		form.put(`/admin/offers/${offer.id}/content`, {
			preserveScroll: true,
			onSuccess: onDone
		});
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "stack",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(Alert, {
				tone: "muted",
				icon: "info",
				children: "Правка касается только этой клиники и пересобирает текст с переменными. Шаблон не меняется."
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Заголовок страницы",
				value: form.data.web_title,
				onChange: (e) => form.setData("web_title", e.target.value),
				error: form.errors.web_title
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "Текст страницы",
				rows: 8,
				maxLength: 2e4,
				value: form.data.web_body,
				onChange: (e) => form.setData("web_body", e.target.value),
				error: form.errors.web_body
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Тема письма",
				value: form.data.email_subject,
				onChange: (e) => form.setData("email_subject", e.target.value),
				error: form.errors.email_subject
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "Текст письма",
				rows: 6,
				value: form.data.email_body,
				onChange: (e) => form.setData("email_body", e.target.value),
				error: form.errors.email_body
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "SMS",
				rows: 2,
				value: form.data.sms_text,
				onChange: (e) => form.setData("sms_text", e.target.value),
				error: form.errors.sms_text
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "Мессенджеры",
				rows: 4,
				value: form.data.messenger_text,
				onChange: (e) => form.setData("messenger_text", e.target.value),
				error: form.errors.messenger_text
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "Скрипт звонка",
				rows: 4,
				maxLength: 4e3,
				value: form.data.call_script ?? "",
				onChange: (e) => form.setData("call_script", e.target.value),
				error: form.errors.call_script
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row offers-save",
				children: [/* @__PURE__ */ jsx(Button, {
					type: "submit",
					loading: form.processing,
					children: "Сохранить для этой клиники"
				}), /* @__PURE__ */ jsx(Button, {
					variant: "ghost",
					onClick: onDone,
					children: "Отмена"
				})]
			})
		]
	});
}
function DemoLinkItem({ link, sections }) {
	const form = useForm({
		expires_at: link.expires_at ?? "",
		max_opens: link.max_opens ?? "",
		max_devices: link.max_devices ?? "",
		sections: link.sections,
		show_tariffs: link.show_tariffs,
		notify_manager: link.notify_manager,
		revoke_on_connect: link.revoke_on_connect
	});
	const err = form.errors;
	const submit = (e) => {
		e.preventDefault();
		form.transform((d) => ({
			...d,
			expires_at: d.expires_at || null,
			max_opens: d.max_opens === "" ? null : d.max_opens,
			max_devices: d.max_devices === "" ? null : d.max_devices
		}));
		form.put(`/admin/offers/demo-links/${link.id}`, { preserveScroll: true });
	};
	const revoke = () => {
		if (window.confirm("Отозвать демо-ссылку? Открытые сессии закроются при следующем переходе.")) router.post(`/admin/offers/demo-links/${link.id}/revoke`, {}, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: `offers-demo${link.state ? " is-closed" : ""}`,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "offers-demo__head",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "row row--wrap offers-meta",
					children: [
						/* @__PURE__ */ jsxs("b", { children: ["Ссылка #", link.id] }),
						link.state ? /* @__PURE__ */ jsx(Badge, { children: link.revoke_reason ?? link.state }) : /* @__PURE__ */ jsx(Badge, {
							tone: "success",
							children: "действует"
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "text-sm text-muted",
							children: [
								"открытий ",
								link.opens_count,
								link.max_opens ? ` из ${link.max_opens}` : "",
								" · устройств ",
								link.devices_count,
								link.max_devices ? ` из ${link.max_devices}` : "",
								link.last_opened_at ? ` · последнее ${link.last_opened_at}` : ""
							]
						})
					]
				}), !link.state ? /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: "ghost",
					onClick: revoke,
					children: "Отозвать"
				}) : null]
			}),
			!link.state ? /* @__PURE__ */ jsx(CopyLink, {
				label: "Прямая ссылка на демо",
				value: link.url
			}) : null,
			!link.state ? /* @__PURE__ */ jsxs("details", {
				className: "offers-details",
				children: [/* @__PURE__ */ jsx("summary", { children: "Ограничения ссылки" }), /* @__PURE__ */ jsxs("form", {
					className: "stack",
					onSubmit: submit,
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "offers-form-grid",
							children: [
								/* @__PURE__ */ jsx(TextField, {
									label: "Действует до",
									type: "date",
									value: form.data.expires_at,
									onChange: (e) => form.setData("expires_at", e.target.value),
									error: err.expires_at,
									hint: "Пусто — бессрочно"
								}),
								/* @__PURE__ */ jsx(TextField, {
									label: "Максимум открытий",
									type: "number",
									min: 1,
									value: form.data.max_opens,
									onChange: (e) => form.setData("max_opens", e.target.value === "" ? "" : Number(e.target.value)),
									error: err.max_opens
								}),
								/* @__PURE__ */ jsx(TextField, {
									label: "Максимум устройств",
									type: "number",
									min: 1,
									value: form.data.max_devices,
									onChange: (e) => form.setData("max_devices", e.target.value === "" ? "" : Number(e.target.value)),
									error: err.max_devices
								})
							]
						}),
						/* @__PURE__ */ jsx(SectionPicker, {
							sections,
							value: form.data.sections,
							onChange: (v) => form.setData("sections", v),
							error: err.sections
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "offers-checks",
							children: [
								/* @__PURE__ */ jsx(Check, {
									label: "Показывать тарифы",
									checked: form.data.show_tariffs,
									onChange: (e) => form.setData("show_tariffs", e.target.checked)
								}),
								/* @__PURE__ */ jsx(Check, {
									label: "Сообщать менеджеру об открытии",
									checked: form.data.notify_manager,
									onChange: (e) => form.setData("notify_manager", e.target.checked)
								}),
								/* @__PURE__ */ jsx(Check, {
									label: "Закрыть после подключения",
									checked: form.data.revoke_on_connect,
									onChange: (e) => form.setData("revoke_on_connect", e.target.checked)
								})
							]
						}),
						/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Button, {
							type: "submit",
							size: "sm",
							loading: form.processing,
							disabled: !form.isDirty,
							children: "Сохранить ограничения"
						}) })
					]
				})]
			}) : null,
			link.visits.length > 0 ? /* @__PURE__ */ jsx(Table, {
				headers: [
					"Начало",
					"Длительность",
					"Устройство",
					"IP",
					"Разделы"
				],
				children: link.visits.map((v) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("td", { children: v.started_at }),
					/* @__PURE__ */ jsxs("td", { children: [
						duration(v.duration),
						" ",
						/* @__PURE__ */ jsxs("span", {
							className: "text-xs text-muted",
							children: [
								"· ",
								v.pages,
								" стр."
							]
						})
					] }),
					/* @__PURE__ */ jsx("td", { children: v.device }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", { children: v.ip }) }),
					/* @__PURE__ */ jsx("td", {
						className: "text-sm",
						children: v.sections.join(", ") || "—"
					})
				] }, v.id))
			}) : /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				children: "Демо-кабинет по этой ссылке ещё не открывали."
			})
		]
	});
}
//#endregion
export { AdminOffer as default };

//# sourceMappingURL=Offer-D6IClcmq.js.map