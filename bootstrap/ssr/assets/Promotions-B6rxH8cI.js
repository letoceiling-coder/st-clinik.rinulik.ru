import { n as Button } from "./Button-DsM_qe4F.js";
import { C as TextField, l as EmptyState, s as Badge } from "../app.js";
import { r as PageHead } from "./Dash-C-3tSNHh.js";
import { t as FileDropzone } from "./FileDropzone-Cv2Y8hOy.js";
import { useForm, usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
//#region resources/js/pages/Cabinet/Promotions.tsx
function formatPrice(kopecks) {
	if (!kopecks) return "—";
	return `${Math.round(kopecks / 100).toLocaleString("ru-RU")} ₽`;
}
function CheckoutForm({ type, id, requiresBanner, name, price }) {
	const form = useForm({
		type,
		id,
		banner_title: "",
		banner_url: "",
		banner_image: null
	});
	const submit = (event) => {
		event.preventDefault();
		form.post("/clinic-cabinet/promotions/checkout", {
			forceFormData: true,
			preserveScroll: true
		});
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "card stack promo-offer",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "row row--wrap row--between",
				children: [/* @__PURE__ */ jsx("h3", {
					className: "promo-offer__title",
					children: name
				}), /* @__PURE__ */ jsx("strong", {
					className: "promo-offer__price",
					children: formatPrice(price)
				})]
			}),
			requiresBanner ? /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx(TextField, {
					label: "Заголовок баннера",
					required: true,
					value: form.data.banner_title,
					onChange: (e) => form.setData("banner_title", e.target.value),
					error: form.errors.banner_title
				}),
				/* @__PURE__ */ jsx(TextField, {
					label: "Ссылка при клике",
					required: true,
					type: "url",
					value: form.data.banner_url,
					onChange: (e) => form.setData("banner_url", e.target.value),
					error: form.errors.banner_url,
					hint: "Обычно страница клиники или акции"
				}),
				/* @__PURE__ */ jsx(FileDropzone, {
					label: "Изображение баннера",
					accept: "image/*",
					onChange: (file) => form.setData("banner_image", file),
					error: form.errors.banner_image,
					hint: "JPG или PNG, до 4 МБ. После оплаты — модерация администратора."
				})
			] }) : null,
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				disabled: form.processing || !price,
				children: "Оплатить через ЮKassa"
			}),
			form.errors.payment ? /* @__PURE__ */ jsx("p", {
				className: "field-error",
				children: form.errors.payment
			}) : null
		]
	});
}
function CabinetPromotions({ products, packages, active, orders, yookassa_configured, labels }) {
	const { flash } = usePage().props;
	const [tab, setTab] = useState("packages");
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(PageHead, {
			title: "Продвижение",
			text: "Поднимите клинику в каталоге или разместите баннер. Оплата через ЮKassa."
		}),
		flash?.success ? /* @__PURE__ */ jsx("p", {
			className: "alert alert--success",
			children: flash.success
		}) : null,
		!yookassa_configured ? /* @__PURE__ */ jsx("p", {
			className: "alert alert--warning",
			children: "Оплата временно недоступна: не настроена ЮKassa на сервере."
		}) : null,
		active.length > 0 ? /* @__PURE__ */ jsxs("section", {
			className: "stack",
			children: [/* @__PURE__ */ jsx("h2", { children: "Активные услуги" }), /* @__PURE__ */ jsx("div", {
				className: "stack",
				children: active.map((item) => /* @__PURE__ */ jsxs("article", {
					className: "card row row--wrap row--between",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: labels[item.product_code] ?? item.product_code }), /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: item.starts_at ? `${item.starts_at} — ${item.ends_at ?? "…"}` : "Ожидает модерации"
					})] }), /* @__PURE__ */ jsx(Badge, {
						tone: item.status === "active" ? "success" : "warning",
						children: item.status === "active" ? "Активно" : "На модерации"
					})]
				}, item.id))
			})]
		}) : null,
		/* @__PURE__ */ jsxs("section", {
			className: "stack-lg",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				style: { gap: 8 },
				children: [/* @__PURE__ */ jsx(Button, {
					variant: tab === "packages" ? "primary" : "outline",
					type: "button",
					onClick: () => setTab("packages"),
					children: "Пакеты"
				}), /* @__PURE__ */ jsx(Button, {
					variant: tab === "products" ? "primary" : "outline",
					type: "button",
					onClick: () => setTab("products"),
					children: "Отдельные услуги"
				})]
			}), tab === "packages" ? packages.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
				title: "Пакеты пока не настроены",
				text: "Обратитесь к администратору каталога."
			}) : /* @__PURE__ */ jsx("div", {
				className: "promo-grid",
				children: packages.map((p) => /* @__PURE__ */ jsx(CheckoutForm, {
					type: "package",
					id: p.id,
					name: p.name,
					price: p.price,
					requiresBanner: p.requires_moderation
				}, p.id))
			}) : products.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Тарифы пока не настроены" }) : /* @__PURE__ */ jsx("div", {
				className: "promo-grid",
				children: products.map((p) => /* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [
						p.available === 0 && p.code !== "boost" ? /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted",
							children: "Свободных мест: 0"
						}) : null,
						/* @__PURE__ */ jsx(CheckoutForm, {
							type: "product",
							id: p.id,
							name: p.name,
							price: p.price,
							requiresBanner: p.requires_moderation
						}),
						p.description ? /* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted",
							children: p.description
						}) : null
					]
				}, p.id))
			})]
		}),
		orders.length > 0 ? /* @__PURE__ */ jsxs("section", {
			className: "stack",
			children: [/* @__PURE__ */ jsx("h2", { children: "Последние заказы" }), /* @__PURE__ */ jsx("div", {
				className: "table-wrap",
				children: /* @__PURE__ */ jsxs("table", {
					className: "table",
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("th", { children: "Дата" }),
						/* @__PURE__ */ jsx("th", { children: "Сумма" }),
						/* @__PURE__ */ jsx("th", { children: "Статус" }),
						/* @__PURE__ */ jsx("th", {})
					] }) }), /* @__PURE__ */ jsx("tbody", { children: orders.map((o) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", { children: o.created_at }),
						/* @__PURE__ */ jsx("td", { children: formatPrice(o.amount) }),
						/* @__PURE__ */ jsxs("td", { children: [o.status, o.moderation_status ? ` / ${o.moderation_status}` : ""] }),
						/* @__PURE__ */ jsx("td", { children: o.status === "pending_payment" && o.payment_url ? /* @__PURE__ */ jsx("a", {
							href: o.payment_url,
							className: "link",
							children: "Оплатить"
						}) : null })
					] }, o.id)) })]
				})
			})]
		}) : null
	] });
}
//#endregion
export { CabinetPromotions as default };

//# sourceMappingURL=Promotions-B6rxH8cI.js.map