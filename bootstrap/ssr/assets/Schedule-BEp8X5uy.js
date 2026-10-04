import { n as Button } from "./Button-D8Mzgn6o.js";
import { g as Check, x as TextField } from "../app.js";
import { r as PageHead } from "./Dash-BbiOlhfn.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Schedule.tsx
function Schedule({ days, is_24_7, same_day }) {
	const form = useForm({
		is_24_7,
		same_day,
		days: Object.fromEntries(days.map((d) => [d.key, {
			enabled: d.enabled,
			open: d.open ?? "09:00",
			close: d.close ?? "21:00"
		}]))
	});
	const submit = (e) => {
		e.preventDefault();
		form.put("/clinic-cabinet/schedule");
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "card stack",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(PageHead, { title: "График работы" }),
			/* @__PURE__ */ jsx(Check, {
				label: "Круглосуточно",
				checked: form.data.is_24_7,
				onChange: (e) => form.setData("is_24_7", e.target.checked)
			}),
			/* @__PURE__ */ jsx(Check, {
				label: "Можно записаться на сегодня",
				checked: form.data.same_day,
				onChange: (e) => form.setData("same_day", e.target.checked)
			}),
			days.map((d) => /* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				children: [
					/* @__PURE__ */ jsx(Check, {
						label: d.label,
						checked: form.data.days[d.key]?.enabled,
						onChange: (e) => form.setData("days", {
							...form.data.days,
							[d.key]: {
								...form.data.days[d.key],
								enabled: e.target.checked
							}
						})
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "С",
						type: "time",
						value: form.data.days[d.key]?.open ?? "",
						onChange: (e) => form.setData("days", {
							...form.data.days,
							[d.key]: {
								...form.data.days[d.key],
								open: e.target.value
							}
						})
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "До",
						type: "time",
						value: form.data.days[d.key]?.close ?? "",
						onChange: (e) => form.setData("days", {
							...form.data.days,
							[d.key]: {
								...form.data.days[d.key],
								close: e.target.value
							}
						})
					})
				]
			}, d.key)),
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				loading: form.processing,
				children: "Сохранить график"
			})
		]
	});
}
//#endregion
export { Schedule as default };

//# sourceMappingURL=Schedule-BEp8X5uy.js.map