import { n as Button } from "./Button-C2BxTtRt.js";
import { D as SearchInput, O as SelectField, S as Stars, l as promptDialog } from "../app.js";
import { i as PagerSafe, r as PageHead, s as StatusBadge, t as FilterBar } from "./Dash-C_HMp027.js";
import { router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Reviews.tsx
function Reviews({ reviews, statuses, filters }) {
	const act = async (id, action) => {
		let note = "";
		if (action === "reject" || action === "hide") {
			const answer = await promptDialog({
				title: action === "reject" ? "Отклонить отзыв" : "Скрыть отзыв",
				label: "Комментарий — его увидит автор",
				placeholder: "Необязательно",
				multiline: true,
				confirmLabel: action === "reject" ? "Отклонить" : "Скрыть",
				danger: true
			});
			if (answer === null) return;
			note = answer;
		}
		router.put(`/admin/reviews/${id}`, {
			action,
			note
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Отзывы",
				text: "Не пропускайте диагнозы, персональные данные и рекламу."
			}),
			/* @__PURE__ */ jsxs(FilterBar, { children: [/* @__PURE__ */ jsx(SearchInput, {
				name: "q",
				defaultValue: filters.q,
				placeholder: "Текст или автор"
			}), /* @__PURE__ */ jsxs(SelectField, {
				name: "status",
				label: "Статус",
				defaultValue: filters.status ?? "",
				children: [/* @__PURE__ */ jsx("option", {
					value: "",
					children: "Все"
				}), statuses.map((s) => /* @__PURE__ */ jsx("option", {
					value: s,
					children: s
				}, s))]
			})] }),
			reviews.data.map((r) => /* @__PURE__ */ jsxs("article", {
				className: "card stack",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "row row--between",
						children: [/* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsx("b", { children: r.author }),
							" · ",
							r.clinic,
							/* @__PURE__ */ jsxs("div", {
								className: "text-xs text-muted",
								children: [r.created_at, r.is_verified_visit ? " · визит" : ""]
							})
						] }), /* @__PURE__ */ jsx(StatusBadge, { status: r.status })]
					}),
					/* @__PURE__ */ jsx(Stars, { value: r.rating }),
					/* @__PURE__ */ jsx("p", { children: r.body }),
					r.flags ? /* @__PURE__ */ jsxs("p", {
						className: "text-xs text-muted",
						children: ["Флаги: ", Array.isArray(r.flags) ? r.flags.join(", ") : JSON.stringify(r.flags)]
					}) : null,
					/* @__PURE__ */ jsxs("div", {
						className: "row row--wrap",
						children: [
							/* @__PURE__ */ jsx(Button, {
								size: "sm",
								onClick: () => act(r.id, "approve"),
								children: "Одобрить"
							}),
							/* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "danger",
								onClick: () => act(r.id, "reject"),
								children: "Отклонить"
							}),
							/* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "secondary",
								onClick: () => act(r.id, "hide"),
								children: "Скрыть"
							}),
							/* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => act(r.id, "restore"),
								children: "Вернуть"
							})
						]
					})
				]
			}, r.id)),
			/* @__PURE__ */ jsx(PagerSafe, { page: reviews })
		]
	});
}
//#endregion
export { Reviews as default };

//# sourceMappingURL=Reviews-CH81CF3a.js.map