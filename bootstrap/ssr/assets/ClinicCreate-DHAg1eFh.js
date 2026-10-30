import { n as Button } from "./Button-C2BxTtRt.js";
import { C as SelectField, c as Alert, y as Check } from "../app.js";
import { n as useClinicProfileForm, t as ClinicProfileFields } from "./ClinicProfileFields-CNi7-paX.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/ClinicCreate.tsx
function ClinicCreate({ organizations, ...options }) {
	const { form, prepare } = useClinicProfileForm(null, options.propertyTypes, {
		organization_id: "",
		publish: false
	});
	const submit = (e) => {
		e.preventDefault();
		prepare();
		form.post("/admin/clinics");
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "stack-lg",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "page-head page-head--dash",
				children: /* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						style: { marginBottom: 8 },
						children: /* @__PURE__ */ jsx(Link, {
							href: "/admin/clinics",
							className: "link",
							children: "← К списку клиник"
						})
					}),
					/* @__PURE__ */ jsx("h1", { children: "Новая клиника" }),
					/* @__PURE__ */ jsx("p", {
						className: "text-muted",
						children: "Добавление вручную. Чтобы взять данные с Яндекс Карт, откройте «Парсер», отметьте найденные клиники и нажмите «Импортировать»."
					})
				] })
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card form-grid",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title span-2",
						children: "Размещение"
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Организация",
						hint: "Если клиника — филиал сети, выберите её организацию. Иначе будет создана новая организация без владельца.",
						value: form.data.organization_id,
						onChange: (e) => form.setData("organization_id", e.target.value),
						error: form.errors.organization_id,
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Новая организация"
						}), organizations.map((o) => /* @__PURE__ */ jsx("option", {
							value: o.id,
							children: o.name
						}, o.id))]
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Сразу опубликовать на сайте",
						checked: form.data.publish,
						onChange: (e) => form.setData("publish", e.target.checked)
					})
				]
			}),
			Object.keys(form.errors).length > 0 ? /* @__PURE__ */ jsxs(Alert, {
				tone: "danger",
				children: ["Не сохранено: ", [...new Set(Object.values(form.errors))].slice(0, 3).join(" ")]
			}) : null,
			/* @__PURE__ */ jsx(ClinicProfileFields, {
				form,
				options,
				phoneRequired: false,
				showCoordinates: true
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				size: "lg",
				loading: form.processing,
				children: "Добавить клинику"
			})
		]
	});
}
//#endregion
export { ClinicCreate as default };

//# sourceMappingURL=ClinicCreate-DHAg1eFh.js.map