import { n as Button } from "./Button-DsM_qe4F.js";
import { C as TextField, S as TextArea, b as SearchInput, x as SelectField, y as Check } from "../app.js";
import { a as StatusBadge, i as PagerSafe, r as PageHead, t as FilterBar } from "./Dash-C-3tSNHh.js";
import { Link, router, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Clinics.tsx
function Clinics({ clinics, cities, statuses, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, { title: "Клиники" }),
			/* @__PURE__ */ jsxs(FilterBar, { children: [
				/* @__PURE__ */ jsx(SearchInput, {
					name: "q",
					defaultValue: filters.q,
					placeholder: "Название или адрес"
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "status",
					label: "Статус",
					defaultValue: filters.status ?? "",
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: "Все"
					}), statuses.map((s) => /* @__PURE__ */ jsx("option", {
						value: s,
						children: s
					}, s))]
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "city",
					label: "Город",
					defaultValue: filters.city ?? "",
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: "Все города"
					}), cities.map((c) => /* @__PURE__ */ jsx("option", {
						value: c.id,
						children: c.name
					}, c.id))]
				})
			] }),
			clinics.data.map((c) => /* @__PURE__ */ jsx(ClinicRow, {
				clinic: c,
				statuses
			}, c.id)),
			/* @__PURE__ */ jsx(PagerSafe, { page: clinics })
		]
	});
}
function ClinicRow({ clinic, statuses }) {
	const form = useForm({
		status: clinic.status,
		is_verified: clinic.is_verified,
		moderation_note: clinic.moderation_note ?? "",
		seo_title: clinic.seo_title ?? "",
		seo_description: clinic.seo_description ?? ""
	});
	return /* @__PURE__ */ jsxs("article", {
		className: "card stack",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "row row--between",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Link, {
				href: `/clinics/${clinic.slug}`,
				className: "link",
				children: clinic.name
			}), /* @__PURE__ */ jsxs("div", {
				className: "text-xs text-muted",
				children: [
					clinic.city,
					" · ",
					clinic.address,
					" · профиль ",
					clinic.completeness,
					"%"
				]
			})] }), /* @__PURE__ */ jsx(StatusBadge, { status: clinic.status })]
		}), /* @__PURE__ */ jsxs("form", {
			className: "form-grid",
			onSubmit: (e) => {
				e.preventDefault();
				form.put(`/admin/clinics/${clinic.id}`);
			},
			children: [
				/* @__PURE__ */ jsx(SelectField, {
					label: "Статус",
					value: form.data.status,
					onChange: (e) => form.setData("status", e.target.value),
					children: statuses.map((s) => /* @__PURE__ */ jsx("option", {
						value: s,
						children: s
					}, s))
				}),
				/* @__PURE__ */ jsx(Check, {
					label: "Проверена",
					checked: form.data.is_verified,
					onChange: (e) => form.setData("is_verified", e.target.checked)
				}),
				/* @__PURE__ */ jsx(TextField, {
					className: "span-2",
					label: "SEO title",
					value: form.data.seo_title,
					onChange: (e) => form.setData("seo_title", e.target.value)
				}),
				/* @__PURE__ */ jsx(TextArea, {
					className: "span-2",
					label: "SEO description / заметка",
					value: form.data.seo_description,
					onChange: (e) => form.setData("seo_description", e.target.value)
				}),
				/* @__PURE__ */ jsx(TextArea, {
					className: "span-2",
					label: "Заметка модерации",
					value: form.data.moderation_note,
					onChange: (e) => form.setData("moderation_note", e.target.value)
				}),
				/* @__PURE__ */ jsx(Button, {
					type: "submit",
					size: "sm",
					loading: form.processing,
					children: "Сохранить"
				}),
				/* @__PURE__ */ jsx(Button, {
					type: "button",
					size: "sm",
					variant: "danger",
					onClick: () => confirm("Удалить клинику?") && router.delete(`/admin/clinics/${clinic.id}`),
					children: "Удалить"
				})
			]
		})]
	});
}
//#endregion
export { Clinics as default };

//# sourceMappingURL=Clinics-BMiNMrc2.js.map