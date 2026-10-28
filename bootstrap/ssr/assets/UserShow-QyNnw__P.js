import { n as Button } from "./Button-C2BxTtRt.js";
import { S as SelectField } from "../app.js";
import { r as PageHead, s as StatusBadge } from "./Dash-cIdZIfDR.js";
import { Link, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/UserShow.tsx
function UserShow({ user, stats, reviews, appointments, audit, roles, canEdit }) {
	const form = useForm({
		role: user.role,
		status: user.status
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: user.name,
				text: `${user.email} · регистрация ${user.created_at ?? "—"}`
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm",
				children: /* @__PURE__ */ jsx(Link, {
					href: "/admin/users",
					className: "link",
					children: "← К списку"
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "kpi-grid",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "kpi card",
					children: [/* @__PURE__ */ jsx("dt", { children: "Отзывы" }), /* @__PURE__ */ jsx("dd", { children: stats.reviews })]
				}), /* @__PURE__ */ jsxs("div", {
					className: "kpi card",
					children: [/* @__PURE__ */ jsx("dt", { children: "Записи" }), /* @__PURE__ */ jsx("dd", { children: stats.appointments })]
				})]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					form.put(`/admin/users/${user.id}`);
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Роль и доступ"
					}),
					!canEdit ? /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "Роль и статус этого пользователя может изменить только сотрудник с не меньшими правами (или это ваша учётная запись)."
					}) : null,
					/* @__PURE__ */ jsx(SelectField, {
						label: "Роль",
						disabled: !canEdit,
						value: form.data.role,
						onChange: (e) => form.setData("role", e.target.value),
						children: (roles.some((r) => r.slug === user.role) ? roles : [{
							slug: user.role,
							name: user.role
						}, ...roles]).map((r) => /* @__PURE__ */ jsx("option", {
							value: r.slug,
							children: r.name
						}, r.slug))
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Статус",
						disabled: !canEdit,
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
					canEdit ? /* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						children: "Сохранить"
					}) : null
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Последние отзывы"
				}), reviews.map((r) => /* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsxs("span", { children: [
						r.rating,
						"★ · ",
						r.created_at
					] }), /* @__PURE__ */ jsx(StatusBadge, { status: r.status })]
				}, r.id))]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Записи"
				}), appointments.map((a) => /* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsxs("span", { children: [
						a.starts_at,
						" · ",
						a.clinic ?? "—"
					] }), /* @__PURE__ */ jsx(StatusBadge, { status: a.status })]
				}, a.id))]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Активность (аудит)"
				}), audit.map((a, i) => /* @__PURE__ */ jsxs("div", {
					className: "row row--between text-sm",
					children: [/* @__PURE__ */ jsx("span", { children: a.action }), /* @__PURE__ */ jsx("span", {
						className: "text-muted",
						children: a.at
					})]
				}, i))]
			})
		]
	});
}
//#endregion
export { UserShow as default };

//# sourceMappingURL=UserShow-QyNnw__P.js.map