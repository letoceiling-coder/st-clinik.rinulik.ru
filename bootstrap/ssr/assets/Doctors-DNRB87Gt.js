import { n as Button } from "./Button-DsM_qe4F.js";
import { b as TextArea, g as Check, v as SearchInput, y as SelectField } from "../app.js";
import { i as PagerSafe, o as StatusBadge, r as PageHead, t as FilterBar } from "./Dash-BUI7tnGJ.js";
import { Link, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Doctors.tsx
function Doctors({ doctors, statuses, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, { title: "Врачи" }),
			/* @__PURE__ */ jsxs(FilterBar, { children: [/* @__PURE__ */ jsx(SearchInput, {
				name: "q",
				defaultValue: filters.q,
				placeholder: "ФИО"
			}), /* @__PURE__ */ jsxs(SelectField, {
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
			})] }),
			doctors.data.map((d) => /* @__PURE__ */ jsx(Row, {
				doctor: d,
				statuses
			}, d.id)),
			/* @__PURE__ */ jsx(PagerSafe, { page: doctors })
		]
	});
}
function Row({ doctor, statuses }) {
	const form = useForm({
		status: doctor.status,
		is_verified: doctor.is_verified,
		moderation_note: doctor.moderation_note ?? ""
	});
	return /* @__PURE__ */ jsxs("article", {
		className: "card stack",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "row row--between",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Link, {
				href: `/doctors/${doctor.slug}`,
				className: "link",
				children: doctor.name
			}), /* @__PURE__ */ jsxs("div", {
				className: "text-xs text-muted",
				children: [
					doctor.position,
					" · ",
					doctor.clinic
				]
			})] }), /* @__PURE__ */ jsx(StatusBadge, { status: doctor.status })]
		}), /* @__PURE__ */ jsxs("form", {
			className: "form-grid",
			onSubmit: (e) => {
				e.preventDefault();
				form.put(`/admin/doctors/${doctor.id}`);
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
					label: "Проверен",
					checked: form.data.is_verified,
					onChange: (e) => form.setData("is_verified", e.target.checked)
				}),
				/* @__PURE__ */ jsx(TextArea, {
					className: "span-2",
					label: "Заметка",
					value: form.data.moderation_note,
					onChange: (e) => form.setData("moderation_note", e.target.value)
				}),
				/* @__PURE__ */ jsx(Button, {
					type: "submit",
					size: "sm",
					loading: form.processing,
					children: "Сохранить"
				})
			]
		})]
	});
}
//#endregion
export { Doctors as default };

//# sourceMappingURL=Doctors-DNRB87Gt.js.map