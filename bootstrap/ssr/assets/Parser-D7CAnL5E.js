import { i as LinkButton, n as Button } from "./Button-C2BxTtRt.js";
import { C as SelectField, S as SearchInput, b as CitySearchField, c as Alert, n as formatEta, t as ParserTaskProgress, u as Badge, v as Tabs, y as Check } from "../app.js";
import { a as Panel, i as PagerSafe, n as Kpis, r as PageHead, t as FilterBar } from "./Dash-C8plSzIc.js";
import { Link, router, useForm, usePoll } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Parser.tsx
var ORG_TONE = {
	new: "info",
	reviewed: "primary",
	imported: "success",
	duplicate: "warning",
	ignored: void 0
};
var TASK_TONE = {
	queued: "info",
	running: "primary",
	completed: "success",
	failed: "danger",
	cancelled: void 0,
	stale: "warning"
};
/** Парсер открывает около 40 карточек в час; задача ограничена 4 часами. */
var CARDS_PER_HOUR = 40;
var AMOUNTS = [
	10,
	20,
	45,
	80,
	120,
	150
];
var organizationsOf = (city, cities) => {
	const id = cities.find((c) => c.name === city)?.id;
	return `/admin/parser?tab=organizations&status=new${id ? `&city=${id}` : ""}`;
};
var go = (tab) => router.get("/admin/parser", { tab }, { preserveState: false });
function AdminParser(props) {
	const { tab, configured, counts } = props;
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Парсер стоматологий",
				text: "Собирает стоматологии с Яндекс Карт. Найденное не публикуется на сайте, пока вы не проверите карточку и не импортируете её в черновик."
			}),
			!configured ? /* @__PURE__ */ jsxs(Alert, {
				tone: "warning",
				children: [
					"Парсер не подключён. Укажите адрес и API-ключ в разделе",
					" ",
					/* @__PURE__ */ jsx(Link, {
						href: "/admin/integrations#integration-parser",
						className: "link",
						children: "«Интеграции»"
					}),
					"."
				]
			}) : null,
			/* @__PURE__ */ jsx(Guide, {}),
			/* @__PURE__ */ jsx(Kpis, { items: [
				{
					label: "Новые",
					value: counts.new ?? 0,
					hint: "ждут проверки"
				},
				{
					label: "Проверены",
					value: counts.reviewed ?? 0
				},
				{
					label: "Импортированы",
					value: counts.imported ?? 0,
					hint: "черновики клиник"
				},
				{
					label: "Похожи на клиники сайта",
					value: counts.matches ?? 0
				},
				{
					label: "Процессов идёт",
					value: counts.active_tasks ?? 0
				}
			] }),
			/* @__PURE__ */ jsx(Tabs, {
				label: "Разделы парсера",
				value: tab,
				onChange: go,
				items: [
					{
						key: "tasks",
						label: "Запуск парсинга",
						count: counts.active_tasks || void 0
					},
					{
						key: "organizations",
						label: "Найденные клиники",
						count: counts.new || void 0
					},
					{
						key: "base",
						label: "Готовые данные"
					}
				]
			}),
			tab === "organizations" && props.organizations ? /* @__PURE__ */ jsx(OrganizationsTab, {
				...props,
				organizations: props.organizations
			}) : null,
			tab === "tasks" && props.tasks ? /* @__PURE__ */ jsx(TasksTab, {
				...props,
				tasks: props.tasks
			}) : null,
			tab === "base" && props.base ? /* @__PURE__ */ jsx(BaseTab, {
				base: props.base,
				configured
			}) : null
		]
	});
}
function Guide() {
	return /* @__PURE__ */ jsxs("details", {
		className: "parser-guide card",
		children: [
			/* @__PURE__ */ jsxs("summary", { children: [/* @__PURE__ */ jsx("b", { children: "Как пользоваться парсером" }), /* @__PURE__ */ jsx("span", {
				className: "text-sm text-muted",
				children: "4 шага"
			})] }),
			/* @__PURE__ */ jsxs("ol", {
				className: "parser-guide__steps",
				children: [
					/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("b", { children: "Запустите парсинг." }), " Во вкладке «Запуск парсинга» выберите город и, при необходимости, направление (например, «Детская стоматология»). Ищем всегда только стоматологии — другие организации отбрасываются."] }),
					/* @__PURE__ */ jsxs("li", { children: [
						/* @__PURE__ */ jsx("b", { children: "Следите за ходом." }),
						" Внизу экрана появится индикатор: этап, «собрано N из M» и сколько осталось. Парсер открывает каждую карточку, поэтому это небыстро — около ",
						CARDS_PER_HOUR,
						" клиник в час. Страницу можно закрыть или перейти в другой раздел — по завершении придёт уведомление. Если Яндекс покажет проверку, сбор встанет на паузу и индикатор об этом скажет: пройдите проверку на компьютере-исполнителе, сбор продолжится сам."
					] }),
					/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("b", { children: "Проверьте найденное." }), " Карточки появляются во вкладке «Найденные клиники» уже по ходу сбора. Откройте карточку: сверьте адрес и телефоны. Если клиника уже есть на сайте, система подскажет совпадение — такую карточку отметьте «Дубликат»."] }),
					/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("b", { children: "Импортируйте." }), " Нажмите «Импортировать» — появится черновик клиники без владельца. На сайте он не виден, пока вы не опубликуете его в разделе «Клиники»."] })
				]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				children: "Если город уже собирали раньше, быстрее взять данные во вкладке «Готовые данные» — это бесплатно и занимает меньше минуты. Автоматического запуска нет: парсер работает только по вашей команде."
			})
		]
	});
}
function TasksTab({ tasks, cities, search_filters, task_statuses, configured }) {
	const hasActive = tasks.data.some((t) => !t.is_final);
	const { start, stop } = usePoll(4e3, { only: ["tasks", "counts"] }, { autoStart: false });
	useEffect(() => {
		if (hasActive) start();
		else stop();
		return stop;
	}, [
		hasActive,
		start,
		stop
	]);
	const form = useForm({
		city: "",
		query: "",
		count: 45
	});
	const submit = (e) => {
		e.preventDefault();
		form.post("/admin/parser/tasks", { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [/* @__PURE__ */ jsx(Panel, {
			title: "Новый парсинг",
			children: /* @__PURE__ */ jsxs("form", {
				className: "stack",
				onSubmit: submit,
				children: [/* @__PURE__ */ jsxs("div", {
					className: "parser-form-grid",
					children: [
						/* @__PURE__ */ jsxs(SelectField, {
							label: "Город",
							value: form.data.city,
							onChange: (e) => form.setData("city", e.target.value),
							error: form.errors.city,
							required: true,
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Выберите город"
							}), cities.map((c) => /* @__PURE__ */ jsx("option", {
								value: c.name,
								children: c.name
							}, c.id))]
						}),
						/* @__PURE__ */ jsx(SelectField, {
							label: "Направление",
							value: form.data.query,
							onChange: (e) => form.setData("query", e.target.value),
							error: form.errors.query,
							children: Object.entries(search_filters).map(([value, label]) => /* @__PURE__ */ jsx("option", {
								value,
								children: label
							}, value))
						}),
						/* @__PURE__ */ jsx(SelectField, {
							label: "Сколько клиник собрать",
							value: String(form.data.count),
							onChange: (e) => form.setData("count", Number(e.target.value)),
							error: form.errors.count,
							children: AMOUNTS.map((n) => /* @__PURE__ */ jsxs("option", {
								value: n,
								children: [
									n,
									" — ",
									formatEta(n / CARDS_PER_HOUR * 3600)
								]
							}, n))
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "parser-form-actions",
					children: [/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						disabled: !configured || form.processing || form.data.city === "",
						children: "Запустить парсинг"
					}), /* @__PURE__ */ jsxs("span", {
						className: "text-xs text-muted",
						children: [
							"Парсер открывает каждую карточку на Яндекс Картах и забирает всё: адрес, телефоны, сайт, соцсети, график, услуги и цены, фото, координаты. Около",
							" ",
							CARDS_PER_HOUR,
							" клиник в час — карточки появляются во вкладке «Найденные клиники» по ходу сбора."
						]
					})]
				})]
			})
		}), /* @__PURE__ */ jsxs(Panel, {
			title: "История запусков",
			children: [tasks.data.length === 0 ? /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Парсинг ещё не запускали. Выберите город выше и нажмите «Запустить парсинг»."
			}) : /* @__PURE__ */ jsx("ul", {
				className: "parser-list",
				children: tasks.data.map((t) => /* @__PURE__ */ jsxs("li", {
					className: `parser-item${!t.is_final ? " is-active" : ""}`,
					children: [/* @__PURE__ */ jsxs("div", {
						className: "parser-item__main",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "parser-item__title",
								children: [/* @__PURE__ */ jsx("b", { children: t.title }), /* @__PURE__ */ jsx(Badge, {
									tone: TASK_TONE[t.status],
									children: task_statuses[t.status] ?? t.status
								})]
							}),
							!t.is_final ? /* @__PURE__ */ jsx(ParserTaskProgress, { task: t }) : /* @__PURE__ */ jsx("p", {
								className: `text-sm${t.status === "failed" || t.status === "stale" ? " parser-warn" : ""}`,
								children: t.stage
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "text-xs text-muted",
								children: [
									"#",
									t.id,
									" · ",
									t.by ?? "система",
									" · ",
									t.at,
									t.max_results ? ` · лимит ${t.max_results}` : ""
								]
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "parser-item__actions",
						children: [!t.is_final && t.type !== "base.sync" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "outline",
							onClick: () => router.post(`/admin/parser/tasks/${t.id}/refresh`, {}, { preserveScroll: true }),
							children: "Проверить сейчас"
						}), /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => window.confirm("Остановить парсинг?") && router.post(`/admin/parser/tasks/${t.id}/cancel`, {}, { preserveScroll: true }),
							children: "Остановить"
						})] }) : null, t.found > 0 ? /* @__PURE__ */ jsx(LinkButton, {
							href: organizationsOf(t.city, cities),
							size: "sm",
							variant: "outline",
							children: "Смотреть клиники"
						}) : null]
					})]
				}, t.id))
			}), /* @__PURE__ */ jsx(PagerSafe, { page: tasks })]
		})]
	});
}
function OrganizationsTab({ organizations, cities, statuses, filters, offer_templates }) {
	const [selected, setSelected] = useState([]);
	const [busy, setBusy] = useState(false);
	const [templateId, setTemplateId] = useState(offer_templates[0]?.id ?? "");
	const importable = organizations.data.filter((o) => o.importable || o.offerable).map((o) => o.id);
	const selectedImportable = organizations.data.filter((o) => o.importable && selected.includes(o.id)).map((o) => o.id);
	const selectedOfferable = organizations.data.filter((o) => o.offerable && selected.includes(o.id)).map((o) => o.id);
	const allSelected = importable.length > 0 && importable.every((id) => selected.includes(id));
	const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
	const bulk = (url, data, confirmText) => {
		if (!window.confirm(confirmText)) return;
		router.post(url, {
			ids: selected,
			...data
		}, {
			preserveScroll: true,
			onStart: () => setBusy(true),
			onFinish: () => setBusy(false),
			onSuccess: () => setSelected([])
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [
			/* @__PURE__ */ jsxs(FilterBar, { children: [
				/* @__PURE__ */ jsx("input", {
					type: "hidden",
					name: "tab",
					value: "organizations"
				}),
				/* @__PURE__ */ jsx(SearchInput, {
					name: "q",
					defaultValue: filters.q,
					placeholder: "Название, адрес или id Яндекса"
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "status",
					label: "Статус",
					defaultValue: filters.status ?? "",
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: "Все, кроме скрытых"
					}), Object.entries(statuses).map(([k, v]) => /* @__PURE__ */ jsx("option", {
						value: k,
						children: v
					}, k))]
				}),
				/* @__PURE__ */ jsx(CitySearchField, {
					cities,
					defaultValue: filters.city ?? ""
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "has",
					label: "Данные",
					defaultValue: filters.has ?? "",
					children: [
						/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Любые"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "website",
							children: "Есть сайт"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "no_website",
							children: "Нет сайта"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "email",
							children: "Найден email"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "messenger",
							children: "Есть мессенджер или VK"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "full",
							children: "Полная карточка"
						})
					]
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "match",
					label: "Совпадения",
					defaultValue: filters.match ?? "",
					children: [
						/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Все"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "yes",
							children: "Похожа на клинику сайта"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "network",
							children: "Входит в сеть"
						})
					]
				})
			] }),
			/* @__PURE__ */ jsxs("div", {
				className: "parser-toolbar",
				children: [importable.length > 0 ? /* @__PURE__ */ jsx(Check, {
					label: `Выбрать все на странице (${importable.length})`,
					checked: allSelected,
					onChange: () => setSelected(allSelected ? [] : importable)
				}) : /* @__PURE__ */ jsx("span", {
					className: "text-sm text-muted",
					children: "На странице нет карточек для импорта или КП"
				}), /* @__PURE__ */ jsxs("span", {
					className: "text-sm text-muted",
					children: ["Найдено: ", organizations.total]
				})]
			}),
			organizations.data.length === 0 ? /* @__PURE__ */ jsx(Panel, { children: /* @__PURE__ */ jsxs("p", {
				className: "text-muted",
				children: [
					"Здесь пока пусто. Запустите парсинг во вкладке",
					" ",
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "link",
						onClick: () => go("tasks"),
						children: "«Запуск парсинга»"
					}),
					" ",
					"или возьмите город из",
					" ",
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "link",
						onClick: () => go("base"),
						children: "«Готовых данных»"
					}),
					"."
				]
			}) }) : /* @__PURE__ */ jsx("ul", {
				className: "parser-list",
				children: organizations.data.map((o) => /* @__PURE__ */ jsxs("li", {
					className: `parser-item parser-item--org${selected.includes(o.id) ? " is-selected" : ""}`,
					children: [
						/* @__PURE__ */ jsx("label", {
							className: "check parser-item__check",
							children: /* @__PURE__ */ jsx("input", {
								type: "checkbox",
								"aria-label": `Выбрать «${o.name}»`,
								disabled: !o.importable && !o.offerable,
								checked: selected.includes(o.id),
								onChange: () => toggle(o.id)
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "parser-item__main",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "parser-item__title",
									children: [/* @__PURE__ */ jsx(Link, {
										href: `/admin/parser/organizations/${o.id}`,
										className: "link",
										children: /* @__PURE__ */ jsx("b", { children: o.name })
									}), /* @__PURE__ */ jsx(Badge, {
										tone: ORG_TONE[o.status],
										children: statuses[o.status] ?? o.status
									})]
								}),
								/* @__PURE__ */ jsxs("p", {
									className: "text-sm text-muted",
									children: [o.city ?? "город не указан", o.address ? `, ${o.address}` : ""]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "parser-item__meta text-xs",
									children: [
										/* @__PURE__ */ jsx("span", { children: o.phones.length > 0 ? `${o.phones[0]}${o.phones.length > 1 ? ` +${o.phones.length - 1}` : ""}` : "нет телефона" }),
										/* @__PURE__ */ jsx("span", { children: o.website ? "есть сайт" : "без сайта" }),
										o.emails_count > 0 ? /* @__PURE__ */ jsxs("span", { children: ["email: ", o.emails_count] }) : null,
										/* @__PURE__ */ jsxs("span", { children: [
											"★ ",
											o.rating ? o.rating.toFixed(1) : "—",
											" · ",
											o.reviews_count,
											" отз."
										] }),
										o.network_size > 1 ? /* @__PURE__ */ jsxs("span", { children: [
											"сеть: ",
											o.network_size,
											" филиала"
										] }) : null
									]
								}),
								!o.city_known ? /* @__PURE__ */ jsx("p", {
									className: "text-xs parser-warn",
									children: "Города нет в справочнике — сначала добавьте его в «Города», иначе импорт недоступен."
								}) : null,
								o.match ? /* @__PURE__ */ jsxs("p", {
									className: "text-xs parser-warn",
									children: [
										"Похожа на",
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
										o.match.reason ? ` — ${o.match.reason}` : ""
									]
								}) : null
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "parser-item__actions",
							children: [o.offer_id ? /* @__PURE__ */ jsx(LinkButton, {
								href: `/admin/offers/${o.offer_id}`,
								size: "sm",
								variant: "ghost",
								children: "КП"
							}) : null, /* @__PURE__ */ jsx(LinkButton, {
								href: `/admin/parser/organizations/${o.id}`,
								size: "sm",
								variant: "outline",
								children: "Открыть"
							})]
						})
					]
				}, o.id))
			}),
			selected.length > 0 ? /* @__PURE__ */ jsxs("div", {
				className: "parser-bulk",
				role: "region",
				"aria-label": "Действия с выбранными",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "parser-bulk__head",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "parser-bulk__count",
						children: ["Выбрано: ", selected.length]
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "parser-bulk__clear",
						disabled: busy,
						onClick: () => setSelected([]),
						children: "Снять выбор"
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "parser-bulk__actions",
					children: [
						selectedOfferable.length > 0 && offer_templates.length > 0 ? /* @__PURE__ */ jsxs("span", {
							className: "parser-bulk__offer",
							children: [/* @__PURE__ */ jsx("select", {
								"aria-label": "Шаблон КП",
								className: "select select--sm",
								value: templateId,
								onChange: (e) => setTemplateId(Number(e.target.value)),
								children: offer_templates.map((t) => /* @__PURE__ */ jsx("option", {
									value: t.id,
									children: t.name
								}, t.id))
							}), /* @__PURE__ */ jsxs(Button, {
								size: "sm",
								icon: "file",
								loading: busy,
								onClick: () => bulk("/admin/offers/bulk", {
									ids: selectedOfferable,
									template_id: templateId
								}, `Сформировать КП для ${selectedOfferable.length} клиник? Новые карточки будут импортированы в черновики.`),
								children: [
									"Сформировать КП (",
									selectedOfferable.length,
									")"
								]
							})]
						}) : null,
						selectedImportable.length > 0 ? /* @__PURE__ */ jsxs(Button, {
							size: "sm",
							variant: "outline",
							loading: busy,
							onClick: () => bulk("/admin/parser/organizations/import", {
								ids: selectedImportable,
								photos: true
							}, `Импортировать ${selectedImportable.length} карточек в черновики клиник?`),
							children: [
								"Импортировать (",
								selectedImportable.length,
								")"
							]
						}) : null,
						/* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "outline",
							disabled: busy,
							onClick: () => bulk("/admin/parser/organizations/status", { status: "reviewed" }, "Отметить выбранные как проверенные?"),
							children: "Проверены"
						}),
						/* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							disabled: busy,
							onClick: () => bulk("/admin/parser/organizations/status", { status: "ignored" }, "Скрыть выбранные карточки?"),
							children: "Скрыть"
						})
					]
				})]
			}) : null,
			/* @__PURE__ */ jsx(PagerSafe, { page: organizations })
		]
	});
}
function BaseTab({ base, configured }) {
	const [loading, setLoading] = useState(null);
	const sync = (city) => {
		router.post("/admin/parser/sync", { city }, {
			preserveScroll: true,
			onStart: () => setLoading(city),
			onFinish: () => setLoading(null)
		});
	};
	if (base.error) return /* @__PURE__ */ jsx(Alert, {
		tone: "warning",
		children: base.error
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [/* @__PURE__ */ jsxs(Alert, {
			tone: "muted",
			children: [
				"Стоматологии, которые парсер уже собирал раньше (всего ",
				base.total ?? 0,
				"). Кнопка «Загрузить» переносит их к нам в «Найденные клиники» без нового парсинга — быстро и бесплатно. Повторная загрузка обновит данные, ваши решения по карточкам сохранятся."
			]
		}), base.cities.length === 0 ? /* @__PURE__ */ jsx(Panel, { children: /* @__PURE__ */ jsx("p", {
			className: "text-muted",
			children: "Готовых данных по стоматологиям пока нет — запустите парсинг во вкладке «Запуск парсинга»."
		}) }) : /* @__PURE__ */ jsx("ul", {
			className: "parser-list",
			children: base.cities.map((c) => /* @__PURE__ */ jsxs("li", {
				className: "parser-item",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "parser-item__main",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "parser-item__title",
							children: [/* @__PURE__ */ jsx("b", { children: c.city }), c.region ? /* @__PURE__ */ jsx("span", {
								className: "text-xs text-muted",
								children: c.region
							}) : null]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "parser-item__meta text-xs",
							children: [
								/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("b", { children: c.count }), " клиник"] }),
								/* @__PURE__ */ jsxs("span", { children: ["с телефоном: ", c.with_phone] }),
								/* @__PURE__ */ jsxs("span", { children: ["с сайтом: ", c.with_website] }),
								/* @__PURE__ */ jsxs("span", { children: ["★ ", c.avg_rating ?? "—"] }),
								/* @__PURE__ */ jsxs("span", { children: ["обновлено: ", c.updated_at ?? "—"] }),
								/* @__PURE__ */ jsxs("span", { children: ["у нас: ", c.loaded] })
							]
						}),
						!c.known ? /* @__PURE__ */ jsx("p", {
							className: "text-xs parser-warn",
							children: "Города нет в справочнике — загрузить можно, но импорт будет недоступен."
						}) : null
					]
				}), /* @__PURE__ */ jsx("div", {
					className: "parser-item__actions",
					children: /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: c.loaded > 0 ? "outline" : "primary",
						disabled: !configured || loading !== null,
						loading: loading === c.city,
						onClick: () => sync(c.city),
						children: c.loaded > 0 ? "Обновить" : "Загрузить"
					})
				})]
			}, c.city))
		})]
	});
}
//#endregion
export { AdminParser as default };

//# sourceMappingURL=Parser-D7CAnL5E.js.map