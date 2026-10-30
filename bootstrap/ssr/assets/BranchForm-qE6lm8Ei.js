import { n as Button } from "./Button-C2BxTtRt.js";
import { c as Alert } from "../app.js";
import { r as PageHead } from "./Dash-C8plSzIc.js";
import { n as useClinicProfileForm, t as ClinicProfileFields } from "./ClinicProfileFields-CNi7-paX.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/BranchForm.tsx
function BranchForm({ branchForm, ...options }) {
	const b = branchForm ?? {};
	const { form, prepare } = useClinicProfileForm(branchForm, options.propertyTypes);
	const submit = (e) => {
		e.preventDefault();
		prepare();
		if (b.id) form.put(`/clinic-cabinet/branches/${b.id}`);
		else form.post("/clinic-cabinet/branches");
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "stack-lg",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: b.id ? "Редактирование филиала" : "Новый филиал",
				text: "Не публикуйте диагнозы и сканы паспортов пациентов. Лицензию загружайте в «Документы»."
			}),
			b.id ? /* @__PURE__ */ jsxs(Alert, {
				tone: "muted",
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
			/* @__PURE__ */ jsx(ClinicProfileFields, {
				form,
				options
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

//# sourceMappingURL=BranchForm-qE6lm8Ei.js.map