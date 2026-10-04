import { n as Button } from "./Button-D8Mzgn6o.js";
import { a as Alert, b as TextArea, g as Check, x as TextField, y as SelectField } from "../app.js";
import { r as PageHead } from "./Dash-BbiOlhfn.js";
import { Link, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/BranchForm.tsx
function BranchForm({ branchForm, cities, districts, specialties, payments }) {
	const b = branchForm ?? {};
	const form = useForm({
		name: b.name ?? "",
		tagline: b.tagline ?? "",
		description: b.description ?? "",
		city_id: b.city_id ?? "",
		district_id: b.district_id ?? "",
		address: b.address ?? "",
		metro: b.metro ?? "",
		phone: b.phone ?? "",
		email: b.email ?? "",
		website: b.website ?? "",
		founded_year: b.founded_year ?? "",
		license_number: b.license_number ?? "",
		license_issuer: b.license_issuer ?? "",
		license_date: b.license_date ?? "",
		restrictions: b.restrictions ?? "",
		payment_methods: b.payment_methods ?? [],
		achievements: (b.achievements ?? [""]).join("\n"),
		specialty_ids: (b.specialty_ids ?? []).map(String),
		accepts_children: Boolean(b.accepts_children),
		children_age_from: b.children_age_from ?? "",
		has_installment: Boolean(b.has_installment),
		installment_months: b.installment_months ?? "",
		accepts_dms: Boolean(b.accepts_dms),
		has_sedation: Boolean(b.has_sedation),
		has_anesthesia: Boolean(b.has_anesthesia),
		has_microscope: Boolean(b.has_microscope),
		has_ct: Boolean(b.has_ct)
	});
	const submit = (e) => {
		e.preventDefault();
		const payload = {
			...form.data,
			achievements: String(form.data.achievements).split("\n").map((s) => s.trim()).filter(Boolean),
			specialty_ids: form.data.specialty_ids.map(Number)
		};
		form.transform(() => payload);
		if (b.id) form.put(`/clinic-cabinet/branches/${b.id}`);
		else form.post("/clinic-cabinet/branches");
	};
	const cityDistricts = districts.filter((d) => String(d.city_id) === String(form.data.city_id));
	const togglePay = (p) => form.setData("payment_methods", form.data.payment_methods.includes(p) ? form.data.payment_methods.filter((x) => x !== p) : [...form.data.payment_methods, p]);
	const toggleSpec = (id) => form.setData("specialty_ids", form.data.specialty_ids.includes(id) ? form.data.specialty_ids.filter((x) => x !== id) : [...form.data.specialty_ids, id]);
	return /* @__PURE__ */ jsxs("form", {
		className: "stack-lg",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: b.id ? "Редактирование филиала" : "Новый филиал",
				text: "Не публикуйте диагнозы и сканы паспортов пациентов. Лицензию загружайте в «Документы»."
			}),
			b.id ? /* @__PURE__ */ jsxs(Alert, {
				tone: "info",
				icon: "image",
				children: [
					"Фотографии филиала (фасад, интерьер, кабинеты) загружаются в разделе",
					" ",
					/* @__PURE__ */ jsx(Link, {
						href: "/clinic-cabinet/photos",
						className: "link",
						children: "«Фото»"
					}),
					" ",
					"в меню слева. После модерации они появятся на карточке клиники и на странице филиала."
				]
			}) : null,
			/* @__PURE__ */ jsxs("section", {
				className: "card form-grid",
				children: [
					/* @__PURE__ */ jsx(TextField, {
						className: "span-2",
						label: "Название",
						required: true,
						value: form.data.name,
						onChange: (e) => form.setData("name", e.target.value),
						error: form.errors.name
					}),
					/* @__PURE__ */ jsx(TextField, {
						className: "span-2",
						label: "Короткий слоган",
						value: form.data.tagline,
						onChange: (e) => form.setData("tagline", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextArea, {
						className: "span-2",
						label: "Описание",
						value: form.data.description,
						onChange: (e) => form.setData("description", e.target.value)
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Город",
						required: true,
						value: form.data.city_id,
						onChange: (e) => form.setData("city_id", e.target.value),
						error: form.errors.city_id,
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Выберите"
						}), cities.map((c) => /* @__PURE__ */ jsx("option", {
							value: c.id,
							children: c.name
						}, c.id))]
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Район",
						value: form.data.district_id,
						onChange: (e) => form.setData("district_id", e.target.value),
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Не указан"
						}), cityDistricts.map((d) => /* @__PURE__ */ jsx("option", {
							value: d.id,
							children: d.name
						}, d.id))]
					}),
					/* @__PURE__ */ jsx(TextField, {
						className: "span-2",
						label: "Адрес",
						required: true,
						value: form.data.address,
						onChange: (e) => form.setData("address", e.target.value),
						error: form.errors.address
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Метро",
						value: form.data.metro,
						onChange: (e) => form.setData("metro", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Телефон",
						required: true,
						value: form.data.phone,
						onChange: (e) => form.setData("phone", e.target.value),
						error: form.errors.phone
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "E-mail",
						type: "email",
						value: form.data.email,
						onChange: (e) => form.setData("email", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Сайт",
						value: form.data.website,
						onChange: (e) => form.setData("website", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Год основания",
						type: "number",
						value: form.data.founded_year,
						onChange: (e) => form.setData("founded_year", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Номер лицензии",
						value: form.data.license_number,
						onChange: (e) => form.setData("license_number", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Кем выдана",
						value: form.data.license_issuer,
						onChange: (e) => form.setData("license_issuer", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Дата лицензии",
						type: "date",
						value: form.data.license_date,
						onChange: (e) => form.setData("license_date", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextArea, {
						className: "span-2",
						label: "Ограничения приёма",
						hint: "Например: не принимаем детей младше 3 лет, нет наркоза.",
						value: form.data.restrictions,
						onChange: (e) => form.setData("restrictions", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextArea, {
						className: "span-2",
						label: "Достижения (каждое с новой строки)",
						value: form.data.achievements,
						onChange: (e) => form.setData("achievements", e.target.value)
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Направления"
				}), /* @__PURE__ */ jsx("div", {
					className: "check-grid",
					children: specialties.map((s) => /* @__PURE__ */ jsx(Check, {
						label: s.name,
						checked: form.data.specialty_ids.includes(String(s.id)),
						onChange: () => toggleSpec(String(s.id))
					}, s.id))
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Условия"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "check-grid",
						children: [
							/* @__PURE__ */ jsx(Check, {
								label: "Детский приём",
								checked: form.data.accepts_children,
								onChange: (e) => form.setData("accepts_children", e.target.checked)
							}),
							/* @__PURE__ */ jsx(Check, {
								label: "Рассрочка",
								checked: form.data.has_installment,
								onChange: (e) => form.setData("has_installment", e.target.checked)
							}),
							/* @__PURE__ */ jsx(Check, {
								label: "ДМС",
								checked: form.data.accepts_dms,
								onChange: (e) => form.setData("accepts_dms", e.target.checked)
							}),
							/* @__PURE__ */ jsx(Check, {
								label: "Седация",
								checked: form.data.has_sedation,
								onChange: (e) => form.setData("has_sedation", e.target.checked)
							}),
							/* @__PURE__ */ jsx(Check, {
								label: "Наркоз",
								checked: form.data.has_anesthesia,
								onChange: (e) => form.setData("has_anesthesia", e.target.checked)
							}),
							/* @__PURE__ */ jsx(Check, {
								label: "Микроскоп",
								checked: form.data.has_microscope,
								onChange: (e) => form.setData("has_microscope", e.target.checked)
							}),
							/* @__PURE__ */ jsx(Check, {
								label: "КТ",
								checked: form.data.has_ct,
								onChange: (e) => form.setData("has_ct", e.target.checked)
							})
						]
					}),
					form.data.accepts_children ? /* @__PURE__ */ jsx(TextField, {
						label: "Дети с какого возраста",
						type: "number",
						value: form.data.children_age_from,
						onChange: (e) => form.setData("children_age_from", e.target.value)
					}) : null,
					form.data.has_installment ? /* @__PURE__ */ jsx(TextField, {
						label: "Рассрочка, мес.",
						type: "number",
						value: form.data.installment_months,
						onChange: (e) => form.setData("installment_months", e.target.value)
					}) : null,
					/* @__PURE__ */ jsx("div", {
						className: "check-grid",
						children: payments.map((p) => /* @__PURE__ */ jsx(Check, {
							label: p,
							checked: form.data.payment_methods.includes(p),
							onChange: () => togglePay(p)
						}, p))
					})
				]
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				size: "lg",
				loading: form.processing,
				children: "Сохранить"
			})
		]
	});
}
//#endregion
export { BranchForm as default };

//# sourceMappingURL=BranchForm-DizerrCB.js.map