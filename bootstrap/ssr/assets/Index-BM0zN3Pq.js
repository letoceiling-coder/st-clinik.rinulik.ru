import { n as cx } from "./format-BPZIj7DQ.js";
import { a as Alert, c as Breadcrumbs, d as Pagination, l as EmptyState, n as useCity } from "../app.js";
import { t as ReviewCard } from "./ReviewCard-DMd-uulm.js";
import { router, usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Reviews/Index.tsx
function ReviewsIndex({ reviews, filters, breadcrumbs }) {
	const city = useCity();
	const { seo } = usePage().props;
	const rating = filters.rating ? Number(filters.rating) : 0;
	const setRating = (value) => router.get(`/${city.slug}/reviews`, value ? { rating: value } : {}, {
		preserveScroll: true,
		preserveState: true,
		replace: true
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Breadcrumbs, { items: breadcrumbs }),
		/* @__PURE__ */ jsxs("header", {
			className: "container page-head",
			children: [/* @__PURE__ */ jsx("h1", { children: seo?.h1 ?? `Отзывы о стоматологиях ${city.nameIn}` }), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Мы публикуем отзывы только после проверки модератором."
			})]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "container stack-lg",
			style: { paddingBottom: "var(--space-12)" },
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					role: "group",
					"aria-label": "Фильтр по оценке",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						className: cx("chip", !rating && "is-active"),
						"aria-pressed": !rating,
						onClick: () => setRating(0),
						children: "Все оценки"
					}), [
						5,
						4,
						3,
						2,
						1
					].map((n) => /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: cx("chip", rating === n && "is-active"),
						"aria-pressed": rating === n,
						onClick: () => setRating(n),
						children: [n, " ★"]
					}, n))]
				}),
				/* @__PURE__ */ jsx(Alert, {
					tone: "muted",
					icon: "shield",
					children: "Отзывы отражают личный опыт пациентов и не заменяют консультацию врача. Не публикуем диагнозы, медицинские документы и персональные данные."
				}),
				reviews.data.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
					icon: "thumb",
					title: "Отзывов пока нет",
					text: "Будьте первым, кто поделится опытом, — откройте страницу клиники."
				}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
					className: "grid grid--reviews",
					children: reviews.data.map((r) => /* @__PURE__ */ jsx(ReviewCard, {
						review: r,
						showClinic: true
					}, r.id))
				}), /* @__PURE__ */ jsx(Pagination, { page: reviews })] })
			]
		})
	] });
}
//#endregion
export { ReviewsIndex as default };

//# sourceMappingURL=Index-BM0zN3Pq.js.map