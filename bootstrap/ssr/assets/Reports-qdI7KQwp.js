import { n as Button } from "./Button-B5alqlNe.js";
import { S as SelectField, w as TextField } from "../app.js";
import { r as PageHead, s as StatusBadge } from "./Dash-1ijSGeUC.js";
import { useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Reports.tsx
function Reports({ types, formats, exports }) {
	const form = useForm({
		report_type: Object.keys(types)[0] ?? "clinics",
		format: "csv",
		from: "",
		to: "",
		status: ""
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Отчёты",
				text: "CSV или XLSX. Файл формируется в фоне — пришлём уведомление на сайте."
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					form.post("/admin/reports");
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Новый отчёт"
					}),
					/* @__PURE__ */ jsx(SelectField, {
						label: "Тип",
						value: form.data.report_type,
						onChange: (e) => form.setData("report_type", e.target.value),
						children: Object.entries(types).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))
					}),
					/* @__PURE__ */ jsx(SelectField, {
						label: "Формат",
						value: form.data.format,
						onChange: (e) => form.setData("format", e.target.value),
						children: Object.entries(formats).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))
					}),
					form.data.report_type === "appointments" ? /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsx(TextField, {
							label: "С даты",
							type: "date",
							value: form.data.from,
							onChange: (e) => form.setData("from", e.target.value)
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "По дату",
							type: "date",
							value: form.data.to,
							onChange: (e) => form.setData("to", e.target.value)
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Статус (необяз.)",
							value: form.data.status,
							onChange: (e) => form.setData("status", e.target.value)
						})
					] }) : null,
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						children: "Сформировать"
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Ваши выгрузки"
					}),
					exports.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "text-muted",
						children: "Пока нет отчётов."
					}) : null,
					exports.map((e) => /* @__PURE__ */ jsxs("div", {
						className: "row row--between row--wrap",
						children: [/* @__PURE__ */ jsxs("span", { children: [
							e.label,
							" · ",
							e.created_at
						] }), /* @__PURE__ */ jsxs("span", {
							className: "row row--wrap",
							children: [
								/* @__PURE__ */ jsx(StatusBadge, {
									status: e.status === "ready" ? "published" : e.status === "failed" ? "rejected" : "pending",
									label: e.status
								}),
								e.download_url ? /* @__PURE__ */ jsx("a", {
									className: "link text-sm",
									href: e.download_url,
									children: "Скачать"
								}) : null,
								e.error ? /* @__PURE__ */ jsx("span", {
									className: "text-xs text-danger",
									children: e.error
								}) : null
							]
						})]
					}, e.id))
				]
			})
		]
	});
}
//#endregion
export { Reports as default };

//# sourceMappingURL=Reports-qdI7KQwp.js.map