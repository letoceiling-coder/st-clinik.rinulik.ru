import { i as LinkButton, n as Button } from "./Button-C2BxTtRt.js";
import { c as Alert } from "../app.js";
import { Link, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Auth/VerifyEmail.tsx
function VerifyEmail({ status, email, placeholder_email }) {
	const form = useForm({});
	const resend = (e) => {
		e.preventDefault();
		form.post("/email/verification-notification");
	};
	if (placeholder_email) return /* @__PURE__ */ jsxs("div", {
		className: "auth-card card card--shadow stack",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "auth-card__title",
				children: "E-mail не указан"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Вход через соцсеть выполнен без адреса почты (так бывает у VK ID). Личный кабинет уже доступен — добавьте реальный e-mail в профиле для восстановления доступа и писем."
			})] }),
			/* @__PURE__ */ jsx(LinkButton, {
				href: "/account/profile",
				variant: "dark",
				block: true,
				children: "Перейти в профиль"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm text-center",
				children: /* @__PURE__ */ jsx(Link, {
					href: "/logout",
					method: "post",
					as: "button",
					className: "link",
					children: "Выйти"
				})
			})
		]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "auth-card card card--shadow stack",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "auth-card__title",
				children: "Подтвердите e-mail"
			}), /* @__PURE__ */ jsxs("p", {
				className: "text-muted",
				children: [
					"Мы отправили письмо на ",
					/* @__PURE__ */ jsx("strong", { children: email }),
					". Без подтверждения личный кабинет недоступен."
				]
			})] }),
			status === "verification-link-sent" && /* @__PURE__ */ jsx(Alert, {
				tone: "success",
				children: "Новое письмо отправлено."
			}),
			/* @__PURE__ */ jsx("form", {
				onSubmit: resend,
				children: /* @__PURE__ */ jsx(Button, {
					type: "submit",
					block: true,
					loading: form.processing,
					children: "Отправить письмо ещё раз"
				})
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm text-center",
				children: /* @__PURE__ */ jsx(Link, {
					href: "/logout",
					method: "post",
					as: "button",
					className: "link",
					children: "Выйти"
				})
			})
		]
	});
}
//#endregion
export { VerifyEmail as default };

//# sourceMappingURL=VerifyEmail-D0R-8Bsa.js.map