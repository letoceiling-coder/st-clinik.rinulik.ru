import { n as Button } from "./Button-DsM_qe4F.js";
import { b as TextArea, g as Check, v as SearchInput, x as TextField, y as SelectField } from "../app.js";
import { i as PagerSafe, r as PageHead, s as Table, t as FilterBar } from "./Dash-BUI7tnGJ.js";
import { Link, router, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
//#region resources/js/pages/Admin/Dictionary.tsx
function Dictionary({ resource, title, columns, fields, lookups, rows, tabs, filters }) {
	const [edit, setEdit] = useState(null);
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, { title }),
			/* @__PURE__ */ jsx("nav", {
				className: "dict-tabs",
				"aria-label": "Справочники",
				children: tabs.map((t) => /* @__PURE__ */ jsx(Link, {
					href: `/admin/dictionaries/${t.key}`,
					className: t.key === resource ? "chip is-active" : "chip",
					children: t.title
				}, t.key))
			}),
			/* @__PURE__ */ jsx(FilterBar, { children: /* @__PURE__ */ jsx(SearchInput, {
				name: "q",
				defaultValue: filters.q,
				placeholder: "Поиск"
			}) }),
			/* @__PURE__ */ jsx(DictForm, {
				fields,
				onDone: () => setEdit(null),
				resource,
				initial: edit
			}),
			/* @__PURE__ */ jsx(Table, {
				headers: [...columns.map((c) => c.label), ""],
				children: rows.data.map((row) => /* @__PURE__ */ jsxs("tr", { children: [columns.map((c) => /* @__PURE__ */ jsx("td", { children: formatCell(row[c.name], lookups[c.name]) }, c.name)), /* @__PURE__ */ jsxs("td", {
					className: "actions",
					children: [/* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => setEdit(row),
						children: "Изменить"
					}), /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => confirm("Удалить запись?") && router.delete(`/admin/dictionaries/${resource}/${row.id}`),
						children: "Удалить"
					})]
				})] }, String(row.id)))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: rows })
		]
	});
}
function formatCell(value, lookup) {
	if (typeof value === "boolean") return value ? "да" : "нет";
	if (Array.isArray(value)) return value.join(", ");
	if (lookup && value !== null && value !== void 0) return lookup[String(value)] ?? String(value);
	return value === null || value === void 0 ? "—" : String(value);
}
function DictForm({ fields, resource, initial, onDone }) {
	const empty = Object.fromEntries(fields.map((f) => [f.name, f.type === "checkbox" ? false : f.type === "multiselect" ? [] : ""]));
	const form = useForm({
		...empty,
		...initial ?? {}
	});
	const submit = () => {
		if (initial?.id) form.put(`/admin/dictionaries/${resource}/${initial.id}`, { onSuccess: onDone });
		else form.post(`/admin/dictionaries/${resource}`, { onSuccess: () => form.reset() });
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "card form-grid",
		onSubmit: (e) => {
			e.preventDefault();
			submit();
		},
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "card-title span-2",
				children: initial ? "Редактирование" : "Новая запись"
			}),
			fields.map((f) => {
				const err = form.errors[f.name];
				if (f.type === "textarea") return /* @__PURE__ */ jsx(TextArea, {
					className: "span-2",
					label: f.label,
					hint: f.help,
					rows: f.rows,
					required: f.required,
					value: String(form.data[f.name] ?? ""),
					onChange: (e) => form.setData(f.name, e.target.value),
					error: err
				}, f.name);
				if (f.type === "checkbox") return /* @__PURE__ */ jsx(Check, {
					label: f.label,
					checked: Boolean(form.data[f.name]),
					onChange: (e) => form.setData(f.name, e.target.checked)
				}, f.name);
				if (f.type === "select") return /* @__PURE__ */ jsxs(SelectField, {
					label: f.label,
					required: f.required,
					value: String(form.data[f.name] ?? ""),
					onChange: (e) => form.setData(f.name, e.target.value),
					error: err,
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: "—"
					}), (f.options ?? []).map((o) => /* @__PURE__ */ jsx("option", {
						value: o.value,
						children: o.label
					}, String(o.value)))]
				}, f.name);
				if (f.type === "multiselect") {
					const selected = form.data[f.name] ?? [];
					return /* @__PURE__ */ jsx("div", {
						className: "span-2 check-grid",
						children: (f.options ?? []).map((o) => /* @__PURE__ */ jsx(Check, {
							label: o.label,
							checked: selected.map(String).includes(String(o.value)),
							onChange: () => {
								const next = selected.map(String).includes(String(o.value)) ? selected.filter((v) => String(v) !== String(o.value)) : [...selected, o.value];
								form.setData(f.name, next);
							}
						}, String(o.value)))
					}, f.name);
				}
				return /* @__PURE__ */ jsx(TextField, {
					label: f.label,
					type: f.type === "number" ? "number" : "text",
					required: f.required,
					hint: f.help,
					value: String(form.data[f.name] ?? ""),
					onChange: (e) => form.setData(f.name, e.target.value),
					error: err
				}, f.name);
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				loading: form.processing,
				children: initial ? "Сохранить" : "Добавить"
			}),
			initial ? /* @__PURE__ */ jsx(Button, {
				type: "button",
				variant: "ghost",
				onClick: onDone,
				children: "Отмена"
			}) : null
		]
	});
}
//#endregion
export { Dictionary as default };

//# sourceMappingURL=Dictionary-CSiNKAND.js.map