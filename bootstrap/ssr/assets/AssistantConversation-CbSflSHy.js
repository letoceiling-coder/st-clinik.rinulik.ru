import { a as Panel, r as PageHead } from "./Dash-C8plSzIc.js";
import { Link } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/AssistantConversation.tsx
function AdminAssistantConversation({ conversation }) {
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(PageHead, {
		title: "Диалог ассистента",
		text: /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx(Link, {
				href: "/admin/assistant",
				children: "← Настройки ассистента"
			}),
			" · ",
			conversation.channel,
			conversation.city ? ` · ${conversation.city}` : "",
			conversation.user ? ` · ${conversation.user.name}` : ""
		] })
	}), /* @__PURE__ */ jsx(Panel, {
		title: "Сообщения",
		children: /* @__PURE__ */ jsx("div", {
			className: "assistant-transcript",
			children: conversation.messages.map((m, i) => /* @__PURE__ */ jsxs("article", {
				className: m.role === "user" ? "assistant-transcript__user" : "assistant-transcript__bot",
				children: [
					/* @__PURE__ */ jsx("header", { children: m.role === "user" ? "Пользователь" : "Ассистент" }),
					/* @__PURE__ */ jsx("p", { children: m.content }),
					m.meta && Object.keys(m.meta).length > 0 ? /* @__PURE__ */ jsx("pre", {
						className: "assistant-transcript__meta",
						children: JSON.stringify(m.meta, null, 2)
					}) : null
				]
			}, i))
		})
	})] });
}
//#endregion
export { AdminAssistantConversation as default };

//# sourceMappingURL=AssistantConversation-CbSflSHy.js.map