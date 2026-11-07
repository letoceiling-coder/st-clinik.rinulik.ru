import { t as Icon } from "./Icon-_sloiNX5.js";
import { i as LinkButton, n as Button, r as IconButton } from "./Button-C2BxTtRt.js";
import { M as Lightbox, N as Modal, S as Stars, k as TextArea } from "../app.js";
import { n as DoctorArt, r as PhotoArt } from "./PhotoArt-C4p4XGJd.js";
import { Link, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/moderation/PhotoViewer.tsx
/** Просмотр фото на весь экран: стрелки, клавиши ← → и счётчик. */
function PhotoViewer({ photos, index, onIndex, title }) {
	const open = index !== null && photos[index] !== void 0;
	const go = (step) => index !== null && onIndex((index + step + photos.length) % photos.length);
	useEffect(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === "ArrowRight") go(1);
			if (e.key === "ArrowLeft") go(-1);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	});
	if (!open) return null;
	const photo = photos[index];
	return /* @__PURE__ */ jsxs(Lightbox, {
		open: true,
		onClose: () => onIndex(null),
		title: `${title} · ${index + 1} из ${photos.length}${photo.caption && photo.caption !== title ? ` · ${photo.caption}` : ""}`,
		children: [/* @__PURE__ */ jsx("img", {
			className: "mod-lightbox__img",
			src: photo.url,
			alt: photo.caption ?? title
		}), photos.length > 1 ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(IconButton, {
			className: "mod-lightbox__nav mod-lightbox__nav--prev",
			icon: "chevron-left",
			label: "Предыдущее фото",
			onClick: () => go(-1),
			variant: "secondary",
			round: true
		}), /* @__PURE__ */ jsx(IconButton, {
			className: "mod-lightbox__nav mod-lightbox__nav--next",
			icon: "chevron-right",
			label: "Следующее фото",
			onClick: () => go(1),
			variant: "secondary",
			round: true
		})] }) : null]
	});
}
//#endregion
//#region resources/js/components/moderation/ModerationCard.tsx
/** Карточка материала в очереди: факты, текст, медиа и решение. */
function ModerationCard({ item, compact = false }) {
	const form = useForm({
		decision: "approve",
		note: "",
		publish: false
	});
	const [viewer, setViewer] = useState(null);
	const send = (decision, publish = false) => {
		form.transform((d) => ({
			...d,
			decision,
			publish
		}));
		form.post(`/admin/moderation/${item.type}/${item.id}`, { preserveScroll: true });
	};
	const photos = item.gallery.map((p) => ({
		url: p.url,
		caption: item.title
	}));
	const isClinic = item.type === "clinic";
	return /* @__PURE__ */ jsxs("article", {
		className: `card mod-card${compact ? " mod-card--compact" : ""}`,
		"aria-labelledby": `mod-${item.type}-${item.id}`,
		children: [
			item.media ? /* @__PURE__ */ jsx(MediaPreview, {
				media: item.media,
				title: item.title
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "mod-card__main",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "mod-card__meta",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "badge badge--primary",
								children: item.type_label
							}),
							item.clinic && !compact ? /* @__PURE__ */ jsx(Link, {
								href: item.review_url ?? `/admin/clinics/${item.clinic.id}`,
								className: "link",
								children: item.clinic.name
							}) : null,
							item.at ? /* @__PURE__ */ jsxs("span", {
								className: "text-sm text-muted",
								children: ["отправлено ", item.at]
							}) : null
						]
					}),
					/* @__PURE__ */ jsx("h2", {
						id: `mod-${item.type}-${item.id}`,
						className: "mod-card__title",
						children: isClinic && item.review_url ? /* @__PURE__ */ jsx(Link, {
							href: item.review_url,
							className: "mod-card__title-link",
							children: item.title
						}) : item.title
					}),
					item.rating ? /* @__PURE__ */ jsx(Stars, { value: item.rating }) : null,
					item.gallery.length > 0 ? /* @__PURE__ */ jsxs("div", {
						className: "mod-strip",
						"aria-label": "Фото клиники",
						children: [item.gallery.map((p, i) => /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "mod-strip__item",
							onClick: () => setViewer(i),
							"aria-label": `Открыть фото ${i + 1}`,
							children: /* @__PURE__ */ jsx("img", {
								src: p.url,
								alt: "",
								loading: "lazy"
							})
						}, p.id)), item.gallery_total > item.gallery.length && item.review_url ? /* @__PURE__ */ jsxs(Link, {
							href: item.review_url,
							className: "mod-strip__more",
							children: ["ещё ", item.gallery_total - item.gallery.length]
						}) : null]
					}) : isClinic ? /* @__PURE__ */ jsxs("p", {
						className: "mod-flags",
						role: "note",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "alert",
							size: 16
						}), " У клиники нет фото."]
					}) : null,
					item.facts.length > 0 ? /* @__PURE__ */ jsx("dl", {
						className: "mod-facts",
						children: item.facts.map((f) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: f.label }), /* @__PURE__ */ jsx("dd", { children: f.value })] }, f.label))
					}) : null,
					item.context ? /* @__PURE__ */ jsxs("div", {
						className: "mod-text mod-text--context",
						children: [/* @__PURE__ */ jsx("span", {
							className: "mod-text__label",
							children: item.context_label
						}), /* @__PURE__ */ jsx("p", { children: item.context })]
					}) : null,
					item.body ? /* @__PURE__ */ jsxs("div", {
						className: "mod-text",
						children: [/* @__PURE__ */ jsx("span", {
							className: "mod-text__label",
							children: item.body_label
						}), /* @__PURE__ */ jsx("p", { children: item.body })]
					}) : null,
					item.flags.length > 0 ? /* @__PURE__ */ jsxs("p", {
						className: "mod-flags",
						role: "note",
						children: [
							/* @__PURE__ */ jsx(Icon, {
								name: "alert",
								size: 16
							}),
							" Автопроверка нашла в тексте: ",
							item.flags.join(", "),
							"."
						]
					}) : null,
					!compact ? /* @__PURE__ */ jsxs("p", {
						className: "mod-hint",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "info",
							size: 16
						}), /* @__PURE__ */ jsx("span", { children: item.hint })]
					}) : null,
					item.links.length > 0 || isClinic && item.review_url ? /* @__PURE__ */ jsxs("div", {
						className: "row row--wrap",
						style: { gap: 12 },
						children: [isClinic && item.review_url ? /* @__PURE__ */ jsx(LinkButton, {
							href: item.review_url,
							size: "sm",
							variant: "dark",
							icon: "eye",
							children: "Открыть полную проверку"
						}) : null, item.links.map((l) => l.external ? /* @__PURE__ */ jsxs("a", {
							className: "link",
							href: l.url,
							target: "_blank",
							rel: "noreferrer",
							children: [
								l.label,
								" ",
								/* @__PURE__ */ jsx(Icon, {
									name: "external",
									size: 14
								})
							]
						}, l.url) : /* @__PURE__ */ jsx(Link, {
							className: "link",
							href: l.url,
							children: l.label
						}, l.url))]
					}) : null,
					/* @__PURE__ */ jsx(TextArea, {
						label: item.note_required ? "Причина отклонения (обязательна, её увидит автор)" : "Причина отклонения (необязательно)",
						value: form.data.note,
						maxLength: 500,
						rows: 2,
						onChange: (e) => form.setData("note", e.target.value),
						error: form.errors.note
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "row row--wrap",
						style: { gap: 8 },
						children: [
							isClinic && item.can_publish ? /* @__PURE__ */ jsxs(Button, {
								size: "sm",
								loading: form.processing,
								onClick: () => send("approve", true),
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "check",
									size: 16
								}), " Одобрить и опубликовать"]
							}) : null,
							/* @__PURE__ */ jsxs(Button, {
								size: "sm",
								variant: isClinic && item.can_publish ? "outline" : "primary",
								loading: form.processing,
								onClick: () => send("approve"),
								children: [
									isClinic && item.can_publish ? null : /* @__PURE__ */ jsx(Icon, {
										name: "check",
										size: 16
									}),
									" ",
									isClinic ? "Только одобрить" : "Одобрить и опубликовать"
								]
							}),
							/* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "danger",
								loading: form.processing,
								onClick: () => send("reject"),
								children: "Отклонить"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsx(PhotoViewer, {
				photos,
				index: viewer,
				onIndex: setViewer,
				title: item.title
			})
		]
	});
}
function MediaPreview({ media, title }) {
	const [open, setOpen] = useState(false);
	if (media.kind === "missing") return /* @__PURE__ */ jsxs("div", {
		className: "mod-media mod-media--missing",
		children: [/* @__PURE__ */ jsx(Icon, {
			name: "file",
			size: 28
		}), /* @__PURE__ */ jsx("span", { children: media.caption })]
	});
	if (media.kind === "photo_art" || media.kind === "doctor_art") return /* @__PURE__ */ jsxs("figure", {
		className: "mod-media",
		children: [media.kind === "photo_art" ? /* @__PURE__ */ jsx(PhotoArt, {
			seed: media.seed,
			kind: media.photo_kind,
			label: title
		}) : /* @__PURE__ */ jsx(DoctorArt, {
			seed: media.seed,
			name: title
		}), /* @__PURE__ */ jsx("figcaption", { children: media.caption })]
	});
	return /* @__PURE__ */ jsxs("figure", {
		className: "mod-media",
		children: [
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "mod-media__open",
				onClick: () => setOpen(true),
				"aria-label": `Открыть: ${title}`,
				children: [media.kind === "image" ? /* @__PURE__ */ jsx("img", {
					src: media.url,
					alt: "",
					loading: "lazy"
				}) : /* @__PURE__ */ jsxs("span", {
					className: "mod-media__pdf",
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "file",
						size: 36
					}), "PDF"]
				}), /* @__PURE__ */ jsxs("span", {
					className: "mod-media__zoom",
					children: [
						/* @__PURE__ */ jsx(Icon, {
							name: "eye",
							size: 16
						}),
						" ",
						media.kind === "pdf" ? "Открыть документ" : "Увеличить"
					]
				})]
			}),
			/* @__PURE__ */ jsx("figcaption", { children: media.caption }),
			/* @__PURE__ */ jsx(Modal, {
				open,
				onClose: () => setOpen(false),
				title,
				wide: true,
				sheet: false,
				footer: /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					style: { gap: 12 },
					children: [/* @__PURE__ */ jsxs("a", {
						className: "link",
						href: media.url,
						target: "_blank",
						rel: "noreferrer",
						children: ["Открыть в новой вкладке ", /* @__PURE__ */ jsx(Icon, {
							name: "external",
							size: 14
						})]
					}), media.download_url ? /* @__PURE__ */ jsx("a", {
						className: "link",
						href: media.download_url,
						children: "Скачать файл"
					}) : null]
				}),
				children: media.kind === "image" ? /* @__PURE__ */ jsx("img", {
					className: "mod-viewer__img",
					src: media.url,
					alt: title
				}) : /* @__PURE__ */ jsx("iframe", {
					className: "mod-viewer__pdf",
					src: media.url,
					title
				})
			})
		]
	});
}
//#endregion
export { PhotoViewer as n, ModerationCard as t };

//# sourceMappingURL=ModerationCard-CZ4TOH-W.js.map