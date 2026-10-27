import { n as Button } from "./Button-D8Mzgn6o.js";
import { l as Badge } from "../app.js";
import { Link, router } from "@inertiajs/react";
import { Children, cloneElement, isValidElement } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/Dash.tsx
var STATUS = {
	draft: { label: "Черновик" },
	pending: {
		label: "На модерации",
		tone: "warning"
	},
	approved: {
		label: "Одобрено",
		tone: "info"
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
	rescheduled: {
		label: "Перенесена",
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
	booked: {
		label: "Забронировано",
		tone: "primary"
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
function StatusBadge({ status, label }) {
	const s = STATUS[status];
	return /* @__PURE__ */ jsx(Badge, {
		tone: s?.tone,
		children: label ?? s?.label ?? status
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
/** Колонок столько, чтобы ряды были ровными: 6 → 3+3, 8 → 4+4, 5 → 5. */
function kpiColumns(count) {
	if (count % 4 === 0) return 4;
	if (count % 3 === 0) return 3;
	return Math.min(count, 5);
}
function Kpis({ items }) {
	return /* @__PURE__ */ jsx("dl", {
		className: "kpi-grid kpi-grid--balanced",
		style: { "--kpi-cols": kpiColumns(items.length) },
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
function Panel({ title, action, children }) {
	return /* @__PURE__ */ jsxs("section", {
		className: "card stack",
		children: [title || action ? /* @__PURE__ */ jsxs("div", {
			className: "row row--between",
			children: [title ? /* @__PURE__ */ jsx("h2", {
				className: "card-title",
				style: { margin: 0 },
				children: title
			}) : /* @__PURE__ */ jsx("span", {}), action]
		}) : null, children]
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
function labelRows(headers, children) {
	return Children.map(children, (row) => {
		if (!isValidElement(row)) return row;
		const cells = Children.toArray(row.props.children);
		return cloneElement(row, {}, cells.map((cell, index) => {
			if (!isValidElement(cell)) return cell;
			if (cell.props["data-label"] !== void 0) return cell;
			return cloneElement(cell, { "data-label": headers[index] ?? "" });
		}));
	});
}
function Table({ headers, children }) {
	return /* @__PURE__ */ jsx("div", {
		className: "table-wrap",
		children: /* @__PURE__ */ jsxs("table", {
			className: "table table--responsive",
			children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { children: headers.map((h, index) => /* @__PURE__ */ jsx("th", {
				scope: "col",
				children: h
			}, `${h}-${index}`)) }) }), /* @__PURE__ */ jsx("tbody", { children: labelRows(headers, children) })]
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
export { Panel as a, Table as c, PagerSafe as i, Kpis as n, STATUS as o, PageHead as r, StatusBadge as s, FilterBar as t };

//# sourceMappingURL=Dash-mdaQWR8t.js.map