import { n as Button } from "./Button-D8Mzgn6o.js";
import { v as Check } from "../app.js";
import { r as PageHead } from "./Dash-mdaQWR8t.js";
import { useForm } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/SiteDisplay.tsx
function SiteDisplay({ display_settings, yandex_maps_configured }) {
	const form = useForm({
		home_map_enabled: display_settings.home_map_enabled,
		ads_enabled: display_settings.ads_enabled
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Сайт: карта и реклама",
				text: "Переключатели для публичного сайта. Доступно без раздела «Справочники → География»."
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "card stack",
				onSubmit: (e) => {
					e.preventDefault();
					form.put("/admin/site-display", { preserveScroll: true });
				},
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Рекламные баннеры"
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Показывать рекламу на сайте",
						checked: form.data.ads_enabled,
						onChange: (e) => form.setData("ads_enabled", e.target.checked)
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "При включении на главной и в каталоге видны только одобренные активные баннеры выбранного города. Если в городе нет баннеров, блок не показывается. Демо-заглушки отключены."
					}),
					/* @__PURE__ */ jsx("h2", {
						className: "card-title",
						children: "Карта на главной"
					}),
					/* @__PURE__ */ jsx(Check, {
						label: "Показывать карту клиник под шапкой",
						checked: form.data.home_map_enabled,
						onChange: (e) => form.setData("home_map_enabled", e.target.checked)
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "text-sm text-muted",
						children: [
							"Блок виден только если переключатель включён",
							yandex_maps_configured ? /* @__PURE__ */ jsx(Fragment, { children: " и в интеграциях указан ключ Яндекс.Карт" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
								", но сейчас",
								" ",
								/* @__PURE__ */ jsx("a", {
									href: "/admin/integrations#integration-yandex_maps",
									className: "link",
									children: "ключ Яндекс.Карт не настроен"
								})
							] }),
							" ",
							"и у клиник города есть координаты."
						]
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						loading: form.processing,
						disabled: !form.isDirty,
						children: "Сохранить"
					})
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: [
					"Импорт городов и статистика — в",
					" ",
					/* @__PURE__ */ jsx("a", {
						href: "/admin/geography",
						className: "link",
						children: "«География»"
					}),
					" ",
					"(нужно право «Справочники»). Модерация баннеров — в",
					" ",
					/* @__PURE__ */ jsx("a", {
						href: "/admin/promotions",
						className: "link",
						children: "«Продвижение»"
					}),
					"."
				]
			})
		]
	});
}
//#endregion
export { SiteDisplay as default };

//# sourceMappingURL=SiteDisplay-Cu3Fp2KU.js.map