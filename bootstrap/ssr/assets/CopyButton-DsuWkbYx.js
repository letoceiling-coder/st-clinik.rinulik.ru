import { n as Button } from "./Button-D8Mzgn6o.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/CopyButton.tsx
function CopyButton({ value, label = "Копировать", size = "sm" }) {
	const [copied, setCopied] = useState(false);
	const copy = () => {
		navigator.clipboard?.writeText(value).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	};
	return /* @__PURE__ */ jsx(Button, {
		type: "button",
		size,
		variant: "outline",
		icon: copied ? "check" : void 0,
		onClick: copy,
		children: copied ? "Скопировано" : label
	});
}
function CopyLink({ label, value }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "copy-link",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "copy-link__label text-xs text-muted",
				children: label
			}),
			/* @__PURE__ */ jsx("code", {
				className: "copy-link__value",
				children: value
			}),
			/* @__PURE__ */ jsx(CopyButton, { value })
		]
	});
}
//#endregion
export { CopyLink as n, CopyButton as t };

//# sourceMappingURL=CopyButton-DsuWkbYx.js.map