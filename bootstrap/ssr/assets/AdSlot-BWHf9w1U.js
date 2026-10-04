import { n as cx } from "./format-BPZIj7DQ.js";
import { r as bannerSpecForSlot, t as BANNER_SLOT_CAPACITY } from "./banner-specs-BL8mmY3b.js";
import { Link } from "@inertiajs/react";
import { useEffect, useRef } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/AdSlot.tsx
function DemoBanner({ slot }) {
	const spec = bannerSpecForSlot(slot);
	const ratioLabel = slot === "home" ? "21:9" : "5:2";
	return /* @__PURE__ */ jsxs(Link, {
		href: "/for-clinics",
		className: "ad-slot__banner ad-slot__banner--demo",
		children: [/* @__PURE__ */ jsx("div", {
			className: "ad-slot__media",
			children: /* @__PURE__ */ jsxs("div", {
				className: "ad-slot__demo",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "ad-slot__demo-badge",
						children: "Демо"
					}),
					/* @__PURE__ */ jsx("strong", {
						className: "ad-slot__demo-title",
						children: "Рекламное место для клиники"
					}),
					/* @__PURE__ */ jsx("span", {
						className: "ad-slot__demo-text",
						children: spec.placementLabel
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "ad-slot__demo-size",
						children: ["Формат ", ratioLabel]
					})
				]
			})
		}), /* @__PURE__ */ jsxs("span", {
			className: "ad-slot__meta",
			children: ["Разместите баннер в личном кабинете", /* @__PURE__ */ jsx("span", {
				className: "ad-slot__mark",
				children: "Реклама"
			})]
		})]
	});
}
function AdSlot({ banners, label = "Реклама", slot = "home", demoWhenEmpty = true }) {
	const tracked = useRef(/* @__PURE__ */ new Set());
	const hasBanners = banners.length > 0;
	const demoCount = BANNER_SLOT_CAPACITY[slot];
	useEffect(() => {
		banners.forEach((b) => {
			if (tracked.current.has(b.id)) return;
			tracked.current.add(b.id);
			const img = new Image();
			img.src = b.impression_url;
		});
	}, [banners]);
	if (!hasBanners && !demoWhenEmpty) return null;
	return /* @__PURE__ */ jsxs("section", {
		className: cx("ad-slot", `ad-slot--${slot}`, !hasBanners && "ad-slot--demo-mode"),
		"aria-label": label,
		children: [/* @__PURE__ */ jsx("p", {
			className: "ad-slot__label",
			children: label
		}), /* @__PURE__ */ jsx("div", {
			className: "ad-slot__grid",
			children: hasBanners ? banners.map((b) => /* @__PURE__ */ jsxs("a", {
				href: b.click_url,
				className: "ad-slot__banner",
				target: "_blank",
				rel: "noopener sponsored",
				children: [/* @__PURE__ */ jsx("div", {
					className: "ad-slot__media",
					children: b.image_url ? /* @__PURE__ */ jsx("img", {
						src: b.image_url,
						alt: b.title ?? b.clinic_name ?? "Рекламный баннер",
						loading: "lazy",
						decoding: "async"
					}) : null
				}), /* @__PURE__ */ jsxs("span", {
					className: "ad-slot__meta",
					children: [b.title ?? b.clinic_name, /* @__PURE__ */ jsx("span", {
						className: "ad-slot__mark",
						children: "Реклама"
					})]
				})]
			}, b.id)) : Array.from({ length: demoCount }).map((_, i) => /* @__PURE__ */ jsx(DemoBanner, { slot }, `demo-${slot}-${i}`))
		})]
	});
}
//#endregion
export { AdSlot as t };

//# sourceMappingURL=AdSlot-BWHf9w1U.js.map