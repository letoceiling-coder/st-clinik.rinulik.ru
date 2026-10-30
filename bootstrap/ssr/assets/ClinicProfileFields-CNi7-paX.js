import { C as SelectField, T as TextField, w as TextArea, x as PhoneField, y as Check } from "../app.js";
import { useForm } from "@inertiajs/react";
import { useMemo } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/ClinicProfileFields.tsx
/** Состояние формы профиля клиники; extra — дополнительные поля конкретной страницы (например, организация в админке). */
function useClinicProfileForm(profile, propertyTypes, extra = {}) {
	const b = profile ?? {};
	const propertyDefaults = Object.fromEntries(propertyTypes.map((p) => [p.column, Boolean(b[p.column])]));
	const form = useForm({
		name: b.name ?? "",
		tagline: b.tagline ?? "",
		description: b.description ?? "",
		city_id: b.city_id ?? "",
		district_id: b.district_id ?? "",
		address: b.address ?? "",
		metro: b.metro ?? "",
		directions_note: b.directions_note ?? "",
		parking: b.parking ?? "",
		warranty: b.warranty ?? "",
		lat: b.lat ?? "",
		lng: b.lng ?? "",
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
		installment_months: b.installment_months ?? "",
		...propertyDefaults,
		...extra
	});
	/** Готовит данные к отправке: достижения — списком, направления — числами, пустые координаты — null. */
	const prepare = () => {
		form.transform((data) => ({
			...data,
			lat: data.lat === "" ? null : data.lat,
			lng: data.lng === "" ? null : data.lng,
			achievements: String(data.achievements).split("\n").map((s) => s.trim()).filter(Boolean),
			specialty_ids: data.specialty_ids.map(Number)
		}));
	};
	return {
		form,
		prepare
	};
}
/** Поля профиля клиники: общие для кабинета владельца и админ-панели. */
function ClinicProfileFields({ form, options, phoneRequired = true, showCoordinates = false }) {
	const { cities, districts, specialties, payments, propertyTypes } = options;
	const propertyGroups = useMemo(() => {
		const groups = /* @__PURE__ */ new Map();
		propertyTypes.forEach((p) => {
			const list = groups.get(p.group) ?? [];
			list.push(p);
			groups.set(p.group, list);
		});
		return [...groups.entries()];
	}, [propertyTypes]);
	const cityDistricts = districts.filter((d) => String(d.city_id) === String(form.data.city_id));
	const togglePay = (p) => form.setData("payment_methods", form.data.payment_methods.includes(p) ? form.data.payment_methods.filter((x) => x !== p) : [...form.data.payment_methods, p]);
	const toggleSpec = (id) => form.setData("specialty_ids", form.data.specialty_ids.includes(id) ? form.data.specialty_ids.filter((x) => x !== id) : [...form.data.specialty_ids, id]);
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsxs("section", {
			className: "card form-grid",
			children: [
				/* @__PURE__ */ jsx("h2", {
					className: "card-title span-2",
					children: "Основное"
				}),
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
					onChange: (e) => form.setData("tagline", e.target.value),
					error: form.errors.tagline
				}),
				/* @__PURE__ */ jsx(TextArea, {
					className: "span-2",
					label: "Описание",
					value: form.data.description,
					maxLength: 3e3,
					onChange: (e) => form.setData("description", e.target.value),
					error: form.errors.description
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
					label: "Парковка",
					placeholder: "Например: бесплатная у входа",
					maxLength: 160,
					value: form.data.parking,
					onChange: (e) => form.setData("parking", e.target.value),
					error: form.errors.parking
				}),
				/* @__PURE__ */ jsx(TextArea, {
					className: "span-2",
					label: "Как найти вход",
					hint: "Этаж, вывеска, вход со двора, домофон — это увидят пациенты в блоке «Как добраться».",
					maxLength: 500,
					value: form.data.directions_note,
					onChange: (e) => form.setData("directions_note", e.target.value),
					error: form.errors.directions_note
				}),
				/* @__PURE__ */ jsx(PhoneField, {
					label: "Телефон",
					required: phoneRequired,
					value: form.data.phone,
					onChange: (e) => form.setData("phone", e.target.value),
					error: form.errors.phone
				}),
				/* @__PURE__ */ jsx(TextField, {
					label: "E-mail",
					type: "email",
					value: form.data.email,
					onChange: (e) => form.setData("email", e.target.value),
					error: form.errors.email
				}),
				/* @__PURE__ */ jsx(TextField, {
					label: "Сайт",
					value: form.data.website,
					placeholder: "https://",
					onChange: (e) => form.setData("website", e.target.value),
					error: form.errors.website
				}),
				showCoordinates ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(TextField, {
					label: "Широта",
					inputMode: "decimal",
					value: form.data.lat ?? "",
					onChange: (e) => form.setData("lat", e.target.value),
					error: form.errors.lat
				}), /* @__PURE__ */ jsx(TextField, {
					label: "Долгота",
					inputMode: "decimal",
					value: form.data.lng ?? "",
					onChange: (e) => form.setData("lng", e.target.value),
					error: form.errors.lng
				})] }) : null
			]
		}),
		/* @__PURE__ */ jsxs("section", {
			className: "card form-grid",
			children: [
				/* @__PURE__ */ jsx("h2", {
					className: "card-title span-2",
					children: "Лицензия и документы"
				}),
				/* @__PURE__ */ jsx(TextField, {
					label: "Год основания",
					type: "number",
					value: form.data.founded_year,
					onChange: (e) => form.setData("founded_year", e.target.value),
					error: form.errors.founded_year
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
					onChange: (e) => form.setData("license_date", e.target.value),
					error: form.errors.license_date
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
					label: "Гарантии",
					hint: "Например: пломбы — 1 год, коронки — 3 года, импланты — пожизненно от производителя. Условия гарантии.",
					maxLength: 1500,
					value: form.data.warranty,
					onChange: (e) => form.setData("warranty", e.target.value),
					error: form.errors.warranty
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
					children: "Условия и свойства"
				}),
				/* @__PURE__ */ jsx("div", {
					className: "check-grid",
					children: /* @__PURE__ */ jsx(Check, {
						label: "Детский приём",
						checked: form.data.accepts_children,
						onChange: (e) => form.setData("accepts_children", e.target.checked)
					})
				}),
				form.data.accepts_children ? /* @__PURE__ */ jsx(TextField, {
					label: "Дети с какого возраста",
					type: "number",
					value: form.data.children_age_from,
					onChange: (e) => form.setData("children_age_from", e.target.value)
				}) : null,
				propertyGroups.map(([group, items]) => /* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "text-sm text-muted",
						children: group
					}), /* @__PURE__ */ jsx("div", {
						className: "check-grid",
						children: items.map((p) => /* @__PURE__ */ jsx(Check, {
							label: p.name,
							checked: Boolean(form.data[p.column]),
							onChange: (e) => form.setData(p.column, e.target.checked)
						}, p.slug))
					})]
				}, group)),
				form.data.has_installment ? /* @__PURE__ */ jsx(TextField, {
					label: "Рассрочка, мес.",
					type: "number",
					value: form.data.installment_months,
					onChange: (e) => form.setData("installment_months", e.target.value)
				}) : null,
				/* @__PURE__ */ jsx("h3", {
					className: "text-sm text-muted",
					children: "Оплата"
				}),
				/* @__PURE__ */ jsx("div", {
					className: "check-grid",
					children: payments.map((p) => /* @__PURE__ */ jsx(Check, {
						label: p,
						checked: form.data.payment_methods.includes(p),
						onChange: () => togglePay(p)
					}, p))
				})
			]
		})
	] });
}
//#endregion
export { useClinicProfileForm as n, ClinicProfileFields as t };

//# sourceMappingURL=ClinicProfileFields-CNi7-paX.js.map