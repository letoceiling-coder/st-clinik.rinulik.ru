import { n as cx } from "./format-Cjg0FGVI.js";
import { n as clinicPhoto, r as doctorPhoto } from "./demo-images-CwyQSe03.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
//#region resources/js/components/PhotoArt.tsx
function DemoImg({ src, alt, className, loading, aspect = "4/3" }) {
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	return /* @__PURE__ */ jsxs("span", {
		className: cx("demo-photo", !ready && "demo-photo--loading", className),
		style: { aspectRatio: aspect },
		children: [!ready && !failed ? /* @__PURE__ */ jsx("span", {
			className: "demo-photo__skeleton skeleton",
			"aria-hidden": "true"
		}) : null, /* @__PURE__ */ jsx("img", {
			src,
			alt: alt ?? "",
			loading: loading ?? "lazy",
			decoding: "async",
			onLoad: () => setReady(true),
			onError: () => setFailed(true),
			className: cx("demo-photo__img", ready && "is-ready")
		})]
	});
}
function PhotoArt({ seed = 1, kind = "interior", label, className, priority }) {
	const src = clinicPhoto(seed, kind);
	return /* @__PURE__ */ jsx(DemoImg, {
		src,
		alt: label ?? "Фото клиники",
		className,
		loading: priority ? "eager" : "lazy",
		aspect: "4/3"
	});
}
function DoctorArt({ seed = 1, className, name }) {
	const src = doctorPhoto(seed);
	return /* @__PURE__ */ jsx(DemoImg, {
		src,
		alt: name ?? "Фото врача",
		className,
		aspect: "1/1"
	});
}
//#endregion
export { DoctorArt as n, PhotoArt as r, DemoImg as t };

//# sourceMappingURL=PhotoArt-Ds-2t9uu.js.map