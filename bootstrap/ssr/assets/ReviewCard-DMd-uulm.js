import { t as Icon } from "./Icon-DQahs-u2.js";
import { r as dateRu } from "./format-BPZIj7DQ.js";
import { n as Button } from "./Button-D8Mzgn6o.js";
import { b as TextArea, m as Stars, o as Avatar, s as Badge, w as Modal, y as SelectField } from "../app.js";
import { Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/ReviewCard.tsx
var COMPLAINT_REASONS = {
	insult: "Оскорбления или нецензурная лексика",
	ad: "Реклама или ссылки",
	personal_data: "Персональные данные третьих лиц",
	medical_data: "Диагнозы и медицинские документы",
	fake: "Вымышленный отзыв / не было визита",
	other: "Другое"
};
function ReviewCard({ review, showClinic, canReport = true }) {
	const { auth } = usePage().props;
	const [report, setReport] = useState(false);
	const [reason, setReason] = useState("fake");
	const [comment, setComment] = useState("");
	const [busy, setBusy] = useState(false);
	const send = () => {
		setBusy(true);
		router.post(`/reviews/${review.id}/complaints`, {
			reason,
			comment
		}, {
			preserveScroll: true,
			onFinish: () => setBusy(false),
			onSuccess: () => {
				setReport(false);
				setComment("");
			}
		});
	};
	return /* @__PURE__ */ jsxs("article", {
		className: "review",
		"aria-label": `Отзыв ${review.author_name}`,
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "review__head",
				children: [/* @__PURE__ */ jsx(Avatar, { name: review.author_name }), /* @__PURE__ */ jsxs("div", {
					className: "grow",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "review__author",
						children: [/* @__PURE__ */ jsx("b", { children: review.author_name }), review.is_verified_visit ? /* @__PURE__ */ jsx(Badge, {
							tone: "success",
							icon: "check-circle",
							children: "Подтверждённый визит"
						}) : null]
					}), /* @__PURE__ */ jsxs("div", {
						className: "row row--wrap",
						style: { gap: 10 },
						children: [/* @__PURE__ */ jsx(Stars, { value: review.rating }), /* @__PURE__ */ jsx("span", {
							className: "text-xs text-muted",
							children: dateRu(review.published_at ?? review.visit_date)
						})]
					})]
				})]
			}),
			review.title ? /* @__PURE__ */ jsx("h3", {
				className: "review__title",
				children: review.title
			}) : null,
			/* @__PURE__ */ jsx("p", {
				className: "review__body",
				children: review.body
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "review__meta text-xs text-muted",
				children: [
					showClinic && review.clinic ? /* @__PURE__ */ jsx(Link, {
						href: `/clinics/${review.clinic.slug}`,
						className: "link",
						children: review.clinic.name
					}) : null,
					review.doctor ? /* @__PURE__ */ jsxs("span", { children: ["Врач: ", review.doctor.name] }) : null,
					review.service ? /* @__PURE__ */ jsxs("span", { children: ["Услуга: ", review.service.name] }) : null,
					review.visit_date ? /* @__PURE__ */ jsxs("span", { children: ["Визит: ", dateRu(review.visit_date)] }) : null
				]
			}),
			review.reply ? /* @__PURE__ */ jsxs("div", {
				className: "review__reply",
				children: [
					/* @__PURE__ */ jsx("b", {
						className: "text-sm",
						children: "Ответ клиники"
					}),
					/* @__PURE__ */ jsx("p", { children: review.reply.text }),
					review.reply.at ? /* @__PURE__ */ jsx("span", {
						className: "text-xs text-muted",
						children: dateRu(review.reply.at)
					}) : null
				]
			}) : null,
			canReport ? /* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "review__report",
				onClick: () => auth.user ? setReport(true) : router.visit("/login"),
				children: [/* @__PURE__ */ jsx(Icon, {
					name: "alert",
					size: 14
				}), " Пожаловаться"]
			}) : null,
			/* @__PURE__ */ jsx(Modal, {
				open: report,
				onClose: () => setReport(false),
				title: "Жалоба на отзыв",
				footer: /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Button, {
					variant: "ghost",
					onClick: () => setReport(false),
					children: "Отмена"
				}), /* @__PURE__ */ jsx(Button, {
					onClick: send,
					loading: busy,
					children: "Отправить жалобу"
				})] }),
				children: /* @__PURE__ */ jsxs("div", {
					className: "stack",
					children: [/* @__PURE__ */ jsx(SelectField, {
						label: "Причина",
						value: reason,
						onChange: (e) => setReason(e.target.value),
						children: Object.entries(COMPLAINT_REASONS).map(([k, v]) => /* @__PURE__ */ jsx("option", {
							value: k,
							children: v
						}, k))
					}), /* @__PURE__ */ jsx(TextArea, {
						label: "Пояснение (необязательно)",
						maxLength: 500,
						value: comment,
						onChange: (e) => setComment(e.target.value)
					})]
				})
			})
		]
	});
}
//#endregion
export { ReviewCard as t };

//# sourceMappingURL=ReviewCard-DMd-uulm.js.map