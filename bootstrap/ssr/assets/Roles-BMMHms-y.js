import { n as Button } from "./Button-DsM_qe4F.js";
import { C as TextField, y as Check } from "../app.js";
import { r as PageHead } from "./Dash-C-3tSNHh.js";
import { router, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Roles.tsx
function Roles({ roles, catalog }) {
	const create = useForm({
		slug: "",
		name: "",
		description: "",
		permissions: []
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, { title: "Роли и права" }),
			roles.map((r) => /* @__PURE__ */ jsx(RoleCard, {
				role: r,
				catalog
			}, r.slug)),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					create.post("/admin/roles", { onSuccess: () => create.reset() });
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Новая роль"
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Ключ",
						required: true,
						value: create.data.slug,
						onChange: (e) => create.setData("slug", e.target.value),
						error: create.errors.slug
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Название",
						required: true,
						value: create.data.name,
						onChange: (e) => create.setData("name", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Описание",
						value: create.data.description,
						onChange: (e) => create.setData("description", e.target.value)
					}),
					/* @__PURE__ */ jsx(Perms, {
						catalog,
						value: create.data.permissions,
						onChange: (permissions) => create.setData("permissions", permissions)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: create.processing,
						children: "Создать"
					})
				]
			})
		]
	});
}
function RoleCard({ role, catalog }) {
	const form = useForm({
		name: role.name,
		description: role.description ?? "",
		permissions: role.permissions ?? []
	});
	return /* @__PURE__ */ jsxs("form", {
		className: "card stack",
		onSubmit: (e) => {
			e.preventDefault();
			form.put(`/admin/roles/${role.slug}`);
		},
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "row row--between",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", { children: role.name }), /* @__PURE__ */ jsxs("p", {
					className: "text-sm text-muted",
					children: [
						role.slug,
						" · пользователей: ",
						role.users
					]
				})] }), !role.is_system ? /* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "ghost",
					size: "sm",
					onClick: () => confirm("Удалить роль?") && router.delete(`/admin/roles/${role.slug}`),
					children: "Удалить"
				}) : null]
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Название",
				value: form.data.name,
				onChange: (e) => form.setData("name", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Описание",
				value: form.data.description,
				onChange: (e) => form.setData("description", e.target.value)
			}),
			/* @__PURE__ */ jsx(Perms, {
				catalog,
				value: form.data.permissions,
				onChange: (permissions) => form.setData("permissions", permissions),
				disabled: role.slug === "superadmin"
			}),
			role.slug !== "superadmin" ? /* @__PURE__ */ jsx(Button, {
				type: "submit",
				size: "sm",
				loading: form.processing,
				children: "Сохранить права"
			}) : /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				children: "Права суперадмина не редактируются."
			})
		]
	});
}
function Perms({ catalog, value, onChange, disabled }) {
	return /* @__PURE__ */ jsx("div", {
		className: "check-grid",
		children: catalog.map((p) => /* @__PURE__ */ jsx(Check, {
			label: p.label,
			disabled,
			checked: value.includes(p.key),
			onChange: () => onChange(value.includes(p.key) ? value.filter((k) => k !== p.key) : [...value, p.key])
		}, p.key))
	});
}
//#endregion
export { Roles as default };

//# sourceMappingURL=Roles-BMMHms-y.js.map