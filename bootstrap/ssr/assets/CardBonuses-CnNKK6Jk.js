import { n as Button } from "./Button-C2BxTtRt.js";
import { v as Check } from "../app.js";
import { c as Table, r as PageHead } from "./Dash-cIdZIfDR.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/CardBonuses.tsx
function AdminCardBonuses({ types = [] }) {
	const form = useForm({ types: types.map((t) => ({
		id: t.id,
		is_active: t.is_active,
		triggers_premium: t.triggers_premium
	})) });
	const submit = (e) => {
		e.preventDefault();
		form.put("/admin/card-bonuses");
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "stack-lg",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Бонусы на карточках клиник",
				text: "Включите типы акций для ЛК клиник. Отметка «Премиум» выделяет карточку на главной и в каталоге, если клиника включила такой бонус."
			}),
			/* @__PURE__ */ jsx(Table, {
				headers: [
					"Тип",
					"Код",
					"Где показывается",
					"Активен",
					"Премиум-оформление"
				],
				children: types.map((type, index) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("td", { children: type.name }),
					/* @__PURE__ */ jsx("td", { children: type.code }),
					/* @__PURE__ */ jsx("td", { children: type.placement === "features" ? "Особенности" : "Полоска акций" }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Check, {
						label: "",
						checked: form.data.types[index]?.is_active ?? false,
						onChange: (e) => {
							const next = [...form.data.types];
							next[index] = {
								...next[index],
								is_active: e.target.checked
							};
							form.setData("types", next);
						}
					}) }),
					/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Check, {
						label: "",
						checked: form.data.types[index]?.triggers_premium ?? false,
						onChange: (e) => {
							const next = [...form.data.types];
							next[index] = {
								...next[index],
								triggers_premium: e.target.checked
							};
							form.setData("types", next);
						}
					}) })
				] }, type.id))
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				loading: form.processing,
				children: "Сохранить"
			})
		]
	});
}
//#endregion
export { AdminCardBonuses as default };

//# sourceMappingURL=CardBonuses-CnNKK6Jk.js.map