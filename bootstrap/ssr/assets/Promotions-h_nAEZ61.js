import { n as Button } from "./Button-DsM_qe4F.js";
import { C as TextField, S as TextArea, s as Badge, x as SelectField, y as Check } from "../app.js";
import { r as PageHead } from "./Dash-C-3tSNHh.js";
import { router, useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
//#region resources/js/pages/Admin/Promotions.tsx
function rub(kopecks) {
	return `${Math.round(kopecks / 100).toLocaleString("ru-RU")} ₽`;
}
function AdminPromotions({ products, packages, prices, settings, pending_orders, cities }) {
	const [tab, setTab] = useState("moderation");
	const priceForm = useForm({
		priceable_type: "product",
		priceable_id: products[0]?.id ?? 1,
		city_id: "",
		price: 99e4,
		is_active: true
	});
	const limitForm = useForm({
		city_id: "",
		max_boost: 3,
		max_banner_home: 1,
		max_banner_catalog: 2
	});
	const productForm = useForm({
		code: "",
		name: "",
		description: "",
		duration_days: 30,
		requires_moderation: false,
		is_active: true,
		sort: 100
	});
	const packageForm = useForm({
		code: "",
		name: "",
		description: "",
		duration_days: 30,
		product_ids: [],
		is_active: true,
		sort: 100
	});
	const savePrice = (e) => {
		e.preventDefault();
		priceForm.transform((d) => ({
			...d,
			city_id: d.city_id === "" ? null : Number(d.city_id),
			price: Number(d.price)
		})).post("/admin/promotions/prices", { preserveScroll: true });
	};
	const saveLimit = (e) => {
		e.preventDefault();
		limitForm.transform((d) => ({
			...d,
			city_id: d.city_id === "" ? null : Number(d.city_id)
		})).post("/admin/promotions/settings", { preserveScroll: true });
	};
	const saveProduct = (e) => {
		e.preventDefault();
		productForm.post("/admin/promotions/products", {
			preserveScroll: true,
			onSuccess: () => productForm.reset()
		});
	};
	const savePackage = (e) => {
		e.preventDefault();
		packageForm.post("/admin/promotions/packages", {
			preserveScroll: true,
			onSuccess: () => packageForm.reset()
		});
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(PageHead, {
			title: "Продвижение и тарифы",
			text: "Тарифы, пакеты, региональные цены, лимиты и модерация баннеров."
		}),
		/* @__PURE__ */ jsx("div", {
			className: "row row--wrap",
			style: {
				gap: 8,
				marginBottom: 24
			},
			children: [
				"moderation",
				"products",
				"packages",
				"prices",
				"limits"
			].map((key) => /* @__PURE__ */ jsx(Button, {
				type: "button",
				variant: tab === key ? "primary" : "outline",
				onClick: () => setTab(key),
				children: key === "moderation" ? `Модерация (${pending_orders.length})` : key === "products" ? "Тарифы" : key === "packages" ? "Пакеты" : key === "prices" ? "Цены" : "Лимиты"
			}, key))
		}),
		tab === "moderation" ? /* @__PURE__ */ jsxs("div", {
			className: "stack-lg",
			children: [pending_orders.length === 0 ? /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Нет заявок на модерацию."
			}) : null, pending_orders.map((o) => /* @__PURE__ */ jsxs("article", {
				className: "card stack",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "row row--wrap row--between",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: o.clinic?.name }), /* @__PURE__ */ jsxs("p", {
							className: "text-sm text-muted",
							children: [
								o.city,
								" · ",
								o.paid_at
							]
						})] }), /* @__PURE__ */ jsx(Badge, {
							tone: "warning",
							children: "На модерации"
						})]
					}),
					o.banner_image_url ? /* @__PURE__ */ jsx("img", {
						src: o.banner_image_url,
						alt: "",
						className: "promo-moderation__img"
					}) : null,
					/* @__PURE__ */ jsxs("p", { children: [
						/* @__PURE__ */ jsx("strong", { children: o.banner_title }),
						/* @__PURE__ */ jsx("br", {}),
						/* @__PURE__ */ jsx("a", {
							href: o.banner_url ?? "#",
							className: "link",
							target: "_blank",
							rel: "noreferrer",
							children: o.banner_url
						})
					] }),
					/* @__PURE__ */ jsxs("div", {
						className: "row row--wrap",
						style: { gap: 8 },
						children: [/* @__PURE__ */ jsx(Button, {
							type: "button",
							onClick: () => router.post(`/admin/promotions/orders/${o.id}/approve`, {}, { preserveScroll: true }),
							children: "Опубликовать"
						}), /* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "outline",
							onClick: () => {
								const note = window.prompt("Причина отклонения");
								if (note) router.post(`/admin/promotions/orders/${o.id}/reject`, { note }, { preserveScroll: true });
							},
							children: "Отклонить"
						})]
					})
				]
			}, o.id))]
		}) : null,
		tab === "products" ? /* @__PURE__ */ jsxs("div", {
			className: "stack-lg",
			children: [/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: saveProduct,
				children: [
					/* @__PURE__ */ jsx("h2", { children: "Новый тариф" }),
					/* @__PURE__ */ jsx(TextField, {
						label: "Код",
						required: true,
						value: productForm.data.code,
						onChange: (e) => productForm.setData("code", e.target.value),
						hint: "boost, banner_home, banner_catalog"
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Название",
						required: true,
						value: productForm.data.name,
						onChange: (e) => productForm.setData("name", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextArea, {
						label: "Описание",
						value: productForm.data.description,
						onChange: (e) => productForm.setData("description", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Дней",
						type: "number",
						value: String(productForm.data.duration_days),
						onChange: (e) => productForm.setData("duration_days", Number(e.target.value))
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Требует модерации (баннер)",
						checked: productForm.data.requires_moderation,
						onChange: (e) => productForm.setData("requires_moderation", e.target.checked)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						children: "Добавить"
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "table-wrap",
				children: /* @__PURE__ */ jsxs("table", {
					className: "table",
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("th", { children: "Код" }),
						/* @__PURE__ */ jsx("th", { children: "Название" }),
						/* @__PURE__ */ jsx("th", { children: "Дней" }),
						/* @__PURE__ */ jsx("th", { children: "Модерация" }),
						/* @__PURE__ */ jsx("th", { children: "Активен" })
					] }) }), /* @__PURE__ */ jsx("tbody", { children: products.map((p) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", { children: p.code }),
						/* @__PURE__ */ jsx("td", { children: p.name }),
						/* @__PURE__ */ jsx("td", { children: p.duration_days }),
						/* @__PURE__ */ jsx("td", { children: p.requires_moderation ? "Да" : "—" }),
						/* @__PURE__ */ jsx("td", { children: p.is_active ? "Да" : "Нет" })
					] }, p.id)) })]
				})
			})]
		}) : null,
		tab === "packages" ? /* @__PURE__ */ jsxs("div", {
			className: "stack-lg",
			children: [/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: savePackage,
				children: [
					/* @__PURE__ */ jsx("h2", { children: "Новый пакет" }),
					/* @__PURE__ */ jsx(TextField, {
						label: "Код",
						required: true,
						value: packageForm.data.code,
						onChange: (e) => packageForm.setData("code", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Название",
						required: true,
						value: packageForm.data.name,
						onChange: (e) => packageForm.setData("name", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextArea, {
						label: "Описание",
						value: packageForm.data.description,
						onChange: (e) => packageForm.setData("description", e.target.value)
					}),
					/* @__PURE__ */ jsxs("fieldset", {
						className: "stack",
						children: [/* @__PURE__ */ jsx("legend", {
							className: "text-sm",
							children: "Включённые услуги"
						}), products.map((p) => /* @__PURE__ */ jsx(Check, {
							label: p.name,
							checked: packageForm.data.product_ids.includes(p.id),
							onChange: (e) => {
								const ids = new Set(packageForm.data.product_ids);
								if (e.target.checked) ids.add(p.id);
								else ids.delete(p.id);
								packageForm.setData("product_ids", [...ids]);
							}
						}, p.id))]
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						children: "Добавить пакет"
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "stack",
				children: packages.map((p) => /* @__PURE__ */ jsxs("article", {
					className: "card",
					children: [
						/* @__PURE__ */ jsx("strong", { children: p.name }),
						" (",
						p.code,
						")",
						/* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted",
							children: p.products.map((x) => x.name).join(" · ")
						})
					]
				}, p.id))
			})]
		}) : null,
		tab === "prices" ? /* @__PURE__ */ jsxs("div", {
			className: "stack-lg",
			children: [/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: savePrice,
				children: [
					/* @__PURE__ */ jsx("h2", { children: "Цена по региону" }),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Тип",
						value: priceForm.data.priceable_type,
						onChange: (e) => priceForm.setData("priceable_type", e.target.value),
						children: [/* @__PURE__ */ jsx("option", {
							value: "product",
							children: "Тариф"
						}), /* @__PURE__ */ jsx("option", {
							value: "package",
							children: "Пакет"
						})]
					}),
					/* @__PURE__ */ jsx(SelectField, {
						label: "Позиция",
						value: priceForm.data.priceable_id,
						onChange: (e) => priceForm.setData("priceable_id", Number(e.target.value)),
						children: (priceForm.data.priceable_type === "product" ? products : packages).map((item) => /* @__PURE__ */ jsx("option", {
							value: item.id,
							children: item.name
						}, item.id))
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Город",
						value: priceForm.data.city_id,
						onChange: (e) => priceForm.setData("city_id", e.target.value),
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "По умолчанию (все города)"
						}), cities.map((c) => /* @__PURE__ */ jsx("option", {
							value: c.id,
							children: c.name
						}, c.id))]
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Цена, коп.",
						required: true,
						type: "number",
						value: String(priceForm.data.price),
						onChange: (e) => priceForm.setData("price", Number(e.target.value)),
						hint: "990000 = 9 900 ₽"
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						children: "Сохранить цену"
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "table-wrap",
				children: /* @__PURE__ */ jsxs("table", {
					className: "table",
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("th", { children: "Тип" }),
						/* @__PURE__ */ jsx("th", { children: "ID" }),
						/* @__PURE__ */ jsx("th", { children: "Город" }),
						/* @__PURE__ */ jsx("th", { children: "Цена" }),
						/* @__PURE__ */ jsx("th", {})
					] }) }), /* @__PURE__ */ jsx("tbody", { children: prices.map((p) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", { children: p.priceable_type }),
						/* @__PURE__ */ jsx("td", { children: p.priceable_id }),
						/* @__PURE__ */ jsx("td", { children: p.city_name }),
						/* @__PURE__ */ jsx("td", { children: rub(p.price) }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "ghost",
							size: "sm",
							onClick: () => router.delete(`/admin/promotions/prices/${p.id}`, { preserveScroll: true }),
							children: "Удалить"
						}) })
					] }, p.id)) })]
				})
			})]
		}) : null,
		tab === "limits" ? /* @__PURE__ */ jsxs("div", {
			className: "stack-lg",
			children: [/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: saveLimit,
				children: [
					/* @__PURE__ */ jsx("h2", { children: "Лимиты размещений" }),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Город",
						value: limitForm.data.city_id,
						onChange: (e) => limitForm.setData("city_id", e.target.value),
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "По умолчанию"
						}), cities.map((c) => /* @__PURE__ */ jsx("option", {
							value: c.id,
							children: c.name
						}, c.id))]
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Макс. бустов «Рекомендуем»",
						type: "number",
						value: String(limitForm.data.max_boost),
						onChange: (e) => limitForm.setData("max_boost", Number(e.target.value))
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Макс. баннеров на главной",
						type: "number",
						value: String(limitForm.data.max_banner_home),
						onChange: (e) => limitForm.setData("max_banner_home", Number(e.target.value))
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Макс. баннеров в каталоге",
						type: "number",
						value: String(limitForm.data.max_banner_catalog),
						onChange: (e) => limitForm.setData("max_banner_catalog", Number(e.target.value))
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						children: "Сохранить лимиты"
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "table-wrap",
				children: /* @__PURE__ */ jsxs("table", {
					className: "table",
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("th", { children: "Город" }),
						/* @__PURE__ */ jsx("th", { children: "Буст" }),
						/* @__PURE__ */ jsx("th", { children: "Главная" }),
						/* @__PURE__ */ jsx("th", { children: "Каталог" })
					] }) }), /* @__PURE__ */ jsx("tbody", { children: settings.map((s) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", { children: s.city_name }),
						/* @__PURE__ */ jsx("td", { children: s.max_boost }),
						/* @__PURE__ */ jsx("td", { children: s.max_banner_home }),
						/* @__PURE__ */ jsx("td", { children: s.max_banner_catalog })
					] }, s.id)) })]
				})
			})]
		}) : null
	] });
}
//#endregion
export { AdminPromotions as default };

//# sourceMappingURL=Promotions-h_nAEZ61.js.map