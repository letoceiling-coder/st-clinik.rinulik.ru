import { i as LinkButton, n as Button } from "./Button-C2BxTtRt.js";
import { C as SelectField, S as SearchInput, T as TextField, c as Alert, u as Badge, v as Tabs, w as TextArea, x as PhoneField, y as Check } from "../app.js";
import { a as Panel, c as Table, i as PagerSafe, r as PageHead, t as FilterBar } from "./Dash-C8plSzIc.js";
import { Link, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Offers.tsx
var OFFER_TONE = {
	ready: "info",
	sent: "primary",
	viewed: "primary",
	applied: "warning",
	connected: "success",
	revoked: void 0
};
var APPLICATION_TONE = {
	new: "warning",
	in_progress: "info",
	connected: "success",
	rejected: void 0
};
var go = (tab) => router.get("/admin/offers", { tab }, { preserveState: false });
function AdminOffers(props) {
	const { tab, counts } = props;
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "КП и демо-кабинеты",
				text: "Персональные предложения для черновиков клиник: страница КП, демо-кабинет только для просмотра, заявки на подключение.",
				action: /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap offers-head-actions",
					children: [/* @__PURE__ */ jsx(LinkButton, {
						href: "/admin/campaigns",
						variant: "outline",
						icon: "mail",
						children: "Кампании"
					}), /* @__PURE__ */ jsx(LinkButton, {
						href: "/admin/offers/templates/create",
						icon: "plus",
						children: "Новый шаблон"
					})]
				})
			}),
			/* @__PURE__ */ jsx(Tabs, {
				label: "Разделы КП",
				value: tab,
				onChange: go,
				items: [
					{
						key: "offers",
						label: "Предложения",
						count: counts.offers || void 0
					},
					{
						key: "applications",
						label: "Заявки",
						count: counts.applications || void 0
					},
					{
						key: "templates",
						label: "Шаблоны",
						count: counts.templates || void 0
					},
					{
						key: "stop-list",
						label: "Стоп-лист",
						count: counts["stop-list"] || void 0
					},
					{
						key: "settings",
						label: "Настройки"
					}
				]
			}),
			tab === "offers" && props.offers ? /* @__PURE__ */ jsx(OffersTab, {
				...props,
				offers: props.offers
			}) : null,
			tab === "applications" && props.applications ? /* @__PURE__ */ jsx(ApplicationsTab, {
				applications: props.applications,
				statuses: props.application_statuses
			}) : null,
			tab === "templates" && props.templates ? /* @__PURE__ */ jsx(TemplatesTab, { templates: props.templates }) : null,
			tab === "stop-list" && props.stop_list ? /* @__PURE__ */ jsx(StopListTab, {
				...props,
				stopList: props.stop_list
			}) : null,
			tab === "settings" && props.settings ? /* @__PURE__ */ jsx(SettingsTab, {
				settings: props.settings,
				sections: props.sections
			}) : null
		]
	});
}
function OffersTab({ offers, cities, offer_statuses, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [
			/* @__PURE__ */ jsx(Alert, {
				tone: "muted",
				icon: "info",
				children: "КП формируется из карточки организации в разделе «Парсер» (кнопка «Сформировать КП») или сразу для многих черновиков — через кампанию."
			}),
			/* @__PURE__ */ jsxs(FilterBar, {
				action: "/admin/offers",
				children: [
					/* @__PURE__ */ jsx("input", {
						type: "hidden",
						name: "tab",
						value: "offers"
					}),
					/* @__PURE__ */ jsx(SearchInput, {
						name: "q",
						defaultValue: filters.q,
						placeholder: "Название клиники"
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						name: "status",
						defaultValue: filters.status ?? "",
						"aria-label": "Статус",
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Все статусы"
						}), Object.entries(offer_statuses).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))]
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						name: "city",
						defaultValue: filters.city ?? "",
						"aria-label": "Город",
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Все города"
						}), cities.map((c) => /* @__PURE__ */ jsx("option", {
							value: c.id,
							children: c.name
						}, c.id))]
					})
				]
			}),
			offers.data.length === 0 ? /* @__PURE__ */ jsx(Panel, { children: /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Предложений пока нет."
			}) }) : /* @__PURE__ */ jsx(Table, {
				headers: [
					"Клиника",
					"Статус",
					"Просмотры КП",
					"Демо",
					"Действует до",
					""
				],
				children: offers.data.map((o) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx(Link, {
						href: `/admin/offers/${o.id}`,
						className: "link",
						children: /* @__PURE__ */ jsx("b", { children: o.clinic.name })
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted",
						children: [
							o.clinic.city ?? "город не указан",
							" · ",
							o.created_at,
							o.is_customized ? " · текст изменён вручную" : ""
						]
					})] }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Badge, {
						tone: OFFER_TONE[o.status],
						children: offer_statuses[o.status] ?? o.status
					}) }),
					/* @__PURE__ */ jsx("td", { children: o.views }),
					/* @__PURE__ */ jsx("td", { children: o.demo ? /* @__PURE__ */ jsxs("span", {
						className: o.demo.state ? "text-muted" : void 0,
						children: [
							o.demo.opens,
							o.demo.max_opens ? ` из ${o.demo.max_opens}` : "",
							o.demo.state ? " · закрыт" : ""
						]
					}) : "—" }),
					/* @__PURE__ */ jsx("td", { children: o.available ? o.expires_at ?? "бессрочно" : /* @__PURE__ */ jsx("span", {
						className: "text-muted",
						children: "недоступно"
					}) }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(LinkButton, {
						href: `/admin/offers/${o.id}`,
						size: "sm",
						variant: "outline",
						children: "Открыть"
					}) })
				] }, o.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: offers })
		]
	});
}
function ApplicationsTab({ applications, statuses }) {
	if (applications.data.length === 0) return /* @__PURE__ */ jsx(Panel, { children: /* @__PURE__ */ jsx("p", {
		className: "text-muted",
		children: "Заявок на подключение пока нет. Они появляются, когда клиника нажимает «Подключиться» на странице КП."
	}) });
	return /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [/* @__PURE__ */ jsx("ul", {
			className: "offers-list",
			children: applications.data.map((a) => /* @__PURE__ */ jsx(ApplicationItem, {
				application: a,
				statuses
			}, a.id))
		}), "last_page" in applications ? /* @__PURE__ */ jsx(PagerSafe, { page: applications }) : null]
	});
}
function ApplicationItem({ application: a, statuses }) {
	const form = useForm({
		status: a.status,
		admin_note: a.admin_note ?? ""
	});
	const save = (e) => {
		e.preventDefault();
		form.put(`/admin/offers/applications/${a.id}`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs("li", {
		className: "offers-item card",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "offers-item__main stack",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "offers-item__title",
					children: [/* @__PURE__ */ jsx("b", { children: a.name }), /* @__PURE__ */ jsx(Badge, {
						tone: APPLICATION_TONE[a.status],
						children: statuses[a.status] ?? a.status
					})]
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "text-sm",
					children: [
						/* @__PURE__ */ jsx("a", {
							className: "link",
							href: `tel:${a.phone.replace(/[^\d+]/g, "")}`,
							children: a.phone
						}),
						a.email ? /* @__PURE__ */ jsxs(Fragment, { children: [" · ", /* @__PURE__ */ jsx("a", {
							className: "link",
							href: `mailto:${a.email}`,
							children: a.email
						})] }) : null,
						a.position ? ` · ${a.position}` : ""
					]
				}),
				a.comment ? /* @__PURE__ */ jsx("p", {
					className: "text-sm offers-quote",
					children: a.comment
				}) : null,
				/* @__PURE__ */ jsxs("p", {
					className: "text-xs text-muted",
					children: [
						/* @__PURE__ */ jsx(Link, {
							href: `/admin/offers/${a.offer_id}`,
							className: "link",
							children: a.clinic ?? `КП #${a.offer_id}`
						}),
						" ",
						"· ",
						a.created_at,
						a.processor ? ` · обработал ${a.processor}` : ""
					]
				})
			]
		}), /* @__PURE__ */ jsxs("form", {
			className: "offers-item__side stack",
			onSubmit: save,
			children: [
				/* @__PURE__ */ jsx(SelectField, {
					label: "Статус",
					value: form.data.status,
					onChange: (e) => form.setData("status", e.target.value),
					children: Object.entries(statuses).map(([k, v]) => /* @__PURE__ */ jsx("option", {
						value: k,
						children: v
					}, k))
				}),
				/* @__PURE__ */ jsx(TextArea, {
					label: "Заметка",
					rows: 2,
					value: form.data.admin_note,
					maxLength: 2e3,
					onChange: (e) => form.setData("admin_note", e.target.value),
					error: form.errors.admin_note
				}),
				/* @__PURE__ */ jsx(Button, {
					type: "submit",
					size: "sm",
					variant: "outline",
					loading: form.processing,
					disabled: !form.isDirty,
					children: "Сохранить"
				}),
				form.data.status === "connected" && a.status !== "connected" ? /* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted",
					children: "Демо-доступ закроется, демо-данные удалятся."
				}) : null
			]
		})]
	});
}
function TemplatesTab({ templates }) {
	if (templates.length === 0) return /* @__PURE__ */ jsx(Panel, { children: /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [/* @__PURE__ */ jsx("p", {
			className: "text-muted",
			children: "Шаблонов ещё нет. Создайте первый — в нём уже будет пример текста со всеми переменными."
		}), /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(LinkButton, {
			href: "/admin/offers/templates/create",
			icon: "plus",
			children: "Создать шаблон"
		}) })]
	}) });
	return /* @__PURE__ */ jsx(Table, {
		headers: [
			"Шаблон",
			"Версия",
			"КП по шаблону",
			"Изменён",
			""
		],
		children: templates.map((t) => /* @__PURE__ */ jsxs("tr", { children: [
			/* @__PURE__ */ jsxs("td", { children: [
				/* @__PURE__ */ jsx(Link, {
					href: `/admin/offers/templates/${t.id}`,
					className: "link",
					children: /* @__PURE__ */ jsx("b", { children: t.name })
				}),
				" ",
				!t.is_active ? /* @__PURE__ */ jsx(Badge, { children: "выключен" }) : null
			] }),
			/* @__PURE__ */ jsxs("td", { children: [
				"v",
				t.version ?? "—",
				" ",
				/* @__PURE__ */ jsxs("span", {
					className: "text-xs text-muted",
					children: [
						"(всего ",
						t.versions,
						")"
					]
				})
			] }),
			/* @__PURE__ */ jsx("td", { children: t.offers }),
			/* @__PURE__ */ jsx("td", { children: t.updated_at ?? "—" }),
			/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(LinkButton, {
				href: `/admin/offers/templates/${t.id}`,
				size: "sm",
				variant: "outline",
				icon: "edit",
				children: "Изменить"
			}) })
		] }, t.id))
	});
}
function StopListTab({ stopList, channels, stop_reasons, filters }) {
	const form = useForm({
		channel: "email",
		value: "",
		note: ""
	});
	const add = (e) => {
		e.preventDefault();
		form.post("/admin/offers/stop-list", {
			preserveScroll: true,
			onSuccess: () => form.reset("value", "note")
		});
	};
	const remove = (row) => {
		if (window.confirm(`Убрать ${row.value} из стоп-листа? На этот контакт снова смогут уходить КП.`)) router.delete(`/admin/offers/stop-list/${row.id}`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [
			/* @__PURE__ */ jsxs(Panel, {
				title: "Добавить контакт",
				children: [/* @__PURE__ */ jsxs("form", {
					className: "offers-form-grid",
					onSubmit: add,
					children: [
						/* @__PURE__ */ jsx(SelectField, {
							label: "Канал",
							value: form.data.channel,
							onChange: (e) => form.setData("channel", e.target.value),
							children: Object.entries(channels).map(([k, v]) => /* @__PURE__ */ jsx("option", {
								value: k,
								children: v
							}, k))
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Email, телефон или ссылка",
							value: form.data.value,
							onChange: (e) => form.setData("value", e.target.value),
							error: form.errors.value,
							required: true
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Причина",
							value: form.data.note,
							onChange: (e) => form.setData("note", e.target.value),
							placeholder: "Например: просили не писать"
						}),
						/* @__PURE__ */ jsx("div", {
							className: "offers-form-grid__action",
							children: /* @__PURE__ */ jsx(Button, {
								type: "submit",
								loading: form.processing,
								children: "Добавить"
							})
						})
					]
				}), /* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted",
					children: "Номер телефона блокируется сразу для SMS, звонков и WhatsApp. Отписавшиеся по ссылке из письма попадают сюда автоматически."
				})]
			}),
			/* @__PURE__ */ jsxs(FilterBar, {
				action: "/admin/offers",
				children: [/* @__PURE__ */ jsx("input", {
					type: "hidden",
					name: "tab",
					value: "stop-list"
				}), /* @__PURE__ */ jsx(SearchInput, {
					name: "q",
					defaultValue: filters.q,
					placeholder: "Поиск контакта"
				})]
			}),
			stopList.data.length === 0 ? /* @__PURE__ */ jsx(Panel, { children: /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Стоп-лист пуст."
			}) }) : /* @__PURE__ */ jsx(Table, {
				headers: [
					"Контакт",
					"Канал",
					"Причина",
					"Добавлен",
					""
				],
				children: stopList.data.map((s) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("code", { children: s.value }), s.note ? /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: s.note
					}) : null] }),
					/* @__PURE__ */ jsx("td", { children: channels[s.channel] ?? s.channel }),
					/* @__PURE__ */ jsx("td", { children: stop_reasons[s.reason] ?? s.reason }),
					/* @__PURE__ */ jsx("td", { children: s.created_at }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						icon: "trash",
						onClick: () => remove(s),
						children: "Убрать"
					}) })
				] }, s.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: stopList })
		]
	});
}
function SettingsTab({ settings, sections }) {
	const form = useForm(settings);
	const [saved, setSaved] = useState(false);
	const err = form.errors;
	const demo = form.data.demo;
	const rules = form.data.rules;
	const setDemo = (key, value) => form.setData("demo", {
		...demo,
		[key]: value
	});
	const setRule = (key, value) => form.setData("rules", {
		...rules,
		[key]: Number(value)
	});
	const num = (v) => v === "" ? null : Number(v);
	const submit = (e) => {
		e.preventDefault();
		form.put("/admin/offers/settings", {
			preserveScroll: true,
			onSuccess: () => setSaved(true)
		});
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "stack",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(Panel, {
				title: "Демо-кабинет по умолчанию",
				children: /* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [
						/* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted",
							children: "Применяется к новым демо-ссылкам. Для конкретной ссылки ограничения меняются на странице КП."
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "offers-form-grid",
							children: [
								/* @__PURE__ */ jsx(TextField, {
									label: "Срок действия КП, дней",
									type: "number",
									min: 1,
									value: form.data.offer_expires_days,
									onChange: (e) => form.setData("offer_expires_days", Number(e.target.value)),
									error: err.offer_expires_days
								}),
								/* @__PURE__ */ jsx(TextField, {
									label: "Срок демо-ссылки, дней",
									type: "number",
									min: 1,
									value: demo.expires_days,
									onChange: (e) => setDemo("expires_days", Number(e.target.value)),
									error: err["demo.expires_days"]
								}),
								/* @__PURE__ */ jsx(TextField, {
									label: "Максимум открытий",
									type: "number",
									min: 1,
									value: demo.max_opens ?? "",
									onChange: (e) => setDemo("max_opens", num(e.target.value)),
									hint: "Пусто — без ограничения",
									error: err["demo.max_opens"]
								}),
								/* @__PURE__ */ jsx(TextField, {
									label: "Максимум устройств",
									type: "number",
									min: 1,
									value: demo.max_devices ?? "",
									onChange: (e) => setDemo("max_devices", num(e.target.value)),
									hint: "Пусто — без ограничения",
									error: err["demo.max_devices"]
								})
							]
						}),
						/* @__PURE__ */ jsx(SectionPicker, {
							sections,
							value: demo.sections,
							onChange: (v) => setDemo("sections", v),
							error: err["demo.sections"]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "offers-checks",
							children: [
								/* @__PURE__ */ jsx(Check, {
									label: "Показывать тарифы на странице КП",
									checked: demo.show_tariffs,
									onChange: (e) => setDemo("show_tariffs", e.target.checked)
								}),
								/* @__PURE__ */ jsx(Check, {
									label: "Сообщать менеджеру об открытии демо",
									checked: demo.notify_manager,
									onChange: (e) => setDemo("notify_manager", e.target.checked)
								}),
								/* @__PURE__ */ jsx(Check, {
									label: "Закрывать демо после подключения клиники",
									checked: demo.revoke_on_connect,
									onChange: (e) => setDemo("revoke_on_connect", e.target.checked)
								})
							]
						})
					]
				})
			}),
			/* @__PURE__ */ jsx(Panel, {
				title: "Правила рассылки",
				children: /* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "offers-form-grid",
						children: [
							/* @__PURE__ */ jsx(TextField, {
								label: "Не чаще одного КП на контакт, дней",
								type: "number",
								min: 0,
								value: rules.min_days_between,
								onChange: (e) => setRule("min_days_between", e.target.value),
								error: err["rules.min_days_between"]
							}),
							/* @__PURE__ */ jsx(TextField, {
								label: "Писем в день",
								type: "number",
								min: 0,
								value: rules.daily_email,
								onChange: (e) => setRule("daily_email", e.target.value),
								error: err["rules.daily_email"]
							}),
							/* @__PURE__ */ jsx(TextField, {
								label: "SMS в день",
								type: "number",
								min: 0,
								value: rules.daily_sms,
								onChange: (e) => setRule("daily_sms", e.target.value),
								error: err["rules.daily_sms"]
							}),
							/* @__PURE__ */ jsx(TextField, {
								label: "Отправлять с, час",
								type: "number",
								min: 0,
								max: 23,
								value: rules.send_from_hour,
								onChange: (e) => setRule("send_from_hour", e.target.value),
								error: err["rules.send_from_hour"]
							}),
							/* @__PURE__ */ jsx(TextField, {
								label: "Отправлять до, час",
								type: "number",
								min: 1,
								max: 24,
								value: rules.send_to_hour,
								onChange: (e) => setRule("send_to_hour", e.target.value),
								error: err["rules.send_to_hour"]
							})
						]
					}), /* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted",
						children: "Время — московское. Письма и SMS вне рабочего окна ждут его начала, при исчерпании дневного лимита отправка продолжается на следующий день."
					})]
				})
			}),
			/* @__PURE__ */ jsx(Panel, {
				title: "Менеджер в текстах КП",
				children: /* @__PURE__ */ jsxs("div", {
					className: "offers-form-grid",
					children: [
						/* @__PURE__ */ jsx(TextField, {
							label: "Имя",
							value: form.data.manager.name,
							onChange: (e) => form.setData("manager", {
								...form.data.manager,
								name: e.target.value
							}),
							error: err["manager.name"]
						}),
						/* @__PURE__ */ jsx(PhoneField, {
							label: "Телефон",
							value: form.data.manager.phone,
							onChange: (e) => form.setData("manager", {
								...form.data.manager,
								phone: e.target.value
							}),
							error: err["manager.phone"]
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Email для уведомлений",
							type: "email",
							value: form.data.manager.email,
							onChange: (e) => form.setData("manager", {
								...form.data.manager,
								email: e.target.value
							}),
							hint: "Сюда придут письма об открытии демо",
							error: err["manager.email"]
						})
					]
				})
			}),
			/* @__PURE__ */ jsx(Panel, {
				title: "ИИ для текстов КП",
				children: /* @__PURE__ */ jsx("div", {
					className: "offers-form-grid",
					children: /* @__PURE__ */ jsx(TextField, {
						label: "Модель OpenRouter",
						value: form.data.ai?.model ?? "",
						onChange: (e) => form.setData("ai", { model: e.target.value }),
						placeholder: "deepseek/deepseek-chat",
						hint: "Кнопка «Улучшить с ИИ» в карточке КП. Рекомендуем недорогие модели: deepseek/deepseek-chat, qwen/qwen-2.5-72b-instruct.",
						error: err["ai.model"]
					})
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row offers-save",
				children: [/* @__PURE__ */ jsx(Button, {
					type: "submit",
					loading: form.processing,
					children: "Сохранить настройки"
				}), saved && !form.isDirty ? /* @__PURE__ */ jsx("span", {
					className: "text-sm text-muted",
					children: "Сохранено"
				}) : null]
			})
		]
	});
}
function SectionPicker({ sections, value, onChange, error }) {
	const toggle = (key, on) => onChange(on ? [...value, key] : value.filter((v) => v !== key));
	return /* @__PURE__ */ jsxs("fieldset", {
		className: "offers-sections",
		children: [
			/* @__PURE__ */ jsx("legend", {
				className: "field__label",
				children: "Разделы кабинета в демо"
			}),
			/* @__PURE__ */ jsx("div", {
				className: "offers-sections__grid",
				children: Object.entries(sections).map(([key, label]) => /* @__PURE__ */ jsx(Check, {
					label,
					checked: value.includes(key),
					onChange: (e) => toggle(key, e.target.checked)
				}, key))
			}),
			error ? /* @__PURE__ */ jsx("p", {
				className: "field__error",
				role: "alert",
				children: error
			}) : null
		]
	});
}
//#endregion
export { APPLICATION_TONE, ApplicationsTab, OFFER_TONE, SectionPicker, AdminOffers as default };

//# sourceMappingURL=Offers-CjBlmR6m.js.map