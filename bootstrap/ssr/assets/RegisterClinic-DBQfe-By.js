import { n as Button } from "./Button-D8Mzgn6o.js";
import { C as TextField, s as Alert, v as Check } from "../app.js";
import { Link, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Auth/RegisterClinic.tsx
function RegisterClinic({ offer = null }) {
	const claimMode = Boolean(offer?.claimable);
	const form = useForm({
		name: "",
		organization_name: offer?.organization_name ?? "",
		email: "",
		phone: "",
		password: "",
		password_confirmation: "",
		consent: false,
		offer_token: claimMode ? offer?.token ?? "" : ""
	});
	const submit = (e) => {
		e.preventDefault();
		form.post("/register/clinic", { onFinish: () => form.reset("password", "password_confirmation") });
	};
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		className: "auth-card card card--shadow stack",
		noValidate: true,
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "auth-card__title",
				children: claimMode ? "Регистрация и подключение" : "Регистрация клиники"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: claimMode ? `Создайте аккаунт и заберите черновик «${offer?.clinic_name}» (${offer?.organization_name}).` : "Создайте организацию и добавьте первый филиал в кабинете."
			})] }),
			offer && !offer.claimable && offer.reason ? /* @__PURE__ */ jsx(Alert, {
				tone: "warning",
				children: offer.reason
			}) : null,
			/* @__PURE__ */ jsx(TextField, {
				label: "Ваше имя",
				required: true,
				value: form.data.name,
				onChange: (e) => form.setData("name", e.target.value),
				error: form.errors.name
			}),
			!claimMode ? /* @__PURE__ */ jsx(TextField, {
				label: "Название организации",
				required: true,
				value: form.data.organization_name,
				onChange: (e) => form.setData("organization_name", e.target.value),
				error: form.errors.organization_name
			}) : /* @__PURE__ */ jsx(TextField, {
				label: "Организация",
				value: offer?.organization_name ?? "",
				readOnly: true,
				disabled: true
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "E-mail",
				type: "email",
				required: true,
				value: form.data.email,
				onChange: (e) => form.setData("email", e.target.value),
				error: form.errors.email
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Телефон",
				value: form.data.phone,
				onChange: (e) => form.setData("phone", e.target.value),
				error: form.errors.phone
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Пароль",
				type: "password",
				required: true,
				value: form.data.password,
				onChange: (e) => form.setData("password", e.target.value),
				error: form.errors.password
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Повторите пароль",
				type: "password",
				required: true,
				value: form.data.password_confirmation,
				onChange: (e) => form.setData("password_confirmation", e.target.value),
				error: form.errors.password_confirmation
			}),
			/* @__PURE__ */ jsx(Check, {
				checked: form.data.consent,
				onChange: (e) => form.setData("consent", e.target.checked),
				error: form.errors.consent,
				label: "Согласие на обработку персональных данных"
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				block: true,
				loading: form.processing,
				disabled: Boolean(offer && !offer.claimable),
				children: claimMode ? "Зарегистрироваться и забрать черновик" : "Зарегистрировать клинику"
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-center",
				children: [
					/* @__PURE__ */ jsx(Link, {
						href: "/register",
						className: "link",
						children: "Регистрация пациента"
					}),
					" · ",
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
export { RegisterClinic as default };

//# sourceMappingURL=RegisterClinic-DBQfe-By.js.map