import { n as Button } from "./Button-DsM_qe4F.js";
import { g as Check, s as Badge, x as TextField } from "../app.js";
import { r as PageHead } from "./Dash-BUI7tnGJ.js";
import { useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
//#region resources/js/pages/Admin/Integrations.tsx
function InstructionBlock({ text }) {
	if (!text) return null;
	return /* @__PURE__ */ jsx("div", {
		className: "integration-instructions",
		children: text.split("\n").map((line, i) => {
			const trimmed = line.trim();
			if (!trimmed) return /* @__PURE__ */ jsx("br", {}, i);
			const html = trimmed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noreferrer\" class=\"link\">$1</a>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
			if (/^\d+\./.test(trimmed)) return /* @__PURE__ */ jsx("p", {
				className: "text-sm",
				dangerouslySetInnerHTML: { __html: html }
			}, i);
			return /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				dangerouslySetInnerHTML: { __html: html }
			}, i);
		})
	});
}
function GroupCard({ group }) {
	const [open, setOpen] = useState(!group.status.configured);
	const initial = Object.fromEntries(group.fields.map((f) => [f.name, f.type === "checkbox" ? f.value === "1" : f.value]));
	const form = useForm(initial);
	const submit = (event) => {
		event.preventDefault();
		form.put(`/admin/integrations/${group.key}`, { preserveScroll: true });
	};
	return /* @__PURE__ */ jsxs("article", {
		className: "card stack integration-card",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "integration-card__head",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "integration-card__intro",
				children: [/* @__PURE__ */ jsx("h2", {
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
						children: group.status.configured ? "Настроено" : `Заполнено ${group.status.filled}/${group.status.total}`
					}),
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
						children: open ? "Свернуть" : "Настроить"
					})
				]
			})]
		}), open ? /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx(InstructionBlock, { text: group.instructions }),
			Object.keys(group.hints).length > 0 ? /* @__PURE__ */ jsx("dl", {
				className: "integration-hints text-sm",
				children: Object.entries(group.hints).map(([k, v]) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", {
					className: "text-muted",
					children: k
				}), /* @__PURE__ */ jsx("dd", { children: /* @__PURE__ */ jsx("code", { children: v }) })] }, k))
			}) : null,
			/* @__PURE__ */ jsxs("form", {
				className: "stack integration-form",
				onSubmit: submit,
				children: [group.fields.map((field) => field.type === "checkbox" ? /* @__PURE__ */ jsx(Check, {
					label: field.label,
					checked: Boolean(form.data[field.name]),
					onChange: (e) => form.setData(field.name, e.target.checked)
				}, field.name) : /* @__PURE__ */ jsx(TextField, {
					label: field.label,
					type: field.secret ? "password" : field.type === "url" ? "url" : "text",
					value: String(form.data[field.name] ?? ""),
					onChange: (e) => form.setData(field.name, e.target.value),
					error: form.errors[field.name],
					hint: field.secret && field.has_value ? `Сохранено: ${field.masked}. Оставьте пустым, чтобы не менять.` : void 0,
					placeholder: field.secret && field.has_value ? "••••••••" : void 0
				}, field.name)), /* @__PURE__ */ jsx("div", {
					className: "integration-form__actions",
					children: /* @__PURE__ */ jsx(Button, {
						type: "submit",
						block: true,
						disabled: form.processing,
						children: "Сохранить"
					})
				})]
			})
		] }) : null]
	});
}
function AdminIntegrations({ groups, yookassa_ready, app_url }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Интеграции",
				text: "Ключи API, OAuth и платёжные сервисы. Значения хранятся в базе и применяются без правки .env на сервере."
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted integration-meta",
				children: [
					"Базовый URL сайта: ",
					/* @__PURE__ */ jsx("code", { children: app_url }),
					yookassa_ready ? /* @__PURE__ */ jsxs(Fragment, { children: [
						" ",
						"· ",
						/* @__PURE__ */ jsx(Badge, {
							tone: "success",
							children: "ЮKassa активна"
						})
					] }) : null
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "stack-lg",
				children: groups.map((group) => /* @__PURE__ */ jsx(GroupCard, { group }, group.key))
			})
		]
	});
}
//#endregion
export { AdminIntegrations as default };

//# sourceMappingURL=Integrations-CTtdMh3E.js.map