import { t as Icon } from "./Icon-DQahs-u2.js";
import { n as cx } from "./format-BPZIj7DQ.js";
import { useEffect, useId, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/ui/FileDropzone.tsx
function pickFile(files, accept) {
	const file = files?.[0];
	if (!file) return null;
	if (accept === "image/*" && !file.type.startsWith("image/")) return null;
	return file;
}
function FileDropzone({ label = "Файл", hint, error, accept = "image/*", value, onChange, previewUrl, compact = false, className }) {
	const id = useId();
	const inputRef = useRef(null);
	const [dragging, setDragging] = useState(false);
	const [localPreview, setLocalPreview] = useState(null);
	useEffect(() => {
		if (!value) {
			setLocalPreview(null);
			return;
		}
		const url = URL.createObjectURL(value);
		setLocalPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [value]);
	const preview = localPreview ?? previewUrl ?? null;
	const setFile = (file) => {
		onChange(file);
	};
	const onDrop = (event) => {
		event.preventDefault();
		setDragging(false);
		setFile(pickFile(event.dataTransfer.files, accept));
	};
	const onDragOver = (event) => {
		event.preventDefault();
		setDragging(true);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: cx("field", className),
		children: [
			label ? /* @__PURE__ */ jsx("label", {
				className: "field__label",
				htmlFor: id,
				children: label
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: cx("file-dropzone", compact && "file-dropzone--compact", dragging && "is-dragover", (value || preview) && "has-file", error && "is-invalid"),
				onDragEnter: onDragOver,
				onDragOver,
				onDragLeave: () => setDragging(false),
				onDrop,
				onClick: () => inputRef.current?.click(),
				onKeyDown: (event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						inputRef.current?.click();
					}
				},
				role: "button",
				tabIndex: 0,
				"aria-describedby": error ? `${id}-err` : hint ? `${id}-hint` : void 0,
				children: [/* @__PURE__ */ jsx("input", {
					ref: inputRef,
					id,
					type: "file",
					accept,
					className: "file-dropzone__input",
					onChange: (event) => setFile(pickFile(event.target.files, accept))
				}), preview ? /* @__PURE__ */ jsxs("div", {
					className: "file-dropzone__preview",
					children: [/* @__PURE__ */ jsx("img", {
						src: preview,
						alt: ""
					}), /* @__PURE__ */ jsxs("div", {
						className: "file-dropzone__overlay",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "upload",
							size: 20
						}), /* @__PURE__ */ jsx("span", { children: value ? value.name : "Заменить файл" })]
					})]
				}) : /* @__PURE__ */ jsxs("div", {
					className: "file-dropzone__body",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "file-dropzone__icon",
							"aria-hidden": "true",
							children: /* @__PURE__ */ jsx(Icon, {
								name: "upload",
								size: 22
							})
						}),
						/* @__PURE__ */ jsx("span", {
							className: "file-dropzone__title",
							children: dragging ? "Отпустите файл" : "Перетащите фото сюда"
						}),
						/* @__PURE__ */ jsx("span", {
							className: "file-dropzone__text",
							children: "или нажмите, чтобы выбрать"
						}),
						value ? /* @__PURE__ */ jsx("span", {
							className: "file-dropzone__name",
							children: value.name
						}) : null
					]
				})]
			}),
			value ? /* @__PURE__ */ jsx("button", {
				type: "button",
				className: "file-dropzone__clear link text-sm",
				onClick: (event) => {
					event.stopPropagation();
					setFile(null);
					if (inputRef.current) inputRef.current.value = "";
				},
				children: "Убрать файл"
			}) : null,
			error ? /* @__PURE__ */ jsx("p", {
				className: "field__error",
				id: `${id}-err`,
				role: "alert",
				children: error
			}) : hint ? /* @__PURE__ */ jsx("p", {
				className: "field__hint",
				id: `${id}-hint`,
				children: hint
			}) : null
		]
	});
}
//#endregion
export { FileDropzone as t };

//# sourceMappingURL=FileDropzone-PX-lgEUM.js.map