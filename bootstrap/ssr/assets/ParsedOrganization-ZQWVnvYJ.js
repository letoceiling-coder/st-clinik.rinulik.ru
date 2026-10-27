import { i as LinkButton, n as Button } from "./Button-D8Mzgn6o.js";
import { C as TextField, l as Badge, s as Alert, x as SelectField } from "../app.js";
import { a as Panel, r as PageHead, s as StatusBadge } from "./Dash-mdaQWR8t.js";
import { Link, router, useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/ParsedOrganization.tsx
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
function ParsedOrganizationPage({ organization: o, contacts, network, email_tasks, statuses, contact_types, task_statuses, offers }) {
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
	const post = (url, data = {}, confirmText) => {
		if (confirmText && !window.confirm(confirmText)) return;
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
					o.external_id,
					o.synced_at ? ` · обновлено ${o.synced_at}` : ""
				] }),
				action: /* @__PURE__ */ jsx(LinkButton, {
					href: "/admin/parser?tab=organizations",
					variant: "outline",
					size: "sm",
					children: "К списку"
				})
			}),
			o.clinic ? /* @__PURE__ */ jsxs(Alert, {
				tone: "success",
				children: [
					"Импортирована ",
					o.imported?.at,
					o.imported?.by ? ` (${o.imported.by})` : "",
					" в черновик",
					" ",
					/* @__PURE__ */ jsxs(Link, {
						href: `/admin/clinics/${o.clinic.id}`,
						className: "link",
						children: [
							"«",
							o.clinic.name,
							"»"
						]
					}),
					" ",
					"— ",
					/* @__PURE__ */ jsx(StatusBadge, { status: o.clinic.status })
				]
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
			!o.city_known ? /* @__PURE__ */ jsxs(Alert, {
				tone: "warning",
				children: [
					"Города «",
					o.city,
					"» нет в справочнике. Добавьте его в «Справочники → Города», иначе импорт недоступен."
				]
			}) : null,
			o.importable ? /* @__PURE__ */ jsxs("div", {
				className: "row",
				children: [
					/* @__PURE__ */ jsx(Button, {
						onClick: () => post(`${base}/import`, { photos: true }, "Создать черновик клиники из этой карточки? На сайте он не появится до публикации."),
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
						onClick: () => post(`${base}/status`, { status: "ignored" }, "Скрыть карточку? Её можно вернуть фильтром «Скрыта»."),
						children: "Скрыть"
					})
				]
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "parser-show-grid",
				children: [/* @__PURE__ */ jsx(Panel, {
					title: "Данные из Яндекса",
					children: /* @__PURE__ */ jsxs("dl", {
						className: "parser-facts text-sm",
						children: [
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
											onClick: () => window.confirm("Удалить контакт?") && router.delete(`/admin/parser/contacts/${c.id}`, { preserveScroll: true }),
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

//# sourceMappingURL=ParsedOrganization-ZQWVnvYJ.js.map