import { n as Button } from "./Button-C2BxTtRt.js";
import { w as TextField } from "../app.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Auth/ResetPassword.tsx
function ResetPassword({ token, email }) {
	const form = useForm({
		token,
		email,
		password: "",
		password_confirmation: ""
	});
	const submit = (e) => {
		e.preventDefault();
		form.post("/password/reset");
	};
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		className: "auth-card card card--shadow stack",
		noValidate: true,
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "auth-card__title",
				children: "Новый пароль"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Придумайте пароль не короче 8 символов."
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
				autoComplete: "new-password",
				required: true,
				value: form.data.password,
				onChange: (e) => form.setData("password", e.target.value),
				error: form.errors.password
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Повторите пароль",
				type: "password",
				autoComplete: "new-password",
				required: true,
				value: form.data.password_confirmation,
				onChange: (e) => form.setData("password_confirmation", e.target.value)
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				block: true,
				size: "lg",
				loading: form.processing,
				children: "Сохранить пароль"
			})
		]
	});
}
//#endregion
export { ResetPassword as default };

//# sourceMappingURL=ResetPassword-Dh9aBPQJ.js.map