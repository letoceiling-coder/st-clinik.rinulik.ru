import { n as cx } from "./format-BP5psl3Q.js";
import { n as Button } from "./Button-C2BxTtRt.js";
import { T as TextField, c as Alert } from "../app.js";
import { r as PageHead } from "./Dash-C8plSzIc.js";
import { router, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Roles.tsx
function Roles({ roles, catalog, groups, sensitiveLabels, isSuperadmin }) {
	const create = useForm({
		slug: "",
		name: "",
		description: "",
		permissions: []
	});
	const staffRoles = roles.filter((r) => !r.is_site);
	const siteRoles = roles.filter((r) => r.is_site);
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Роли и права",
				text: "Роль определяет, какие разделы админ-панели видит сотрудник. Права проверяются и в меню, и на сервере."
			}),
			!isSuperadmin ? /* @__PURE__ */ jsx(Alert, {
				tone: "muted",
				children: "Вы можете выдавать только те права, что есть у вас самих, и не можете менять свою роль. Роли с большими правами меняет суперадмин."
			}) : null,
			/* @__PURE__ */ jsxs("section", {
				className: "stack",
				children: [/* @__PURE__ */ jsx("h2", {
					style: { margin: 0 },
					children: "Сотрудники админ-панели"
				}), staffRoles.map((r) => /* @__PURE__ */ jsx(RoleCard, {
					role: r,
					catalog,
					groups,
					sensitiveLabels
				}, r.slug))]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "stack",
				children: [
					/* @__PURE__ */ jsx("h2", {
						style: { margin: 0 },
						children: "Роли сайта"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						style: { margin: 0 },
						children: "Эти роли не дают доступа в админ-панель. Права сотрудников клиники (администратор, врач и т. д.) настраивает сама клиника в своём кабинете."
					}),
					/* @__PURE__ */ jsx("div", {
						className: "roles-site",
						children: siteRoles.map((r) => /* @__PURE__ */ jsxs("div", {
							className: "card roles-site__item",
							children: [
								/* @__PURE__ */ jsx("b", { children: r.name }),
								/* @__PURE__ */ jsx("span", {
									className: "text-sm text-muted",
									children: r.description
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "text-xs text-muted",
									children: [
										r.slug,
										" · пользователей: ",
										r.users
									]
								})
							]
						}, r.slug))
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					create.post("/admin/roles", {
						preserveScroll: true,
						onSuccess: () => create.reset()
					});
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Новая роль"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "form-grid",
						children: [
							/* @__PURE__ */ jsx(TextField, {
								label: "Ключ",
								hint: "Латиница, например: call_center",
								required: true,
								value: create.data.slug,
								onChange: (e) => create.setData("slug", e.target.value),
								error: create.errors.slug
							}),
							/* @__PURE__ */ jsx(TextField, {
								label: "Название",
								required: true,
								value: create.data.name,
								onChange: (e) => create.setData("name", e.target.value),
								error: create.errors.name
							}),
							/* @__PURE__ */ jsx(TextField, {
								className: "span-2",
								label: "Описание — чем занимается сотрудник",
								value: create.data.description,
								onChange: (e) => create.setData("description", e.target.value)
							})
						]
					}),
					/* @__PURE__ */ jsx(Perms, {
						catalog,
						groups,
						sensitiveLabels,
						value: create.data.permissions,
						onChange: (permissions) => create.setData("permissions", permissions)
					}),
					create.errors.permissions ? /* @__PURE__ */ jsx(Alert, {
						tone: "danger",
						children: create.errors.permissions
					}) : null,
					/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: create.processing,
						children: "Создать роль"
					}) })
				]
			})
		]
	});
}
function RoleCard({ role, catalog, groups, sensitiveLabels }) {
	const form = useForm({
		name: role.name,
		description: role.description ?? "",
		permissions: role.permissions ?? []
	});
	const isSuper = role.permissions.includes("*");
	const granted = isSuper ? catalog : catalog.filter((p) => role.permissions.includes(p.key));
	const sensitive = [...new Set(granted.map((p) => p.sensitive).filter((s) => Boolean(s)))];
	return /* @__PURE__ */ jsxs("details", {
		className: "card roles-card",
		children: [/* @__PURE__ */ jsxs("summary", {
			className: "roles-card__head",
			children: [/* @__PURE__ */ jsxs("span", {
				className: "roles-card__title",
				children: [/* @__PURE__ */ jsx("b", { children: role.name }), /* @__PURE__ */ jsx("span", {
					className: "text-sm text-muted",
					children: role.description
				})]
			}), /* @__PURE__ */ jsxs("span", {
				className: "roles-card__meta",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "text-xs text-muted",
					children: [
						isSuper ? "все права" : `${granted.length} из ${catalog.length} прав`,
						" · пользователей: ",
						role.users,
						role.is_own ? " · ваша роль" : ""
					]
				}), /* @__PURE__ */ jsx("span", {
					className: "roles-card__tags",
					children: sensitive.map((s) => /* @__PURE__ */ jsx("span", {
						className: cx("roles-tag", `roles-tag--${s}`),
						children: sensitiveLabels[s] ?? s
					}, s))
				})]
			})]
		}), /* @__PURE__ */ jsxs("form", {
			className: "stack roles-card__body",
			onSubmit: (e) => {
				e.preventDefault();
				form.put(`/admin/roles/${role.slug}`, { preserveScroll: true });
			},
			children: [
				!role.editable ? /* @__PURE__ */ jsx(Alert, {
					tone: "muted",
					children: isSuper ? "Суперадмин имеет все права, они не редактируются." : role.is_own ? "Свою роль менять нельзя." : "У этой роли больше прав, чем у вас: изменить её может суперадмин."
				}) : null,
				/* @__PURE__ */ jsxs("div", {
					className: "form-grid",
					children: [/* @__PURE__ */ jsx(TextField, {
						label: "Название",
						disabled: !role.editable,
						value: form.data.name,
						onChange: (e) => form.setData("name", e.target.value)
					}), /* @__PURE__ */ jsx(TextField, {
						label: "Описание",
						disabled: !role.editable,
						value: form.data.description,
						onChange: (e) => form.setData("description", e.target.value)
					})]
				}),
				/* @__PURE__ */ jsx(Perms, {
					catalog,
					groups,
					sensitiveLabels,
					value: isSuper ? catalog.map((p) => p.key) : form.data.permissions,
					onChange: (permissions) => form.setData("permissions", permissions),
					disabled: !role.editable
				}),
				form.errors.permissions ? /* @__PURE__ */ jsx(Alert, {
					tone: "danger",
					children: form.errors.permissions
				}) : null,
				role.editable ? /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					style: { gap: 8 },
					children: [/* @__PURE__ */ jsx(Button, {
						type: "submit",
						size: "sm",
						loading: form.processing,
						children: "Сохранить права"
					}), !role.is_system ? /* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "ghost",
						size: "sm",
						onClick: () => confirm(`Удалить роль «${role.name}»?`) && router.delete(`/admin/roles/${role.slug}`, { preserveScroll: true }),
						children: "Удалить роль"
					}) : null]
				}) : null
			]
		})]
	});
}
function Perms({ catalog, groups, sensitiveLabels, value, onChange, disabled }) {
	const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
	return /* @__PURE__ */ jsx("div", {
		className: "roles-perms",
		children: Object.entries(groups).map(([group, title]) => {
			const items = catalog.filter((p) => p.group === group);
			if (items.length === 0) return null;
			return /* @__PURE__ */ jsxs("fieldset", {
				className: "roles-perms__group",
				children: [/* @__PURE__ */ jsx("legend", { children: title }), items.map((p) => {
					const locked = disabled || !p.grantable;
					return /* @__PURE__ */ jsxs("label", {
						className: cx("roles-perm", value.includes(p.key) && "is-on", locked && "is-locked"),
						children: [/* @__PURE__ */ jsx("input", {
							type: "checkbox",
							checked: value.includes(p.key),
							disabled: locked,
							onChange: () => toggle(p.key)
						}), /* @__PURE__ */ jsxs("span", {
							className: "roles-perm__text",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "roles-perm__label",
								children: [p.label, p.sensitive ? /* @__PURE__ */ jsx("span", {
									className: cx("roles-tag", `roles-tag--${p.sensitive}`),
									children: sensitiveLabels[p.sensitive] ?? p.sensitive
								}) : null]
							}), p.hint ? /* @__PURE__ */ jsx("span", {
								className: "roles-perm__hint",
								children: p.hint
							}) : null]
						})]
					}, p.key);
				})]
			}, group);
		})
	});
}
//#endregion
export { Roles as default };

//# sourceMappingURL=Roles-BVF4jAH_.js.map