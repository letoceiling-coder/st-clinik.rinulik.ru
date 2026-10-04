import { i as LinkButton, n as Button } from "./Button-D8Mzgn6o.js";
import { b as TextArea, g as Check, x as TextField, y as SelectField } from "../app.js";
import { a as STATUS, o as StatusBadge } from "./Dash-BbiOlhfn.js";
import { Link, router, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/ClinicShow.tsx
function ClinicShow({ clinic, statuses }) {
	const form = useForm({
		status: clinic.status,
		is_verified: clinic.is_verified,
		moderation_note: clinic.moderation_note ?? "",
		seo_title: clinic.seo_title ?? "",
		seo_description: clinic.seo_description ?? ""
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "page-head page-head--dash",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						style: { marginBottom: 8 },
						children: /* @__PURE__ */ jsx(Link, {
							href: "/admin/clinics",
							className: "link",
							children: "← К списку клиник"
						})
					}),
					/* @__PURE__ */ jsx("h1", { children: clinic.name }),
					/* @__PURE__ */ jsxs("p", {
						className: "text-muted",
						children: [
							clinic.city,
							" · ",
							clinic.address,
							clinic.organization ? ` · ${clinic.organization}` : ""
						]
					})
				] }), /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					style: { gap: 8 },
					children: [/* @__PURE__ */ jsx(StatusBadge, { status: clinic.status }), /* @__PURE__ */ jsx(LinkButton, {
						href: `/clinics/${clinic.slug}`,
						variant: "outline",
						size: "sm",
						target: "_blank",
						children: "Страница на сайте"
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("dl", {
				className: "kpi-grid",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Рейтинг" }), /* @__PURE__ */ jsx("dd", { children: clinic.rating > 0 ? clinic.rating.toFixed(1) : "—" })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Отзывы" }), /* @__PURE__ */ jsx("dd", { children: clinic.reviews_count })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "kpi card",
						children: [/* @__PURE__ */ jsx("dt", { children: "Заполненность" }), /* @__PURE__ */ jsxs("dd", { children: [clinic.completeness, "%"] })]
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					form.put(`/admin/clinics/${clinic.id}`);
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						style: { margin: 0 },
						children: "Настройки и модерация"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "form-grid",
						children: [
							/* @__PURE__ */ jsx(SelectField, {
								label: "Статус",
								value: form.data.status,
								onChange: (e) => form.setData("status", e.target.value),
								children: statuses.map((s) => /* @__PURE__ */ jsx("option", {
									value: s,
									children: STATUS[s]?.label ?? s
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
								label: "SEO description",
								value: form.data.seo_description,
								onChange: (e) => form.setData("seo_description", e.target.value)
							}),
							/* @__PURE__ */ jsx(TextArea, {
								className: "span-2",
								label: "Заметка модерации",
								value: form.data.moderation_note,
								onChange: (e) => form.setData("moderation_note", e.target.value)
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "row row--wrap",
						style: { gap: 8 },
						children: [/* @__PURE__ */ jsx(Button, {
							type: "submit",
							loading: form.processing,
							children: "Сохранить"
						}), /* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "danger",
							onClick: () => confirm("Удалить клинику без возможности восстановления?") && router.delete(`/admin/clinics/${clinic.id}`),
							children: "Удалить"
						})]
					})
				]
			})
		]
	});
}
//#endregion
export { ClinicShow as default };

//# sourceMappingURL=ClinicShow-bMTbryBp.js.map