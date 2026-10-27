import { n as Button } from "./Button-B5alqlNe.js";
import { C as TextArea, l as Badge, v as Check, w as TextField } from "../app.js";
import { r as PageHead } from "./Dash-1ijSGeUC.js";
import { router, useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Tariffs.tsx
function Tariffs({ tariffs, feature_labels }) {
	const create = useForm({
		name: "",
		price: 0,
		duration_days: 30,
		is_active: true,
		is_default: false,
		sort: 100,
		features: []
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(PageHead, { title: "Тарифы" }), /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "page-title",
				children: "Тарифы клиник"
			}),
			/* @__PURE__ */ jsx("div", {
				className: "stack",
				children: tariffs.map((t) => /* @__PURE__ */ jsx(TariffEditor, {
					tariff: t,
					feature_labels
				}, t.id))
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					create.post("/admin/tariffs");
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Новый тариф"
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Название",
						value: create.data.name,
						onChange: (e) => create.setData("name", e.target.value),
						required: true
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Цена (коп.)",
						type: "number",
						value: String(create.data.price),
						onChange: (e) => create.setData("price", Number(e.target.value))
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Срок (дней)",
						type: "number",
						value: String(create.data.duration_days),
						onChange: (e) => create.setData("duration_days", Number(e.target.value))
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Активен",
						checked: create.data.is_active,
						onChange: (e) => create.setData("is_active", e.target.checked)
					}),
					/* @__PURE__ */ jsx("div", {
						className: "row row--wrap",
						children: Object.entries(feature_labels).map(([key, label]) => /* @__PURE__ */ jsx(Check, {
							label,
							checked: create.data.features.includes(key),
							onChange: () => {
								const next = create.data.features.includes(key) ? create.data.features.filter((f) => f !== key) : [...create.data.features, key];
								create.setData("features", next);
							}
						}, key))
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: create.processing,
						children: "Создать"
					})
				]
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "button",
				variant: "outline",
				onClick: () => router.get("/admin/finance"),
				children: "Финансы и настройки"
			})
		]
	})] });
}
function TariffEditor({ tariff, feature_labels }) {
	const form = useForm({
		name: tariff.name,
		description: tariff.description ?? "",
		price: tariff.price,
		duration_days: tariff.duration_days,
		max_branches: tariff.max_branches ?? "",
		max_doctors: tariff.max_doctors ?? "",
		max_photos: tariff.max_photos ?? "",
		sort: tariff.sort,
		is_active: tariff.is_active,
		is_default: tariff.is_default,
		features: tariff.features
	});
	const submit = (e) => {
		e.preventDefault();
		form.transform((d) => ({
			...d,
			max_branches: d.max_branches === "" ? null : Number(d.max_branches),
			max_doctors: d.max_doctors === "" ? null : Number(d.max_doctors),
			max_photos: d.max_photos === "" ? null : Number(d.max_photos)
		}));
		form.put(`/admin/tariffs/${tariff.id}`);
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "card stack",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "row row--between row--wrap",
				children: [/* @__PURE__ */ jsx("strong", { children: tariff.name }), /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					children: [tariff.is_default ? /* @__PURE__ */ jsx(Badge, {
						tone: "info",
						children: "По умолчанию"
					}) : null, tariff.is_active ? /* @__PURE__ */ jsx(Badge, {
						tone: "success",
						children: "Активен"
					}) : /* @__PURE__ */ jsx(Badge, {
						tone: "warning",
						children: "Выключен"
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: ["Клиник на тарифе: ", tariff.clinics_count]
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Название",
				value: form.data.name,
				onChange: (e) => form.setData("name", e.target.value),
				required: true
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "Описание",
				value: form.data.description,
				maxLength: 5e3,
				onChange: (e) => form.setData("description", e.target.value)
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "form-grid",
				children: [
					/* @__PURE__ */ jsx(TextField, {
						label: "Цена (коп.)",
						type: "number",
						value: String(form.data.price),
						onChange: (e) => form.setData("price", Number(e.target.value))
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Срок (дней)",
						type: "number",
						value: String(form.data.duration_days),
						onChange: (e) => form.setData("duration_days", Number(e.target.value))
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Филиалы (лимит)",
						type: "number",
						value: String(form.data.max_branches),
						onChange: (e) => form.setData("max_branches", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Врачи (лимит)",
						type: "number",
						value: String(form.data.max_doctors),
						onChange: (e) => form.setData("max_doctors", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Фото (лимит)",
						type: "number",
						value: String(form.data.max_photos),
						onChange: (e) => form.setData("max_photos", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Сортировка",
						type: "number",
						value: String(form.data.sort),
						onChange: (e) => form.setData("sort", Number(e.target.value))
					})
				]
			}),
			/* @__PURE__ */ jsx(Check, {
				label: "Активен",
				checked: form.data.is_active,
				onChange: (e) => form.setData("is_active", e.target.checked)
			}),
			/* @__PURE__ */ jsx(Check, {
				label: "Тариф по умолчанию",
				checked: form.data.is_default,
				onChange: (e) => form.setData("is_default", e.target.checked)
			}),
			/* @__PURE__ */ jsx("div", {
				className: "row row--wrap",
				children: Object.entries(feature_labels).map(([key, label]) => /* @__PURE__ */ jsx(Check, {
					label,
					checked: form.data.features.includes(key),
					onChange: () => {
						const next = form.data.features.includes(key) ? form.data.features.filter((f) => f !== key) : [...form.data.features, key];
						form.setData("features", next);
					}
				}, key))
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				loading: form.processing,
				children: "Сохранить"
			})
		]
	});
}
//#endregion
export { Tariffs as default };

//# sourceMappingURL=Tariffs-CIsIdMpZ.js.map