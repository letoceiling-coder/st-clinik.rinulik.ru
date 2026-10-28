import { i as LinkButton, n as Button, t as AnchorButton } from "./Button-C2BxTtRt.js";
import { S as SelectField, l as Badge, s as Alert } from "../app.js";
import { a as Panel, c as Table, i as PagerSafe, n as Kpis, r as PageHead, t as FilterBar } from "./Dash-cIdZIfDR.js";
import { t as CopyButton } from "./CopyButton-ByUXubLU.js";
import { CAMPAIGN_TONE } from "./Campaigns-BWRegMOn.js";
import { Link, router } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Campaign.tsx
var RECIPIENT_TONE = {
	queued: "info",
	sent: "primary",
	delivered: "primary",
	opened: "primary",
	clicked: "warning",
	demo_opened: "warning",
	replied: "success",
	connected: "success",
	failed: "danger",
	skipped: void 0,
	unsubscribed: void 0
};
var STAGES = [
	"sent",
	"opened",
	"clicked",
	"demo_opened",
	"replied",
	"connected"
];
var percent = (part, total) => total > 0 ? `${Math.round(part / total * 100)}%` : "—";
function AdminCampaign({ campaign, recipients, channels, auto_channels, statuses, recipient_statuses, funnel_labels, filters }) {
	const f = campaign.funnel;
	const active = f.total - f.skipped;
	const post = (action) => router.post(`/admin/campaigns/${campaign.id}/${action}`, {}, { preserveScroll: true });
	const hasAuto = campaign.channels.some((c) => auto_channels.includes(c));
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: campaign.name,
				text: /* @__PURE__ */ jsxs("span", {
					className: "row row--wrap offers-meta",
					children: [/* @__PURE__ */ jsx(Badge, {
						tone: CAMPAIGN_TONE[campaign.status],
						children: statuses[campaign.status] ?? campaign.status
					}), /* @__PURE__ */ jsxs("span", {
						className: "text-sm text-muted",
						children: [
							campaign.template?.name ?? "шаблон удалён",
							" · ",
							campaign.channels.map((c) => channels[c] ?? c).join(", "),
							campaign.started_at ? ` · запущена ${campaign.started_at}` : "",
							campaign.completed_at ? ` · завершена ${campaign.completed_at}` : ""
						]
					})]
				}),
				action: /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap offers-head-actions",
					children: [
						/* @__PURE__ */ jsx(LinkButton, {
							href: "/admin/campaigns",
							variant: "ghost",
							children: "Все кампании"
						}),
						/* @__PURE__ */ jsx(AnchorButton, {
							href: `/admin/campaigns/${campaign.id}/export`,
							variant: "outline",
							icon: "file",
							children: "Экспорт CSV"
						}),
						campaign.status !== "completed" ? /* @__PURE__ */ jsx(Button, {
							variant: "outline",
							icon: "refresh",
							onClick: () => post("rebuild"),
							children: "Добрать получателей"
						}) : null,
						campaign.status === "running" ? /* @__PURE__ */ jsx(Button, {
							variant: "outline",
							onClick: () => post("pause"),
							children: "Пауза"
						}) : campaign.status !== "completed" ? /* @__PURE__ */ jsx(Button, {
							icon: "send",
							onClick: () => post("start"),
							disabled: f.queued === 0,
							children: "Запустить"
						}) : null
					]
				})
			}),
			campaign.status === "draft" && hasAuto ? /* @__PURE__ */ jsx(Alert, {
				tone: "muted",
				icon: "info",
				children: "Проверьте получателей и нажмите «Запустить» — email и SMS уйдут в рабочее время с учётом дневных лимитов. Ручные каналы можно отрабатывать сразу."
			}) : null,
			campaign.filters.length ? /* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: ["Отбор: ", campaign.filters.join(" · ")]
			}) : null,
			/* @__PURE__ */ jsx(Kpis, { items: [
				{
					label: "Получателей",
					value: active,
					hint: `${f.skipped} пропущено`
				},
				{
					label: "В очереди",
					value: f.queued
				},
				{
					label: "Отправлено",
					value: f.sent,
					hint: f.failed ? `${f.failed} с ошибкой` : void 0
				},
				{
					label: "Перешли на КП",
					value: f.clicked,
					hint: percent(f.clicked, f.sent)
				},
				{
					label: "Оставили заявку",
					value: f.replied,
					hint: percent(f.replied, f.sent)
				},
				{
					label: "Отписались",
					value: f.unsubscribed
				}
			] }),
			/* @__PURE__ */ jsxs(Panel, {
				title: "Воронка по каналам",
				children: [/* @__PURE__ */ jsx(Table, {
					headers: ["Канал", ...STAGES.map((s) => funnel_labels[s] ?? s)],
					children: Object.entries(campaign.by_channel).map(([channel, row]) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("b", { children: channels[channel] ?? channel }), /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted",
						children: auto_channels.includes(channel) ? "автоматически" : "вручную"
					})] }), STAGES.map((s) => /* @__PURE__ */ jsxs("td", { children: [
						row[s],
						" ",
						s !== "sent" ? /* @__PURE__ */ jsx("span", {
							className: "text-xs text-muted",
							children: percent(row[s], row.sent)
						}) : null
					] }, s))] }, channel))
				}), /* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted",
					children: "«Открыто» считается только для писем (по картинке-пикселю — часть почтовых программ её блокирует)."
				})]
			}),
			/* @__PURE__ */ jsxs(FilterBar, {
				action: `/admin/campaigns/${campaign.id}`,
				children: [/* @__PURE__ */ jsxs(SelectField, {
					name: "channel",
					defaultValue: filters.channel ?? "",
					"aria-label": "Канал",
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: "Все каналы"
					}), campaign.channels.map((c) => /* @__PURE__ */ jsx("option", {
						value: c,
						children: channels[c] ?? c
					}, c))]
				}), /* @__PURE__ */ jsxs(SelectField, {
					name: "status",
					defaultValue: filters.status ?? "",
					"aria-label": "Статус",
					children: [/* @__PURE__ */ jsx("option", {
						value: "",
						children: "Все статусы"
					}), Object.entries(recipient_statuses).map(([k, v]) => /* @__PURE__ */ jsx("option", {
						value: k,
						children: v
					}, k))]
				})]
			}),
			recipients.data.length === 0 ? /* @__PURE__ */ jsx(Panel, { children: /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Получателей с такими условиями нет."
			}) }) : /* @__PURE__ */ jsx("ul", {
				className: "offers-list",
				children: recipients.data.map((r) => /* @__PURE__ */ jsx(RecipientItem, {
					recipient: r,
					channels,
					statuses: recipient_statuses
				}, r.id))
			}),
			/* @__PURE__ */ jsx(PagerSafe, { page: recipients })
		]
	});
}
function RecipientItem({ recipient: r, channels, statuses }) {
	const mark = (status) => router.post(`/admin/campaigns/recipients/${r.id}/mark`, { status }, { preserveScroll: true });
	const contactHref = r.channel === "phone" ? `tel:${r.contact}` : r.channel === "whatsapp" ? `https://wa.me/${r.contact.replace(/\D/g, "")}` : /^https?:\/\//.test(r.contact) ? r.contact : null;
	const open = ![
		"skipped",
		"unsubscribed",
		"failed",
		"connected"
	].includes(r.status);
	return /* @__PURE__ */ jsxs("li", {
		className: `offers-item card${r.status === "queued" && r.manual ? " is-active" : ""}`,
		children: [/* @__PURE__ */ jsxs("div", {
			className: "offers-item__main stack",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "offers-item__title",
					children: [
						/* @__PURE__ */ jsx("b", { children: r.clinic.name }),
						/* @__PURE__ */ jsx(Badge, {
							tone: RECIPIENT_TONE[r.status],
							children: statuses[r.status] ?? r.status
						}),
						/* @__PURE__ */ jsx("span", {
							className: "text-sm text-muted",
							children: channels[r.channel] ?? r.channel
						})
					]
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "text-sm",
					children: [
						r.contact ? contactHref ? /* @__PURE__ */ jsx("a", {
							href: contactHref,
							className: "link",
							target: "_blank",
							rel: "noopener",
							children: r.contact
						}) : /* @__PURE__ */ jsx("code", { children: r.contact }) : /* @__PURE__ */ jsx("span", {
							className: "text-muted",
							children: "контакта нет"
						}),
						r.clinic.city ? /* @__PURE__ */ jsxs("span", {
							className: "text-muted",
							children: [" · ", r.clinic.city]
						}) : null,
						r.offer_id ? /* @__PURE__ */ jsxs(Fragment, { children: [" · ", /* @__PURE__ */ jsx(Link, {
							href: `/admin/offers/${r.offer_id}`,
							className: "link",
							children: "КП"
						})] }) : null
					]
				}),
				r.error ? /* @__PURE__ */ jsx("p", {
					className: `text-xs ${r.status === "failed" ? "offers-warn" : "text-muted"}`,
					children: r.error
				}) : null,
				r.sent_at ? /* @__PURE__ */ jsxs("p", {
					className: "text-xs text-muted",
					children: [
						"Отправлено ",
						r.sent_at,
						r.sent_by ? ` · ${r.sent_by}` : ""
					]
				}) : null,
				r.manual && r.text && open ? /* @__PURE__ */ jsxs("details", {
					className: "offers-details",
					open: r.status === "queued",
					children: [
						/* @__PURE__ */ jsx("summary", { children: r.channel === "phone" ? "Скрипт звонка" : "Текст сообщения" }),
						/* @__PURE__ */ jsx("pre", {
							className: "offers-plain",
							children: r.text
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "row row--wrap offers-head-actions",
							children: [/* @__PURE__ */ jsx(CopyButton, {
								value: r.text,
								label: "Копировать текст"
							}), r.link ? /* @__PURE__ */ jsx(CopyButton, {
								value: r.link,
								label: "Копировать ссылку"
							}) : null]
						})
					]
				}) : null
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "offers-item__side offers-item__buttons",
			children: [
				r.manual && r.status === "queued" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Button, {
					size: "sm",
					icon: "check",
					onClick: () => mark("sent"),
					children: r.channel === "phone" ? "Позвонил" : "Отправил"
				}), /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: "ghost",
					onClick: () => mark("skipped"),
					children: "Пропустить"
				})] }) : null,
				r.status === "failed" ? /* @__PURE__ */ jsx(Button, {
					size: "sm",
					variant: "outline",
					icon: "refresh",
					onClick: () => router.post(`/admin/campaigns/recipients/${r.id}/retry`, {}, { preserveScroll: true }),
					children: "Повторить"
				}) : null,
				open && r.status !== "queued" ? /* @__PURE__ */ jsxs(Fragment, { children: [
					r.status !== "replied" ? /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "outline",
						onClick: () => mark("replied"),
						children: "Ответили"
					}) : null,
					/* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "outline",
						onClick: () => mark("connected"),
						children: "Подключились"
					}),
					/* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => mark("unsubscribed"),
						children: "Отказ, не писать"
					})
				] }) : null
			]
		})]
	});
}
//#endregion
export { AdminCampaign as default };

//# sourceMappingURL=Campaign-Mt5ujNcB.js.map