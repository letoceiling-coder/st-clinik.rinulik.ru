import { t as Icon } from "./Icon-DQahs-u2.js";
import { n as cx, o as money } from "./format-BPZIj7DQ.js";
import { n as Button } from "./Button-D8Mzgn6o.js";
import { S as Drawer, g as Check, y as SelectField } from "../app.js";
import { router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/FilterPanel.tsx
var PRICES = [
	5e3,
	15e3,
	5e4,
	1e5
];
var RATINGS = [
	4,
	4.5,
	4.8
];
var BASE_FILTER_KEYS = [
	"district",
	"specialty",
	"service",
	"price_max",
	"rating_min",
	"reviews_min",
	"children",
	"child_age",
	"experience_min"
];
function propertyFilterKeys(options) {
	return (options.properties ?? []).map((p) => p.slug);
}
function allFilterKeys(options) {
	return [...BASE_FILTER_KEYS, ...propertyFilterKeys(options)];
}
function toValues(filters) {
	const out = {};
	Object.entries(filters).forEach(([k, v]) => {
		if (v !== null && v !== void 0 && v !== "" && v !== false) out[k] = String(v);
	});
	return out;
}
function activeCount(values, options) {
	return allFilterKeys(options).filter((k) => values[k] !== void 0).length;
}
function FilterPanel({ values, options, onApply, mode, auto = false, idPrefix = "f" }) {
	const [draft, setDraft] = useState(values);
	const first = useRef(true);
	const filterKeys = useMemo(() => allFilterKeys(options), [options]);
	const propertyGroups = useMemo(() => {
		const groups = /* @__PURE__ */ new Map();
		(options.properties ?? []).forEach((p) => {
			const list = groups.get(p.group) ?? [];
			list.push(p);
			groups.set(p.group, list);
		});
		return [...groups.entries()];
	}, [options.properties]);
	useEffect(() => setDraft(values), [JSON.stringify(values)]);
	useEffect(() => {
		if (!auto) return;
		if (first.current) {
			first.current = false;
			return;
		}
		if (JSON.stringify(draft) === JSON.stringify(values)) return;
		const t = window.setTimeout(() => onApply(draft), 350);
		return () => window.clearTimeout(t);
	}, [draft]);
	const set = (k, v) => setDraft((d) => {
		const next = { ...d };
		if (v === null || v === "" || v === false) delete next[k];
		else next[k] = v === true ? "1" : String(v);
		if (k === "children" && !v) delete next.child_age;
		if (k === "child_age" && v !== null && v !== "") next.children = "1";
		return next;
	});
	const reset = () => {
		const cleared = {};
		Object.entries(draft).forEach(([k, v]) => {
			if (!filterKeys.includes(k)) cleared[k] = v;
		});
		setDraft(cleared);
		onApply(cleared);
	};
	const count = activeCount(draft, options);
	return /* @__PURE__ */ jsxs("form", {
		className: "filters",
		onSubmit: (e) => {
			e.preventDefault();
			onApply(draft);
		},
		"aria-label": "Фильтры",
		children: [
			mode === "clinics" && options.districts.length > 0 ? /* @__PURE__ */ jsxs(SelectField, {
				label: "Район",
				value: draft.district ?? "",
				onChange: (e) => set("district", e.target.value),
				children: [/* @__PURE__ */ jsx("option", {
					value: "",
					children: "Любой район"
				}), options.districts.map((d) => /* @__PURE__ */ jsx("option", {
					value: d.slug,
					children: d.name
				}, d.slug))]
			}) : null,
			/* @__PURE__ */ jsxs(SelectField, {
				label: "Направление",
				value: draft.specialty ?? "",
				onChange: (e) => set("specialty", e.target.value),
				children: [/* @__PURE__ */ jsx("option", {
					value: "",
					children: "Все направления"
				}), options.specialties.map((s) => /* @__PURE__ */ jsx("option", {
					value: s.slug,
					children: s.name
				}, s.slug))]
			}),
			mode === "clinics" ? /* @__PURE__ */ jsxs(SelectField, {
				label: "Услуга",
				value: draft.service ?? "",
				onChange: (e) => set("service", e.target.value),
				children: [/* @__PURE__ */ jsx("option", {
					value: "",
					children: "Любая услуга"
				}), Object.entries(options.services.reduce((acc, s) => {
					(acc[s.group ?? "Прочее"] ||= []).push(s);
					return acc;
				}, {})).map(([group, items]) => /* @__PURE__ */ jsx("optgroup", {
					label: group,
					children: items.map((s) => /* @__PURE__ */ jsx("option", {
						value: s.slug,
						children: s.name
					}, s.slug))
				}, group))]
			}) : null,
			/* @__PURE__ */ jsxs("fieldset", {
				className: "filters__group",
				children: [
					/* @__PURE__ */ jsx("legend", { children: "Цена услуг" }),
					/* @__PURE__ */ jsx("div", {
						className: "chip-row",
						children: PRICES.map((p) => /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: cx("chip", draft.price_max === String(p) && "is-active"),
							"aria-pressed": draft.price_max === String(p),
							onClick: () => set("price_max", draft.price_max === String(p) ? null : String(p)),
							children: ["до ", money(p)]
						}, p))
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted",
						children: "Цена «от». Окончательную стоимость называет врач после осмотра."
					})
				]
			}),
			/* @__PURE__ */ jsxs("fieldset", {
				className: "filters__group",
				children: [/* @__PURE__ */ jsx("legend", { children: "Рейтинг" }), /* @__PURE__ */ jsx("div", {
					className: "chip-row",
					children: RATINGS.map((r) => /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: cx("chip", draft.rating_min === String(r) && "is-active"),
						"aria-pressed": draft.rating_min === String(r),
						onClick: () => set("rating_min", draft.rating_min === String(r) ? null : String(r)),
						children: [String(r).replace(".", ","), "+"]
					}, r))
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "form-grid",
				style: { gridTemplateColumns: "1fr 1fr" },
				children: [/* @__PURE__ */ jsxs(SelectField, {
					label: "Отзывов от",
					value: draft.reviews_min ?? "",
					onChange: (e) => set("reviews_min", e.target.value),
					children: [
						/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Любое"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "10",
							children: "10+"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "30",
							children: "30+"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "100",
							children: "100+"
						})
					]
				}), /* @__PURE__ */ jsxs(SelectField, {
					label: "Стаж врача",
					value: draft.experience_min ?? "",
					onChange: (e) => set("experience_min", e.target.value),
					children: [
						/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Любой"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "5",
							children: "от 5 лет"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "10",
							children: "от 10 лет"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "15",
							children: "от 15 лет"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "20",
							children: "от 20 лет"
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("fieldset", {
				className: "filters__group",
				children: [
					/* @__PURE__ */ jsx("legend", { children: "Детский приём" }),
					/* @__PURE__ */ jsx(Check, {
						id: `${idPrefix}-children`,
						label: "Принимают детей",
						checked: draft.children === "1",
						onChange: (e) => set("children", e.target.checked)
					}),
					draft.children === "1" ? /* @__PURE__ */ jsxs(SelectField, {
						label: "Возраст ребёнка",
						value: draft.child_age ?? "",
						onChange: (e) => set("child_age", e.target.value),
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Любой"
						}), [
							0,
							1,
							2,
							3,
							4,
							5,
							6,
							7,
							10,
							14,
							17
						].map((a) => /* @__PURE__ */ jsx("option", {
							value: a,
							children: a === 0 ? "С рождения" : `${a} ${a === 1 ? "год" : a < 5 ? "года" : "лет"}`
						}, a))]
					}) : null
				]
			}),
			propertyGroups.map(([group, items]) => /* @__PURE__ */ jsxs("fieldset", {
				className: "filters__group",
				children: [/* @__PURE__ */ jsx("legend", { children: group }), /* @__PURE__ */ jsx("div", {
					className: "stack",
					style: { ["--gap"]: "10px" },
					children: items.map((p) => /* @__PURE__ */ jsx(Check, {
						id: `${idPrefix}-${p.slug}`,
						label: p.name,
						checked: draft[p.slug] === "1",
						onChange: (e) => set(p.slug, e.target.checked)
					}, p.slug))
				})]
			}, group)),
			/* @__PURE__ */ jsxs("div", {
				className: "filters__actions",
				children: [!auto ? /* @__PURE__ */ jsx(Button, {
					type: "submit",
					block: true,
					children: "Показать результаты"
				}) : null, /* @__PURE__ */ jsxs(Button, {
					type: "button",
					variant: "ghost",
					block: true,
					onClick: reset,
					disabled: count === 0,
					children: ["Сбросить", count ? ` (${count})` : ""]
				})]
			})
		]
	});
}
//#endregion
//#region resources/js/components/Catalog.tsx
var SORTS = {
	relevance: "По умолчанию",
	rating: "По рейтингу",
	reviews: "По числу отзывов",
	price_asc: "Сначала дешевле",
	price_desc: "Сначала дороже",
	experience: "По стажу"
};
var STATIC_LABELS = { children: "Дети" };
function useCatalog(filters) {
	const { url } = usePage();
	const values = useMemo(() => toValues(filters), [filters]);
	const [loading, setLoading] = useState(false);
	const path = url.split("?")[0];
	const apply = useCallback((next) => {
		router.get(path, next, {
			preserveScroll: true,
			preserveState: true,
			replace: true,
			onStart: () => setLoading(true),
			onFinish: () => setLoading(false)
		});
	}, [path]);
	const patch = (changes) => {
		const next = {
			...values,
			...changes
		};
		Object.keys(next).forEach((k) => next[k] === "" && delete next[k]);
		apply(next);
	};
	const remove = (key) => {
		const next = { ...values };
		delete next[key];
		if (key === "children") delete next.child_age;
		apply(next);
	};
	return {
		values,
		apply,
		patch,
		remove,
		loading
	};
}
function activeChips(values, options) {
	const propertyLabels = Object.fromEntries((options.properties ?? []).map((p) => [p.slug, p.name]));
	const keys = [
		"district",
		"specialty",
		"service",
		"services",
		"price_max",
		"rating_min",
		"reviews_min",
		"children",
		"child_age",
		"experience_min",
		...(options.properties ?? []).map((p) => p.slug)
	];
	const out = [];
	keys.forEach((k) => {
		const v = values[k];
		if (v === void 0) return;
		let label = propertyLabels[k] ?? STATIC_LABELS[k];
		if (k === "district") label = options.districts.find((d) => d.slug === v)?.name ?? v;
		if (k === "specialty") label = options.specialties.find((d) => d.slug === v)?.name ?? v;
		if (k === "service") label = options.services.find((d) => d.slug === v)?.name ?? v;
		if (k === "services") label = String(v).split(",").map((slug) => options.services.find((d) => d.slug === slug)?.name ?? slug).join(", ");
		if (k === "price_max") label = `до ${new Intl.NumberFormat("ru-RU").format(Number(v))} ₽`;
		if (k === "rating_min") label = `Рейтинг ${v.replace(".", ",")}+`;
		if (k === "reviews_min") label = `Отзывов от ${v}`;
		if (k === "experience_min") label = `Стаж от ${v} лет`;
		if (k === "child_age") label = `Ребёнок ${v} лет`;
		if (label) out.push({
			key: k,
			label
		});
	});
	return out;
}
function CatalogLayout({ values, options, mode, apply, patch, remove, loading, total, children }) {
	const [drawer, setDrawer] = useState(false);
	const chips = activeChips(values, options);
	const count = activeCount(values, options);
	const filterKeys = allFilterKeys(options);
	const sorts = mode === "doctors" ? [
		"relevance",
		"rating",
		"reviews",
		"experience",
		"price_asc"
	] : [
		"relevance",
		"rating",
		"reviews",
		"price_asc",
		"price_desc"
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "container catalog",
		children: [
			/* @__PURE__ */ jsx("aside", {
				className: "catalog__filters catalog__filters--sidebar",
				"aria-label": "Фильтры",
				children: /* @__PURE__ */ jsxs("div", {
					className: "card",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Фильтры"
					}), /* @__PURE__ */ jsx(FilterPanel, {
						values,
						options,
						onApply: apply,
						mode,
						auto: true,
						idPrefix: "d"
					})]
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "catalog__main",
				"aria-busy": loading,
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "catalog__bar",
						children: [/* @__PURE__ */ jsx("div", {
							className: "catalog__total",
							"aria-live": "polite",
							children: total
						}), /* @__PURE__ */ jsxs("div", {
							className: "catalog__tools",
							children: [/* @__PURE__ */ jsxs(Button, {
								variant: "outline",
								size: "sm",
								icon: "filter",
								onClick: () => setDrawer(true),
								className: "catalog__filters-open",
								children: ["Фильтры", count ? ` · ${count}` : ""]
							}), /* @__PURE__ */ jsxs("label", {
								className: "sort",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "visually-hidden",
										children: "Сортировка"
									}),
									/* @__PURE__ */ jsx(Icon, {
										name: "sort",
										size: 18
									}),
									/* @__PURE__ */ jsx("select", {
										className: "select select--sm",
										value: values.sort ?? "relevance",
										onChange: (e) => patch({ sort: e.target.value === "relevance" ? "" : e.target.value }),
										children: sorts.map((k) => /* @__PURE__ */ jsx("option", {
											value: k,
											children: SORTS[k]
										}, k))
									})
								]
							})]
						})]
					}),
					chips.length > 0 ? /* @__PURE__ */ jsxs("ul", {
						className: "active-chips",
						"aria-label": "Выбранные фильтры",
						children: [chips.map((c) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "chip chip--sm is-active",
							onClick: () => remove(c.key),
							"aria-label": `Убрать фильтр: ${c.label}`,
							children: [c.label, /* @__PURE__ */ jsx(Icon, {
								name: "x",
								size: 14
							})]
						}) }, c.key)), /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "btn btn--ghost btn--sm chip-reset",
							onClick: () => apply(Object.fromEntries(Object.entries(values).filter(([k]) => !filterKeys.includes(k)))),
							children: "Сбросить все"
						}) })]
					}) : null,
					/* @__PURE__ */ jsx("div", {
						className: cx("catalog__list", loading && "is-loading"),
						children
					})
				]
			}),
			/* @__PURE__ */ jsx(Drawer, {
				open: drawer,
				onClose: () => setDrawer(false),
				title: "Фильтры",
				side: "right",
				children: /* @__PURE__ */ jsx(FilterPanel, {
					values,
					options,
					mode,
					idPrefix: "m",
					onApply: (v) => {
						setDrawer(false);
						apply(v);
					}
				})
			})
		]
	});
}
//#endregion
export { useCatalog as n, CatalogLayout as t };

//# sourceMappingURL=Catalog-DLf46ZEi.js.map