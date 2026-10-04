import { n as Button } from "./Button-DsM_qe4F.js";
import { b as TextArea, g as Check, x as TextField } from "../app.js";
import { r as PageHead } from "./Dash-BUI7tnGJ.js";
import { t as FileDropzone } from "./FileDropzone-Cv2Y8hOy.js";
import { useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/DoctorForm.tsx
function DoctorForm({ doctorForm, specialties, weekdays }) {
	const d = doctorForm ?? {};
	const photoUrl = d.photo_url ?? null;
	const form = useForm({
		name: d.name ?? "",
		position: d.position ?? "",
		experience_years: d.experience_years ?? "",
		bio: d.bio ?? "",
		education: (d.education ?? [""]).join("\n"),
		achievements: (d.achievements ?? [""]).join("\n"),
		schedule_days: d.schedule_days ?? [],
		accepts_children: Boolean(d.accepts_children),
		children_age_from: d.children_age_from ?? "",
		consult_price: d.consult_price ?? "",
		specialty_ids: (d.specialty_ids ?? []).map(String),
		photo: null,
		remove_photo: false
	});
	const submit = (e) => {
		e.preventDefault();
		const payload = {
			...form.data,
			education: String(form.data.education).split("\n").map((s) => s.trim()).filter(Boolean),
			achievements: String(form.data.achievements).split("\n").map((s) => s.trim()).filter(Boolean),
			specialty_ids: form.data.specialty_ids.map(Number)
		};
		const opts = { forceFormData: true };
		if (d.id) {
			form.transform(() => ({
				...payload,
				_method: "put"
			}));
			form.post(`/clinic-cabinet/doctors/${d.id}`, opts);
		} else {
			form.transform(() => payload);
			form.post("/clinic-cabinet/doctors", opts);
		}
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "card stack",
		onSubmit: submit,
		children: [
			/* @__PURE__ */ jsx(PageHead, { title: d.id ? "Редактирование врача" : "Новый врач" }),
			/* @__PURE__ */ jsx(FileDropzone, {
				label: "Фото врача",
				hint: "JPG, PNG или WebP до 5 МБ. Квадратное фото смотрится лучше всего.",
				accept: "image/*",
				value: form.data.photo,
				onChange: (file) => {
					form.setData("photo", file);
					if (file) form.setData("remove_photo", false);
				},
				previewUrl: form.data.photo || form.data.remove_photo ? null : photoUrl,
				error: form.errors.photo
			}),
			photoUrl && !form.data.photo ? /* @__PURE__ */ jsx(Check, {
				label: "Удалить текущее фото",
				checked: form.data.remove_photo,
				onChange: (e) => form.setData("remove_photo", e.target.checked)
			}) : null,
			/* @__PURE__ */ jsx(TextField, {
				label: "ФИО",
				required: true,
				value: form.data.name,
				onChange: (e) => form.setData("name", e.target.value),
				error: form.errors.name
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Должность",
				required: true,
				value: form.data.position,
				onChange: (e) => form.setData("position", e.target.value),
				error: form.errors.position
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Стаж, лет",
				type: "number",
				required: true,
				value: form.data.experience_years,
				onChange: (e) => form.setData("experience_years", e.target.value),
				error: form.errors.experience_years
			}),
			/* @__PURE__ */ jsx(TextField, {
				label: "Приём от, ₽",
				type: "number",
				value: form.data.consult_price,
				onChange: (e) => form.setData("consult_price", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "О враче",
				value: form.data.bio,
				onChange: (e) => form.setData("bio", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "Образование (с новой строки)",
				value: form.data.education,
				onChange: (e) => form.setData("education", e.target.value)
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "Достижения (с новой строки)",
				value: form.data.achievements,
				onChange: (e) => form.setData("achievements", e.target.value)
			}),
			/* @__PURE__ */ jsx("div", {
				className: "check-grid",
				children: specialties.map((s) => /* @__PURE__ */ jsx(Check, {
					label: s.name,
					checked: form.data.specialty_ids.includes(String(s.id)),
					onChange: () => form.setData("specialty_ids", form.data.specialty_ids.includes(String(s.id)) ? form.data.specialty_ids.filter((x) => x !== String(s.id)) : [...form.data.specialty_ids, String(s.id)])
				}, s.id))
			}),
			form.errors.specialty_ids ? /* @__PURE__ */ jsx("p", {
				className: "field__error",
				children: form.errors.specialty_ids
			}) : null,
			/* @__PURE__ */ jsx("div", {
				className: "check-grid",
				children: Object.entries(weekdays).map(([k, v]) => /* @__PURE__ */ jsx(Check, {
					label: v,
					checked: form.data.schedule_days.includes(k),
					onChange: () => form.setData("schedule_days", form.data.schedule_days.includes(k) ? form.data.schedule_days.filter((x) => x !== k) : [...form.data.schedule_days, k])
				}, k))
			}),
			/* @__PURE__ */ jsx(Check, {
				label: "Принимает детей",
				checked: form.data.accepts_children,
				onChange: (e) => form.setData("accepts_children", e.target.checked)
			}),
			form.data.accepts_children ? /* @__PURE__ */ jsx(TextField, {
				label: "С какого возраста",
				type: "number",
				value: form.data.children_age_from,
				onChange: (e) => form.setData("children_age_from", e.target.value)
			}) : null,
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				loading: form.processing,
				children: "Сохранить"
			})
		]
	});
}
//#endregion
export { DoctorForm as default };

//# sourceMappingURL=DoctorForm-y2xX5PdK.js.map