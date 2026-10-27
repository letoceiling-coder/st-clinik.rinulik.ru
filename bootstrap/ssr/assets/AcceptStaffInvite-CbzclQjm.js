import { n as Button } from "./Button-D8Mzgn6o.js";
import { Link, router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Auth/AcceptStaffInvite.tsx
function AcceptStaffInvite({ email, phone, organization, role, token }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "auth-card card card--shadow stack",
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "auth-card__title",
				children: "Приглашение в организацию"
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-muted",
				children: [
					organization ?? "Клиника",
					" · роль: ",
					role,
					email ? ` · ${email}` : phone ? ` · ${phone}` : ""
				]
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "button",
				onClick: () => router.post(`/invite/staff/${token}`),
				children: "Принять приглашение"
			}),
			/* @__PURE__ */ jsx(Link, {
				href: "/login",
				className: "text-sm link",
				children: "Сначала войти в другой аккаунт"
			})
		]
	});
}
//#endregion
export { AcceptStaffInvite as default };

//# sourceMappingURL=AcceptStaffInvite-CbzclQjm.js.map