import { t as Icon } from "./Icon-_sloiNX5.js";
import { n as Button } from "./Button-C2BxTtRt.js";
import { O as Modal, _ as Stars, f as EmptyState, w as TextArea, y as Check } from "../app.js";
import { r as PageHead } from "./Dash-C8plSzIc.js";
import { n as DoctorArt, r as PhotoArt } from "./PhotoArt-C4p4XGJd.js";
import { Link, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Moderation.tsx
function Moderation({ queue, typeLabels, content_moderation_settings }) {
	const activeType = new URLSearchParams(usePage().url.split("?")[1] ?? "").get("type") ?? "";
	const counts = queue.reduce((acc, item) => ({
		...acc,
		[item.type]: (acc[item.type] ?? 0) + 1
	}), {});
	const visible = activeType ? queue.filter((item) => item.type === activeType) : queue;
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Модерация",
				text: "Здесь проверяются материалы, которые клиники и пациенты добавили на сайт: карточки клиник, врачи, фото, документы и отзывы. Пока материал не одобрен, посетители его не видят. При отклонении автор получит вашу причину."
			}),
			/* @__PURE__ */ jsxs("nav", {
				className: "dict-tabs",
				"aria-label": "Тип материалов",
				children: [/* @__PURE__ */ jsxs(Link, {
					href: "/admin/moderation",
					className: activeType ? "chip" : "chip is-active",
					preserveScroll: true,
					children: ["Все · ", queue.length]
				}), Object.entries(typeLabels).map(([type, label]) => /* @__PURE__ */ jsxs(Link, {
					href: `/admin/moderation?type=${type}`,
					className: type === activeType ? "chip is-active" : "chip",
					preserveScroll: true,
					children: [
						label,
						" · ",
						counts[type] ?? 0
					]
				}, type))]
			}),
			visible.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
				icon: "check",
				title: activeType ? "Здесь всё проверено" : "Очередь пуста",
				text: "Новые материалы появятся здесь автоматически."
			}) : visible.map((item) => /* @__PURE__ */ jsx(ModerationCard, { item }, `${item.type}-${item.id}`)),
			/* @__PURE__ */ jsx(ModerationSettings, { initial: content_moderation_settings })
		]
	});
}
function ModerationCard({ item }) {
	const form = useForm({
		decision: "approve",
		note: ""
	});
	const send = (decision) => {
		form.transform((d) => ({
			...d,
			decision
		}));
		form.post(`/admin/moderation/${item.type}/${item.id}`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs("article", {
		className: "card mod-card",
		"aria-labelledby": `mod-${item.type}-${item.id}`,
		children: [item.media ? /* @__PURE__ */ jsx(MediaPreview, {
			media: item.media,
			title: item.title
		}) : null, /* @__PURE__ */ jsxs("div", {
			className: "mod-card__main",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "mod-card__meta",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "badge badge--primary",
							children: item.type_label
						}),
						item.clinic ? /* @__PURE__ */ jsx(Link, {
							href: `/admin/clinics/${item.clinic.id}`,
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
					children: item.title
				}),
				item.rating ? /* @__PURE__ */ jsx(Stars, { value: item.rating }) : null,
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
				/* @__PURE__ */ jsxs("p", {
					className: "mod-hint",
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "info",
						size: 16
					}), /* @__PURE__ */ jsx("span", { children: item.hint })]
				}),
				item.links.length > 0 ? /* @__PURE__ */ jsx("div", {
					className: "row row--wrap",
					style: { gap: 12 },
					children: item.links.map((l) => l.external ? /* @__PURE__ */ jsxs("a", {
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
					}, l.url))
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
					children: [/* @__PURE__ */ jsxs(Button, {
						size: "sm",
						loading: form.processing,
						onClick: () => send("approve"),
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "check",
							size: 16
						}), " Одобрить и опубликовать"]
					}), /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "danger",
						loading: form.processing,
						onClick: () => send("reject"),
						children: "Отклонить"
					})]
				})
			]
		})]
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
function ModerationSettings({ initial }) {
	const settings = useForm({ ...initial });
	return /* @__PURE__ */ jsxs("details", {
		className: "card mod-settings",
		children: [/* @__PURE__ */ jsxs("summary", { children: [/* @__PURE__ */ jsx(Icon, {
			name: "settings",
			size: 18
		}), " Настройки модерации"] }), /* @__PURE__ */ jsxs("form", {
			className: "stack",
			onSubmit: (e) => {
				e.preventDefault();
				settings.post("/admin/moderation/settings", { preserveScroll: true });
			},
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: "Что отправлять на ручную проверку, прежде чем показать на сайте."
				}),
				/* @__PURE__ */ jsx(Check, {
					label: "Проверять ответы клиник на отзывы",
					checked: settings.data.moderate_review_replies,
					onChange: (e) => settings.setData("moderate_review_replies", e.target.checked)
				}),
				/* @__PURE__ */ jsx(Check, {
					label: "Проверять все рекламные заказы клиник (включая поднятие в выдаче)",
					checked: settings.data.moderate_promotions,
					onChange: (e) => settings.setData("moderate_promotions", e.target.checked)
				}),
				/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Button, {
					type: "submit",
					size: "sm",
					loading: settings.processing,
					children: "Сохранить настройки"
				}) })
			]
		})]
	});
}
//#endregion
export { Moderation as default };

//# sourceMappingURL=Moderation-CqtNkbNd.js.map