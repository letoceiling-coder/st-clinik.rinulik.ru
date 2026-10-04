import { n as Button } from "./Button-D8Mzgn6o.js";
import { l as EmptyState } from "../app.js";
import { i as PagerSafe, r as PageHead } from "./Dash-BbiOlhfn.js";
import { Link, router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Account/Notifications.tsx
function Notifications({ notifications }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Уведомления",
				action: /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: "secondary",
					onClick: () => router.post("/account/notifications/read-all"),
					children: "Прочитать все"
				})
			}),
			notifications.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Уведомлений нет" }) : /* @__PURE__ */ jsx("ul", {
				className: "stack",
				children: notifications.data.map((n) => /* @__PURE__ */ jsxs("li", {
					className: "card",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "row row--between",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: n.title }), /* @__PURE__ */ jsxs("p", {
							className: "text-sm text-muted",
							children: [
								n.body,
								" · ",
								n.at
							]
						})] }), !n.read ? /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => router.post(`/account/notifications/${n.id}/read`),
							children: "Прочитано"
						}) : null]
					}), n.url ? /* @__PURE__ */ jsx(Link, {
						href: n.url,
						className: "link",
						children: "Открыть"
					}) : null]
				}, n.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: notifications })
		]
	});
}
//#endregion
export { Notifications as default };

//# sourceMappingURL=Notifications-CVG2pexl.js.map