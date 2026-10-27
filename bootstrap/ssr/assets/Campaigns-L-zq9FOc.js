import { i as LinkButton, n as Button } from "./Button-B5alqlNe.js";
import { S as SelectField, l as Badge, s as Alert, v as Check, w as TextField, x as SearchInput } from "../app.js";
import { a as Panel, c as Table, i as PagerSafe, r as PageHead } from "./Dash-1ijSGeUC.js";
import { Link, useForm, useHttp } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Campaigns.tsx
var CAMPAIGN_TONE = {
	draft: void 0,
	running: "primary",
	paused: "warning",
	completed: "success"
};
function AdminCampaigns(props) {
	const { campaigns, statuses, channels } = props;
	const [creating, setCreating] = useState(campaigns.data.length === 0);
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Кампании КП",
				text: "Массовая рассылка КП черновикам: email и SMS уходят автоматически, звонки и мессенджеры система готовит, а отправляет менеджер.",
				action: /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap offers-head-actions",
					children: [/* @__PURE__ */ jsx(LinkButton, {
						href: "/admin/offers",
						variant: "ghost",
						children: "КП и демо"
					}), /* @__PURE__ */ jsx(Button, {
						icon: "plus",
						onClick: () => setCreating((v) => !v),
						children: creating ? "Скрыть форму" : "Новая кампания"
					})]
				})
			}),
			creating ? /* @__PURE__ */ jsx(CreateForm, { ...props }) : null,
			campaigns.data.length > 0 ? /* @__PURE__ */ jsx(Table, {
				headers: [
					"Кампания",
					"Статус",
					"Получатели",
					"Отправлено",
					"Открыли КП",
					"Демо",
					"Заявки",
					""
				],
				children: campaigns.data.map((c) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx(Link, {
						href: `/admin/campaigns/${c.id}`,
						className: "link",
						children: /* @__PURE__ */ jsx("b", { children: c.name })
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted",
						children: [
							c.channels.map((ch) => channels[ch] ?? ch).join(", "),
							" · ",
							c.template ?? "шаблон удалён",
							" · ",
							c.created_at
						]
					})] }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Badge, {
						tone: CAMPAIGN_TONE[c.status],
						children: statuses[c.status] ?? c.status
					}) }),
					/* @__PURE__ */ jsx("td", { children: c.funnel.total - c.funnel.skipped }),
					/* @__PURE__ */ jsx("td", { children: c.funnel.sent }),
					/* @__PURE__ */ jsx("td", { children: c.funnel.clicked }),
					/* @__PURE__ */ jsx("td", { children: c.funnel.demo_opened }),
					/* @__PURE__ */ jsx("td", { children: c.funnel.replied }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(LinkButton, {
						href: `/admin/campaigns/${c.id}`,
						size: "sm",
						variant: "outline",
						children: "Открыть"
					}) })
				] }, c.id))
			}) : null,
			/* @__PURE__ */ jsx(PagerSafe, { page: campaigns })
		]
	});
}
function CreateForm({ templates, cities, channels, auto_channels, has_options, drafts }) {
	const form = useForm({
		name: "",
		template_id: templates[0]?.id ?? "",
		channels: ["email", "sms"],
		filters: {
			city_id: "",
			rating_min: "",
			has: [],
			not_offered: true,
			ids: []
		}
	});
	const estimate = useHttp({ filters: {} });
	const [manual, setManual] = useState(false);
	const [query, setQuery] = useState("");
	const err = form.errors;
	const f = form.data.filters;
	const setFilter = (key, value) => form.setData("filters", {
		...f,
		[key]: value
	});
	const payloadFilters = useMemo(() => manual ? { ids: f.ids } : {
		city_id: f.city_id || null,
		rating_min: f.rating_min || null,
		has: f.has,
		not_offered: f.not_offered
	}, [manual, f]);
	const filtersKey = JSON.stringify(payloadFilters);
	useEffect(() => {
		const timer = setTimeout(() => {
			estimate.transform(() => ({ filters: payloadFilters }));
			estimate.post("/admin/campaigns/estimate").catch(() => void 0);
		}, 300);
		return () => clearTimeout(timer);
	}, [filtersKey]);
	const toggle = (list, value, on) => on ? [...list, value] : list.filter((v) => v !== value);
	const visibleDrafts = drafts.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()));
	const submit = (e) => {
		e.preventDefault();
		form.transform((d) => ({
			...d,
			filters: payloadFilters
		}));
		form.post("/admin/campaigns");
	};
	const count = estimate.response?.count;
	return /* @__PURE__ */ jsx(Panel, {
		title: "Новая кампания",
		children: /* @__PURE__ */ jsxs("form", {
			className: "stack",
			onSubmit: submit,
			children: [
				templates.length === 0 ? /* @__PURE__ */ jsxs(Alert, {
					tone: "warning",
					children: [
						"Нет активных шаблонов.",
						" ",
						/* @__PURE__ */ jsx(Link, {
							href: "/admin/offers/templates/create",
							className: "link",
							children: "Создайте шаблон"
						}),
						", чтобы запустить кампанию."
					]
				}) : null,
				/* @__PURE__ */ jsxs("div", {
					className: "offers-form-grid",
					children: [/* @__PURE__ */ jsx(TextField, {
						label: "Название",
						value: form.data.name,
						onChange: (e) => form.setData("name", e.target.value),
						error: err.name,
						placeholder: "Например: Краснодар, октябрь",
						required: true
					}), /* @__PURE__ */ jsx(SelectField, {
						label: "Шаблон",
						value: form.data.template_id,
						onChange: (e) => form.setData("template_id", Number(e.target.value)),
						error: err.template_id,
						children: templates.map((t) => /* @__PURE__ */ jsx("option", {
							value: t.id,
							children: t.name
						}, t.id))
					})]
				}),
				/* @__PURE__ */ jsxs("fieldset", {
					className: "offers-sections",
					children: [
						/* @__PURE__ */ jsx("legend", {
							className: "field__label",
							children: "Каналы"
						}),
						/* @__PURE__ */ jsx("div", {
							className: "offers-sections__grid",
							children: Object.entries(channels).map(([key, label]) => /* @__PURE__ */ jsx(Check, {
								label: /* @__PURE__ */ jsxs(Fragment, { children: [
									label,
									" ",
									/* @__PURE__ */ jsx("span", {
										className: "text-xs text-muted",
										children: auto_channels.includes(key) ? "автоматически" : "вручную"
									})
								] }),
								checked: form.data.channels.includes(key),
								onChange: (e) => form.setData("channels", toggle(form.data.channels, key, e.target.checked))
							}, key))
						}),
						err.channels ? /* @__PURE__ */ jsx("p", {
							className: "field__error",
							children: err.channels
						}) : null
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "row row--wrap offers-mode",
					children: [/* @__PURE__ */ jsx(Check, {
						type: "radio",
						name: "mode",
						label: "По фильтрам",
						checked: !manual,
						onChange: () => setManual(false)
					}), /* @__PURE__ */ jsx(Check, {
						type: "radio",
						name: "mode",
						label: "Выбрать вручную",
						checked: manual,
						onChange: () => setManual(true)
					})]
				}),
				!manual ? /* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "offers-form-grid",
							children: [/* @__PURE__ */ jsxs(SelectField, {
								label: "Город",
								value: f.city_id,
								onChange: (e) => setFilter("city_id", e.target.value === "" ? "" : Number(e.target.value)),
								children: [/* @__PURE__ */ jsx("option", {
									value: "",
									children: "Все города"
								}), cities.map((c) => /* @__PURE__ */ jsx("option", {
									value: c.id,
									children: c.name
								}, c.id))]
							}), /* @__PURE__ */ jsxs(SelectField, {
								label: "Рейтинг на Яндексе от",
								value: f.rating_min,
								onChange: (e) => setFilter("rating_min", e.target.value),
								children: [/* @__PURE__ */ jsx("option", {
									value: "",
									children: "Любой"
								}), [
									"3.5",
									"4",
									"4.5",
									"4.8"
								].map((r) => /* @__PURE__ */ jsx("option", {
									value: r,
									children: r.replace(".", ",")
								}, r))]
							})]
						}),
						/* @__PURE__ */ jsxs("fieldset", {
							className: "offers-sections",
							children: [/* @__PURE__ */ jsx("legend", {
								className: "field__label",
								children: "Есть контакт"
							}), /* @__PURE__ */ jsx("div", {
								className: "offers-sections__grid",
								children: Object.entries(has_options).map(([key, label]) => /* @__PURE__ */ jsx(Check, {
									label,
									checked: f.has.includes(key),
									onChange: (e) => setFilter("has", toggle(f.has, key, e.target.checked))
								}, key))
							})]
						}),
						/* @__PURE__ */ jsx(Check, {
							label: "Только те, кому КП ещё не отправляли",
							checked: f.not_offered,
							onChange: (e) => setFilter("not_offered", e.target.checked)
						})
					]
				}) : /* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [
						/* @__PURE__ */ jsx(SearchInput, {
							value: query,
							onChange: (e) => setQuery(e.target.value),
							placeholder: "Найти черновик"
						}),
						/* @__PURE__ */ jsxs("ul", {
							className: "offers-pick",
							children: [visibleDrafts.map((d) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Check, {
								checked: f.ids.includes(d.id),
								onChange: (e) => setFilter("ids", e.target.checked ? [...f.ids, d.id] : f.ids.filter((id) => id !== d.id)),
								label: /* @__PURE__ */ jsxs("span", {
									className: "offers-pick__label",
									children: [/* @__PURE__ */ jsx("b", { children: d.name }), /* @__PURE__ */ jsxs("span", {
										className: "text-xs text-muted",
										children: [
											d.city ?? "—",
											d.rating ? ` · ★ ${d.rating}` : "",
											d.contacts.length ? ` · ${d.contacts.map((c) => has_options[c] ?? c).join(", ")}` : " · нет контактов"
										]
									})]
								})
							}) }, d.id)), visibleDrafts.length === 0 ? /* @__PURE__ */ jsx("li", {
								className: "text-sm text-muted",
								children: "Черновиков не найдено."
							}) : null]
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "text-xs text-muted",
							children: [
								"Показаны последние 100 черновиков. Выбрано: ",
								f.ids.length,
								"."
							]
						})
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "offers-estimate",
					children: count === void 0 ? /* @__PURE__ */ jsx("span", {
						className: "text-sm text-muted",
						children: "Считаем организации…"
					}) : /* @__PURE__ */ jsxs("span", {
						className: "text-sm",
						children: [
							"Под условия попадает ",
							/* @__PURE__ */ jsx("b", { children: count }),
							" ",
							count === 1 ? "черновик" : "черновиков",
							estimate.response?.sample.length ? `: ${estimate.response.sample.map((s) => s.name).join(", ")}${count > estimate.response.sample.length ? "…" : ""}` : ""
						]
					})
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted",
					children: "Для каждой организации сформируется КП с демо-ссылкой. Контакты из стоп-листа, получавшие КП недавно и повторяющиеся в сети филиалов пропускаются — причина будет видна в списке получателей. Отправка начнётся после нажатия «Запустить» на странице кампании."
				}),
				/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Button, {
					type: "submit",
					loading: form.processing,
					disabled: templates.length === 0 || form.data.channels.length === 0 || count === 0,
					children: "Сформировать получателей"
				}) })
			]
		})
	});
}
//#endregion
export { CAMPAIGN_TONE, AdminCampaigns as default };

//# sourceMappingURL=Campaigns-L-zq9FOc.js.map