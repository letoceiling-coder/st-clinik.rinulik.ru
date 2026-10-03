import { o as money } from "./format-Cjg0FGVI.js";
import { n as Button } from "./Button-D4s3iLUi.js";
import { S as TextField, b as SelectField, l as EmptyState, v as Check } from "../app.js";
import { o as Table, r as PageHead } from "./Dash-CaoYUPpG.js";
import { router, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Prices.tsx
function Prices({ prices, services }) {
	const form = useForm({
		service_id: "",
		price_from: "",
		price_to: "",
		is_promo: false,
		note: ""
	});
	const add = (e) => {
		e.preventDefault();
		form.post("/clinic-cabinet/prices", { onSuccess: () => form.reset() });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Услуги и прайс",
				text: "Публикуем цену «от». Пациенту объясняем, что итог — после осмотра."
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card form-grid",
				onSubmit: add,
				children: [
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Услуга",
						required: true,
						value: form.data.service_id,
						onChange: (e) => form.setData("service_id", e.target.value),
						error: form.errors.service_id,
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Выберите"
						}), services.map((s) => /* @__PURE__ */ jsxs("option", {
							value: s.id,
							children: [s.specialty ? `${s.specialty} · ` : "", s.name]
						}, s.id))]
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Цена от, ₽",
						type: "number",
						required: true,
						value: form.data.price_from,
						onChange: (e) => form.setData("price_from", e.target.value),
						error: form.errors.price_from
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "До, ₽",
						type: "number",
						value: form.data.price_to,
						onChange: (e) => form.setData("price_to", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Пометка",
						value: form.data.note,
						onChange: (e) => form.setData("note", e.target.value)
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Акция",
						checked: form.data.is_promo,
						onChange: (e) => form.setData("is_promo", e.target.checked)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						children: "Добавить"
					})
				]
			}),
			prices.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Прайс пуст" }) : /* @__PURE__ */ jsx(Table, {
				headers: [
					"Услуга",
					"От",
					"До",
					""
				],
				children: prices.map((p) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [
						p.specialty ? /* @__PURE__ */ jsxs("span", {
							className: "text-xs text-muted",
							children: [p.specialty, /* @__PURE__ */ jsx("br", {})]
						}) : null,
						p.name,
						p.is_promo ? " · акция" : "",
						p.note ? /* @__PURE__ */ jsx("div", {
							className: "text-xs text-muted",
							children: p.note
						}) : null
					] }),
					/* @__PURE__ */ jsx("td", { children: money(p.price_from) }),
					/* @__PURE__ */ jsx("td", { children: p.price_to ? money(p.price_to) : "—" }),
					/* @__PURE__ */ jsx("td", {
						className: "actions",
						children: /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => router.delete(`/clinic-cabinet/prices/${p.id}`),
							children: "Удалить"
						})
					})
				] }, p.id))
			})
		]
	});
}
//#endregion
export { Prices as default };

//# sourceMappingURL=Prices-CufGopAr.js.map