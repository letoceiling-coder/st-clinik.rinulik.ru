import { n as Button } from "./Button-D8Mzgn6o.js";
import { b as TextArea, g as Check, l as EmptyState, s as Badge, x as TextField, y as SelectField } from "../app.js";
import { o as StatusBadge, r as PageHead } from "./Dash-BbiOlhfn.js";
import { t as FileDropzone } from "./FileDropzone-PX-lgEUM.js";
import { router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Posts.tsx
function PostCard({ post, types }) {
	const [open, setOpen] = useState(false);
	const form = useForm({
		type: post.type,
		title: post.title,
		excerpt: post.excerpt ?? "",
		body: post.body,
		starts_at: post.starts_at ?? "",
		ends_at: post.ends_at ?? "",
		is_pinned: post.is_pinned,
		image: null,
		remove_image: false
	});
	const save = (event) => {
		event.preventDefault();
		form.transform((data) => ({
			...data,
			_method: "put"
		})).post(`/clinic-cabinet/posts/${post.id}`, {
			forceFormData: true,
			preserveScroll: true,
			onSuccess: () => {
				form.reset("image");
				form.setData("remove_image", false);
				setOpen(false);
			}
		});
	};
	return /* @__PURE__ */ jsxs("article", {
		className: "post-card card stack",
		children: [
			post.image_url ? /* @__PURE__ */ jsx("img", {
				className: "post-card__image",
				src: post.image_url,
				alt: ""
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				style: { gap: 8 },
				children: [
					/* @__PURE__ */ jsx(Badge, {
						tone: post.type === "promo" ? "warning" : "primary",
						children: types[post.type] ?? post.type
					}),
					post.is_pinned ? /* @__PURE__ */ jsx(Badge, {
						tone: "success",
						children: "Закреплено"
					}) : null,
					/* @__PURE__ */ jsx(StatusBadge, { status: post.status })
				]
			}),
			/* @__PURE__ */ jsx("h3", {
				className: "post-card__title",
				children: post.title
			}),
			post.excerpt ? /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				children: post.excerpt
			}) : null,
			/* @__PURE__ */ jsxs("p", {
				className: "text-xs text-muted",
				children: [post.published_at, post.ends_at ? ` · до ${post.ends_at.split("-").reverse().join(".")}` : ""]
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
					onClick: () => router.delete(`/clinic-cabinet/posts/${post.id}`),
					children: "Удалить"
				})]
			}),
			open ? /* @__PURE__ */ jsxs("form", {
				className: "photo-card__edit stack",
				onSubmit: save,
				children: [
					/* @__PURE__ */ jsx(SelectField, {
						label: "Тип",
						value: form.data.type,
						onChange: (e) => form.setData("type", e.target.value),
						error: form.errors.type,
						children: Object.entries(types).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Заголовок",
						required: true,
						value: form.data.title,
						onChange: (e) => form.setData("title", e.target.value),
						error: form.errors.title
					}),
					/* @__PURE__ */ jsx(TextField, {
						label: "Краткое описание",
						value: form.data.excerpt,
						maxLength: 400,
						onChange: (e) => form.setData("excerpt", e.target.value),
						error: form.errors.excerpt,
						hint: `${form.data.excerpt.length}/400`
					}),
					/* @__PURE__ */ jsx(TextArea, {
						label: "Текст",
						required: true,
						rows: 6,
						value: form.data.body,
						onChange: (e) => form.setData("body", e.target.value),
						error: form.errors.body
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "form-grid",
						children: [/* @__PURE__ */ jsx(TextField, {
							label: "Публикация с",
							type: "date",
							value: form.data.starts_at,
							onChange: (e) => form.setData("starts_at", e.target.value),
							error: form.errors.starts_at
						}), /* @__PURE__ */ jsx(TextField, {
							label: "Действует до",
							type: "date",
							value: form.data.ends_at,
							onChange: (e) => form.setData("ends_at", e.target.value),
							error: form.errors.ends_at,
							hint: "Для акций — дата окончания"
						})]
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Закрепить вверху списка",
						checked: form.data.is_pinned,
						onChange: (e) => form.setData("is_pinned", e.target.checked)
					}),
					/* @__PURE__ */ jsx(FileDropzone, {
						label: "Обложка",
						hint: "JPG, PNG или WebP до 5 МБ",
						accept: "image/*",
						value: form.data.image,
						onChange: (file) => {
							form.setData("image", file);
							if (file) form.setData("remove_image", false);
						},
						previewUrl: form.data.image || form.data.remove_image ? null : post.image_url,
						error: form.errors.image,
						compact: true
					}),
					post.image_url && !form.data.image ? /* @__PURE__ */ jsx(Check, {
						label: "Удалить текущую обложку",
						checked: form.data.remove_image,
						onChange: (e) => form.setData("remove_image", e.target.checked)
					}) : null,
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
function Posts({ posts, types }) {
	const form = useForm({
		type: "news",
		title: "",
		excerpt: "",
		body: "",
		starts_at: "",
		ends_at: "",
		is_pinned: false,
		image: null
	});
	const submit = (event) => {
		event.preventDefault();
		form.post("/clinic-cabinet/posts", {
			forceFormData: true,
			onSuccess: () => form.reset()
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Новости и акции",
				text: "Публикуйте новости клиники, акции и полезную информацию для пациентов. Материалы отображаются на странице клиники на сайте."
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: submit,
				children: [/* @__PURE__ */ jsxs("div", {
					className: "form-grid",
					children: [
						/* @__PURE__ */ jsx(SelectField, {
							label: "Тип",
							value: form.data.type,
							onChange: (e) => form.setData("type", e.target.value),
							error: form.errors.type,
							children: Object.entries(types).map(([k, v]) => /* @__PURE__ */ jsx("option", {
								value: k,
								children: v
							}, k))
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Заголовок",
							required: true,
							value: form.data.title,
							onChange: (e) => form.setData("title", e.target.value),
							error: form.errors.title
						}),
						/* @__PURE__ */ jsx(TextField, {
							className: "span-2",
							label: "Краткое описание",
							value: form.data.excerpt,
							maxLength: 400,
							onChange: (e) => form.setData("excerpt", e.target.value),
							error: form.errors.excerpt,
							hint: `${form.data.excerpt.length}/400 · показывается в карточке на сайте`
						}),
						/* @__PURE__ */ jsx("div", {
							className: "span-2",
							children: /* @__PURE__ */ jsx(TextArea, {
								label: "Текст",
								required: true,
								rows: 6,
								value: form.data.body,
								onChange: (e) => form.setData("body", e.target.value),
								error: form.errors.body
							})
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Публикация с",
							type: "date",
							value: form.data.starts_at,
							onChange: (e) => form.setData("starts_at", e.target.value),
							error: form.errors.starts_at
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Действует до",
							type: "date",
							value: form.data.ends_at,
							onChange: (e) => form.setData("ends_at", e.target.value),
							error: form.errors.ends_at
						}),
						/* @__PURE__ */ jsx("div", {
							className: "span-2",
							children: /* @__PURE__ */ jsx(Check, {
								label: "Закрепить вверху списка",
								checked: form.data.is_pinned,
								onChange: (e) => form.setData("is_pinned", e.target.checked)
							})
						}),
						/* @__PURE__ */ jsx(FileDropzone, {
							className: "span-2",
							label: "Обложка",
							hint: "Необязательно · JPG, PNG или WebP до 5 МБ",
							accept: "image/*",
							value: form.data.image,
							onChange: (file) => form.setData("image", file),
							error: form.errors.image
						})
					]
				}), /* @__PURE__ */ jsx(Button, {
					type: "submit",
					loading: form.processing,
					children: "Опубликовать"
				})]
			}),
			posts.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
				title: "Публикаций пока нет",
				text: "Добавьте новость или акцию — она появится на странице клиники."
			}) : /* @__PURE__ */ jsx("div", {
				className: "post-grid",
				children: posts.map((post) => /* @__PURE__ */ jsx(PostCard, {
					post,
					types
				}, post.id))
			})
		]
	});
}
//#endregion
export { Posts as default };

//# sourceMappingURL=Posts-CTVSdaPS.js.map