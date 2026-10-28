import { n as Button } from "./Button-C2BxTtRt.js";
import { r as PageHead } from "./Dash-cIdZIfDR.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Geography.tsx
function Geography({ stats, csv_help }) {
	const form = useForm({ file: null });
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "География",
				text: "Регионы — в справочнике «Регионы». Массовый импорт городов и районов из CSV."
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card row row--wrap",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "text-muted text-sm",
						children: "Регионов"
					}), /* @__PURE__ */ jsx("div", {
						className: "text-xl font-semibold",
						children: stats.regions
					})] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "text-muted text-sm",
						children: "Городов"
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xl font-semibold",
						children: [
							stats.cities,
							" ",
							/* @__PURE__ */ jsxs("span", {
								className: "text-sm text-muted",
								children: [
									"(",
									stats.cities_active,
									" активных)"
								]
							})
						]
					})] }),
					/* @__PURE__ */ jsx("a", {
						className: "link text-sm",
						href: "/admin/dictionaries/regions",
						children: "Справочник регионов"
					})
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: [
					"Карта и реклама на сайте — в",
					" ",
					/* @__PURE__ */ jsx("a", {
						href: "/admin/site-display",
						className: "link",
						children: "«Сайт: карта и реклама»"
					}),
					"."
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					if (!form.data.file) return;
					form.post("/admin/geography/import", { forceFormData: true });
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Импорт городов (CSV)"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: csv_help
					}),
					/* @__PURE__ */ jsx("input", {
						type: "file",
						accept: ".csv,text/csv",
						onChange: (e) => form.setData("file", e.target.files?.[0] ?? null)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						disabled: !form.data.file,
						children: "Загрузить"
					})
				]
			})
		]
	});
}
//#endregion
export { Geography as default };

//# sourceMappingURL=Geography-CLWmIgQr.js.map