import { n as Button } from "./Button-B5alqlNe.js";
import { w as TextField } from "../app.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Auth/LinkSocial.tsx
var providerLabels = {
	yandex: "Яндекс ID",
	vk: "VK ID",
	max: "MAX"
};
function LinkSocial({ email, provider }) {
	const form = useForm({ password: "" });
	const submit = (e) => {
		e.preventDefault();
		form.post("/auth/social/link");
	};
	return /* @__PURE__ */ jsxs("form", {
		onSubmit: submit,
		className: "auth-card card card--shadow stack",
		noValidate: true,
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
				className: "auth-card__title",
				children: ["Привязать ", providerLabels[provider] ?? provider]
			}), /* @__PURE__ */ jsxs("p", {
				className: "text-muted",
				children: [
					"Аккаунт ",
					/* @__PURE__ */ jsx("strong", { children: email }),
					" уже зарегистрирован. Введите пароль, чтобы привязать вход через ",
					providerLabels[provider] ?? provider,
					"."
				]
			})] }),
			/* @__PURE__ */ jsx(TextField, {
				label: "Пароль",
				type: "password",
				autoComplete: "current-password",
				required: true,
				value: form.data.password,
				onChange: (e) => form.setData("password", e.target.value),
				error: form.errors.password
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				block: true,
				size: "lg",
				loading: form.processing,
				children: "Войти и привязать"
			})
		]
	});
}
//#endregion
export { LinkSocial as default };

//# sourceMappingURL=LinkSocial-WZTZE9ZE.js.map