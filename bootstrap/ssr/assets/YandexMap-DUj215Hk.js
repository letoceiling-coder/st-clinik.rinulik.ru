import { n as cx } from "./format-BPZIj7DQ.js";
import { router, usePage } from "@inertiajs/react";
import { jsx } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef, useState } from "react";
//#region resources/js/components/YandexMap.tsx
var ymapsLoader = null;
function loadYmaps(apiKey) {
	if (typeof window === "undefined") return Promise.reject(/* @__PURE__ */ new Error("Yandex Maps is client-only"));
	if (window.ymaps) return new Promise((resolve) => {
		window.ymaps.ready(() => resolve(window.ymaps));
	});
	if (!ymapsLoader) ymapsLoader = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
		script.async = true;
		script.onload = () => {
			window.ymaps?.ready(() => {
				if (window.ymaps) resolve(window.ymaps);
				else reject(/* @__PURE__ */ new Error("Yandex Maps failed to load"));
			});
		};
		script.onerror = () => reject(/* @__PURE__ */ new Error("Yandex Maps script error"));
		document.head.appendChild(script);
	});
	return ymapsLoader;
}
function YandexMap({ points, className, height, zoom = 11, activeSlug }) {
	const mapId = useId().replace(/:/g, "");
	const hostRef = useRef(null);
	const mapRef = useRef(null);
	const { app } = usePage().props;
	const apiKey = app.yandex_maps_key;
	const [error, setError] = useState(null);
	const valid = useMemo(() => points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)), [points]);
	const pointsKey = useMemo(() => valid.map((p) => `${p.slug}:${p.lat}:${p.lng}`).join("|"), [valid]);
	useEffect(() => {
		if (!apiKey || valid.length === 0 || !hostRef.current) return;
		let cancelled = false;
		let disposeFit = null;
		loadYmaps(apiKey).then((ym) => {
			if (cancelled || !hostRef.current) return;
			mapRef.current?.destroy();
			hostRef.current.innerHTML = "";
			const center = activeSlug ? (() => {
				const active = valid.find((p) => p.slug === activeSlug);
				return active ? [active.lat, active.lng] : [valid[0].lat, valid[0].lng];
			})() : [valid[0].lat, valid[0].lng];
			const map = new ym.Map(hostRef.current, {
				center,
				zoom,
				controls: ["zoomControl", "geolocationControl"]
			}, { suppressMapOpenBlock: true });
			mapRef.current = map;
			const placeControl = (name, top) => {
				const control = map.controls.get(name);
				if (control) control.options.set("position", {
					top,
					right: 12,
					left: "auto"
				});
			};
			placeControl("zoomControl", 12);
			placeControl("geolocationControl", 92);
			valid.forEach((point) => {
				const placemark = new ym.Placemark([point.lat, point.lng], {
					balloonContentHeader: point.name,
					balloonContentBody: point.address ?? "",
					hintContent: point.name
				}, { preset: point.slug === activeSlug ? "islands#orangeIcon" : "islands#darkBlueDotIcon" });
				placemark.events.add("click", () => {
					router.visit(`/clinics/${point.slug}`);
				});
				map.geoObjects.add(placemark);
			});
			if (valid.length > 1 && !activeSlug) {
				const lats = valid.map((p) => p.lat);
				const lngs = valid.map((p) => p.lng);
				map.setBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], {
					checkZoomRange: true,
					zoomMargin: 40
				});
			}
			const fitMap = () => {
				map.container.fitToViewport();
			};
			fitMap();
			requestAnimationFrame(fitMap);
			window.setTimeout(fitMap, 350);
			const onResize = () => {
				fitMap();
			};
			window.addEventListener("resize", onResize);
			const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
			if (hostRef.current && observer) observer.observe(hostRef.current);
			disposeFit = () => {
				window.removeEventListener("resize", onResize);
				observer?.disconnect();
			};
		}).catch(() => {
			if (!cancelled) setError("Не удалось загрузить карту");
		});
		return () => {
			cancelled = true;
			disposeFit?.();
			mapRef.current?.destroy();
			mapRef.current = null;
		};
	}, [
		apiKey,
		pointsKey,
		valid,
		activeSlug,
		zoom
	]);
	const sizeStyle = height !== void 0 ? { height } : void 0;
	if (!apiKey) return /* @__PURE__ */ jsx("div", {
		className: cx("yandex-map yandex-map--empty", className),
		style: sizeStyle,
		role: "note",
		children: /* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted",
			children: "Карта временно недоступна"
		})
	});
	if (valid.length === 0) return /* @__PURE__ */ jsx("div", {
		className: cx("yandex-map yandex-map--empty", className),
		style: sizeStyle,
		role: "note",
		children: /* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted",
			children: "Нет клиник с координатами для отображения на карте"
		})
	});
	if (error) return /* @__PURE__ */ jsx("div", {
		className: cx("yandex-map yandex-map--empty", className),
		style: sizeStyle,
		role: "note",
		children: /* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted",
			children: error
		})
	});
	return /* @__PURE__ */ jsx("div", {
		id: `yandex-map-${mapId}`,
		ref: hostRef,
		className: cx("yandex-map", className),
		style: sizeStyle,
		"aria-label": "Карта клиник"
	});
}
//#endregion
export { YandexMap as t };

//# sourceMappingURL=YandexMap-DUj215Hk.js.map