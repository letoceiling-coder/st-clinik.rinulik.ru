import { o as money } from "./format-BPZIj7DQ.js";
import { n as Button, t as AnchorButton } from "./Button-DsM_qe4F.js";
import { C as TextField, a as Alert, l as EmptyState, x as SelectField, y as Check } from "../app.js";
import { o as Table, r as PageHead } from "./Dash-C-3tSNHh.js";
import { t as FileDropzone } from "./FileDropzone-Cv2Y8hOy.js";
import { router, useForm, usePage } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Prices.tsx
function Prices({ prices, services }) {
	const { flash } = usePage().props;
	const form = useForm({
		service_id: "",
		price_from: "",
		price_to: "",
		is_promo: false,
		note: ""
	});
	const importForm = useForm({ file: null });
	const add = (e) => {
		e.preventDefault();
		form.post("/clinic-cabinet/prices", { onSuccess: () => form.reset() });
	};
	const importFile = (e) => {
		e.preventDefault();
		if (!importForm.data.file) return;
		importForm.post("/clinic-cabinet/prices/import", {
			forceFormData: true,
			preserveScroll: true,
			onSuccess: () => importForm.reset("file")
		});
	};
	const report = flash.import_report;
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Услуги и прайс",
				text: "Публикуем цену «от». Пациенту объясняем, что итог — после осмотра.",
				action: /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					style: { gap: 8 },
					children: [/* @__PURE__ */ jsx(AnchorButton, {
						href: "/clinic-cabinet/prices/template",
						variant: "outline",
						size: "sm",
						download: "price-list-template.xlsx",
						children: "Образец Excel"
					}), /* @__PURE__ */ jsx(AnchorButton, {
						href: "/clinic-cabinet/prices/export",
						variant: "outline",
						size: "sm",
						children: "Выгрузить Excel"
					})]
				})
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					className: "text-lg",
					children: "Импорт из Excel"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: "На листе «Прайс» выберите услугу из выпадающего списка — специализация и код подставятся автоматически. Справочник значений — на листе «Справочник услуг». Существующие позиции обновятся, новые добавятся."
				})] }), /* @__PURE__ */ jsxs("form", {
					className: "stack",
					onSubmit: importFile,
					children: [/* @__PURE__ */ jsx(FileDropzone, {
						label: "Excel-файл",
						hint: "Только .xlsx, до 5 МБ",
						accept: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						value: importForm.data.file,
						onChange: (file) => importForm.setData("file", file),
						error: importForm.errors.file
					}), /* @__PURE__ */ jsx("div", {
						className: "row row--wrap",
						style: { gap: 8 },
						children: /* @__PURE__ */ jsx(Button, {
							type: "submit",
							loading: importForm.processing,
							disabled: !importForm.data.file,
							children: "Загрузить прайс"
						})
					})]
				})]
			}),
			report ? /* @__PURE__ */ jsxs("div", {
				className: "stack",
				children: [/* @__PURE__ */ jsxs(Alert, {
					tone: report.errors.length ? "warning" : "success",
					icon: report.errors.length ? "alert" : "check-circle",
					children: [
						"Добавлено: ",
						report.created,
						" · обновлено: ",
						report.updated,
						" · пропущено: ",
						report.skipped
					]
				}), report.errors.length > 0 ? /* @__PURE__ */ jsxs("div", {
					className: "card stack",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "text-sm",
						children: "Ошибки по строкам"
					}), /* @__PURE__ */ jsx("ul", {
						className: "import-errors",
						children: report.errors.map((item) => /* @__PURE__ */ jsxs("li", { children: [
							/* @__PURE__ */ jsxs("b", { children: [
								"Строка ",
								item.row,
								":"
							] }),
							" ",
							item.message
						] }, `${item.row}-${item.message}`))
					})]
				}) : null]
			}) : null,
			/* @__PURE__ */ jsxs("form", {
				className: "card form-grid",
				onSubmit: add,
				children: [
					/* @__PURE__ */ jsxs(SelectField, {
						label: "Услуга",
						required: true,
						value: form.data.service_id,
						onChange: (e) => form.setData("service_id", e.target.value),
						error: form.errors.service_id,
						children: [/* @__PURE__ */ jsx("option", {
							value: "",
							children: "Выберите"
						}), services.map((s) => /* @__PURE__ */ jsxs("option", {
							value: s.id,
							children: [s.specialty ? `${s.specialty} · ` : "", s.name]
						}, s.id))]
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Цена от, ₽",
						type: "number",
						required: true,
						value: form.data.price_from,
						onChange: (e) => form.setData("price_from", e.target.value),
						error: form.errors.price_from
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "До, ₽",
						type: "number",
						value: form.data.price_to,
						onChange: (e) => form.setData("price_to", e.target.value)
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Пометка",
						value: form.data.note,
						onChange: (e) => form.setData("note", e.target.value)
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Акция",
						checked: form.data.is_promo,
						onChange: (e) => form.setData("is_promo", e.target.checked)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						children: "Добавить"
					})
				]
			}),
			prices.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Прайс пуст" }) : /* @__PURE__ */ jsx(Table, {
				headers: [
					"Услуга",
					"От",
					"До",
					""
				],
				children: prices.map((p) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsxs("td", { children: [
						p.specialty ? /* @__PURE__ */ jsxs("span", {
							className: "text-xs text-muted",
							children: [p.specialty, /* @__PURE__ */ jsx("br", {})]
						}) : null,
						p.name,
						p.is_promo ? " · акция" : "",
						p.note ? /* @__PURE__ */ jsx("div", {
							className: "text-xs text-muted",
							children: p.note
						}) : null
					] }),
					/* @__PURE__ */ jsx("td", { children: money(p.price_from) }),
					/* @__PURE__ */ jsx("td", { children: p.price_to ? money(p.price_to) : "—" }),
					/* @__PURE__ */ jsx("td", {
						className: "actions",
						children: /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => router.delete(`/clinic-cabinet/prices/${p.id}`),
							children: "Удалить"
						})
					})
				] }, p.id))
			})
		]
	});
}
//#endregion
export { Prices as default };

//# sourceMappingURL=Prices-BMwLlTcw.js.map