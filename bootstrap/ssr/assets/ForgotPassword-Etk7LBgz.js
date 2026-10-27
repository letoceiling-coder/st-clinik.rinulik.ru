import { n as Button } from "./Button-D8Mzgn6o.js";
import { C as TextField, s as Alert } from "../app.js";
import { Link, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Auth/ForgotPassword.tsx
function ForgotPassword() {
	const form = useForm({ email: "" });
	const submit = (e) => {
		e.preventDefault();
		form.post("/forgot-password");
	};
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		className: "auth-card card card--shadow stack",
		noValidate: true,
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "auth-card__title",
				children: "Забыли пароль?"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Укажите e-mail — отправим ссылку для сброса пароля."
			})] }),
			form.recentlySuccessful && /* @__PURE__ */ jsx(Alert, {
				tone: "success",
				children: "Если аккаунт существует, письмо уже отправлено."
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "E-mail",
				type: "email",
				autoComplete: "email",
				required: true,
				value: form.data.email,
				onChange: (e) => form.setData("email", e.target.value),
				error: form.errors.email
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				block: true,
				size: "lg",
				loading: form.processing,
				children: "Отправить ссылку"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm text-center",
				children: /* @__PURE__ */ jsx(Link, {
					href: "/login",
					className: "link",
					children: "Вернуться ко входу"
				})
			})
		]
	});
}
//#endregion
export { ForgotPassword as default };

//# sourceMappingURL=ForgotPassword-Etk7LBgz.js.map