import { n as Button } from "./Button-C2BxTtRt.js";
import { C as SelectField, T as TextField, c as Alert, u as Badge, y as Check } from "../app.js";
import { c as Table, r as PageHead } from "./Dash-C8plSzIc.js";
import { Link, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Integrations.tsx
var escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function InstructionBlock({ text }) {
	if (!text) return null;
	return /* @__PURE__ */ jsx("div", {
		className: "integration-instructions",
		children: text.split("\n").map((line, i) => {
			const trimmed = line.trim();
			if (!trimmed) return null;
			const html = escapeHtml(trimmed).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noreferrer\" class=\"link\">$1</a>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
			return /* @__PURE__ */ jsx("p", {
				className: /^\d+\./.test(trimmed) ? "text-sm" : "text-sm text-muted",
				dangerouslySetInnerHTML: { __html: html }
			}, i);
		})
	});
}
function MetrikaGoalsSetup({ goals }) {
	if (goals.length === 0) return null;
	return /* @__PURE__ */ jsxs("div", {
		className: "integration-instructions stack",
		children: [
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm",
				children: [
					/* @__PURE__ */ jsx("strong", { children: "5. JavaScript-цели (обязательно для воронки):" }),
					" после сохранения номера счётчика сайт вызывает",
					" ",
					/* @__PURE__ */ jsx("code", { children: "reachGoal" }),
					" с фиксированными идентификаторами. В Метрике: счётчик → ",
					/* @__PURE__ */ jsx("strong", { children: "Настройки" }),
					" → ",
					/* @__PURE__ */ jsx("strong", { children: "Цели" }),
					" →",
					" ",
					/* @__PURE__ */ jsx("strong", { children: "Добавить цель" }),
					" → тип ",
					/* @__PURE__ */ jsx("strong", { children: "JavaScript-событие" }),
					". В поле ",
					/* @__PURE__ */ jsx("strong", { children: "Идентификатор цели" }),
					" введите строку",
					" ",
					/* @__PURE__ */ jsx("strong", { children: "точно" }),
					" как в таблице (латиница, подчёркивания, без пробелов). Название цели может быть любым."
				]
			}),
			/* @__PURE__ */ jsx(Table, {
				headers: ["ID цели", "Описание"],
				children: goals.map((g) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", { children: g.id }) }), /* @__PURE__ */ jsx("td", { children: g.label })] }, g.id))
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm",
				children: [
					/* @__PURE__ */ jsx("strong", { children: "6." }),
					" Тот же список — в разделе",
					" ",
					/* @__PURE__ */ jsx(Link, {
						href: "/admin/analytics",
						className: "link",
						children: "Аналитика"
					}),
					" ",
					"(таблица «Цели Яндекс.Метрики»). Проверка: в",
					" ",
					/* @__PURE__ */ jsx("a", {
						href: "https://metrika.yandex.ru/",
						target: "_blank",
						rel: "noreferrer",
						className: "link",
						children: "отчётах Метрики"
					}),
					" ",
					"→ ",
					/* @__PURE__ */ jsx("strong", { children: "Конверсии" }),
					" → ",
					/* @__PURE__ */ jsx("strong", { children: "Цели" }),
					" — через 15–30 минут после тестового поиска или записи на сайте должны появиться срабатывания."
				]
			})
		]
	});
}
function CopyValue({ value }) {
	const [copied, setCopied] = useState(false);
	const copy = () => {
		navigator.clipboard?.writeText(value).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	};
	return /* @__PURE__ */ jsxs("dd", {
		className: "integration-hints__value",
		children: [/* @__PURE__ */ jsx("code", { children: value }), /* @__PURE__ */ jsx(Button, {
			type: "button",
			size: "sm",
			variant: "ghost",
			onClick: copy,
			children: copied ? "Скопировано" : "Копировать"
		})]
	});
}
function LastCheck({ check }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [/* @__PURE__ */ jsxs(Alert, {
			tone: check.ok ? "success" : "danger",
			children: [
				/* @__PURE__ */ jsx("strong", { children: check.ok ? "Проверка пройдена" : "Проверка не пройдена" }),
				" · ",
				check.checked_at,
				check.checked_by ? `, ${check.checked_by}` : "",
				/* @__PURE__ */ jsx("br", {}),
				check.message
			]
		}), check.details.length > 0 ? /* @__PURE__ */ jsx("dl", {
			className: "integration-check-details text-sm",
			children: check.details.map((d) => /* @__PURE__ */ jsxs("div", {
				className: d.ok === false ? "is-bad" : d.ok === true ? "is-good" : void 0,
				children: [/* @__PURE__ */ jsx("dt", {
					className: "text-muted",
					children: d.label
				}), /* @__PURE__ */ jsx("dd", { children: d.value })]
			}, d.label))
		}) : null]
	});
}
function FieldInput({ field, form }) {
	const value = form.data[field.name];
	const error = form.errors[field.name];
	const label = field.optional ? `${field.label} (необязательно)` : field.label;
	if (field.type === "checkbox") return /* @__PURE__ */ jsx(Check, {
		label: field.label,
		checked: Boolean(value),
		onChange: (e) => form.setData(field.name, e.target.checked),
		error
	});
	if (field.type === "select") return /* @__PURE__ */ jsxs(SelectField, {
		label,
		value: String(value ?? ""),
		onChange: (e) => form.setData(field.name, e.target.value),
		error,
		hint: field.help ?? void 0,
		children: [/* @__PURE__ */ jsx("option", {
			value: "",
			children: "— не выбрано —"
		}), Object.entries(field.options ?? {}).map(([k, v]) => /* @__PURE__ */ jsx("option", {
			value: k,
			children: v
		}, k))]
	});
	const savedSecretHint = field.secret && field.has_value ? `Сохранено: ${field.masked}. Оставьте пустым, чтобы не менять.` : null;
	return /* @__PURE__ */ jsx(TextField, {
		label,
		type: field.secret ? "password" : field.type === "number" ? "number" : field.type,
		step: field.type === "number" ? "any" : void 0,
		autoComplete: field.secret ? "new-password" : "off",
		value: String(value ?? ""),
		onChange: (e) => form.setData(field.name, e.target.value),
		error,
		hint: [savedSecretHint, field.help].filter(Boolean).join(" ") || void 0,
		placeholder: field.secret && field.has_value ? "••••••••" : field.placeholder ?? void 0
	});
}
function GroupCard({ group, metrikaGoals, adminWebPushSubscribed }) {
	const [open, setOpen] = useState(false);
	const [checking, setChecking] = useState(false);
	const [testingPush, setTestingPush] = useState(false);
	const initial = Object.fromEntries(group.fields.map((f) => [f.name, f.type === "checkbox" ? [
		"1",
		"true",
		"on",
		"yes"
	].includes(String(f.value).toLowerCase()) : f.value]));
	const form = useForm(initial);
	const hasSecret = group.fields.some((f) => f.secret && f.has_value);
	const submit = (event) => {
		event.preventDefault();
		form.put(`/admin/integrations/${group.key}`, {
			preserveScroll: true,
			onSuccess: () => {
				group.fields.filter((f) => f.secret).map((f) => f.name).forEach((name) => form.setData(name, ""));
			}
		});
	};
	const runCheck = () => {
		router.post(`/admin/integrations/${group.key}/check`, {}, {
			preserveScroll: true,
			onStart: () => setChecking(true),
			onFinish: () => setChecking(false)
		});
	};
	const generate = () => {
		if (hasSecret && !window.confirm("Ключи уже есть. После замены все браузерные подписки перестанут работать. Сгенерировать новые?")) return;
		router.post("/admin/integrations/web_push/generate", {}, { preserveScroll: true });
	};
	const sendTestPush = () => {
		router.post("/admin/integrations/web_push/test", {}, {
			preserveScroll: true,
			onStart: () => setTestingPush(true),
			onFinish: () => setTestingPush(false)
		});
	};
	const checkBadge = group.last_check ? /* @__PURE__ */ jsx(Badge, {
		tone: group.last_check.ok ? "success" : "danger",
		children: group.last_check.ok ? "Проверено" : "Ошибка проверки"
	}) : null;
	return /* @__PURE__ */ jsxs("article", {
		className: "card stack integration-card",
		id: `integration-${group.key}`,
		children: [/* @__PURE__ */ jsxs("div", {
			className: "integration-card__head",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "integration-card__intro",
				children: [/* @__PURE__ */ jsx("h3", {
					className: "integration-card__title",
					children: group.title
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: group.description
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "integration-card__tools",
				children: [
					/* @__PURE__ */ jsx(Badge, {
						tone: group.status.configured ? "success" : "warning",
						children: group.status.configured ? "Заполнено" : `Заполнено ${group.status.filled}/${group.status.total}`
					}),
					checkBadge,
					group.docs_url ? /* @__PURE__ */ jsx("a", {
						href: group.docs_url,
						className: "link text-sm",
						target: "_blank",
						rel: "noreferrer",
						children: "Документация"
					}) : null,
					/* @__PURE__ */ jsx(Button, {
						type: "button",
						size: "sm",
						variant: "outline",
						className: "integration-card__toggle",
						onClick: () => setOpen((v) => !v),
						"aria-expanded": open,
						children: open ? "Свернуть" : "Настроить"
					})
				]
			})]
		}), open ? /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx(InstructionBlock, { text: group.instructions }),
			group.key === "yandex_metrika" && metrikaGoals ? /* @__PURE__ */ jsx(MetrikaGoalsSetup, { goals: metrikaGoals }) : null,
			Object.keys(group.hints).length > 0 ? /* @__PURE__ */ jsx("dl", {
				className: "integration-hints text-sm",
				children: Object.entries(group.hints).map(([label, value]) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", {
					className: "text-muted",
					children: label
				}), /* @__PURE__ */ jsx(CopyValue, { value })] }, label))
			}) : null,
			/* @__PURE__ */ jsxs("form", {
				className: "stack integration-form",
				onSubmit: submit,
				autoComplete: "off",
				children: [
					group.fields.map((field) => /* @__PURE__ */ jsx(FieldInput, {
						field,
						form
					}, field.name)),
					/* @__PURE__ */ jsxs("div", {
						className: "integration-form__actions",
						children: [
							/* @__PURE__ */ jsx(Button, {
								type: "submit",
								disabled: form.processing,
								loading: form.processing,
								children: "Сохранить"
							}),
							group.checkable ? /* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "outline",
								onClick: runCheck,
								disabled: checking || form.isDirty,
								loading: checking,
								title: form.isDirty ? "Сначала сохраните изменения" : void 0,
								children: "Проверить подключение"
							}) : null,
							group.generatable ? /* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "secondary",
								onClick: generate,
								children: "Сгенерировать ключи"
							}) : null,
							group.key === "web_push" ? /* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "outline",
								onClick: sendTestPush,
								disabled: testingPush || form.isDirty || !adminWebPushSubscribed,
								loading: testingPush,
								title: form.isDirty ? "Сначала сохраните изменения" : !adminWebPushSubscribed ? "Включите push в личном кабинете → Профиль" : void 0,
								children: "Отправить тестовый push"
							}) : null
						]
					}),
					form.isDirty && group.checkable ? /* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted",
						children: "Проверка выполняется по сохранённым значениям — сначала сохраните изменения."
					}) : null,
					group.key === "web_push" && !adminWebPushSubscribed ? /* @__PURE__ */ jsxs("p", {
						className: "text-xs text-muted",
						children: [
							"Чтобы отправить тест, включите push в",
							" ",
							/* @__PURE__ */ jsx(Link, {
								href: "/account/profile",
								className: "link",
								children: "личном кабинете → Профиль"
							}),
							" ",
							"в этом браузере."
						]
					}) : null
				]
			}),
			group.last_check ? /* @__PURE__ */ jsx(LastCheck, { check: group.last_check }) : null,
			group.history.length > 0 ? /* @__PURE__ */ jsxs("div", {
				className: "stack",
				children: [/* @__PURE__ */ jsx("h4", {
					className: "text-sm",
					children: "Журнал"
				}), /* @__PURE__ */ jsx("ul", {
					className: "integration-history text-sm",
					children: group.history.map((h) => /* @__PURE__ */ jsxs("li", { children: [
						/* @__PURE__ */ jsxs("span", {
							className: "text-muted",
							children: [
								h.at,
								" · ",
								h.user
							]
						}),
						" ",
						"— ",
						h.text
					] }, h.id))
				})]
			}) : null
		] }) : group.last_check && !group.last_check.ok ? /* @__PURE__ */ jsx("p", {
			className: "text-sm integration-card__error",
			children: group.last_check.message
		}) : null]
	});
}
function AdminIntegrations({ categories, groups, app_url, yandex_metrika_goals, admin_web_push_subscribed }) {
	const byCategory = Object.entries(categories).map(([key, title]) => ({
		key,
		title,
		groups: groups.filter((g) => g.category === key)
	})).filter((c) => c.groups.length > 0);
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Интеграции",
				text: "Все ключи доступа хранятся в базе данных: секреты зашифрованы и не показываются после сохранения. Изменения применяются сразу, без правки .env и перезапуска."
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted integration-meta",
				children: ["Адрес сайта для настроек в кабинетах сервисов: ", /* @__PURE__ */ jsx("code", { children: app_url })]
			}),
			/* @__PURE__ */ jsx("nav", {
				className: "integration-nav",
				"aria-label": "Разделы интеграций",
				children: byCategory.map((c) => {
					const ready = c.groups.filter((g) => g.status.configured && g.last_check?.ok).length;
					return /* @__PURE__ */ jsxs("a", {
						href: `#category-${c.key}`,
						className: "chip",
						children: [
							c.title,
							" · ",
							ready,
							"/",
							c.groups.length
						]
					}, c.key);
				})
			}),
			byCategory.map((c) => /* @__PURE__ */ jsxs("section", {
				id: `category-${c.key}`,
				className: "stack",
				"aria-labelledby": `category-${c.key}-title`,
				children: [/* @__PURE__ */ jsx("h2", {
					id: `category-${c.key}-title`,
					className: "integration-category__title",
					children: c.title
				}), c.groups.map((group) => /* @__PURE__ */ jsx(GroupCard, {
					group,
					metrikaGoals: group.key === "yandex_metrika" ? yandex_metrika_goals : void 0,
					adminWebPushSubscribed: group.key === "web_push" ? admin_web_push_subscribed : void 0
				}, group.key))]
			}, c.key))
		]
	});
}
//#endregion
export { AdminIntegrations as default };

//# sourceMappingURL=Integrations-DnNrZv4f.js.map