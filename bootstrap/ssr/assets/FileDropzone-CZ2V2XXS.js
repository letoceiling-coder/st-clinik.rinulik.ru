import { t as Icon } from "./Icon-_sloiNX5.js";
import { n as cx } from "./format-BP5psl3Q.js";
import { useEffect, useId, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/ui/FileDropzone.tsx
/** Подходит ли файл под accept: расширения (.csv), точные MIME-типы и шаблоны вида image/*. */
function matchesAccept(file, accept) {
	const rules = accept.split(",").map((rule) => rule.trim().toLowerCase()).filter(Boolean);
	if (rules.length === 0) return true;
	const name = file.name.toLowerCase();
	const type = file.type.toLowerCase();
	return rules.some((rule) => {
		if (rule.startsWith(".")) return name.endsWith(rule);
		if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
		return type === rule;
	});
}
function pickFile(files, accept) {
	const file = files?.[0];
	return file && matchesAccept(file, accept) ? file : null;
}
function formatSize(bytes) {
	return bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} КБ` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}
function FileDropzone({ label = "Файл", hint, error, accept = "image/*", value, onChange, previewUrl, compact = false, className, title }) {
	const id = useId();
	const inputRef = useRef(null);
	const [dragging, setDragging] = useState(false);
	const [localPreview, setLocalPreview] = useState(null);
	useEffect(() => {
		if (!value || !value.type.startsWith("image/")) {
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
								name: value ? "file" : "upload",
								size: 22
							})
						}),
						/* @__PURE__ */ jsx("span", {
							className: "file-dropzone__title",
							children: dragging ? "Отпустите файл" : value ? value.name : title ?? (accept.startsWith("image/") ? "Перетащите фото сюда" : "Перетащите файл сюда")
						}),
						/* @__PURE__ */ jsx("span", {
							className: "file-dropzone__text",
							children: value ? `${formatSize(value.size)} · нажмите, чтобы заменить` : "или нажмите, чтобы выбрать"
						})
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

//# sourceMappingURL=FileDropzone-CZ2V2XXS.js.map