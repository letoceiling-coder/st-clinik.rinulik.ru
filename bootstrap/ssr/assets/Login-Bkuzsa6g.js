import { n as Button } from "./Button-DsM_qe4F.js";
import { g as Check, x as TextField } from "../app.js";
import { Link, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Auth/Login.tsx
function Login() {
	const form = useForm({
		email: "",
		password: "",
		remember: false
	});
	const submit = (e) => {
		e.preventDefault();
		form.post("/login", { onFinish: () => form.reset("password") });
	};
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		className: "auth-card card card--shadow stack",
		noValidate: true,
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "auth-card__title",
				children: "Вход"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Для пациентов, клиник и сотрудников сервиса."
			})] }),
			/* @__PURE__ */ jsx(TextField, {
				label: "E-mail",
				type: "email",
				autoComplete: "email",
				required: true,
				value: form.data.email,
				onChange: (e) => form.setData("email", e.target.value),
				error: form.errors.email
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Пароль",
				type: "password",
				autoComplete: "current-password",
				required: true,
				value: form.data.password,
				onChange: (e) => form.setData("password", e.target.value),
				error: form.errors.password
			}),
			/* @__PURE__ */ jsx(Check, {
				label: "Запомнить меня",
				checked: form.data.remember,
				onChange: (e) => form.setData("remember", e.target.checked)
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				block: true,
				size: "lg",
				loading: form.processing,
				children: "Войти"
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-center",
				children: [
					"Нет аккаунта?",
					" ",
					/* @__PURE__ */ jsx(Link, {
						href: "/register",
						className: "link",
						children: "Зарегистрироваться"
					})
				]
			})
		]
	});
}
//#endregion
export { Login as default };

//# sourceMappingURL=Login-Bkuzsa6g.js.map