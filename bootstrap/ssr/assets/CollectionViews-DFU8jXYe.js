import { t as Icon } from "./Icon-DBH8JZC9.js";
import { d as yearsWord, i as doctorsWord, l as priceFrom, n as cx, o as money, u as reviewsWord } from "./format-BPZIj7DQ.js";
import { i as LinkButton, n as Button, r as IconButton } from "./Button-DsM_qe4F.js";
import { a as Alert, h as Tabs, l as EmptyState, n as useCity, p as Skeleton, t as useCollections, u as ErrorState } from "../app.js";
import { n as ClinicCardSkeleton, t as ClinicCard } from "./ClinicCard-Cw1BZp_2.js";
import { t as DoctorCard } from "./DoctorCard-B2GdFBgT.js";
import { Link } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
//#region resources/js/lib/entities.ts
/** Загружает карточки по id через публичный API v1 (в localStorage гостя хранятся только id). */
function useEntities(type, ids) {
	const key = ids.join(",");
	const [state, setState] = useState({
		items: [],
		loading: ids.length > 0,
		error: false
	});
	useEffect(() => {
		if (!key) {
			setState({
				items: [],
				loading: false,
				error: false
			});
			return;
		}
		const ctrl = new AbortController();
		setState((s) => ({
			...s,
			loading: true,
			error: false
		}));
		fetch(`/api/v1/${type === "clinic" ? "clinics" : "doctors"}/by-ids?ids=${key}`, {
			signal: ctrl.signal,
			headers: { Accept: "application/json" }
		}).then((r) => r.ok ? r.json() : Promise.reject(r)).then((j) => setState({
			items: j.data,
			loading: false,
			error: false
		})).catch((e) => {
			if (e?.name !== "AbortError") setState({
				items: [],
				loading: false,
				error: true
			});
		});
		return () => ctrl.abort();
	}, [type, key]);
	return state;
}
//#endregion
//#region resources/js/components/CollectionViews.tsx
function useKinds(kind) {
	const { state } = useCollections();
	const clinicIds = state[kind].clinic;
	const doctorIds = state[kind].doctor;
	const [type, setType] = useState(clinicIds.length || !doctorIds.length ? "clinic" : "doctor");
	return {
		type,
		setType,
		clinicIds,
		doctorIds,
		ids: type === "clinic" ? clinicIds : doctorIds
	};
}
function Empty({ kind, type }) {
	const city = useCity();
	const what = type === "clinic" ? "клиник" : "врачей";
	return /* @__PURE__ */ jsx(EmptyState, {
		icon: kind === "favorite" ? "heart" : "scale",
		title: kind === "favorite" ? `Здесь появятся избранные ${what}` : `Добавьте ${what} к сравнению`,
		text: kind === "favorite" ? "Нажмите на сердечко в карточке, чтобы вернуться к варианту позже." : `Выберите от 2 до 4 позиций, чтобы увидеть различия в цене, рейтинге и условиях.`,
		action: /* @__PURE__ */ jsx(LinkButton, {
			href: city.path(type === "clinic" ? "clinics" : "doctors"),
			children: "Перейти в каталог"
		})
	});
}
function FavoritesView() {
	const { type, setType, clinicIds, doctorIds, ids } = useKinds("favorite");
	const { items, loading, error } = useEntities(type, ids);
	const { isGuest } = useCollections();
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(Tabs, {
				label: "Тип избранного",
				value: type,
				onChange: setType,
				items: [{
					key: "clinic",
					label: "Клиники",
					count: clinicIds.length
				}, {
					key: "doctor",
					label: "Врачи",
					count: doctorIds.length
				}]
			}),
			isGuest ? /* @__PURE__ */ jsxs(Alert, {
				tone: "muted",
				icon: "info",
				children: [
					"Избранное хранится в этом браузере. ",
					/* @__PURE__ */ jsx(Link, {
						href: "/login",
						className: "link",
						children: "Войдите"
					}),
					", чтобы сохранить его в аккаунте."
				]
			}) : null,
			ids.length === 0 ? /* @__PURE__ */ jsx(Empty, {
				kind: "favorite",
				type
			}) : error ? /* @__PURE__ */ jsx(ErrorState, {
				title: "Не удалось загрузить избранное",
				text: "Проверьте соединение и повторите попытку.",
				action: /* @__PURE__ */ jsx(Button, {
					onClick: () => window.location.reload(),
					children: "Обновить"
				})
			}) : loading && items.length === 0 ? /* @__PURE__ */ jsxs("div", {
				className: "stack-lg",
				children: [/* @__PURE__ */ jsx(ClinicCardSkeleton, {}), /* @__PURE__ */ jsx(ClinicCardSkeleton, {})]
			}) : type === "clinic" ? /* @__PURE__ */ jsx("div", {
				className: "stack-lg",
				children: items.map((c) => /* @__PURE__ */ jsx(ClinicCard, { clinic: c }, c.id))
			}) : /* @__PURE__ */ jsx("div", {
				className: "grid grid--doctors grid--2",
				children: items.map((d) => /* @__PURE__ */ jsx(DoctorCard, { doctor: d }, d.id))
			})
		]
	});
}
function Cell({ yes }) {
	return yes ? /* @__PURE__ */ jsxs("span", {
		className: "yes",
		children: [/* @__PURE__ */ jsx(Icon, {
			name: "check-circle",
			size: 20
		}), " Да"]
	}) : /* @__PURE__ */ jsx("span", {
		className: "no",
		children: "Нет"
	});
}
function bestIndex(items, pick, dir) {
	const values = items.map(pick);
	const valid = values.filter((v) => v > 0);
	if (items.length < 2 || valid.length === 0) return null;
	const target = dir === "max" ? Math.max(...valid) : Math.min(...valid);
	const idx = values.indexOf(target);
	return values.filter((v) => v === target).length === items.length ? null : idx;
}
var CLINIC_ROWS = [
	{
		label: "Рейтинг",
		render: (c) => c.reviews_count ? /* @__PURE__ */ jsxs("span", {
			className: "rating",
			children: [/* @__PURE__ */ jsx(Icon, {
				name: "star",
				size: 16
			}), c.rating.toFixed(1).replace(".", ",")]
		}) : "—",
		best: (i) => bestIndex(i, (c) => c.reviews_count ? c.rating : 0, "max")
	},
	{
		label: "Отзывов",
		render: (c) => reviewsWord(c.reviews_count),
		best: (i) => bestIndex(i, (c) => c.reviews_count, "max")
	},
	{
		label: "Услуги от",
		render: (c) => priceFrom(c.min_price),
		best: (i) => bestIndex(i, (c) => c.min_price ?? 0, "min")
	},
	{
		label: "Врачей",
		render: (c) => doctorsWord(c.doctors_count)
	},
	{
		label: "Адрес",
		render: (c) => c.address
	},
	{
		label: "Район",
		render: (c) => c.district ?? "—"
	},
	{
		label: "Сегодня",
		render: (c) => c.today
	},
	{
		label: "Круглосуточно",
		render: (c) => /* @__PURE__ */ jsx(Cell, { yes: c.is_24_7 })
	},
	{
		label: "Запись на сегодня",
		render: (c) => /* @__PURE__ */ jsx(Cell, { yes: c.same_day })
	},
	{
		label: "Дети",
		render: (c) => c.accepts_children ? c.children_age_from ? `С ${c.children_age_from} лет` : "Да" : /* @__PURE__ */ jsx(Cell, { yes: false })
	},
	{
		label: "Рассрочка",
		render: (c) => c.has_installment ? c.installment_months ? `До ${c.installment_months} мес.` : "Да" : /* @__PURE__ */ jsx(Cell, { yes: false })
	},
	{
		label: "ДМС",
		render: (c) => /* @__PURE__ */ jsx(Cell, { yes: c.accepts_dms })
	},
	{
		label: "Седация",
		render: (c) => /* @__PURE__ */ jsx(Cell, { yes: c.has_sedation })
	},
	{
		label: "Наркоз",
		render: (c) => /* @__PURE__ */ jsx(Cell, { yes: c.has_anesthesia })
	},
	{
		label: "Микроскоп",
		render: (c) => /* @__PURE__ */ jsx(Cell, { yes: c.has_microscope })
	},
	{
		label: "КТ",
		render: (c) => /* @__PURE__ */ jsx(Cell, { yes: c.has_ct })
	},
	{
		label: "Лицензия проверена",
		render: (c) => /* @__PURE__ */ jsx(Cell, { yes: c.license.confirmed })
	},
	{
		label: "Оплата",
		render: (c) => c.payment_methods.length ? c.payment_methods.join(", ") : "—"
	}
];
var DOCTOR_ROWS = [
	{
		label: "Должность",
		render: (d) => d.position
	},
	{
		label: "Рейтинг",
		render: (d) => d.reviews_count ? /* @__PURE__ */ jsxs("span", {
			className: "rating",
			children: [/* @__PURE__ */ jsx(Icon, {
				name: "star",
				size: 16
			}), d.rating.toFixed(1).replace(".", ",")]
		}) : "—",
		best: (i) => bestIndex(i, (d) => d.reviews_count ? d.rating : 0, "max")
	},
	{
		label: "Отзывов",
		render: (d) => reviewsWord(d.reviews_count),
		best: (i) => bestIndex(i, (d) => d.reviews_count, "max")
	},
	{
		label: "Стаж",
		render: (d) => yearsWord(d.experience_years),
		best: (i) => bestIndex(i, (d) => d.experience_years, "max")
	},
	{
		label: "Приём от",
		render: (d) => d.consult_price ? money(d.consult_price) : "По запросу",
		best: (i) => bestIndex(i, (d) => d.consult_price ?? 0, "min")
	},
	{
		label: "Клиника",
		render: (d) => d.clinic?.name ?? "—"
	},
	{
		label: "Адрес",
		render: (d) => d.clinic?.address ?? "—"
	},
	{
		label: "Дети",
		render: (d) => d.accepts_children ? d.children_age_from ? `С ${d.children_age_from} лет` : "Да" : /* @__PURE__ */ jsx(Cell, { yes: false })
	},
	{
		label: "Специализация",
		render: (d) => d.specialties.map((s) => s.name).join(", ") || "—"
	},
	{
		label: "Проверен",
		render: (d) => /* @__PURE__ */ jsx(Cell, { yes: d.is_verified })
	}
];
function CompareView() {
	const { type, setType, clinicIds, doctorIds, ids } = useKinds("compare");
	const { toggle } = useCollections();
	const { items, loading, error } = useEntities(type, ids);
	const [onlyDiff, setOnlyDiff] = useState(false);
	const rows = type === "clinic" ? CLINIC_ROWS : DOCTOR_ROWS;
	const visible = onlyDiff ? rows.filter((r) => {
		return new Set(items.map((i) => JSON.stringify(r.render(i), (_k, v) => typeof v === "function" ? void 0 : v))).size > 1;
	}) : rows;
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [/* @__PURE__ */ jsx(Tabs, {
			label: "Тип сравнения",
			value: type,
			onChange: setType,
			items: [{
				key: "clinic",
				label: "Клиники",
				count: clinicIds.length
			}, {
				key: "doctor",
				label: "Врачи",
				count: doctorIds.length
			}]
		}), ids.length === 0 ? /* @__PURE__ */ jsx(Empty, {
			kind: "compare",
			type
		}) : error ? /* @__PURE__ */ jsx(ErrorState, {
			title: "Не удалось загрузить сравнение",
			action: /* @__PURE__ */ jsx(Button, {
				onClick: () => window.location.reload(),
				children: "Обновить"
			})
		}) : loading && items.length === 0 ? /* @__PURE__ */ jsx(Skeleton, {
			h: 360,
			r: 20
		}) : /* @__PURE__ */ jsxs(Fragment, { children: [
			ids.length < 2 ? /* @__PURE__ */ jsx(Alert, {
				tone: "muted",
				icon: "info",
				children: "Добавьте ещё хотя бы одну позицию — тогда лучшие значения будут подсвечены."
			}) : /* @__PURE__ */ jsxs("label", {
				className: "switch",
				children: [/* @__PURE__ */ jsx("input", {
					type: "checkbox",
					role: "switch",
					checked: onlyDiff,
					onChange: (e) => setOnlyDiff(e.target.checked)
				}), /* @__PURE__ */ jsx("span", { children: "Показывать только отличия" })]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "compare-wrap",
				children: /* @__PURE__ */ jsxs("table", {
					className: "compare",
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("th", {
						scope: "col",
						className: "compare__corner",
						children: /* @__PURE__ */ jsx("span", {
							className: "visually-hidden",
							children: "Параметр"
						})
					}), items.map((i) => {
						const href = type === "clinic" ? `/clinics/${i.slug}` : `/doctors/${i.slug}`;
						return /* @__PURE__ */ jsx("th", {
							scope: "col",
							children: /* @__PURE__ */ jsxs("div", {
								className: "compare__head",
								children: [/* @__PURE__ */ jsx(IconButton, {
									icon: "x",
									label: `Убрать «${i.name}» из сравнения`,
									variant: "secondary",
									round: true,
									onClick: () => toggle("compare", type, i.id),
									className: "compare__remove"
								}), /* @__PURE__ */ jsx(Link, {
									href,
									className: "compare__name",
									children: i.name
								})]
							})
						}, i.id);
					})] }) }), /* @__PURE__ */ jsx("tbody", { children: visible.map((r) => {
						const best = r.best?.(items) ?? null;
						return /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("th", {
							scope: "row",
							children: r.label
						}), items.map((i, idx) => /* @__PURE__ */ jsx("td", {
							className: cx(best === idx && "is-best"),
							children: r.render(i)
						}, i.id))] }, r.label);
					}) })]
				})
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-xs text-muted",
				children: "Цены «от»; итоговая стоимость определяется после осмотра. Лучшие значения выделены цветом."
			})
		] })]
	});
}
//#endregion
export { FavoritesView as n, CompareView as t };

//# sourceMappingURL=CollectionViews-DFU8jXYe.js.map