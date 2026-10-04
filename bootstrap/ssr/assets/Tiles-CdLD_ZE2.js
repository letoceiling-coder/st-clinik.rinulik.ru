import { t as Icon } from "./Icon-DBH8JZC9.js";
import { n as cx, o as money, t as clinicsWord } from "./format-BPZIj7DQ.js";
import { n as useCity } from "../app.js";
import { n as clinicPhoto } from "./demo-images-CwyQSe03.js";
import { Link } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
import { Children, useCallback, useEffect, useId, useRef, useState } from "react";
//#region resources/js/components/Carousel.tsx
var DRAG_THRESHOLD = 6;
function Carousel({ children, ariaLabel, className, slideClassName, gap, staticClassName }) {
	const trackId = useId().replace(/:/g, "");
	const trackRef = useRef(null);
	const dragRef = useRef({
		active: false,
		moved: false,
		startX: 0,
		scrollLeft: 0
	});
	const [edges, setEdges] = useState({
		prev: false,
		next: false
	});
	const items = Children.toArray(children);
	const updateEdges = useCallback(() => {
		const track = trackRef.current;
		if (!track) return;
		const maxScroll = track.scrollWidth - track.clientWidth;
		setEdges({
			prev: track.scrollLeft > 2,
			next: maxScroll > 2 && track.scrollLeft < maxScroll - 2
		});
	}, []);
	useEffect(() => {
		const track = trackRef.current;
		if (!track) return;
		updateEdges();
		track.addEventListener("scroll", updateEdges, { passive: true });
		const observer = new ResizeObserver(updateEdges);
		observer.observe(track);
		return () => {
			track.removeEventListener("scroll", updateEdges);
			observer.disconnect();
		};
	}, [items.length, updateEdges]);
	useEffect(() => {
		const track = trackRef.current;
		if (!track) return;
		const onWheel = (event) => {
			const maxScroll = track.scrollWidth - track.clientWidth;
			if (maxScroll <= 0) return;
			const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
			if (delta === 0) return;
			const goingForward = delta > 0;
			const atStart = track.scrollLeft <= 0;
			const atEnd = track.scrollLeft >= maxScroll - 1;
			if (goingForward && atEnd || !goingForward && atStart) return;
			event.preventDefault();
			track.scrollLeft += delta;
		};
		track.addEventListener("wheel", onWheel, { passive: false });
		return () => track.removeEventListener("wheel", onWheel);
	}, []);
	const scrollByDir = (direction) => {
		const track = trackRef.current;
		if (!track) return;
		const step = Math.max(track.clientWidth * .75, 220);
		track.scrollBy({
			left: direction * step,
			behavior: "smooth"
		});
	};
	const onPointerDown = (event) => {
		const track = trackRef.current;
		if (!track || event.button !== 0) return;
		dragRef.current = {
			active: true,
			moved: false,
			startX: event.clientX,
			scrollLeft: track.scrollLeft
		};
		track.setPointerCapture(event.pointerId);
		track.classList.add("is-dragging");
	};
	const onPointerMove = (event) => {
		if (!dragRef.current.active) return;
		const track = trackRef.current;
		if (!track) return;
		const delta = event.clientX - dragRef.current.startX;
		if (Math.abs(delta) > DRAG_THRESHOLD) dragRef.current.moved = true;
		if (dragRef.current.moved) {
			event.preventDefault();
			track.scrollLeft = dragRef.current.scrollLeft - delta;
		}
	};
	const endDrag = (event) => {
		const track = trackRef.current;
		if (!track) return;
		dragRef.current.active = false;
		track.classList.remove("is-dragging");
		if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
	};
	const onClickCapture = (event) => {
		if (dragRef.current.moved) {
			event.preventDefault();
			event.stopPropagation();
			dragRef.current.moved = false;
		}
	};
	const trackStyle = gap !== void 0 ? { "--carousel-gap": `${gap}px` } : void 0;
	return /* @__PURE__ */ jsxs("div", {
		className: cx("carousel", className),
		children: [
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "carousel__nav carousel__nav--prev",
				"aria-label": "Назад",
				"aria-controls": trackId,
				disabled: !edges.prev,
				onClick: () => scrollByDir(-1),
				children: /* @__PURE__ */ jsx(Icon, {
					name: "chevron-left",
					size: 20
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "carousel__viewport",
				children: /* @__PURE__ */ jsx("div", {
					ref: trackRef,
					id: trackId,
					className: cx("carousel__track", staticClassName),
					role: "list",
					"aria-label": ariaLabel,
					style: trackStyle,
					onPointerDown,
					onPointerMove,
					onPointerUp: endDrag,
					onPointerCancel: endDrag,
					onClickCapture,
					children: items.map((child, index) => /* @__PURE__ */ jsx("div", {
						className: cx("carousel__slide", slideClassName),
						role: "listitem",
						children: child
					}, index))
				})
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "carousel__nav carousel__nav--next",
				"aria-label": "Вперёд",
				"aria-controls": trackId,
				disabled: !edges.next,
				onClick: () => scrollByDir(1),
				children: /* @__PURE__ */ jsx(Icon, {
					name: "chevron-right",
					size: 20
				})
			})
		]
	});
}
//#endregion
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
	return /* @__PURE__ */ jsx(Carousel, {
		ariaLabel: "С чем чаще обращаются",
		staticClassName: "chip-scroll",
		slideClassName: "carousel__slide--chip",
		gap: 10,
		children: chips
	});
}
function SpecialtyCircles({ specialties }) {
	const city = useCity();
	const items = specialties.map((s, index) => /* @__PURE__ */ jsxs(Link, {
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
					width: 112,
					height: 112
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
	}, s.slug));
	return /* @__PURE__ */ jsx(Carousel, {
		ariaLabel: "Направления стоматологии",
		staticClassName: "cat-scroll",
		slideClassName: "carousel__slide--cat",
		gap: 20,
		children: items
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

//# sourceMappingURL=Tiles-CdLD_ZE2.js.map