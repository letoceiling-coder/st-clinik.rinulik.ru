import { t as Icon } from "./Icon-_sloiNX5.js";
import { n as cx } from "./format-BP5psl3Q.js";
import { n as Button } from "./Button-C2BxTtRt.js";
import { r as PageHead } from "./Dash-BqP8YCar.js";
import { useForm, usePage } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/ClinicCardAppearance.tsx
var PREVIEW_PHOTO = "/images/demo/clinic-interior-02.jpg";
function PremiumCardPreview({ skinClass }) {
	return /* @__PURE__ */ jsxs("article", {
		className: cx("clinic-card", "clinic-card--tile", "clinic-card--preview", skinClass),
		"aria-hidden": "true",
		children: [/* @__PURE__ */ jsx("div", {
			className: "clinic-card__aside",
			children: /* @__PURE__ */ jsxs("div", {
				className: "clinic-card__media",
				children: [/* @__PURE__ */ jsx("img", {
					src: PREVIEW_PHOTO,
					alt: "",
					className: "clinic-card__photo",
					loading: "lazy",
					width: 400,
					height: 300
				}), /* @__PURE__ */ jsxs("div", {
					className: "clinic-card__premium-badge",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "clinic-card__premium-badge-main",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "crown",
							size: 13,
							"aria-hidden": true
						}), /* @__PURE__ */ jsx("span", { children: "Премиум" })]
					}), /* @__PURE__ */ jsx("span", {
						className: "clinic-card__premium-badge-sub",
						children: "Премиум-размещение"
					})]
				})]
			})
		}), /* @__PURE__ */ jsxs("div", {
			className: "clinic-card__body",
			children: [
				/* @__PURE__ */ jsx("h3", {
					className: "clinic-card__title",
					children: /* @__PURE__ */ jsx("span", { children: "СтомКлиник «Пример»" })
				}),
				/* @__PURE__ */ jsx("p", {
					className: "clinic-card__address text-sm",
					children: "ул. Примерная, 12 · 500 м"
				}),
				/* @__PURE__ */ jsx("div", {
					className: "clinic-card__prices-wrap",
					children: /* @__PURE__ */ jsx("div", {
						className: "clinic-card__prices",
						children: /* @__PURE__ */ jsxs("div", {
							className: "clinic-card__prices-head",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "clinic-card__prices-label",
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "ruble",
									size: 16
								}), "Приём и диагностика"]
							}), /* @__PURE__ */ jsx("strong", {
								className: "clinic-card__prices-from",
								children: "от 500 ₽"
							})]
						})
					})
				}),
				/* @__PURE__ */ jsx("div", {
					className: "clinic-card__actions",
					children: /* @__PURE__ */ jsx("span", {
						className: "btn btn--primary btn--sm",
						children: "Записаться"
					})
				})
			]
		})]
	});
}
function ClinicCardAppearance({ variant, variants }) {
	const form = useForm({ variant });
	const { flash } = usePage().props;
	const submit = (e) => {
		e.preventDefault();
		form.put("/admin/clinic-card-appearance");
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "stack-lg premium-variant-page",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Премиум-карточки клиник",
				text: "Выберите визуальный стиль для клиник с премиальным размещением (бонус с отметкой «Премиум» в справочнике). Обычные карточки не меняются."
			}),
			flash.success ? /* @__PURE__ */ jsx("p", {
				className: "text-sm text-success",
				children: flash.success
			}) : null,
			/* @__PURE__ */ jsx("div", {
				className: "premium-variant-picker",
				role: "radiogroup",
				"aria-label": "Стиль премиальной карточки",
				children: variants.map((row) => {
					const selected = form.data.variant === row.id;
					return /* @__PURE__ */ jsxs("label", {
						className: cx("premium-variant-picker__item", selected && "is-selected"),
						children: [
							/* @__PURE__ */ jsx("input", {
								type: "radio",
								className: "premium-variant-picker__input",
								name: "variant",
								value: row.id,
								checked: selected,
								onChange: () => form.setData("variant", row.id)
							}),
							/* @__PURE__ */ jsx("span", {
								className: "premium-variant-picker__check",
								"aria-hidden": "true",
								children: selected ? /* @__PURE__ */ jsx(Icon, {
									name: "check",
									size: 16
								}) : null
							}),
							/* @__PURE__ */ jsx("div", {
								className: "premium-variant-picker__preview",
								children: /* @__PURE__ */ jsx(PremiumCardPreview, { skinClass: row.class })
							}),
							/* @__PURE__ */ jsxs("span", {
								className: "premium-variant-picker__meta stack-sm",
								children: [/* @__PURE__ */ jsx("strong", { children: row.label }), /* @__PURE__ */ jsx("span", {
									className: "text-sm text-muted",
									children: row.description
								})]
							})
						]
					}, row.id);
				})
			}),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				loading: form.processing,
				children: "Сохранить стиль"
			})
		]
	});
}
//#endregion
export { ClinicCardAppearance as default };

//# sourceMappingURL=ClinicCardAppearance-DCm0FI1y.js.map