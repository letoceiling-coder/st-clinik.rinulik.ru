import { n as Button } from "./Button-C2BxTtRt.js";
import { s as Alert } from "../app.js";
import { router } from "@inertiajs/react";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Offer/Unsubscribe.tsx
function OfferUnsubscribe({ contact, done }) {
	const [processing, setProcessing] = useState(false);
	const unsubscribe = () => router.post(window.location.pathname + window.location.search, {}, {
		preserveScroll: true,
		onStart: () => setProcessing(true),
		onFinish: () => setProcessing(false)
	});
	return /* @__PURE__ */ jsx("div", {
		className: "container offer-unsubscribe",
		children: /* @__PURE__ */ jsxs("div", {
			className: "card stack",
			children: [/* @__PURE__ */ jsx("h1", {
				className: "offer-section-title",
				children: "Отписка от предложений"
			}), done ? /* @__PURE__ */ jsxs(Alert, {
				tone: "success",
				icon: "check-circle",
				children: [
					"Готово: на ",
					contact,
					" больше не будут приходить предложения МирКлиник."
				]
			}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("p", { children: [
				"Больше не присылать коммерческие предложения на ",
				/* @__PURE__ */ jsx("b", { children: contact }),
				"? Системные письма по уже подключённым услугам это не затронет."
			] }), /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Button, {
				onClick: unsubscribe,
				loading: processing,
				children: "Отписаться"
			}) })] })]
		})
	});
}
//#endregion
export { OfferUnsubscribe as default };

//# sourceMappingURL=Unsubscribe-CgsUXKWu.js.map