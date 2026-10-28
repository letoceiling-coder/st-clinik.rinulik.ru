import { n as Button } from "./Button-C2BxTtRt.js";
import { C as TextArea, D as Modal, S as SelectField, v as Check, w as TextField, x as SearchInput } from "../app.js";
import { c as Table, i as PagerSafe, r as PageHead, t as FilterBar } from "./Dash-BqP8YCar.js";
import { t as FileDropzone } from "./FileDropzone-CiBd0Lal.js";
import { Link, router, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Dictionary.tsx
function Dictionary({ resource, title, columns, fields, lookups, rows, tabs, filters }) {
	const [draft, setDraft] = useState(null);
	const modalOpen = draft !== null;
	const editing = draft?.mode === "edit" ? draft.row : null;
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg dict-admin",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title,
				action: /* @__PURE__ */ jsx(Button, {
					size: "sm",
					icon: "plus",
					onClick: () => setDraft({ mode: "create" }),
					children: "Добавить"
				})
			}),
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
			/* @__PURE__ */ jsx("div", {
				className: "dict-table-wrap",
				children: /* @__PURE__ */ jsx(Table, {
					headers: [...columns.map((c) => c.label), ""],
					children: rows.data.map((row) => /* @__PURE__ */ jsxs("tr", { children: [columns.map((c) => /* @__PURE__ */ jsx("td", {
						"data-label": c.label,
						children: formatCell(row[c.name], c.type, lookups[c.name])
					}, c.name)), /* @__PURE__ */ jsxs("td", {
						className: "actions",
						children: [/* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => setDraft({
								mode: "edit",
								row
							}),
							children: "Изменить"
						}), /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => confirm("Удалить запись?") && router.delete(`/admin/dictionaries/${resource}/${row.id}`),
							children: "Удалить"
						})]
					})] }, String(row.id)))
				})
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: rows }),
			/* @__PURE__ */ jsx(Modal, {
				open: modalOpen,
				onClose: () => setDraft(null),
				wide: true,
				title: editing ? "Редактирование" : "Новая запись",
				footer: editing ? /* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted dict-modal__hint",
					children: "Изменения сохраняются сразу после нажатия «Сохранить»."
				}) : /* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted dict-modal__hint",
					children: "URL (slug) создаётся автоматически из названия."
				}),
				children: /* @__PURE__ */ jsx(DictForm, {
					fields,
					resource,
					initial: editing,
					onDone: () => setDraft(null)
				}, editing ? String(editing.id) : "create")
			})
		]
	});
}
function formatCell(value, type, lookup) {
	if (type === "image") {
		const url = typeof value === "string" ? value : null;
		return url ? /* @__PURE__ */ jsx("img", {
			src: url,
			alt: "",
			className: "dict-table__thumb",
			loading: "lazy"
		}) : /* @__PURE__ */ jsx("span", {
			className: "text-muted",
			children: "—"
		});
	}
	if (typeof value === "boolean") return /* @__PURE__ */ jsx("span", {
		className: value ? "dict-badge dict-badge--ok" : "dict-badge",
		children: value ? "да" : "нет"
	});
	if (Array.isArray(value)) return value.join(", ");
	if (lookup && value !== null && value !== void 0) return lookup[String(value)] ?? String(value);
	return value === null || value === void 0 ? "—" : String(value);
}
function DictForm({ fields, resource, initial, onDone }) {
	const isEdit = Boolean(initial?.id);
	const empty = Object.fromEntries(fields.map((f) => [f.name, f.type === "checkbox" ? false : f.type === "multiselect" ? [] : f.type === "image" ? null : ""]));
	const form = useForm({
		...empty,
		remove_cover: false,
		...initial ?? {}
	});
	useEffect(() => {
		form.setData({
			...empty,
			remove_cover: false,
			...initial ?? {}
		});
		form.clearErrors();
	}, [initial]);
	const submit = () => {
		if (!isEdit) form.setData("slug", "");
		const opts = {
			forceFormData: fields.some((f) => f.type === "image" && form.data[f.name] instanceof File),
			onSuccess: () => {
				if (isEdit) onDone();
				else {
					form.reset();
					onDone();
				}
			},
			preserveScroll: true
		};
		if (isEdit) form.post(`/admin/dictionaries/${resource}/${initial.id}`, {
			...opts,
			_method: "put"
		});
		else form.post(`/admin/dictionaries/${resource}`, opts);
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "form-grid dict-form",
		onSubmit: (e) => {
			e.preventDefault();
			submit();
		},
		children: [fields.map((f) => {
			const err = form.errors[f.name];
			if (f.type === "slug" && !isEdit) return null;
			if (f.type === "textarea") return /* @__PURE__ */ jsx(TextArea, {
				className: "span-2",
				label: f.label,
				hint: f.help,
				rows: f.rows ?? 4,
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
			if (f.type === "image") {
				const preview = f.name === "cover" ? initial?.cover_url : void 0;
				return /* @__PURE__ */ jsxs("div", {
					className: "span-2 stack",
					children: [/* @__PURE__ */ jsx(FileDropzone, {
						label: f.label,
						hint: f.help,
						error: err,
						value: form.data[f.name] ?? null,
						previewUrl: form.data.remove_cover ? null : preview ?? null,
						onChange: (file) => {
							form.setData(f.name, file);
							if (file) form.setData("remove_cover", false);
						}
					}), preview && !form.data[f.name] ? /* @__PURE__ */ jsx(Check, {
						label: "Удалить текущее фото",
						checked: Boolean(form.data.remove_cover),
						onChange: (e) => form.setData("remove_cover", e.target.checked)
					}) : null]
				}, f.name);
			}
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
			if (f.type === "slug") return /* @__PURE__ */ jsx(TextField, {
				label: f.label,
				required: false,
				hint: f.help,
				value: String(form.data[f.name] ?? ""),
				onChange: (e) => form.setData(f.name, e.target.value),
				error: err
			}, f.name);
			return /* @__PURE__ */ jsx(TextField, {
				label: f.label,
				type: f.type === "number" ? "number" : "text",
				required: f.required,
				hint: f.type === "text" && f.name === "name" && !isEdit ? "После сохранения URL создастся автоматически." : f.help,
				value: String(form.data[f.name] ?? ""),
				onChange: (e) => form.setData(f.name, e.target.value),
				error: err,
				className: f.name === "name" ? "span-2" : void 0
			}, f.name);
		}), /* @__PURE__ */ jsxs("div", {
			className: "span-2 dict-form__actions",
			children: [/* @__PURE__ */ jsx(Button, {
				type: "submit",
				loading: form.processing,
				children: isEdit ? "Сохранить" : "Добавить"
			}), /* @__PURE__ */ jsx(Button, {
				type: "button",
				variant: "ghost",
				onClick: onDone,
				children: "Отмена"
			})]
		})]
	});
}
//#endregion
export { Dictionary as default };

//# sourceMappingURL=Dictionary-Blt1FMDS.js.map