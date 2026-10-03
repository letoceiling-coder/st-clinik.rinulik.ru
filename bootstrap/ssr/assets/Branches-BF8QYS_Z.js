import { i as LinkButton, n as Button } from "./Button-D4s3iLUi.js";
import { l as EmptyState } from "../app.js";
import { a as StatusBadge, o as Table, r as PageHead } from "./Dash-CaoYUPpG.js";
import { Link, router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Branches.tsx
function Branches({ branches }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [/* @__PURE__ */ jsx(PageHead, {
			title: "Филиалы",
			action: /* @__PURE__ */ jsx(LinkButton, {
				href: "/clinic-cabinet/branches/create",
				children: "Новый филиал"
			})
		}), branches.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
			title: "Добавьте первый филиал",
			action: /* @__PURE__ */ jsx(LinkButton, {
				href: "/clinic-cabinet/branches/create",
				children: "Создать"
			})
		}) : /* @__PURE__ */ jsx(Table, {
			headers: [
				"Филиал",
				"Город",
				"Статус",
				"Профиль",
				""
			],
			children: branches.map((b) => /* @__PURE__ */ jsxs("tr", { children: [
				/* @__PURE__ */ jsxs("td", { children: [
					/* @__PURE__ */ jsx("b", { children: b.name }),
					/* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: b.address
					}),
					b.moderation_note ? /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: b.moderation_note
					}) : null
				] }),
				/* @__PURE__ */ jsx("td", { children: b.city }),
				/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StatusBadge, { status: b.status }) }),
				/* @__PURE__ */ jsxs("td", { children: [b.completeness, "%"] }),
				/* @__PURE__ */ jsxs("td", {
					className: "actions",
					children: [/* @__PURE__ */ jsx(Link, {
						href: `/clinic-cabinet/branches/${b.id}/edit`,
						className: "link",
						children: "Править"
					}), ["draft", "rejected"].includes(b.status) ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => router.post(`/clinic-cabinet/branches/${b.id}/submit`),
						children: "На модерацию"
					}) : null]
				})
			] }, b.id))
		})]
	});
}
//#endregion
export { Branches as default };

//# sourceMappingURL=Branches-BF8QYS_Z.js.map