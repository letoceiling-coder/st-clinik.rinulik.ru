import { i as LinkButton, n as Button } from "./Button-C2BxTtRt.js";
import { A as TextField, O as SelectField, c as confirmDialog, h as Badge, p as Alert } from "../app.js";
import { a as Panel, r as PageHead, s as StatusBadge } from "./Dash-C_HMp027.js";
import { Link, router, useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/ParsedOrganization.tsx
var CLINIC_ACTIONS = [
	{
		target: "published",
		label: "Опубликовать",
		title: "Опубликовать в каталоге?",
		message: "Клиника сразу станет видна посетителям сайта, без модерации.",
		allowedFrom: [
			"draft",
			"pending",
			"approved",
			"hidden",
			"rejected"
		]
	},
	{
		target: "pending",
		label: "На модерацию",
		title: "Отправить на модерацию?",
		message: "Клиника попадёт в очередь «Модерация».",
		allowedFrom: ["draft", "rejected"]
	},
	{
		target: "draft",
		label: "В черновики",
		title: "Вернуть в черновики?",
		message: "Клиника пропадёт из каталога, пока её снова не опубликуют.",
		allowedFrom: [
			"pending",
			"approved",
			"published",
			"hidden",
			"rejected"
		]
	}
];
/** Клиника на сайте сейчас — отдельно от снимка Яндекса: после импорта их данные живут независимо. */
function ClinicNow({ o, clinic }) {
	const move = async (action) => {
		if (!await confirmDialog({
			title: action.title,
			message: action.message,
			confirmLabel: action.label,
			danger: action.target === "draft"
		})) return;
		router.post("/admin/parser/organizations/import", {
			ids: [o.id],
			target: action.target,
			photos: false
		}, { preserveScroll: true });
	};
	const differs = (a, b) => (a ?? "").trim() !== "" && (b ?? "").trim() !== "" && a.trim() !== b.trim();
	return /* @__PURE__ */ jsxs(Panel, {
		title: "Клиника на сайте сейчас",
		action: /* @__PURE__ */ jsx(LinkButton, {
			href: `/admin/clinics/${clinic.id}`,
			size: "sm",
			variant: "outline",
			children: "Открыть клинику"
		}),
		children: [
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: [
					"Создана из этой карточки ",
					o.imported?.at,
					o.imported?.by ? ` (${o.imported.by})` : "",
					". Дальше клиника живёт своей жизнью: правки в админке и кабинете сюда не попадают, а новые данные Яндекса не меняют клинику."
				]
			}),
			/* @__PURE__ */ jsxs("dl", {
				className: "parser-facts text-sm",
				children: [
					/* @__PURE__ */ jsx("dt", { children: "Статус" }),
					/* @__PURE__ */ jsx("dd", { children: /* @__PURE__ */ jsx(StatusBadge, { status: clinic.status }) }),
					/* @__PURE__ */ jsx("dt", { children: "Название" }),
					/* @__PURE__ */ jsxs("dd", { children: [clinic.name, differs(clinic.name, o.name) ? /* @__PURE__ */ jsxs("div", {
						className: "text-xs parser-warn",
						children: ["В Яндексе: ", o.name]
					}) : null] }),
					/* @__PURE__ */ jsx("dt", { children: "Город, адрес" }),
					/* @__PURE__ */ jsxs("dd", { children: [[clinic.city, clinic.address].filter(Boolean).join(", ") || "—", differs(clinic.address, o.address) ? /* @__PURE__ */ jsxs("div", {
						className: "text-xs parser-warn",
						children: ["В Яндексе: ", o.address]
					}) : null] }),
					/* @__PURE__ */ jsx("dt", { children: "Телефон" }),
					/* @__PURE__ */ jsxs("dd", { children: [clinic.phone ?? "—", clinic.phone && o.phones.length > 0 && !o.phones.includes(clinic.phone) ? /* @__PURE__ */ jsxs("div", {
						className: "text-xs parser-warn",
						children: ["В Яндексе: ", o.phones.join(", ")]
					}) : null] }),
					/* @__PURE__ */ jsx("dt", { children: "Сайт" }),
					/* @__PURE__ */ jsx("dd", { children: clinic.website ?? "—" }),
					/* @__PURE__ */ jsx("dt", { children: "Изменена" }),
					/* @__PURE__ */ jsx("dd", { children: clinic.updated_at ?? "—" })
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "row row--wrap",
				children: CLINIC_ACTIONS.filter((a) => a.allowedFrom.includes(clinic.status)).map((a) => /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: a.target === "published" ? "primary" : "outline",
					onClick: () => move(a),
					children: a.label
				}, a.target))
			})
		]
	});
}
/** Привязка к городу справочника: для посёлков и пригородов, которых в справочнике нет. */
function CityAssign({ o, cities }) {
	const form = useForm({ city_id: "" });
	return /* @__PURE__ */ jsxs("form", {
		className: "parser-offer card",
		onSubmit: (e) => {
			e.preventDefault();
			form.post(`/admin/parser/organizations/${o.id}/city`, { preserveScroll: true });
		},
		children: [/* @__PURE__ */ jsxs("span", {
			className: "text-sm",
			children: [
				/* @__PURE__ */ jsx("b", { children: o.city_known ? "Город на сайте." : `«${o.settlement ?? "Без города"}» нет в справочнике городов.` }),
				" ",
				o.city_known ? `Карточка относится к городу «${o.city}». Если это ошибка — выберите другой.` : "Выберите ближайший город — карточка попадёт в его список и станет доступна для импорта. Название посёлка останется в адресе."
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "parser-offer__form",
			children: [/* @__PURE__ */ jsxs(SelectField, {
				"aria-label": "Город",
				value: form.data.city_id,
				onChange: (e) => form.setData("city_id", e.target.value === "" ? "" : Number(e.target.value)),
				children: [/* @__PURE__ */ jsx("option", {
					value: "",
					children: "Выберите город"
				}), cities.map((c) => /* @__PURE__ */ jsx("option", {
					value: c.id,
					children: c.name
				}, c.id))]
			}), /* @__PURE__ */ jsx(Button, {
				type: "submit",
				size: "sm",
				variant: o.city_known ? "outline" : "primary",
				loading: form.processing,
				disabled: form.data.city_id === "",
				children: "Привязать"
			})]
		})]
	});
}
var contactHref = (c) => {
	if (c.type === "phone") return `tel:${c.value}`;
	if (c.type === "email") return `mailto:${c.value}`;
	return c.value.startsWith("http") ? c.value : void 0;
};
function OfferBlock({ organizationId, offers, cityKnown }) {
	const form = useForm({
		parsed_organization_id: organizationId,
		template_id: offers.templates[0]?.id ?? ""
	});
	if (offers.current) return /* @__PURE__ */ jsxs("div", {
		className: "parser-offer card",
		children: [/* @__PURE__ */ jsxs("span", {
			className: "text-sm",
			children: [/* @__PURE__ */ jsx("b", { children: "Коммерческое предложение" }), " уже сформировано."]
		}), /* @__PURE__ */ jsx(LinkButton, {
			href: `/admin/offers/${offers.current.id}`,
			size: "sm",
			variant: "outline",
			children: "Открыть КП"
		})]
	});
	if (!offers.allowed) return null;
	return /* @__PURE__ */ jsxs("form", {
		className: "parser-offer card",
		onSubmit: (e) => {
			e.preventDefault();
			form.post("/admin/offers");
		},
		children: [/* @__PURE__ */ jsxs("span", {
			className: "text-sm",
			children: [/* @__PURE__ */ jsx("b", { children: "Коммерческое предложение." }), " Создаст черновик клиники (если его ещё нет), страницу КП и демо-кабинет."]
		}), offers.templates.length === 0 ? /* @__PURE__ */ jsx(LinkButton, {
			href: "/admin/offers/templates/create",
			size: "sm",
			variant: "outline",
			children: "Создать шаблон КП"
		}) : /* @__PURE__ */ jsxs("div", {
			className: "parser-offer__form",
			children: [/* @__PURE__ */ jsx(SelectField, {
				"aria-label": "Шаблон КП",
				value: form.data.template_id,
				onChange: (e) => form.setData("template_id", Number(e.target.value)),
				children: offers.templates.map((t) => /* @__PURE__ */ jsx("option", {
					value: t.id,
					children: t.name
				}, t.id))
			}), /* @__PURE__ */ jsx(Button, {
				type: "submit",
				size: "sm",
				icon: "send",
				loading: form.processing,
				disabled: !cityKnown,
				children: "Сформировать КП"
			})]
		})]
	});
}
function ParsedOrganizationPage({ organization: o, contacts, network, email_tasks, statuses, cities, contact_types, task_statuses, offers }) {
	const base = `/admin/parser/organizations/${o.id}`;
	const contactForm = useForm({
		type: "email",
		value: ""
	});
	const noteForm = useForm({
		status: o.status === "imported" ? "reviewed" : o.status,
		note: o.note ?? ""
	});
	const hasEmailTaskRunning = email_tasks.some((t) => ["queued", "running"].includes(t.status));
	const post = async (url, data = {}, confirm) => {
		if (confirm && !await confirmDialog(confirm)) return;
		router.post(url, data, { preserveScroll: true });
	};
	const addContact = (e) => {
		e.preventDefault();
		contactForm.post(`${base}/contacts`, {
			preserveScroll: true,
			onSuccess: () => contactForm.reset("value")
		});
	};
	const saveNote = (e) => {
		e.preventDefault();
		noteForm.post(`${base}/status`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: o.name,
				text: /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx(Badge, { children: statuses[o.status] ?? o.status }),
					" ",
					o.city ?? "—",
					" · id Яндекса ",
					o.external_id
				] }),
				action: /* @__PURE__ */ jsx(LinkButton, {
					href: "/admin/parser?tab=organizations",
					variant: "outline",
					size: "sm",
					children: "К списку"
				})
			}),
			/* @__PURE__ */ jsxs(Alert, {
				tone: o.stale ? "warning" : "muted",
				children: [
					"Данные из Яндекс Карт получены ",
					o.synced_at ?? "—",
					o.synced_ago ? ` (${o.synced_ago})` : "",
					o.source_updated_at ? `, в самом Яндексе карточка обновлялась ${o.source_updated_at}` : "",
					".",
					o.stale ? " Снимок устарел — перед импортом или КП сверьте телефон и адрес на Яндекс Картах или запустите парсинг города заново." : ""
				]
			}),
			o.clinic ? /* @__PURE__ */ jsx(ClinicNow, {
				o,
				clinic: o.clinic
			}) : null,
			o.match && !o.clinic ? /* @__PURE__ */ jsxs(Alert, {
				tone: "warning",
				children: [
					"Возможно, это клиника, которая уже есть на сайте:",
					" ",
					/* @__PURE__ */ jsxs(Link, {
						href: `/admin/clinics/${o.match.id}`,
						className: "link",
						children: [
							"«",
							o.match.name,
							"»"
						]
					}),
					" ",
					"(",
					o.match.reason,
					"; ",
					o.match.address ?? "без адреса",
					", ",
					o.match.phone ?? "без телефона",
					"). Если это она — отметьте карточку как дубль."
				]
			}) : null,
			offers ? /* @__PURE__ */ jsx(OfferBlock, {
				organizationId: o.id,
				offers,
				cityKnown: o.city_known
			}) : null,
			!o.clinic && cities.length > 0 ? /* @__PURE__ */ jsx(CityAssign, {
				o,
				cities
			}) : null,
			o.importable ? /* @__PURE__ */ jsxs("div", {
				className: "row",
				children: [
					/* @__PURE__ */ jsx(Button, {
						onClick: () => post(`${base}/import`, { photos: true }, {
							title: "Создать черновик клиники?",
							message: "На сайте он не появится до публикации.",
							confirmLabel: "Создать черновик"
						}),
						disabled: !o.city_known,
						children: "Импортировать как черновик"
					}),
					/* @__PURE__ */ jsx(Button, {
						variant: "outline",
						onClick: () => post(`${base}/import`, { photos: false }),
						disabled: !o.city_known,
						children: "Импортировать без фото"
					}),
					o.match ? /* @__PURE__ */ jsxs(Button, {
						variant: "secondary",
						onClick: () => post(`${base}/status`, {
							status: "duplicate",
							match_clinic_id: o.match?.id
						}),
						children: [
							"Это дубль «",
							o.match.name,
							"»"
						]
					}) : null,
					/* @__PURE__ */ jsx(Button, {
						variant: "ghost",
						onClick: () => post(`${base}/status`, { status: "ignored" }, {
							title: "Скрыть карточку?",
							message: "Её можно вернуть фильтром «Скрыта».",
							confirmLabel: "Скрыть"
						}),
						children: "Скрыть"
					})
				]
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "parser-show-grid",
				children: [/* @__PURE__ */ jsx(Panel, {
					title: `Снимок из Яндекс Карт${o.synced_at ? ` · ${o.synced_at}` : ""}`,
					children: /* @__PURE__ */ jsxs("dl", {
						className: "parser-facts text-sm",
						children: [
							/* @__PURE__ */ jsx("dt", { children: "Город" }),
							/* @__PURE__ */ jsxs("dd", { children: [o.city ?? "—", o.settlement && o.settlement !== o.city ? /* @__PURE__ */ jsxs("span", {
								className: "text-muted",
								children: [
									" (в Яндексе: ",
									o.settlement,
									")"
								]
							}) : null] }),
							/* @__PURE__ */ jsx("dt", { children: "Адрес" }),
							/* @__PURE__ */ jsxs("dd", { children: [o.address ?? "—", o.address_details ? /* @__PURE__ */ jsx("div", {
								className: "text-muted",
								children: o.address_details
							}) : null] }),
							/* @__PURE__ */ jsx("dt", { children: "Регион" }),
							/* @__PURE__ */ jsx("dd", { children: o.region ?? "—" }),
							/* @__PURE__ */ jsx("dt", { children: "Координаты" }),
							/* @__PURE__ */ jsx("dd", { children: o.lat && o.lng ? `${o.lat}, ${o.lng}` : "—" }),
							/* @__PURE__ */ jsx("dt", { children: "Рубрики" }),
							/* @__PURE__ */ jsx("dd", { children: o.categories.length > 0 ? o.categories.join(", ") : "—" }),
							/* @__PURE__ */ jsx("dt", { children: "Часы работы" }),
							/* @__PURE__ */ jsx("dd", { children: o.hours ?? "—" }),
							/* @__PURE__ */ jsx("dt", { children: "Рейтинг Яндекса" }),
							/* @__PURE__ */ jsxs("dd", { children: [
								o.rating ?? "—",
								" (",
								o.reviews_count,
								" отзывов) — только для внутренней аналитики, на сайт не переносится"
							] }),
							/* @__PURE__ */ jsx("dt", { children: "Фото" }),
							/* @__PURE__ */ jsx("dd", { children: o.photos_count }),
							/* @__PURE__ */ jsx("dt", { children: "Карточка" }),
							/* @__PURE__ */ jsxs("dd", { children: [o.has_full_card ? "полная" : "из выдачи (без графика, услуг и цен)", o.source_url ? /* @__PURE__ */ jsxs(Fragment, { children: [" · ", /* @__PURE__ */ jsx("a", {
								href: o.source_url,
								target: "_blank",
								rel: "noreferrer",
								className: "link",
								children: "открыть на Яндекс Картах"
							})] }) : null] }),
							o.task ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("dt", { children: "Источник" }), /* @__PURE__ */ jsxs("dd", { children: [
								"задача #",
								o.task.id,
								" (",
								o.task.type,
								"), ",
								o.task.at
							] })] }) : null
						]
					})
				}), /* @__PURE__ */ jsxs(Panel, {
					title: "Контакты для КП",
					action: o.website ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "outline",
						loading: hasEmailTaskRunning,
						disabled: hasEmailTaskRunning,
						onClick: () => post(`${base}/emails`),
						children: "Найти email на сайте"
					}) : null,
					children: [
						contacts.length === 0 ? /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted",
							children: "Контактов нет."
						}) : /* @__PURE__ */ jsx("ul", {
							className: "parser-contacts",
							children: contacts.map((c) => /* @__PURE__ */ jsxs("li", {
								className: `parser-contacts__item${c.do_not_contact ? " is-muted" : ""}`,
								children: [/* @__PURE__ */ jsxs("div", {
									className: "parser-contacts__value",
									children: [
										/* @__PURE__ */ jsxs("span", {
											className: "text-xs text-muted",
											children: [
												c.type_label,
												" · ",
												c.source
											]
										}),
										contactHref(c) ? /* @__PURE__ */ jsx("a", {
											href: contactHref(c),
											target: "_blank",
											rel: "noreferrer",
											className: "link parser-contact",
											children: c.value
										}) : /* @__PURE__ */ jsx("span", {
											className: "parser-contact",
											children: c.value
										}),
										c.do_not_contact ? /* @__PURE__ */ jsx(Badge, {
											tone: "danger",
											children: "не писать"
										}) : c.is_verified ? /* @__PURE__ */ jsx(Badge, {
											tone: "success",
											children: "подтверждён"
										}) : null
									]
								}), /* @__PURE__ */ jsxs("div", {
									className: "parser-item__actions",
									children: [
										/* @__PURE__ */ jsx(Button, {
											size: "sm",
											variant: "ghost",
											onClick: () => router.put(`/admin/parser/contacts/${c.id}`, { is_verified: !c.is_verified }, { preserveScroll: true }),
											children: c.is_verified ? "Снять отметку" : "Подтвердить"
										}),
										/* @__PURE__ */ jsx(Button, {
											size: "sm",
											variant: "ghost",
											onClick: () => router.put(`/admin/parser/contacts/${c.id}`, { do_not_contact: !c.do_not_contact }, { preserveScroll: true }),
											children: c.do_not_contact ? "Разрешить" : "Не писать"
										}),
										/* @__PURE__ */ jsx(Button, {
											size: "sm",
											variant: "ghost",
											onClick: async () => await confirmDialog({
												title: "Удалить контакт?",
												message: c.value,
												confirmLabel: "Удалить",
												danger: true
											}) && router.delete(`/admin/parser/contacts/${c.id}`, { preserveScroll: true }),
											children: "Удалить"
										})
									]
								})]
							}, c.id))
						}),
						hasEmailTaskRunning ? /* @__PURE__ */ jsxs("div", {
							className: "parser-task-progress",
							children: [/* @__PURE__ */ jsx("div", {
								className: "parser-progress is-indeterminate",
								role: "progressbar",
								"aria-label": "Идёт поиск email"
							}), /* @__PURE__ */ jsx("p", {
								className: "text-xs",
								children: "Ищем email на сайте клиники — обычно до минуты. Можно уйти со страницы, по завершении придёт уведомление."
							})]
						}) : null,
						email_tasks.length > 0 ? /* @__PURE__ */ jsx("ul", {
							className: "text-xs text-muted",
							children: email_tasks.map((t) => /* @__PURE__ */ jsxs("li", { children: [
								"Поиск email ",
								t.at,
								": ",
								task_statuses[t.status] ?? t.status,
								t.status === "completed" ? `, найдено ${t.found}` : "",
								t.error ? ` — ${t.error}` : ""
							] }, t.id))
						}) : null,
						/* @__PURE__ */ jsxs("form", {
							className: "parser-contact-form",
							onSubmit: addContact,
							children: [
								/* @__PURE__ */ jsx(SelectField, {
									label: "Тип",
									value: contactForm.data.type,
									onChange: (e) => contactForm.setData("type", e.target.value),
									children: Object.entries(contact_types).map(([k, v]) => /* @__PURE__ */ jsx("option", {
										value: k,
										children: v
									}, k))
								}),
								/* @__PURE__ */ jsx(TextField, {
									label: "Контакт",
									value: contactForm.data.value,
									onChange: (e) => contactForm.setData("value", e.target.value),
									error: contactForm.errors.value,
									placeholder: contactForm.data.type === "email" ? "info@clinic.ru" : "",
									required: true
								}),
								/* @__PURE__ */ jsx(Button, {
									type: "submit",
									size: "sm",
									variant: "outline",
									loading: contactForm.processing,
									children: "Добавить"
								})
							]
						})
					]
				})]
			}),
			o.services.length > 0 || o.amenities.length > 0 ? /* @__PURE__ */ jsxs(Panel, {
				title: "Услуги и особенности",
				children: [o.services.length > 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-sm",
					children: o.services.join(", ")
				}) : null, o.amenities.length > 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: o.amenities.join(" · ")
				}) : null]
			}) : null,
			o.products.length > 0 ? /* @__PURE__ */ jsxs(Panel, {
				title: "Цены из Яндекса",
				children: [/* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted",
					children: "Перенос цен в прайс черновика появится вместе со справочником соответствия услуг."
				}), /* @__PURE__ */ jsx("ul", {
					className: "parser-prices text-sm",
					children: o.products.map((p, i) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("span", { children: p.name }), /* @__PURE__ */ jsx("b", { children: p.price })] }, i))
				})]
			}) : null,
			network.length > 0 ? /* @__PURE__ */ jsxs(Panel, {
				title: `Сеть: ещё ${network.length}`,
				children: [/* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted",
					children: "Общий сайт или телефон. При импорте филиалы объединяются в одну организацию."
				}), /* @__PURE__ */ jsx("ul", {
					className: "text-sm",
					children: network.map((n) => /* @__PURE__ */ jsxs("li", { children: [
						/* @__PURE__ */ jsx(Link, {
							href: `/admin/parser/organizations/${n.id}`,
							className: "link",
							children: n.name
						}),
						" ",
						"— ",
						n.address ?? "без адреса",
						" · ",
						statuses[n.status] ?? n.status
					] }, n.id))
				})]
			}) : null,
			o.status !== "imported" ? /* @__PURE__ */ jsx(Panel, {
				title: "Решение администратора",
				children: /* @__PURE__ */ jsxs("form", {
					className: "stack",
					onSubmit: saveNote,
					children: [
						/* @__PURE__ */ jsx(SelectField, {
							label: "Статус",
							value: noteForm.data.status,
							onChange: (e) => noteForm.setData("status", e.target.value),
							children: [
								"new",
								"reviewed",
								"duplicate",
								"ignored"
							].map((s) => /* @__PURE__ */ jsx("option", {
								value: s,
								children: statuses[s]
							}, s))
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Заметка",
							value: noteForm.data.note,
							onChange: (e) => noteForm.setData("note", e.target.value),
							error: noteForm.errors.note
						}),
						/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Button, {
							type: "submit",
							size: "sm",
							loading: noteForm.processing,
							children: "Сохранить"
						}) })
					]
				})
			}) : null
		]
	});
}
//#endregion
export { ParsedOrganizationPage as default };

//# sourceMappingURL=ParsedOrganization-CGvei92r.js.map