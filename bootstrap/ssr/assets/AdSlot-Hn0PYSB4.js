import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
//#region resources/js/components/AdSlot.tsx
function AdSlot({ banners, label = "Реклама" }) {
	const tracked = useRef(/* @__PURE__ */ new Set());
	useEffect(() => {
		banners.forEach((b) => {
			if (tracked.current.has(b.id)) return;
			tracked.current.add(b.id);
			const img = new Image();
			img.src = b.impression_url;
		});
	}, [banners]);
	if (banners.length === 0) return null;
	return /* @__PURE__ */ jsxs("section", {
		className: "ad-slot",
		"aria-label": label,
		children: [/* @__PURE__ */ jsx("p", {
			className: "ad-slot__label",
			children: label
		}), /* @__PURE__ */ jsx("div", {
			className: "ad-slot__grid",
			children: banners.map((b) => /* @__PURE__ */ jsxs("a", {
				href: b.click_url,
				className: "ad-slot__banner",
				target: "_blank",
				rel: "noopener sponsored",
				children: [b.image_url ? /* @__PURE__ */ jsx("img", {
					src: b.image_url,
					alt: b.title ?? b.clinic_name ?? "Рекламный баннер",
					loading: "lazy"
				}) : null, /* @__PURE__ */ jsxs("span", {
					className: "ad-slot__meta",
					children: [b.title ?? b.clinic_name, /* @__PURE__ */ jsx("span", {
						className: "ad-slot__mark",
						children: "Реклама"
					})]
				})]
			}, b.id))
		})]
	});
}
//#endregion
export { AdSlot as t };

//# sourceMappingURL=AdSlot-Hn0PYSB4.js.map