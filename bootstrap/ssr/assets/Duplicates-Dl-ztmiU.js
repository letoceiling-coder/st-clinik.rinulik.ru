import { n as Button } from "./Button-D8Mzgn6o.js";
import { l as EmptyState } from "../app.js";
import { o as StatusBadge, r as PageHead } from "./Dash-BbiOlhfn.js";
import { Link, router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/Duplicates.tsx
function Duplicates({ pairs }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [/* @__PURE__ */ jsx(PageHead, {
			title: "Дубликаты",
			text: "Совпадения по телефону, адресу или названию в городе."
		}), pairs.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Подозрительных пар нет" }) : pairs.map((p) => /* @__PURE__ */ jsxs("article", {
			className: "card stack",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: p.reasons.join(" · ")
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "two-col two-col--even",
					children: [/* @__PURE__ */ jsx(Clinic, { c: p.a }), /* @__PURE__ */ jsx(Clinic, { c: p.b })]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					children: [
						/* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "secondary",
							onClick: () => router.post("/admin/duplicates/dismiss", {
								a: p.a.id,
								b: p.b.id
							}),
							children: "Это разные клиники"
						}),
						/* @__PURE__ */ jsx(Button, {
							size: "sm",
							onClick: () => confirm("Объединить в первую?") && router.post("/admin/duplicates/merge", {
								keep: p.a.id,
								remove: p.b.id
							}),
							children: "Оставить первую"
						}),
						/* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "dark",
							onClick: () => confirm("Объединить во вторую?") && router.post("/admin/duplicates/merge", {
								keep: p.b.id,
								remove: p.a.id
							}),
							children: "Оставить вторую"
						})
					]
				})
			]
		}, p.key))]
	});
}
function Clinic({ c }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "card card--muted",
		children: [
			/* @__PURE__ */ jsx(Link, {
				href: `/clinics/${c.slug}`,
				className: "link",
				children: c.name
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm",
				children: [
					c.city,
					", ",
					c.address
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: [
					c.phone,
					" · отзывы ",
					c.reviews_count,
					" · врачи ",
					c.doctors_count
				]
			}),
			/* @__PURE__ */ jsx(StatusBadge, { status: c.status })
		]
	});
}
//#endregion
export { Duplicates as default };

//# sourceMappingURL=Duplicates-Dl-ztmiU.js.map