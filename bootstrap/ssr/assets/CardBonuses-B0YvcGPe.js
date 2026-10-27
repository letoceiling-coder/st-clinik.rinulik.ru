import { n as Button } from "./Button-B5alqlNe.js";
import { C as TextArea, l as Badge, v as Check, w as TextField } from "../app.js";
import { r as PageHead } from "./Dash-1ijSGeUC.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/CardBonuses.tsx
function CardBonuses({ types, help }) {
	const form = useForm({ bonuses: types.map((t) => ({
		type_id: t.id,
		enabled: t.enabled,
		short_label: t.short_label,
		description: t.description
	})) });
	const submit = (e) => {
		e.preventDefault();
		form.put("/clinic-cabinet/card-bonuses");
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "stack-lg",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Бонусы на карточке",
				text: help
			}),
			types.map((type, index) => /* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "row row--between row--wrap",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
							className: "h3",
							children: type.name
						}), /* @__PURE__ */ jsxs("p", {
							className: "text-sm text-muted",
							children: [type.placement === "features" ? "Блок особенностей" : "Полоска акций", type.requires_calendar ? " · проверка по календарю" : ""]
						})] }), /* @__PURE__ */ jsxs("div", {
							className: "row row--wrap",
							children: [!type.is_active ? /* @__PURE__ */ jsx(Badge, {
								tone: "warning",
								children: "Отключено админом"
							}) : null, type.triggers_premium ? /* @__PURE__ */ jsx(Badge, {
								tone: "primary",
								children: "Премиум-карточка"
							}) : null]
						})]
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Показывать на карточке",
						checked: form.data.bonuses[index]?.enabled ?? false,
						disabled: !type.is_active,
						onChange: (e) => {
							const bonuses = [...form.data.bonuses];
							bonuses[index] = {
								...bonuses[index],
								enabled: e.target.checked
							};
							form.setData("bonuses", bonuses);
						}
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Короткая подпись на карточке",
						value: form.data.bonuses[index]?.short_label ?? "",
						onChange: (e) => {
							const bonuses = [...form.data.bonuses];
							bonuses[index] = {
								...bonuses[index],
								short_label: e.target.value
							};
							form.setData("bonuses", bonuses);
						}
					}),
					/* @__PURE__ */ jsx(TextArea, {
						label: "Описание для пользователя (попап)",
						value: form.data.bonuses[index]?.description ?? "",
						onChange: (e) => {
							const bonuses = [...form.data.bonuses];
							bonuses[index] = {
								...bonuses[index],
								description: e.target.value
							};
							form.setData("bonuses", bonuses);
						}
					})
				]
			}, type.id)),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				loading: form.processing,
				children: "Сохранить"
			})
		]
	});
}
//#endregion
export { CardBonuses as default };

//# sourceMappingURL=CardBonuses-B0YvcGPe.js.map