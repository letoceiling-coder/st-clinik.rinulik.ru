import { n as Button } from "./Button-C2BxTtRt.js";
import { w as TextField } from "../app.js";
import { r as PageHead } from "./Dash-cIdZIfDR.js";
import { useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Organization.tsx
function Organization({ organization }) {
	const form = useForm({ ...organization });
	const submit = (e) => {
		e.preventDefault();
		form.put("/clinic-cabinet/organization");
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(PageHead, { title: "Организация" }), /* @__PURE__ */ jsxs("form", {
		className: "card stack",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(TextField, {
				label: "Отображаемое название",
				required: true,
				value: form.data.name ?? "",
				onChange: (e) => form.setData("name", e.target.value),
				error: form.errors.name
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Юридическое название",
				value: form.data.legal_name ?? "",
				onChange: (e) => form.setData("legal_name", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "ИНН",
				value: form.data.inn ?? "",
				onChange: (e) => form.setData("inn", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "ОГРН",
				value: form.data.ogrn ?? "",
				onChange: (e) => form.setData("ogrn", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "КПП",
				value: form.data.kpp ?? "",
				onChange: (e) => form.setData("kpp", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Юридический адрес",
				value: form.data.legal_address ?? "",
				onChange: (e) => form.setData("legal_address", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Лицензия №",
				value: form.data.license_number ?? "",
				onChange: (e) => form.setData("license_number", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Кем выдана",
				value: form.data.license_issuer ?? "",
				onChange: (e) => form.setData("license_issuer", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Дата лицензии",
				type: "date",
				value: form.data.license_date ?? "",
				onChange: (e) => form.setData("license_date", e.target.value)
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				loading: form.processing,
				children: "Сохранить"
			})
		]
	})] });
}
//#endregion
export { Organization as default };

//# sourceMappingURL=Organization-qrU7o_6i.js.map