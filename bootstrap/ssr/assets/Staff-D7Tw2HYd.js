import { n as Button } from "./Button-C2BxTtRt.js";
import { C as SelectField, T as TextField, x as PhoneField } from "../app.js";
import { r as PageHead } from "./Dash-C8plSzIc.js";
import { router, useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Staff.tsx
function Staff({ members, invitations, roles, can_manage, sms_invites_enabled }) {
	const form = useForm({
		email: "",
		phone: "",
		role: "manager"
	});
	const submit = (e) => {
		e.preventDefault();
		form.post("/clinic-cabinet/staff/invite", { onSuccess: () => form.reset() });
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(PageHead, { title: "Сотрудники" }), /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Команда"
				}), /* @__PURE__ */ jsx("ul", {
					className: "stack text-sm",
					children: members.map((m) => /* @__PURE__ */ jsxs("li", {
						className: "row row--between row--wrap",
						children: [/* @__PURE__ */ jsxs("span", { children: [
							m.name,
							" · ",
							m.email,
							" · ",
							m.role_label
						] }), can_manage ? /* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "outline",
							size: "sm",
							onClick: () => router.delete(`/clinic-cabinet/staff/${m.id}`),
							children: "Отозвать"
						}) : null]
					}, m.id))
				})]
			}),
			can_manage ? /* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: submit,
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Пригласить"
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "E-mail",
						type: "email",
						value: form.data.email,
						onChange: (e) => form.setData("email", e.target.value),
						error: form.errors.email
					}),
					/* @__PURE__ */ jsx(PhoneField, {
						label: "Телефон",
						value: form.data.phone,
						onChange: (e) => form.setData("phone", e.target.value),
						error: form.errors.phone
					}),
					!sms_invites_enabled ? /* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted",
						children: "SMS не настроен — по телефону ссылку нужно будет передать вручную."
					}) : null,
					/* @__PURE__ */ jsx(SelectField, {
						label: "Роль",
						value: form.data.role,
						onChange: (e) => form.setData("role", e.target.value),
						children: Object.entries(roles).map(([key, label]) => /* @__PURE__ */ jsx("option", {
							value: key,
							children: label
						}, key))
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						children: "Отправить приглашение"
					})
				]
			}) : null,
			invitations.length > 0 ? /* @__PURE__ */ jsxs("div", {
				className: "card stack text-sm",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Ожидают принятия"
				}), invitations.map((i) => /* @__PURE__ */ jsxs("div", { children: [
					i.email ?? i.phone,
					" · ",
					i.role_label,
					" · до ",
					i.expires_at
				] }, i.id))]
			}) : null
		]
	})] });
}
//#endregion
export { Staff as default };

//# sourceMappingURL=Staff-D7Tw2HYd.js.map