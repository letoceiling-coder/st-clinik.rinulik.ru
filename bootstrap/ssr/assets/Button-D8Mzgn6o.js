import { t as Icon } from "./Icon-DQahs-u2.js";
import { n as cx } from "./format-BPZIj7DQ.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/ui/Button.tsx
var classes = ({ variant = "primary", size = "md", block, loading }, extra) => cx("btn", `btn--${variant}`, size !== "md" && `btn--${size}`, block && "btn--block", loading && "is-loading", extra);
function Button({ variant, size, block, icon, iconRight, loading, children, className, type = "button", disabled, ...rest }) {
	return /* @__PURE__ */ jsxs("button", {
		type,
		className: classes({
			variant,
			size,
			block,
			loading
		}, className),
		disabled: disabled || loading,
		"aria-busy": loading || void 0,
		...rest,
		children: [
			loading ? /* @__PURE__ */ jsx("span", {
				className: "spinner",
				"aria-hidden": "true"
			}) : icon ? /* @__PURE__ */ jsx(Icon, {
				name: icon,
				size: size === "sm" ? 18 : 20
			}) : null,
			children,
			iconRight ? /* @__PURE__ */ jsx(Icon, {
				name: iconRight,
				size: size === "sm" ? 18 : 20
			}) : null
		]
	});
}
function LinkButton({ variant, size, block, icon, iconRight, children, className, ...rest }) {
	return /* @__PURE__ */ jsxs(Link, {
		className: classes({
			variant,
			size,
			block
		}, className),
		...rest,
		children: [
			icon ? /* @__PURE__ */ jsx(Icon, {
				name: icon,
				size: size === "sm" ? 18 : 20
			}) : null,
			children,
			iconRight ? /* @__PURE__ */ jsx(Icon, {
				name: iconRight,
				size: size === "sm" ? 18 : 20
			}) : null
		]
	});
}
function AnchorButton({ variant, size, block, icon, iconRight, children, className, ...rest }) {
	return /* @__PURE__ */ jsxs("a", {
		className: classes({
			variant,
			size,
			block
		}, className),
		...rest,
		children: [
			icon ? /* @__PURE__ */ jsx(Icon, {
				name: icon,
				size: size === "sm" ? 18 : 20
			}) : null,
			children,
			iconRight ? /* @__PURE__ */ jsx(Icon, {
				name: iconRight,
				size: size === "sm" ? 18 : 20
			}) : null
		]
	});
}
function IconButton({ icon, label, variant = "ghost", round, className, pressed, ...rest }) {
	return /* @__PURE__ */ jsx("button", {
		type: "button",
		className: cx("btn", `btn--${variant}`, "btn--icon", round && "btn--round", className),
		"aria-label": label,
		title: label,
		"aria-pressed": pressed,
		...rest,
		children: /* @__PURE__ */ jsx(Icon, {
			name: icon,
			size: 20
		})
	});
}
//#endregion
export { LinkButton as i, Button as n, IconButton as r, AnchorButton as t };

//# sourceMappingURL=Button-D8Mzgn6o.js.map