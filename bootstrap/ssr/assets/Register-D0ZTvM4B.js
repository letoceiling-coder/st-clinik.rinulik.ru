import { n as Button } from "./Button-D4s3iLUi.js";
import { S as TextField, v as Check } from "../app.js";
import { Link, useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Auth/Register.tsx
function Register() {
	const form = useForm({
		name: "",
		email: "",
		phone: "",
		password: "",
		password_confirmation: "",
		consent: false
	});
	const submit = (e) => {
		e.preventDefault();
		form.post("/register", { onFinish: () => form.reset("password", "password_confirmation") });
	};
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		className: "auth-card card card--shadow stack",
		noValidate: true,
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "auth-card__title",
				children: "Регистрация"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Записи, избранное и отзывы будут в одном месте."
			})] }),
			/* @__PURE__ */ jsx(TextField, {
				label: "Имя",
				autoComplete: "name",
				required: true,
				value: form.data.name,
				onChange: (e) => form.setData("name", e.target.value),
				error: form.errors.name
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
			/* @__PURE__ */ jsx(TextField, {
				label: "Телефон",
				type: "tel",
				autoComplete: "tel",
				placeholder: "+7 (900) 000-00-00",
				value: form.data.phone,
				onChange: (e) => form.setData("phone", e.target.value),
				error: form.errors.phone,
				hint: "Необязательно. Нужен, чтобы клиника могла связаться по заявке."
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Пароль",
				type: "password",
				autoComplete: "new-password",
				required: true,
				value: form.data.password,
				onChange: (e) => form.setData("password", e.target.value),
				error: form.errors.password,
				hint: "Не менее 8 символов, буквы и цифры."
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Повторите пароль",
				type: "password",
				autoComplete: "new-password",
				required: true,
				value: form.data.password_confirmation,
				onChange: (e) => form.setData("password_confirmation", e.target.value),
				error: form.errors.password_confirmation
			}),
			/* @__PURE__ */ jsx(Check, {
				checked: form.data.consent,
				onChange: (e) => form.setData("consent", e.target.checked),
				error: form.errors.consent,
				label: /* @__PURE__ */ jsxs(Fragment, { children: [
					"Согласен на обработку персональных данных (",
					/* @__PURE__ */ jsx(Link, {
						href: "/consent",
						className: "link",
						children: "согласие"
					}),
					") и принимаю",
					" ",
					/* @__PURE__ */ jsx(Link, {
						href: "/privacy",
						className: "link",
						children: "политику конфиденциальности"
					})
				] })
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				block: true,
				size: "lg",
				loading: form.processing,
				children: "Создать аккаунт"
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-center",
				children: [
					"Уже есть аккаунт?",
					" ",
					/* @__PURE__ */ jsx(Link, {
						href: "/login",
						className: "link",
						children: "Войти"
					})
				]
			})
		]
	});
}
//#endregion
export { Register as default };

//# sourceMappingURL=Register-D0ZTvM4B.js.map