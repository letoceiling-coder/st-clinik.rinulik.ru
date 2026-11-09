import { n as Button } from "./Button-C2BxTtRt.js";
import { p as Alert } from "../app.js";
import { r as PageHead } from "./Dash-C_HMp027.js";
import { n as useClinicProfileForm, t as ClinicProfileFields } from "./ClinicProfileFields-CUdlYRCi.js";
import { t as PendingChanges } from "./PendingChanges-Dr8zQiSs.js";
import { Link, usePage } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/BranchForm.tsx
function BranchForm({ branchForm, pendingRevision, ...options }) {
	const b = branchForm ?? {};
	const { form, prepare } = useClinicProfileForm(branchForm, options.propertyTypes);
	const duplicates = usePage().props.flash.duplicates ?? [];
	const save = (notDuplicate) => {
		prepare();
		if (b.id) form.put(`/clinic-cabinet/branches/${b.id}`);
		else {
			form.transform((data) => ({
				...data,
				not_duplicate: notDuplicate
			}));
			form.post("/clinic-cabinet/branches");
		}
	};
	const submit = (e) => {
		e.preventDefault();
		save(false);
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "stack-lg",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: b.id ? "Редактирование филиала" : "Новый филиал",
				text: "Не публикуйте диагнозы и сканы паспортов пациентов. Лицензию загружайте в «Документы»."
			}),
			/* @__PURE__ */ jsx(PendingChanges, { revision: pendingRevision }),
			!b.id && duplicates.length > 0 ? /* @__PURE__ */ jsxs(Alert, {
				tone: "warning",
				icon: "info",
				children: [
					/* @__PURE__ */ jsx("b", { children: "Похоже, ваша клиника уже есть в каталоге." }),
					" Заберите готовую карточку — отзывы, рейтинг и история сохранятся, а пациенты не увидят дубль.",
					/* @__PURE__ */ jsx("ul", {
						className: "stack",
						style: { marginBlock: "var(--space-3)" },
						children: duplicates.map((d) => /* @__PURE__ */ jsxs("li", { children: [
							/* @__PURE__ */ jsx("b", { children: d.name }),
							d.address ? `, ${d.address}` : "",
							" ",
							/* @__PURE__ */ jsxs("span", {
								className: "text-muted",
								children: ["— ", d.reason]
							}),
							" ",
							/* @__PURE__ */ jsx("a", {
								href: d.claim_url,
								className: "link",
								children: "Это наша клиника"
							})
						] }, d.slug))
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "outline",
						size: "sm",
						loading: form.processing,
						onClick: () => save(true),
						children: "Нет, это другая клиника — создать филиал"
					})
				]
			}) : null,
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

//# sourceMappingURL=BranchForm-BGNlMAdQ.js.map