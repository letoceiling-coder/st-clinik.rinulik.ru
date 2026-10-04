import { n as Button } from "./Button-DsM_qe4F.js";
import { b as SearchInput, x as SelectField } from "../app.js";
import { a as StatusBadge, i as PagerSafe, o as Table, r as PageHead, t as FilterBar } from "./Dash-C-3tSNHh.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Users.tsx
function Users({ users, roles, filters }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, { title: "Пользователи" }),
			/* @__PURE__ */ jsxs(FilterBar, { children: [
				/* @__PURE__ */ jsx(SearchInput, {
					name: "q",
					defaultValue: filters.q,
					placeholder: "Имя или e-mail"
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "role",
					label: "Роль",
					defaultValue: filters.role ?? "",
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: "Все роли"
					}), roles.map((r) => /* @__PURE__ */ jsx("option", {
						value: r.slug,
						children: r.name
					}, r.slug))]
				}),
				/* @__PURE__ */ jsxs(SelectField, {
					name: "status",
					label: "Статус",
					defaultValue: filters.status ?? "",
					children: [
						/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Все"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "active",
							children: "Активен"
						}),
						/* @__PURE__ */ jsx("option", {
							value: "blocked",
							children: "Заблокирован"
						})
					]
				})
			] }),
			/* @__PURE__ */ jsx(Table, {
				headers: [
					"Пользователь",
					"Роль / статус",
					"Вход",
					""
				],
				children: users.data.map((u) => /* @__PURE__ */ jsx(UserRow, {
					user: u,
					roles
				}, u.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: users })
		]
	});
}
function UserRow({ user, roles }) {
	const form = useForm({
		role: user.role,
		status: user.status
	});
	return /* @__PURE__ */ jsxs("tr", { children: [
		/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("b", { children: user.name }), /* @__PURE__ */ jsx("div", {
			className: "text-xs text-muted",
			children: user.email
		})] }),
		/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("form", {
			className: "row row--wrap",
			onSubmit: (e) => {
				e.preventDefault();
				form.put(`/admin/users/${user.id}`);
			},
			children: [
				/* @__PURE__ */ jsx("select", {
					className: "select select--sm",
					value: form.data.role,
					onChange: (e) => form.setData("role", e.target.value),
					children: roles.map((r) => /* @__PURE__ */ jsx("option", {
						value: r.slug,
						children: r.name
					}, r.slug))
				}),
				/* @__PURE__ */ jsxs("select", {
					className: "select select--sm",
					value: form.data.status,
					onChange: (e) => form.setData("status", e.target.value),
					children: [/* @__PURE__ */ jsx("option", {
						value: "active",
						children: "Активен"
					}), /* @__PURE__ */ jsx("option", {
						value: "blocked",
						children: "Заблокирован"
					})]
				}),
				/* @__PURE__ */ jsx(Button, {
					type: "submit",
					size: "sm",
					loading: form.processing,
					children: "OK"
				})
			]
		}) }),
		/* @__PURE__ */ jsx("td", { children: user.last_login_at ?? "—" }),
		/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StatusBadge, { status: user.status }) })
	] });
}
//#endregion
export { Users as default };

//# sourceMappingURL=Users-sUAPThbQ.js.map