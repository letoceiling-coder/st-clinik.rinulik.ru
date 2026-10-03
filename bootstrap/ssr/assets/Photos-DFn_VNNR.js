import { n as Button } from "./Button-D4s3iLUi.js";
import { S as TextField, b as SelectField, l as EmptyState } from "../app.js";
import { r as PhotoArt } from "./PhotoArt-Ds-2t9uu.js";
import { a as StatusBadge, r as PageHead } from "./Dash-CaoYUPpG.js";
import { router, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Photos.tsx
function Photos({ photos, kinds }) {
	const form = useForm({
		photo: null,
		kind: "interior",
		caption: ""
	});
	const submit = (e) => {
		e.preventDefault();
		form.post("/clinic-cabinet/photos", {
			forceFormData: true,
			onSuccess: () => form.reset("photo", "caption")
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Фотографии",
				text: "JPG, PNG или WebP до 5 МБ, минимум 600×400. Фото проходят модерацию."
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card form-grid",
				onSubmit: submit,
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "field",
						children: [
							/* @__PURE__ */ jsx("label", {
								className: "field__label",
								htmlFor: "photo",
								children: "Файл"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "photo",
								className: "input",
								type: "file",
								accept: "image/*",
								onChange: (e) => form.setData("photo", e.target.files?.[0] ?? null)
							}),
							form.errors.photo ? /* @__PURE__ */ jsx("p", {
								className: "field__error",
								children: form.errors.photo
							}) : null
						]
					}),
					/* @__PURE__ */ jsx(SelectField, {
						label: "Тип",
						value: form.data.kind,
						onChange: (e) => form.setData("kind", e.target.value),
						children: Object.entries(kinds).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Подпись",
						value: form.data.caption,
						onChange: (e) => form.setData("caption", e.target.value)
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						children: "Загрузить"
					})
				]
			}),
			photos.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Фото ещё нет" }) : /* @__PURE__ */ jsx("div", {
				className: "photo-grid",
				children: photos.map((p) => /* @__PURE__ */ jsxs("figure", {
					className: "card stack",
					children: [
						p.url ? /* @__PURE__ */ jsx("img", {
							className: "photo-tile",
							src: p.url,
							alt: ""
						}) : /* @__PURE__ */ jsx("div", {
							className: "photo-tile",
							children: /* @__PURE__ */ jsx(PhotoArt, {
								seed: p.art_seed,
								kind: p.kind
							})
						}),
						/* @__PURE__ */ jsx(StatusBadge, { status: p.status }),
						/* @__PURE__ */ jsxs("span", {
							className: "text-sm",
							children: [kinds[p.kind] ?? p.kind, p.caption ? ` · ${p.caption}` : ""]
						}),
						/* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => router.delete(`/clinic-cabinet/photos/${p.id}`),
							children: "Удалить"
						})
					]
				}, p.id))
			})
		]
	});
}
//#endregion
export { Photos as default };

//# sourceMappingURL=Photos-DFn_VNNR.js.map