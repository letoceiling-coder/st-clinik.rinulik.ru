import { n as Button } from "./Button-DsM_qe4F.js";
import { S as TextField, b as SelectField, l as EmptyState } from "../app.js";
import { r as PhotoArt } from "./PhotoArt-Cckquo9q.js";
import { a as StatusBadge, r as PageHead } from "./Dash-C-3tSNHh.js";
import { t as FileDropzone } from "./FileDropzone-Cv2Y8hOy.js";
import { router, useForm } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
//#region resources/js/pages/Cabinet/Photos.tsx
function PhotoCard({ photo, kinds }) {
	const [open, setOpen] = useState(false);
	const form = useForm({
		kind: photo.kind,
		caption: photo.caption ?? "",
		photo: null
	});
	const save = (event) => {
		event.preventDefault();
		form.transform((data) => ({
			...data,
			_method: "put"
		})).post(`/clinic-cabinet/photos/${photo.id}`, {
			forceFormData: true,
			preserveScroll: true,
			onSuccess: () => {
				form.reset("photo");
				setOpen(false);
			}
		});
	};
	return /* @__PURE__ */ jsxs("figure", {
		className: "photo-card card stack",
		children: [
			photo.url ? /* @__PURE__ */ jsx("img", {
				className: "photo-tile",
				src: photo.url,
				alt: photo.caption ?? kinds[photo.kind] ?? ""
			}) : /* @__PURE__ */ jsx("div", {
				className: "photo-tile",
				children: /* @__PURE__ */ jsx(PhotoArt, {
					seed: photo.art_seed,
					kind: photo.kind
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "photo-card__meta",
				children: [/* @__PURE__ */ jsx(StatusBadge, { status: photo.status }), /* @__PURE__ */ jsxs("span", {
					className: "text-sm",
					children: [kinds[photo.kind] ?? photo.kind, photo.caption ? ` · ${photo.caption}` : ""]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "photo-card__actions",
				children: [/* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: open ? "primary" : "outline",
					type: "button",
					onClick: () => setOpen((v) => !v),
					children: open ? "Свернуть" : "Редактировать"
				}), /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: "ghost",
					type: "button",
					onClick: () => router.delete(`/clinic-cabinet/photos/${photo.id}`),
					children: "Удалить"
				})]
			}),
			open ? /* @__PURE__ */ jsxs("form", {
				className: "photo-card__edit stack",
				onSubmit: save,
				children: [
					/* @__PURE__ */ jsx(SelectField, {
						label: "Тип",
						value: form.data.kind,
						onChange: (e) => form.setData("kind", e.target.value),
						error: form.errors.kind,
						children: Object.entries(kinds).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Подпись",
						value: form.data.caption,
						maxLength: 120,
						placeholder: "Краткое описание фото для каталога",
						onChange: (e) => form.setData("caption", e.target.value),
						error: form.errors.caption,
						hint: `${form.data.caption.length}/120`
					}),
					/* @__PURE__ */ jsx(FileDropzone, {
						label: "Заменить файл",
						hint: "Оставьте пустым, если меняете только тип или подпись",
						accept: "image/*",
						value: form.data.photo,
						onChange: (file) => form.setData("photo", file),
						previewUrl: form.data.photo ? null : photo.url,
						error: form.errors.photo,
						compact: true
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "photo-card__edit-actions",
						children: [/* @__PURE__ */ jsx(Button, {
							type: "submit",
							size: "sm",
							loading: form.processing,
							children: "Сохранить"
						}), /* @__PURE__ */ jsx(Button, {
							type: "button",
							size: "sm",
							variant: "ghost",
							onClick: () => {
								form.reset();
								form.clearErrors();
								setOpen(false);
							},
							children: "Отмена"
						})]
					})
				]
			}) : null
		]
	});
}
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
					/* @__PURE__ */ jsx(FileDropzone, {
						className: "span-2",
						label: "Файл",
						hint: "JPG, PNG или WebP · до 5 МБ · минимум 600×400 px",
						accept: "image/*",
						value: form.data.photo,
						onChange: (file) => form.setData("photo", file),
						error: form.errors.photo
					}),
					/* @__PURE__ */ jsx(SelectField, {
						label: "Тип",
						value: form.data.kind,
						onChange: (e) => form.setData("kind", e.target.value),
						error: form.errors.kind,
						children: Object.entries(kinds).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Подпись",
						value: form.data.caption,
						maxLength: 120,
						placeholder: "Например: Ресепшен и зона ожидания",
						onChange: (e) => form.setData("caption", e.target.value),
						error: form.errors.caption,
						hint: `${form.data.caption.length}/120`
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						className: "span-2",
						loading: form.processing,
						disabled: !form.data.photo,
						children: "Загрузить"
					})
				]
			}),
			photos.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Фото ещё нет" }) : /* @__PURE__ */ jsx("div", {
				className: "photo-grid photo-grid--manage",
				children: photos.map((p) => /* @__PURE__ */ jsx(PhotoCard, {
					photo: p,
					kinds
				}, p.id))
			})
		]
	});
}
//#endregion
export { Photos as default };

//# sourceMappingURL=Photos-C-gDl9yE.js.map