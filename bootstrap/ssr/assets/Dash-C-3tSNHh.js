import { n as Button } from "./Button-DsM_qe4F.js";
import { s as Badge } from "../app.js";
import { Link, router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/Dash.tsx
var STATUS = {
	draft: { label: "Черновик" },
	pending: {
		label: "На модерации",
		tone: "warning"
	},
	published: {
		label: "Опубликовано",
		tone: "success"
	},
	rejected: {
		label: "Отклонено",
		tone: "danger"
	},
	hidden: {
		label: "Скрыто",
		tone: "info"
	},
	active: {
		label: "Активен",
		tone: "success"
	},
	blocked: {
		label: "Заблокирован",
		tone: "danger"
	},
	new: {
		label: "Новая",
		tone: "primary"
	},
	confirmed: {
		label: "Подтверждена",
		tone: "info"
	},
	completed: {
		label: "Состоялась",
		tone: "success"
	},
	cancelled: { label: "Отменена" },
	no_show: {
		label: "Не пришёл",
		tone: "warning"
	},
	open: {
		label: "Открыта",
		tone: "warning"
	},
	upheld: {
		label: "Подтверждена",
		tone: "success"
	}
};
function StatusBadge({ status }) {
	const s = STATUS[status];
	return /* @__PURE__ */ jsx(Badge, {
		tone: s?.tone,
		children: s?.label ?? status
	});
}
function PageHead({ title, text, action }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "page-head page-head--dash",
		children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", { children: title }), text ? /* @__PURE__ */ jsx("p", {
			className: "text-muted",
			children: text
		}) : null] }), action]
	});
}
function Kpis({ items }) {
	return /* @__PURE__ */ jsx("dl", {
		className: "kpi-grid",
		children: items.map((i) => /* @__PURE__ */ jsxs("div", {
			className: "kpi card",
			children: [
				/* @__PURE__ */ jsx("dt", { children: i.label }),
				/* @__PURE__ */ jsx("dd", { children: i.value }),
				i.hint ? /* @__PURE__ */ jsx("span", {
					className: "text-xs text-muted",
					children: i.hint
				}) : null
			]
		}, i.label))
	});
}
function FilterBar({ action = "", children }) {
	const submit = (e) => {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(e.currentTarget).entries());
		router.get(action || window.location.pathname, data, {
			preserveState: true,
			replace: true
		});
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "filter-bar",
		onSubmit: submit,
		children: [children, /* @__PURE__ */ jsx(Button, {
			type: "submit",
			variant: "dark",
			size: "sm",
			children: "Найти"
		})]
	});
}
function Table({ headers, children }) {
	return /* @__PURE__ */ jsx("div", {
		className: "table-wrap",
		children: /* @__PURE__ */ jsxs("table", {
			className: "table",
			children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { children: headers.map((h) => /* @__PURE__ */ jsx("th", {
				scope: "col",
				children: h
			}, h)) }) }), /* @__PURE__ */ jsx("tbody", { children })]
		})
	});
}
function PagerSafe({ page }) {
	if (!page || page.last_page <= 1) return null;
	return /* @__PURE__ */ jsxs("nav", {
		className: "pagination",
		"aria-label": "Страницы",
		children: [
			page.prev_page_url ? /* @__PURE__ */ jsx(Link, {
				href: page.prev_page_url,
				className: "page-btn",
				preserveState: true,
				children: "Назад"
			}) : /* @__PURE__ */ jsx("span", {
				className: "page-btn is-disabled",
				children: "Назад"
			}),
			/* @__PURE__ */ jsxs("span", {
				className: "text-sm text-muted",
				children: [
					page.current_page,
					" / ",
					page.last_page
				]
			}),
			page.next_page_url ? /* @__PURE__ */ jsx(Link, {
				href: page.next_page_url,
				className: "page-btn",
				preserveState: true,
				children: "Вперёд"
			}) : /* @__PURE__ */ jsx("span", {
				className: "page-btn is-disabled",
				children: "Вперёд"
			})
		]
	});
}
//#endregion
export { StatusBadge as a, PagerSafe as i, Kpis as n, Table as o, PageHead as r, FilterBar as t };

//# sourceMappingURL=Dash-C-3tSNHh.js.map