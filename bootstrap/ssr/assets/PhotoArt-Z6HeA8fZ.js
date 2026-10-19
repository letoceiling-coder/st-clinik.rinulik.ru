import { n as cx } from "./format-BPZIj7DQ.js";
import { n as doctorPhoto, t as clinicPhoto } from "./demo-images-BOCchIKZ.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/PhotoArt.tsx
var ASPECT_DIMS = {
	"4/3": {
		width: 960,
		height: 720
	},
	"1/1": {
		width: 640,
		height: 640
	},
	"16/10": {
		width: 960,
		height: 600
	}
};
function DemoImg({ src, alt, className, loading, aspect = "4/3", width, height, fetchPriority }) {
	const fallbackDims = aspect !== "unset" ? ASPECT_DIMS[aspect] : ASPECT_DIMS["4/3"];
	const imgWidth = width ?? fallbackDims?.width ?? 960;
	const imgHeight = height ?? fallbackDims?.height ?? 720;
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	return /* @__PURE__ */ jsxs("span", {
		className: cx("demo-photo", !ready && "demo-photo--loading", className),
		style: aspect === "unset" ? void 0 : { aspectRatio: aspect },
		children: [!ready && !failed ? /* @__PURE__ */ jsx("span", {
			className: "demo-photo__skeleton skeleton",
			"aria-hidden": "true"
		}) : null, /* @__PURE__ */ jsx("img", {
			src,
			alt: alt ?? "",
			width: imgWidth,
			height: imgHeight,
			loading: loading ?? "lazy",
			decoding: "async",
			fetchPriority,
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
function DoctorArt({ seed = 1, photoUrl, className, name }) {
	const src = photoUrl ?? doctorPhoto(seed);
	return /* @__PURE__ */ jsx(DemoImg, {
		src,
		alt: name ?? "Фото врача",
		className,
		aspect: "1/1"
	});
}
//#endregion
export { DoctorArt as n, PhotoArt as r, DemoImg as t };

//# sourceMappingURL=PhotoArt-Z6HeA8fZ.js.map