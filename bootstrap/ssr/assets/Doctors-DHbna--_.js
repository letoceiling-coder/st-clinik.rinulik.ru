import { i as LinkButton, n as Button } from "./Button-D8Mzgn6o.js";
import { l as EmptyState } from "../app.js";
import { n as DoctorArt } from "./PhotoArt-BefU5AAo.js";
import { o as StatusBadge, r as PageHead, s as Table } from "./Dash-BbiOlhfn.js";
import { Link, router } from "@inertiajs/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Cabinet/Doctors.tsx
function Doctors({ doctors }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [/* @__PURE__ */ jsx(PageHead, {
			title: "Врачи",
			action: /* @__PURE__ */ jsx(LinkButton, {
				href: "/clinic-cabinet/doctors/create",
				children: "Добавить врача"
			})
		}), doctors.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
			title: "В филиале ещё нет врачей",
			action: /* @__PURE__ */ jsx(LinkButton, {
				href: "/clinic-cabinet/doctors/create",
				children: "Добавить"
			})
		}) : /* @__PURE__ */ jsx(Table, {
			headers: [
				"",
				"Врач",
				"Стаж",
				"Статус",
				""
			],
			children: doctors.map((d) => /* @__PURE__ */ jsxs("tr", { children: [
				/* @__PURE__ */ jsx("td", {
					className: "doctor-list__photo",
					children: /* @__PURE__ */ jsx(DoctorArt, {
						seed: d.art_seed,
						photoUrl: d.photo_url,
						name: d.name
					})
				}),
				/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("b", { children: d.name }), /* @__PURE__ */ jsxs("div", {
					className: "text-xs text-muted",
					children: [
						d.position,
						" · ",
						d.specialties.join(", ")
					]
				})] }),
				/* @__PURE__ */ jsxs("td", { children: [d.experience_years, " лет"] }),
				/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx(StatusBadge, { status: d.status }), d.moderation_note ? /* @__PURE__ */ jsx("div", {
					className: "text-xs text-muted",
					children: d.moderation_note
				}) : null] }),
				/* @__PURE__ */ jsxs("td", {
					className: "actions",
					children: [/* @__PURE__ */ jsx(Link, {
						href: `/clinic-cabinet/doctors/${d.id}/edit`,
						className: "link",
						children: "Править"
					}), /* @__PURE__ */ jsx(Button, {
						size: "sm",
						variant: "ghost",
						onClick: () => confirm("Удалить врача?") && router.delete(`/clinic-cabinet/doctors/${d.id}`),
						children: "Удалить"
					})]
				})
			] }, d.id))
		})]
	});
}
//#endregion
export { Doctors as default };

//# sourceMappingURL=Doctors-DHbna--_.js.map