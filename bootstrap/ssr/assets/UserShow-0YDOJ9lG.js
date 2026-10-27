import { n as Button } from "./Button-D8Mzgn6o.js";
import { x as SelectField } from "../app.js";
import { r as PageHead, s as StatusBadge } from "./Dash-mdaQWR8t.js";
import { Link, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/UserShow.tsx
function UserShow({ user, stats, reviews, appointments, audit, roles }) {
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
					/* @__PURE__ */ jsx(SelectField, {
						label: "Роль",
						value: form.data.role,
						onChange: (e) => form.setData("role", e.target.value),
						children: roles.map((r) => /* @__PURE__ */ jsx("option", {
							value: r.slug,
							children: r.name
						}, r.slug))
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Статус",
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
						loading: form.processing,
						children: "Сохранить"
					})
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

//# sourceMappingURL=UserShow-0YDOJ9lG.js.map