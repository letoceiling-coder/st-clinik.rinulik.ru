import { n as Button } from "./Button-C2BxTtRt.js";
import { c as confirmDialog, p as Alert } from "../app.js";
import { router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/PendingChanges.tsx
/** Плашка в кабинете: правка отправлена модератору, на сайте пока прежняя версия. */
function PendingChanges({ revision }) {
	if (!revision) return null;
	const withdraw = async () => {
		if (await confirmDialog({
			title: "Отозвать изменения?",
			message: "Модератор не будет их проверять, на сайте останется текущая версия.",
			confirmLabel: "Отозвать"
		})) router.post(`/clinic-cabinet/revisions/${revision.id}/withdraw`, {}, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsx(Alert, {
		tone: "warning",
		icon: "clock",
		children: /* @__PURE__ */ jsxs("div", {
			className: "stack",
			children: [/* @__PURE__ */ jsxs("span", { children: [
				/* @__PURE__ */ jsx("b", { children: "Изменения на модерации" }),
				revision.submitted_at ? ` с ${revision.submitted_at}` : "",
				". Пока их не проверят, пациенты видят прежнюю версию.",
				revision.fields.length > 0 ? ` Изменено: ${revision.fields.join(", ")}.` : "",
				" В форме ниже — отправленные вами значения."
			] }), /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Button, {
				type: "button",
				size: "sm",
				variant: "ghost",
				onClick: withdraw,
				children: "Отозвать изменения"
			}) })]
		})
	});
}
//#endregion
export { PendingChanges as t };

//# sourceMappingURL=PendingChanges-Dr8zQiSs.js.map