import { t as Icon } from "./Icon-_sloiNX5.js";
import { i as LinkButton, n as Button } from "./Button-C2BxTtRt.js";
import { h as Badge, k as TextArea, p as Alert, w as Check } from "../app.js";
import { r as PageHead, s as StatusBadge } from "./Dash-C_HMp027.js";
import { n as DoctorArt, r as PhotoArt } from "./PhotoArt-C4p4XGJd.js";
import { n as PhotoViewer, t as ModerationCard } from "./ModerationCard-CZ4TOH-W.js";
import { Link, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/ModerationClinic.tsx
var STATUS_TONE = {
	pending: "warning",
	approved: "success",
	published: "success",
	rejected: "danger",
	draft: void 0,
	hidden: "info"
};
function ModerationClinic({ clinic: c, related, queue }) {
	const [viewer, setViewer] = useState(null);
	const viewable = c.photos.filter((p) => p.url);
	const sections = [
		["photos", `Фото · ${c.photos.length}`],
		["profile", "Профиль"],
		["schedule", "График и условия"],
		["services", `Услуги · ${c.services.length}`],
		["doctors", `Врачи · ${c.doctors.length}`],
		["documents", `Документы · ${c.documents.length}`],
		...related.length > 0 ? [["related", `Ещё на проверке · ${related.length}`]] : [],
		["decision", "Решение"]
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: c.name,
				text: /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx(StatusBadge, { status: c.status }),
					" ",
					queue.position ? `Клиника ${queue.position} из ${queue.total} на проверке` : `На проверке клиник: ${queue.total}`,
					c.updated_at ? ` · изменена ${c.updated_at}` : ""
				] }),
				action: /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					style: { gap: 8 },
					children: [/* @__PURE__ */ jsx(LinkButton, {
						href: "/admin/moderation?type=clinic",
						size: "sm",
						variant: "outline",
						children: "К очереди"
					}), queue.next_id && queue.next_id !== c.id ? /* @__PURE__ */ jsx(LinkButton, {
						href: `/admin/moderation/clinic/${queue.next_id}`,
						size: "sm",
						variant: "ghost",
						iconRight: "chevron-right",
						children: "Следующая"
					}) : null]
				})
			}),
			/* @__PURE__ */ jsx("nav", {
				className: "mod-anchors",
				"aria-label": "Разделы проверки",
				children: sections.map(([id, label]) => /* @__PURE__ */ jsx("a", {
					href: `#${id}`,
					className: "chip",
					children: label
				}, id))
			}),
			c.previous_note ? /* @__PURE__ */ jsxs(Alert, {
				tone: "warning",
				children: ["Прошлое отклонение: ", c.previous_note]
			}) : null,
			c.source ? /* @__PURE__ */ jsxs(Alert, {
				tone: "muted",
				children: [
					c.source.label,
					".",
					c.source.yandex_rating ? ` Рейтинг в Яндексе: ${c.source.yandex_rating} (на сайт не переносится).` : "",
					" ",
					c.source.yandex_url ? /* @__PURE__ */ jsxs("a", {
						href: c.source.yandex_url,
						target: "_blank",
						rel: "noreferrer",
						className: "link",
						children: ["Открыть в Яндекс Картах ", /* @__PURE__ */ jsx(Icon, {
							name: "external",
							size: 14
						})]
					}) : null,
					c.source.parsed_id ? /* @__PURE__ */ jsxs(Fragment, { children: [" · ", /* @__PURE__ */ jsx(Link, {
						href: `/admin/parser/organizations/${c.source.parsed_id}`,
						className: "link",
						children: "Карточка парсера"
					})] }) : null
				]
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "mod-review",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "mod-review__main stack-lg",
					children: [
						/* @__PURE__ */ jsx(Section, {
							id: "photos",
							title: "Фото",
							note: c.photos.length === 0 ? "Фото нет — на сайте будут иллюстрации." : "Нажмите на фото, чтобы открыть крупно. Фото на проверке можно одобрить или отклонить прямо здесь.",
							children: c.photos.length > 0 ? /* @__PURE__ */ jsx("ul", {
								className: "mod-gallery",
								children: c.photos.map((p) => {
									const viewIndex = viewable.findIndex((v) => v.id === p.id);
									return /* @__PURE__ */ jsxs("li", {
										className: `mod-gallery__item is-${p.status}`,
										children: [
											p.url ? /* @__PURE__ */ jsx("button", {
												type: "button",
												className: "mod-gallery__open",
												onClick: () => setViewer(viewIndex),
												"aria-label": `Открыть фото: ${p.kind_label}`,
												children: /* @__PURE__ */ jsx("img", {
													src: p.url,
													alt: "",
													loading: "lazy"
												})
											}) : /* @__PURE__ */ jsx(PhotoArt, {
												seed: p.art_seed,
												kind: p.kind,
												label: c.name
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "mod-gallery__meta",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-xs",
													children: p.kind_label
												}), /* @__PURE__ */ jsx(Badge, {
													tone: STATUS_TONE[p.status],
													children: p.status_label
												})]
											}),
											p.status === "pending" ? /* @__PURE__ */ jsxs("div", {
												className: "mod-gallery__actions",
												children: [/* @__PURE__ */ jsx(Button, {
													size: "sm",
													onClick: () => router.post(`/admin/moderation/photo/${p.id}`, { decision: "approve" }, { preserveScroll: true }),
													children: "Одобрить"
												}), /* @__PURE__ */ jsx(Button, {
													size: "sm",
													variant: "ghost",
													onClick: () => router.post(`/admin/moderation/photo/${p.id}`, { decision: "reject" }, { preserveScroll: true }),
													children: "Отклонить"
												})]
											}) : null
										]
									}, p.id);
								})
							}) : null
						}),
						/* @__PURE__ */ jsxs(Section, {
							id: "profile",
							title: "Профиль клиники",
							children: [
								/* @__PURE__ */ jsx(Facts, { rows: c.profile }),
								c.map_url ? /* @__PURE__ */ jsxs("a", {
									href: c.map_url,
									target: "_blank",
									rel: "noreferrer",
									className: "link text-sm",
									children: ["Точка на карте ", /* @__PURE__ */ jsx(Icon, {
										name: "external",
										size: 14
									})]
								}) : /* @__PURE__ */ jsxs("p", {
									className: "mod-flags",
									children: [/* @__PURE__ */ jsx(Icon, {
										name: "alert",
										size: 16
									}), " Нет координат — клиника не появится на карте."]
								}),
								c.texts.length > 0 ? c.texts.map((t) => /* @__PURE__ */ jsxs("div", {
									className: "mod-text",
									children: [/* @__PURE__ */ jsx("span", {
										className: "mod-text__label",
										children: t.label
									}), /* @__PURE__ */ jsx("p", { children: t.value })]
								}, t.label)) : /* @__PURE__ */ jsx("p", {
									className: "text-sm text-muted",
									children: "Описания нет."
								}),
								c.organization ? /* @__PURE__ */ jsxs("div", {
									className: "stack",
									children: [/* @__PURE__ */ jsxs("h3", {
										className: "mod-subtitle",
										children: [
											"Организация «",
											c.organization.name,
											"»"
										]
									}), /* @__PURE__ */ jsx(Facts, { rows: c.organization.facts })]
								}) : null
							]
						}),
						/* @__PURE__ */ jsx(Section, {
							id: "schedule",
							title: "График и условия",
							children: /* @__PURE__ */ jsxs("div", {
								className: "mod-columns",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "stack",
									children: [/* @__PURE__ */ jsx("h3", {
										className: "mod-subtitle",
										children: "График"
									}), c.schedule.length > 0 ? /* @__PURE__ */ jsx("dl", {
										className: "mod-schedule",
										children: c.schedule.map((d) => /* @__PURE__ */ jsxs("div", {
											className: d.hours === "выходной" ? "is-off" : void 0,
											children: [/* @__PURE__ */ jsx("dt", { children: d.day }), /* @__PURE__ */ jsx("dd", { children: d.hours })]
										}, d.day))
									}) : /* @__PURE__ */ jsx("p", {
										className: "text-sm text-muted",
										children: "Не указан."
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "stack",
									children: [
										/* @__PURE__ */ jsx("h3", {
											className: "mod-subtitle",
											children: "Направления"
										}),
										/* @__PURE__ */ jsx(Tags, {
											items: c.specialties,
											empty: "Не выбраны."
										}),
										/* @__PURE__ */ jsx("h3", {
											className: "mod-subtitle",
											children: "Особенности"
										}),
										/* @__PURE__ */ jsx(Tags, {
											items: c.features,
											empty: "Не отмечены."
										}),
										/* @__PURE__ */ jsx("h3", {
											className: "mod-subtitle",
											children: "Оплата"
										}),
										/* @__PURE__ */ jsx(Tags, {
											items: c.payment_methods,
											empty: "Не указана."
										})
									]
								})]
							})
						}),
						/* @__PURE__ */ jsx(Section, {
							id: "services",
							title: "Услуги и цены",
							children: c.services.length > 0 ? /* @__PURE__ */ jsx("ul", {
								className: "mod-services",
								children: c.services.map((s, i) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsxs("span", { children: [
									s.name,
									s.promo ? /* @__PURE__ */ jsx(Badge, {
										tone: "success",
										children: "акция"
									}) : null,
									s.note ? /* @__PURE__ */ jsxs("span", {
										className: "text-xs text-muted",
										children: [" · ", s.note]
									}) : null
								] }), /* @__PURE__ */ jsxs("span", {
									className: "mod-services__price",
									children: [s.price, s.duration ? /* @__PURE__ */ jsxs("span", {
										className: "text-xs text-muted",
										children: [" · ", s.duration]
									}) : null]
								})] }, `${s.name}-${i}`))
							}) : /* @__PURE__ */ jsx("p", {
								className: "text-sm text-muted",
								children: "Услуг нет — клинику не найдут по запросам вроде «имплантация»."
							})
						}),
						/* @__PURE__ */ jsx(Section, {
							id: "doctors",
							title: "Врачи",
							children: c.doctors.length > 0 ? /* @__PURE__ */ jsx("ul", {
								className: "mod-people",
								children: c.doctors.map((d) => /* @__PURE__ */ jsxs("li", { children: [
									/* @__PURE__ */ jsx("span", {
										className: "mod-people__photo",
										children: d.photo_url ? /* @__PURE__ */ jsx("img", {
											src: d.photo_url,
											alt: "",
											loading: "lazy"
										}) : /* @__PURE__ */ jsx(DoctorArt, {
											seed: d.art_seed,
											name: d.name
										})
									}),
									/* @__PURE__ */ jsxs("span", {
										className: "mod-people__text",
										children: [/* @__PURE__ */ jsx("b", { children: d.name }), /* @__PURE__ */ jsx("span", {
											className: "text-sm text-muted",
											children: [
												d.position,
												d.specialties,
												d.experience
											].filter(Boolean).join(" · ") || "без описания"
										})]
									}),
									/* @__PURE__ */ jsx(Badge, {
										tone: STATUS_TONE[d.status],
										children: d.status_label
									})
								] }, d.id))
							}) : /* @__PURE__ */ jsx("p", {
								className: "text-sm text-muted",
								children: "Врачи не добавлены."
							})
						}),
						/* @__PURE__ */ jsx(Section, {
							id: "documents",
							title: "Документы",
							children: c.documents.length > 0 ? /* @__PURE__ */ jsx("ul", {
								className: "mod-people",
								children: c.documents.map((d) => /* @__PURE__ */ jsxs("li", { children: [
									/* @__PURE__ */ jsx("span", {
										className: "mod-people__photo mod-people__photo--icon",
										children: /* @__PURE__ */ jsx(Icon, {
											name: "file",
											size: 22
										})
									}),
									/* @__PURE__ */ jsxs("span", {
										className: "mod-people__text",
										children: [
											/* @__PURE__ */ jsxs("b", { children: [
												d.type,
												": ",
												d.title
											] }),
											/* @__PURE__ */ jsx("span", {
												className: "text-sm text-muted",
												children: [
													d.number ? `№ ${d.number}` : "без номера",
													d.issued_at ? `выдан ${d.issued_at}` : null,
													d.expires_at ? `до ${d.expires_at}` : "бессрочно"
												].filter(Boolean).join(" · ")
											}),
											d.view_url ? /* @__PURE__ */ jsxs("a", {
												href: d.view_url,
												target: "_blank",
												rel: "noreferrer",
												className: "link text-sm",
												children: ["Открыть файл ", /* @__PURE__ */ jsx(Icon, {
													name: "external",
													size: 14
												})]
											}) : /* @__PURE__ */ jsx("span", {
												className: "text-sm parser-warn",
												children: "Файл не приложен"
											})
										]
									}),
									/* @__PURE__ */ jsx(Badge, {
										tone: STATUS_TONE[d.status],
										children: d.status_label
									})
								] }, d.id))
							}) : /* @__PURE__ */ jsx("p", {
								className: "text-sm text-muted",
								children: "Документов нет. Лицензия не подтверждена — отметки «Лицензия проверена» на карточке не будет."
							})
						}),
						related.length > 0 ? /* @__PURE__ */ jsx(Section, {
							id: "related",
							title: "Ещё на проверке у этой клиники",
							note: "Врачи, документы и отзывы этой клиники из общей очереди.",
							children: /* @__PURE__ */ jsx("div", {
								className: "stack",
								children: related.map((item) => /* @__PURE__ */ jsx(ModerationCard, {
									item,
									compact: true
								}, `${item.type}-${item.id}`))
							})
						}) : null
					]
				}), /* @__PURE__ */ jsx("aside", {
					className: "mod-review__aside",
					children: /* @__PURE__ */ jsx(Decision, { c })
				})]
			}),
			/* @__PURE__ */ jsx(PhotoViewer, {
				photos: viewable.map((p) => ({
					url: p.url,
					caption: p.kind_label
				})),
				index: viewer,
				onIndex: setViewer,
				title: c.name
			})
		]
	});
}
function Decision({ c }) {
	const pendingPhotos = c.pending_counts.photo;
	const form = useForm({
		decision: "approve",
		note: "",
		publish: false,
		approve_photos: pendingPhotos > 0,
		next: true
	});
	const send = (decision, publish = false) => {
		form.transform((d) => ({
			...d,
			decision,
			publish
		}));
		form.post(`/admin/moderation/clinic/${c.id}`, { preserveScroll: true });
	};
	const ready = c.readiness.percent >= c.readiness.min;
	return /* @__PURE__ */ jsxs("section", {
		id: "decision",
		className: "card stack mod-decision",
		"aria-label": "Решение по клинике",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "stack",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "row row--between",
					children: [/* @__PURE__ */ jsxs("h2", {
						className: "card-title",
						style: { margin: 0 },
						children: [
							"Профиль заполнен на ",
							c.readiness.percent,
							"%"
						]
					}), /* @__PURE__ */ jsx(Badge, {
						tone: ready ? "success" : "warning",
						children: ready ? "достаточно" : `нужно ${c.readiness.min}%`
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "mod-progress",
					role: "progressbar",
					"aria-valuenow": c.readiness.percent,
					"aria-valuemin": 0,
					"aria-valuemax": 100,
					children: /* @__PURE__ */ jsx("span", { style: { width: `${Math.min(c.readiness.percent, 100)}%` } })
				})]
			}),
			c.status !== "pending" ? /* @__PURE__ */ jsxs(Alert, {
				tone: "info",
				children: [
					"Решение уже принято: «",
					c.status_label,
					"»."
				]
			}) : /* @__PURE__ */ jsxs(Fragment, { children: [
				pendingPhotos > 0 ? /* @__PURE__ */ jsx(Check, {
					label: `Одобрить и фото на проверке (${pendingPhotos})`,
					checked: form.data.approve_photos,
					onChange: (e) => form.setData("approve_photos", e.target.checked)
				}) : null,
				/* @__PURE__ */ jsx(TextArea, {
					label: "Причина отклонения (её увидит клиника)",
					value: form.data.note,
					maxLength: 500,
					rows: 3,
					onChange: (e) => form.setData("note", e.target.value),
					error: form.errors.note
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [
						!c.has_owner ? /* @__PURE__ */ jsxs(Button, {
							block: true,
							loading: form.processing,
							onClick: () => send("approve", true),
							children: [/* @__PURE__ */ jsx(Icon, {
								name: "check",
								size: 16
							}), " Одобрить и опубликовать"]
						}) : null,
						/* @__PURE__ */ jsx(Button, {
							block: true,
							variant: c.has_owner ? "primary" : "outline",
							loading: form.processing,
							onClick: () => send("approve"),
							children: c.has_owner ? "Одобрить" : "Только одобрить"
						}),
						/* @__PURE__ */ jsx(Button, {
							block: true,
							variant: "danger",
							loading: form.processing,
							onClick: () => send("reject"),
							children: "Отклонить"
						})
					]
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "text-xs text-muted",
					children: [
						c.has_owner ? "После одобрения владелец получит уведомление и сам опубликует клинику из кабинета." : "У клиники нет владельца: «Одобрить и опубликовать» сразу покажет её в каталоге.",
						" ",
						"После решения откроется следующая клиника из очереди."
					]
				})
			] }),
			/* @__PURE__ */ jsxs("details", {
				className: "mod-checklist-wrap",
				children: [/* @__PURE__ */ jsxs("summary", { children: [
					"Чек-лист профиля · ",
					c.readiness.items.filter((i) => i.done).length,
					" из ",
					c.readiness.items.length
				] }), /* @__PURE__ */ jsx("ul", {
					className: "mod-checklist",
					children: c.readiness.items.map((i) => /* @__PURE__ */ jsxs("li", {
						className: i.done ? "is-done" : i.pending ? "is-pending" : void 0,
						children: [/* @__PURE__ */ jsx(Icon, {
							name: i.done ? "check-circle" : i.pending ? "clock" : "alert",
							size: 16
						}), /* @__PURE__ */ jsxs("span", { children: [
							i.label,
							i.progress && !i.done ? /* @__PURE__ */ jsxs("span", {
								className: "text-muted",
								children: [" · ", i.progress]
							}) : null,
							i.pending ? /* @__PURE__ */ jsx("span", {
								className: "text-muted",
								children: " · на проверке"
							}) : null
						] })]
					}, i.label))
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				style: { gap: 12 },
				children: [/* @__PURE__ */ jsx(Link, {
					href: `/admin/clinics/${c.id}`,
					className: "link text-sm",
					children: "Редактировать в админке"
				}), /* @__PURE__ */ jsxs("a", {
					href: `/clinics/${c.slug}`,
					target: "_blank",
					rel: "noreferrer",
					className: "link text-sm",
					children: ["Как увидят пациенты ", /* @__PURE__ */ jsx(Icon, {
						name: "external",
						size: 14
					})]
				})]
			})
		]
	});
}
function Section({ id, title, note, children }) {
	return /* @__PURE__ */ jsxs("section", {
		id,
		className: "card stack mod-section",
		"aria-labelledby": `${id}-title`,
		children: [
			/* @__PURE__ */ jsx("h2", {
				id: `${id}-title`,
				className: "card-title",
				style: { margin: 0 },
				children: title
			}),
			note ? /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				children: note
			}) : null,
			children
		]
	});
}
function Facts({ rows }) {
	return rows.length > 0 ? /* @__PURE__ */ jsx("dl", {
		className: "mod-facts",
		children: rows.map((f) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: f.label }), /* @__PURE__ */ jsx("dd", { children: f.value })] }, f.label))
	}) : null;
}
function Tags({ items, empty }) {
	return items.length > 0 ? /* @__PURE__ */ jsx("div", {
		className: "mod-tags",
		children: items.map((t) => /* @__PURE__ */ jsx("span", {
			className: "chip chip--static",
			children: t
		}, t))
	}) : /* @__PURE__ */ jsx("p", {
		className: "text-sm text-muted",
		children: empty
	});
}
//#endregion
export { ModerationClinic as default };

//# sourceMappingURL=ModerationClinic-BbXNdKsD.js.map