import { t as Icon } from "./Icon-DQahs-u2.js";
import { l as priceFrom, n as cx, o as money, r as dateRu } from "./format-BPZIj7DQ.js";
import { C as Lightbox } from "../app.js";
import { r as PhotoArt } from "./PhotoArt-BefU5AAo.js";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/ClinicParts.tsx
var PHOTO_KINDS = {
	exterior: "Фасад",
	interior: "Интерьер",
	reception: "Ресепшн",
	cabinet: "Кабинет",
	equipment: "Оборудование",
	team: "Команда"
};
function Photo({ photo, eager }) {
	return photo.url ? /* @__PURE__ */ jsx("img", {
		src: photo.url,
		alt: photo.caption ?? PHOTO_KINDS[photo.kind] ?? "Фото клиники",
		loading: eager ? "eager" : "lazy"
	}) : /* @__PURE__ */ jsx(PhotoArt, {
		seed: photo.art_seed,
		kind: photo.kind
	});
}
function Gallery({ photos, name }) {
	const [open, setOpen] = useState(null);
	if (photos.length === 0) return null;
	const shown = photos.slice(0, 5);
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
		className: cx("gallery", `gallery--${Math.min(shown.length, 5)}`),
		role: "group",
		"aria-label": `Фотографии клиники ${name}`,
		children: shown.map((p, i) => /* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "gallery__item",
			onClick: () => setOpen(i),
			"aria-label": `Открыть фото ${i + 1} из ${photos.length}`,
			children: [/* @__PURE__ */ jsx(Photo, {
				photo: p,
				eager: i === 0
			}), i === shown.length - 1 && photos.length > shown.length ? /* @__PURE__ */ jsxs("span", {
				className: "gallery__more",
				children: ["+", photos.length - shown.length]
			}) : null]
		}, i))
	}), /* @__PURE__ */ jsx(Lightbox, {
		open: open !== null,
		onClose: () => setOpen(null),
		title: open !== null ? photos[open].caption ?? PHOTO_KINDS[photos[open].kind] ?? "Фото" : void 0,
		children: open !== null ? /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "lightbox__nav lightbox__nav--prev",
				onClick: () => setOpen((open - 1 + photos.length) % photos.length),
				"aria-label": "Предыдущее фото",
				children: /* @__PURE__ */ jsx(Icon, {
					name: "chevron-left",
					size: 24
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "lightbox__frame",
				children: /* @__PURE__ */ jsx(Photo, {
					photo: photos[open],
					eager: true
				})
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "lightbox__nav lightbox__nav--next",
				onClick: () => setOpen((open + 1) % photos.length),
				"aria-label": "Следующее фото",
				children: /* @__PURE__ */ jsx(Icon, {
					name: "chevron-right",
					size: 24
				})
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "lightbox__count text-sm text-muted",
				children: [
					open + 1,
					" / ",
					photos.length
				]
			})
		] }) : null
	})] });
}
function ScheduleView({ week, compact }) {
	return /* @__PURE__ */ jsx("dl", {
		className: cx("schedule", compact && "schedule--compact"),
		children: week.map((d) => /* @__PURE__ */ jsxs("div", {
			className: cx("schedule__row", d.today && "is-today"),
			children: [/* @__PURE__ */ jsxs("dt", { children: [d.day, d.today ? /* @__PURE__ */ jsx("span", {
				className: "badge badge--primary",
				children: "сегодня"
			}) : null] }), /* @__PURE__ */ jsx("dd", { children: d.hours })]
		}, d.key))
	});
}
function PriceTable({ items }) {
	return /* @__PURE__ */ jsx("ul", {
		className: "price-list",
		children: items.map((p) => /* @__PURE__ */ jsxs("li", {
			className: "price-row price-row--static",
			children: [
				/* @__PURE__ */ jsxs("span", {
					className: "price-row__name",
					children: [/* @__PURE__ */ jsxs("b", { children: [p.name, p.is_promo ? /* @__PURE__ */ jsx("span", {
						className: "badge badge--primary",
						style: { marginLeft: 8 },
						children: "акция"
					}) : null] }), p.description ? /* @__PURE__ */ jsx("span", {
						className: "text-sm text-muted",
						children: p.description
					}) : null]
				}),
				/* @__PURE__ */ jsx("span", {
					className: "price-row__meta text-sm text-muted",
					children: p.duration_min ? `~${p.duration_min} мин` : ""
				}),
				/* @__PURE__ */ jsx("b", {
					className: "price-row__price",
					children: p.price_to && p.price_to > p.price_from ? `${money(p.price_from)} – ${money(p.price_to)}` : priceFrom(p.price_from)
				})
			]
		}, p.id))
	});
}
function RatingSummary({ rating, count, distribution, active, onPick }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "rating-summary",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "rating-summary__score",
			children: [
				/* @__PURE__ */ jsx("b", { children: count > 0 ? rating.toFixed(1).replace(".", ",") : "—" }),
				/* @__PURE__ */ jsx("div", {
					className: "stars",
					"aria-hidden": "true",
					children: [
						1,
						2,
						3,
						4,
						5
					].map((i) => /* @__PURE__ */ jsx("span", {
						className: i <= Math.round(rating) ? "" : "off",
						children: /* @__PURE__ */ jsx(Icon, {
							name: "star",
							size: 20
						})
					}, i))
				}),
				/* @__PURE__ */ jsx("span", {
					className: "text-sm text-muted",
					children: count > 0 ? `${count} оценок` : "Пока нет оценок"
				})
			]
		}), /* @__PURE__ */ jsx("ul", {
			className: "rating-summary__bars",
			children: [
				5,
				4,
				3,
				2,
				1
			].map((n) => {
				const v = distribution[n] ?? 0;
				const pct = count ? Math.round(v / count * 100) : 0;
				return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
					type: "button",
					className: cx("bar-row", active === n && "is-active"),
					onClick: () => onPick?.(active === n ? 0 : n),
					"aria-pressed": active === n,
					"aria-label": `${n} из 5: ${v}`,
					children: [
						/* @__PURE__ */ jsx("span", { children: n }),
						/* @__PURE__ */ jsx(Icon, {
							name: "star",
							size: 14
						}),
						/* @__PURE__ */ jsx("span", {
							className: "bar",
							children: /* @__PURE__ */ jsx("span", { style: { width: `${pct}%` } })
						}),
						/* @__PURE__ */ jsx("span", {
							className: "bar-row__n text-sm text-muted",
							children: v
						})
					]
				}) }, n);
			})
		})]
	});
}
function documentTitle(d) {
	const date = d.issued_at ? ` от ${dateRu(d.issued_at)}` : "";
	return `${d.title}${d.number ? ` № ${d.number}` : ""}${date}`;
}
//#endregion
export { documentTitle as a, ScheduleView as i, PriceTable as n, RatingSummary as r, Gallery as t };

//# sourceMappingURL=ClinicParts-DWb9NADn.js.map