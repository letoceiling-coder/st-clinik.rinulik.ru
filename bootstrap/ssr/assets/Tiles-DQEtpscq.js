import { t as Icon } from "./Icon-DBH8JZC9.js";
import { o as money, t as clinicsWord } from "./format-Cjg0FGVI.js";
import { n as useCity } from "../app.js";
import { n as clinicPhoto } from "./demo-images-CwyQSe03.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/Tiles.tsx
function specialtySeed(slug, index) {
	return slug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) + index;
}
function ConcernChips({ concerns, scroll = true }) {
	const city = useCity();
	const chips = concerns.map((c) => /* @__PURE__ */ jsxs(Link, {
		href: city.concern(c.slug),
		className: "chip chip--soft chip--lg",
		title: c.hint ?? void 0,
		children: [/* @__PURE__ */ jsx("span", {
			className: "chip-icon",
			children: /* @__PURE__ */ jsx(Icon, {
				name: c.icon ?? "tooth",
				size: 16
			})
		}), c.name]
	}, c.slug));
	if (!scroll) return /* @__PURE__ */ jsx("div", {
		className: "chip-row",
		children: chips
	});
	return /* @__PURE__ */ jsx("div", {
		className: "scroll-wrap",
		children: /* @__PURE__ */ jsx("div", {
			className: "chip-scroll",
			children: chips
		})
	});
}
function SpecialtyCircles({ specialties }) {
	const city = useCity();
	return /* @__PURE__ */ jsx("div", {
		className: "scroll-wrap",
		children: /* @__PURE__ */ jsx("div", {
			className: "cat-scroll",
			role: "list",
			"aria-label": "Направления",
			children: specialties.map((s, index) => /* @__PURE__ */ jsxs(Link, {
				href: city.direction(s.slug),
				className: "cat",
				role: "listitem",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "cat__circle cat__circle--photo",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ jsx("img", {
							src: clinicPhoto(specialtySeed(s.slug, index), "interior"),
							alt: "",
							loading: "lazy",
							width: 100,
							height: 100
						}),
						/* @__PURE__ */ jsx("span", { className: "cat__shade" }),
						/* @__PURE__ */ jsx(Icon, {
							name: s.icon ?? "tooth",
							size: 32
						})
					]
				}), /* @__PURE__ */ jsx("span", {
					className: "cat__name",
					children: s.name
				})]
			}, s.slug))
		})
	});
}
function SpecialtyTile({ s }) {
	const city = useCity();
	return /* @__PURE__ */ jsxs(Link, {
		href: city.direction(s.slug),
		className: "tile card card--link",
		children: [/* @__PURE__ */ jsx("span", {
			className: "tile__icon",
			children: /* @__PURE__ */ jsx(Icon, {
				name: s.icon ?? "tooth",
				size: 28
			})
		}), /* @__PURE__ */ jsxs("span", {
			className: "tile__body",
			children: [
				/* @__PURE__ */ jsx("b", {
					className: "tile__title",
					children: s.name
				}),
				s.short ? /* @__PURE__ */ jsx("span", {
					className: "tile__text",
					children: s.short
				}) : null,
				s.clinics !== void 0 || s.price_from ? /* @__PURE__ */ jsxs("span", {
					className: "tile__meta",
					children: [s.clinics !== void 0 ? clinicsWord(s.clinics) : null, s.price_from ? ` · от ${money(s.price_from)}` : null]
				}) : null
			]
		})]
	});
}
//#endregion
export { SpecialtyCircles as n, SpecialtyTile as r, ConcernChips as t };

//# sourceMappingURL=Tiles-DQEtpscq.js.map