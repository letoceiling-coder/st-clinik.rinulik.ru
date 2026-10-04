import { n as Button } from "./Button-DsM_qe4F.js";
import { a as Alert, l as EmptyState, x as TextField, y as SelectField } from "../app.js";
import { o as StatusBadge, r as PageHead, s as Table } from "./Dash-BUI7tnGJ.js";
import { router, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Documents.tsx
function Documents({ documents, types }) {
	const form = useForm({
		type: "license",
		title: "",
		number: "",
		issued_at: "",
		expires_at: "",
		file: null
	});
	const submit = (e) => {
		e.preventDefault();
		form.post("/clinic-cabinet/documents", {
			forceFormData: true,
			onSuccess: () => form.reset()
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, { title: "Документы" }),
			/* @__PURE__ */ jsx(Alert, {
				tone: "muted",
				children: "В каталоге публикуются только номер и статус проверки. Файлы видит модератор, не посетители."
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card form-grid",
				onSubmit: submit,
				children: [
					/* @__PURE__ */ jsx(SelectField, {
						label: "Тип",
						value: form.data.type,
						onChange: (e) => form.setData("type", e.target.value),
						children: Object.entries(types).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Название",
						required: true,
						value: form.data.title,
						onChange: (e) => form.setData("title", e.target.value),
						error: form.errors.title
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Номер",
						value: form.data.number,
						onChange: (e) => form.setData("number", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Выдан",
						type: "date",
						value: form.data.issued_at,
						onChange: (e) => form.setData("issued_at", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Действует до",
						type: "date",
						value: form.data.expires_at,
						onChange: (e) => form.setData("expires_at", e.target.value)
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "field",
						children: [
							/* @__PURE__ */ jsx("label", {
								className: "field__label",
								htmlFor: "doc",
								children: "Файл PDF/JPG"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "doc",
								className: "input",
								type: "file",
								onChange: (e) => form.setData("file", e.target.files?.[0] ?? null)
							}),
							form.errors.file ? /* @__PURE__ */ jsx("p", {
								className: "field__error",
								children: form.errors.file
							}) : null
						]
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						children: "Загрузить"
					})
				]
			}),
			documents.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Документов нет" }) : /* @__PURE__ */ jsx(Table, {
				headers: [
					"Документ",
					"Номер",
					"Статус",
					""
				],
				children: documents.map((d) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [d.title, /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: types[d.type]
					})] }),
					/* @__PURE__ */ jsx("td", { children: d.number ?? "—" }),
					/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx(StatusBadge, { status: d.status }), d.reviewer_note ? /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: d.reviewer_note
					}) : null] }),
					/* @__PURE__ */ jsxs("td", {
						className: "actions",
						children: [d.has_file ? /* @__PURE__ */ jsx("a", {
							className: "link",
							href: `/clinic-cabinet/documents/${d.id}/file`,
							children: "Скачать"
						}) : null, /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => router.delete(`/clinic-cabinet/documents/${d.id}`),
							children: "Удалить"
						})]
					})
				] }, d.id))
			})
		]
	});
}
//#endregion
export { Documents as default };

//# sourceMappingURL=Documents-Crwypk8D.js.map