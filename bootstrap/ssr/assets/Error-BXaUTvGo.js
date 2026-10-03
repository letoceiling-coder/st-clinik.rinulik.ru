import { i as LinkButton } from "./Button-D4s3iLUi.js";
import { n as useCity, u as ErrorState } from "../app.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Error.tsx
var TEXT = {
	403: ["Нет доступа", "У вашей учётной записи нет прав для этого раздела."],
	404: ["Страница не найдена", "Возможно, адрес изменился или страница больше не существует."],
	419: ["Сессия истекла", "Обновите страницу и повторите действие."],
	429: ["Слишком много запросов", "Подождите минуту и попробуйте снова."],
	500: ["Что-то пошло не так", "Мы уже знаем о проблеме. Попробуйте позже."],
	503: ["Сервис на обслуживании", "Скоро всё заработает, зайдите чуть позже."]
};
function ErrorPage({ status, message }) {
	const city = useCity();
	const [title, text] = TEXT[status] ?? TEXT[500];
	return /* @__PURE__ */ jsx("div", {
		className: "container",
		style: { padding: "var(--space-12) var(--gutter)" },
		children: /* @__PURE__ */ jsx(ErrorState, {
			title: `${status}. ${title}`,
			text: message && status !== 500 ? message : text,
			action: /* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				style: { justifyContent: "center" },
				children: [/* @__PURE__ */ jsx(LinkButton, {
					href: "/",
					variant: "dark",
					children: "На главную"
				}), /* @__PURE__ */ jsx(LinkButton, {
					href: city.path("clinics"),
					variant: "outline",
					children: "Каталог клиник"
				})]
			})
		})
	});
}
//#endregion
export { ErrorPage as default };

//# sourceMappingURL=Error-BXaUTvGo.js.map