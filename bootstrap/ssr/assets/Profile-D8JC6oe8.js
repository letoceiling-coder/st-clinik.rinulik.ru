import { n as Button } from "./Button-DsM_qe4F.js";
import { a as Alert, g as Check, x as TextField, y as SelectField } from "../app.js";
import { r as PageHead } from "./Dash-BUI7tnGJ.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Account/Profile.tsx
function Profile({ profile, cities }) {
	const form = useForm({
		name: profile.name,
		phone: profile.phone ?? "",
		city_id: profile.city_id ?? "",
		notify_email: profile.notify_email,
		notify_leads: profile.notify_leads
	});
	const pwd = useForm({
		current_password: "",
		password: "",
		password_confirmation: ""
	});
	const del = useForm({ password: "" });
	const save = (e) => {
		e.preventDefault();
		form.put("/account/profile");
	};
	const savePwd = (e) => {
		e.preventDefault();
		pwd.put("/account/password", { onSuccess: () => pwd.reset() });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Профиль",
				text: `Согласие на обработку данных: ${profile.consent_at ?? "не получено"} (${profile.consent_version ?? "—"}).`
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: save,
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Контакты"
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Имя",
						required: true,
						value: form.data.name,
						onChange: (e) => form.setData("name", e.target.value),
						error: form.errors.name
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "E-mail",
						value: profile.email,
						disabled: true,
						hint: "Почта не меняется в прототипе."
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Телефон",
						value: form.data.phone,
						onChange: (e) => form.setData("phone", e.target.value),
						error: form.errors.phone
					}),
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Город",
						value: form.data.city_id,
						onChange: (e) => form.setData("city_id", e.target.value),
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Не выбран"
						}), cities.map((c) => /* @__PURE__ */ jsx("option", {
							value: c.id,
							children: c.name
						}, c.id))]
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Письма на почту",
						checked: form.data.notify_email,
						onChange: (e) => form.setData("notify_email", e.target.checked)
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Уведомления о заявках",
						checked: form.data.notify_leads,
						onChange: (e) => form.setData("notify_leads", e.target.checked)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						children: "Сохранить"
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: savePwd,
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Пароль"
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Текущий пароль",
						type: "password",
						value: pwd.data.current_password,
						onChange: (e) => pwd.setData("current_password", e.target.value),
						error: pwd.errors.current_password
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Новый пароль",
						type: "password",
						value: pwd.data.password,
						onChange: (e) => pwd.setData("password", e.target.value),
						error: pwd.errors.password
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Повторите пароль",
						type: "password",
						value: pwd.data.password_confirmation,
						onChange: (e) => pwd.setData("password_confirmation", e.target.value)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						variant: "dark",
						loading: pwd.processing,
						children: "Обновить пароль"
					})
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					if (confirm("Удалить аккаунт и персональные данные? Это нельзя отменить.")) del.delete("/account");
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Удаление аккаунта"
					}),
					/* @__PURE__ */ jsx(Alert, {
						tone: "warning",
						children: "Диагнозы и медицинские документы через сервис не собираются. Удаление стирает профиль, заявки и отзывы."
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Пароль для подтверждения",
						type: "password",
						value: del.data.password,
						onChange: (e) => del.setData("password", e.target.value),
						error: del.errors.password
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						variant: "danger",
						loading: del.processing,
						children: "Удалить аккаунт"
					})
				]
			})
		]
	});
}
//#endregion
export { Profile as default };

//# sourceMappingURL=Profile-D8JC6oe8.js.map