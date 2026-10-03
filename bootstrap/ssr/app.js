import { t as Icon } from "./assets/Icon-DBH8JZC9.js";
import { a as initials, n as cx } from "./assets/format-Cjg0FGVI.js";
import { i as LinkButton, n as Button, r as IconButton } from "./assets/Button-D4s3iLUi.js";
import { Link, createInertiaApp, router, useForm, usePage } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import createServer from "@inertiajs/react/server";
import { renderToString } from "react-dom/server";
//#region resources/js/components/ui/Fields.tsx
function Wrap({ id, label, hint, error, required, className, children }) {
	return /* @__PURE__ */ jsxs("div", {
		className: cx("field", className),
		children: [
			label ? /* @__PURE__ */ jsxs("label", {
				className: "field__label",
				htmlFor: id,
				children: [label, required ? /* @__PURE__ */ jsx("span", {
					className: "req",
					"aria-hidden": "true",
					children: " *"
				}) : null]
			}) : null,
			children,
			error ? /* @__PURE__ */ jsx("p", {
				className: "field__error",
				id: `${id}-err`,
				role: "alert",
				children: error
			}) : hint ? /* @__PURE__ */ jsx("p", {
				className: "field__hint",
				id: `${id}-hint`,
				children: hint
			}) : null
		]
	});
}
var describe = (id, error, hint) => error ? `${id}-err` : hint ? `${id}-hint` : void 0;
function TextField({ label, hint, error, className, inputClassName, ...rest }) {
	const id = useId();
	return /* @__PURE__ */ jsx(Wrap, {
		id,
		label,
		hint,
		error,
		required: rest.required,
		className,
		children: /* @__PURE__ */ jsx("input", {
			id,
			className: cx("input", inputClassName),
			"aria-invalid": error ? true : void 0,
			"aria-describedby": describe(id, error, hint),
			...rest
		})
	});
}
function TextArea({ label, hint, error, className, ...rest }) {
	const id = useId();
	return /* @__PURE__ */ jsx(Wrap, {
		id,
		label,
		hint,
		error,
		required: rest.required,
		className,
		children: /* @__PURE__ */ jsx("textarea", {
			id,
			className: "textarea",
			"aria-invalid": error ? true : void 0,
			"aria-describedby": describe(id, error, hint),
			...rest
		})
	});
}
function SelectField({ label, hint, error, className, children, ...rest }) {
	const id = useId();
	return /* @__PURE__ */ jsx(Wrap, {
		id,
		label,
		hint,
		error,
		required: rest.required,
		className,
		children: /* @__PURE__ */ jsx("select", {
			id,
			className: "select",
			"aria-invalid": error ? true : void 0,
			"aria-describedby": describe(id, error, hint),
			...rest,
			children
		})
	});
}
function Check({ label, error, className, type = "checkbox", ...rest }) {
	return /* @__PURE__ */ jsxs("div", {
		className,
		children: [/* @__PURE__ */ jsxs("label", {
			className: cx("check", error && "is-invalid"),
			children: [/* @__PURE__ */ jsx("input", {
				type,
				"aria-invalid": error ? true : void 0,
				...rest
			}), /* @__PURE__ */ jsx("span", { children: label })]
		}), error ? /* @__PURE__ */ jsx("p", {
			className: "field__error",
			role: "alert",
			style: { marginTop: 6 },
			children: error
		}) : null]
	});
}
function SearchInput({ value, onChange, placeholder, label = "Поиск", ...rest }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "input-group",
		children: [/* @__PURE__ */ jsx(Icon, {
			name: "search",
			className: "icon-left",
			size: 20
		}), /* @__PURE__ */ jsx("input", {
			type: "search",
			className: "input",
			"aria-label": label,
			placeholder,
			...value === void 0 ? {} : {
				value,
				onChange
			},
			...rest
		})]
	});
}
//#endregion
//#region resources/js/components/ui/Overlay.tsx
var FOCUSABLE = "a[href],button:not([disabled]),input:not([disabled]):not([type=\"hidden\"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex=\"-1\"])";
/** Фокус-ловушка, Esc, блокировка прокрутки и возврат фокуса. */
function useOverlay(open, onClose, panel) {
	useEffect(() => {
		if (!open) return;
		const previous = document.activeElement;
		const html = document.documentElement;
		const prevOverflow = html.style.overflow;
		html.style.overflow = "hidden";
		const focusables = () => Array.from(panel.current?.querySelectorAll(FOCUSABLE) ?? []);
		(focusables().find((el) => el.dataset.autofocus !== void 0) ?? focusables()[0] ?? panel.current)?.focus();
		const onKey = (e) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
			if (e.key === "Tab") {
				const items = focusables();
				if (!items.length) return;
				const a = items[0];
				const b = items[items.length - 1];
				if (e.shiftKey && document.activeElement === a) {
					e.preventDefault();
					b.focus();
				} else if (!e.shiftKey && document.activeElement === b) {
					e.preventDefault();
					a.focus();
				}
			}
		};
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("keydown", onKey);
			html.style.overflow = prevOverflow;
			previous?.focus?.();
		};
	}, [open]);
}
function Portal({ children }) {
	if (typeof document === "undefined") return null;
	return createPortal(children, document.body);
}
function Modal({ open, onClose, title, children, footer, wide, sheet = true }) {
	const ref = useRef(null);
	const titleId = useId();
	useOverlay(open, onClose, ref);
	if (!open) return null;
	return /* @__PURE__ */ jsx(Portal, { children: /* @__PURE__ */ jsx("div", {
		className: cx("overlay", sheet && "overlay--sheet"),
		onMouseDown: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: /* @__PURE__ */ jsxs("div", {
			ref,
			className: cx("modal", wide && "modal--wide"),
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": titleId,
			tabIndex: -1,
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "modal__head",
					children: [/* @__PURE__ */ jsx("h2", {
						id: titleId,
						children: title
					}), /* @__PURE__ */ jsx(IconButton, {
						icon: "x",
						label: "Закрыть",
						onClick: onClose,
						variant: "secondary",
						round: true
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "modal__body",
					children
				}),
				footer ? /* @__PURE__ */ jsx("div", {
					className: "modal__foot",
					children: footer
				}) : null
			]
		})
	}) });
}
function Drawer({ open, onClose, title, children, side = "right", footer }) {
	const ref = useRef(null);
	const titleId = useId();
	useOverlay(open, onClose, ref);
	if (!open) return null;
	return /* @__PURE__ */ jsx(Portal, { children: /* @__PURE__ */ jsx("div", {
		className: "overlay",
		style: { padding: 0 },
		onMouseDown: (e) => e.target === e.currentTarget && onClose(),
		children: /* @__PURE__ */ jsxs("div", {
			ref,
			className: cx("drawer", `drawer--${side}`),
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": titleId,
			tabIndex: -1,
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "modal__head",
					children: [/* @__PURE__ */ jsx("h2", {
						id: titleId,
						children: title
					}), /* @__PURE__ */ jsx(IconButton, {
						icon: "x",
						label: "Закрыть",
						onClick: onClose,
						variant: "secondary",
						round: true
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "modal__body",
					children
				}),
				footer ? /* @__PURE__ */ jsx("div", {
					className: "modal__foot",
					children: footer
				}) : null
			]
		})
	}) });
}
/** Закрытие по клику вне элемента и Esc (для поповеров). */
function useDismiss(open, onClose, ref) {
	useEffect(() => {
		if (!open) return;
		const down = (e) => {
			if (ref.current && !ref.current.contains(e.target)) onClose();
		};
		const key = (e) => e.key === "Escape" && onClose();
		document.addEventListener("mousedown", down);
		document.addEventListener("touchstart", down);
		document.addEventListener("keydown", key);
		return () => {
			document.removeEventListener("mousedown", down);
			document.removeEventListener("touchstart", down);
			document.removeEventListener("keydown", key);
		};
	}, [open]);
}
//#endregion
//#region resources/js/components/ui/Misc.tsx
function Badge$1({ children, tone, icon }) {
	return /* @__PURE__ */ jsxs("span", {
		className: cx("badge", tone && `badge--${tone}`),
		children: [icon ? /* @__PURE__ */ jsx(Icon, {
			name: icon,
			size: 14
		}) : null, children]
	});
}
function Stars({ value, size = 16 }) {
	return /* @__PURE__ */ jsx("span", {
		className: "stars",
		role: "img",
		"aria-label": `Оценка ${value} из 5`,
		children: [
			1,
			2,
			3,
			4,
			5
		].map((i) => /* @__PURE__ */ jsx("span", {
			className: i <= Math.round(value) ? "" : "off",
			children: /* @__PURE__ */ jsx(Icon, {
				name: "star",
				size
			})
		}, i))
	});
}
function Skeleton({ w, h = 16, r, className }) {
	return /* @__PURE__ */ jsx("span", {
		className: cx("skeleton", className),
		style: {
			width: w ?? "100%",
			height: h,
			borderRadius: r
		},
		"aria-hidden": "true"
	});
}
function EmptyState({ icon = "search", title, text, action }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "state",
		role: "status",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "state__icon",
				children: /* @__PURE__ */ jsx(Icon, {
					name: icon,
					size: 32
				})
			}),
			/* @__PURE__ */ jsx("h3", { children: title }),
			text ? /* @__PURE__ */ jsx("p", { children: text }) : null,
			action
		]
	});
}
function ErrorState({ title = "Что-то пошло не так", text, action }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "state state--error",
		role: "alert",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "state__icon",
				children: /* @__PURE__ */ jsx(Icon, {
					name: "alert",
					size: 32
				})
			}),
			/* @__PURE__ */ jsx("h3", { children: title }),
			text ? /* @__PURE__ */ jsx("p", { children: text }) : null,
			action
		]
	});
}
function Alert({ tone, icon, children }) {
	const defaultIcon = tone === "warning" || tone === "danger" ? "alert" : tone === "success" ? "check-circle" : "info";
	return /* @__PURE__ */ jsxs("div", {
		className: cx("alert", tone && `alert--${tone}`),
		role: tone === "danger" ? "alert" : void 0,
		children: [/* @__PURE__ */ jsx(Icon, {
			name: icon ?? defaultIcon,
			size: 20
		}), /* @__PURE__ */ jsx("div", { children })]
	});
}
function Breadcrumbs({ items }) {
	if (!items?.length) return null;
	return /* @__PURE__ */ jsx("nav", {
		"aria-label": "Хлебные крошки",
		className: "container",
		children: /* @__PURE__ */ jsx("ol", {
			className: "breadcrumbs",
			children: items.map(([label, href], i) => {
				const last = i === items.length - 1;
				const path = href.replace(/^https?:\/\/[^/]+/, "") || "/";
				return /* @__PURE__ */ jsxs("li", { children: [last ? /* @__PURE__ */ jsx("span", {
					"aria-current": "page",
					children: label
				}) : /* @__PURE__ */ jsx(Link, {
					href: path,
					children: label
				}), last ? null : /* @__PURE__ */ jsx(Icon, {
					name: "chevron-right",
					size: 14
				})] }, href + i);
			})
		})
	});
}
function Pagination({ page, only, keepScroll, param = "page" }) {
	const { current_page: current, last_page: last } = page;
	if (last <= 1) return null;
	const go = (n) => {
		const url = new URL(window.location.href);
		url.searchParams.set(param, String(n));
		router.get(url.pathname + url.search, {}, {
			preserveScroll: keepScroll ?? false,
			only,
			preserveState: true
		});
	};
	const nums = [];
	for (let i = 1; i <= last; i++) if (i === 1 || i === last || Math.abs(i - current) <= 1) nums.push(i);
	else if (nums[nums.length - 1] !== "…") nums.push("…");
	return /* @__PURE__ */ jsxs("nav", {
		className: "pagination",
		"aria-label": "Страницы",
		children: [
			/* @__PURE__ */ jsx("button", {
				className: cx("page-btn", current === 1 && "is-disabled"),
				onClick: () => go(current - 1),
				"aria-label": "Предыдущая страница",
				disabled: current === 1,
				children: /* @__PURE__ */ jsx(Icon, {
					name: "chevron-left",
					size: 18
				})
			}),
			nums.map((n, i) => n === "…" ? /* @__PURE__ */ jsx("span", {
				className: "text-muted",
				"aria-hidden": "true",
				children: "…"
			}, `d${i}`) : /* @__PURE__ */ jsx("button", {
				className: cx("page-btn", n === current && "is-active"),
				onClick: () => go(n),
				"aria-current": n === current ? "page" : void 0,
				"aria-label": `Страница ${n}`,
				children: n
			}, n)),
			/* @__PURE__ */ jsx("button", {
				className: cx("page-btn", current === last && "is-disabled"),
				onClick: () => go(current + 1),
				"aria-label": "Следующая страница",
				disabled: current === last,
				children: /* @__PURE__ */ jsx(Icon, {
					name: "chevron-right",
					size: 18
				})
			})
		]
	});
}
function Avatar({ name }) {
	return /* @__PURE__ */ jsx("span", {
		className: "avatar",
		"aria-hidden": "true",
		children: initials(name)
	});
}
function Tabs({ value, items, onChange, label }) {
	return /* @__PURE__ */ jsx("div", {
		className: "tabs",
		role: "tablist",
		"aria-label": label,
		children: items.map((i) => /* @__PURE__ */ jsxs("button", {
			role: "tab",
			"aria-selected": value === i.key,
			className: cx("tab", value === i.key && "is-active"),
			onClick: () => onChange(i.key),
			children: [i.label, i.count !== void 0 ? /* @__PURE__ */ jsxs("span", {
				className: "text-muted",
				children: [" ", i.count]
			}) : null]
		}, i.key))
	});
}
function SectionHead({ title, text, action }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "section-head",
		children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", { children: title }), text ? /* @__PURE__ */ jsx("p", { children: text }) : null] }), action]
	});
}
//#endregion
//#region resources/js/components/LeadModal.tsx
var today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
var maxDate = () => new Date(Date.now() + 50976e5).toISOString().slice(0, 10);
function LeadModal({ target, onClose }) {
	const { auth } = usePage().props;
	const form = useForm({
		clinic: "",
		name: auth.user?.name ?? "",
		phone: "",
		preferred_date: "",
		preferred_time: "",
		service_id: "",
		doctor_id: "",
		concern_id: "",
		comment: "",
		is_child: false,
		consent: false,
		website: "",
		source: "clinic_page"
	});
	useEffect(() => {
		if (target) {
			form.setData((d) => ({
				...d,
				clinic: target.slug,
				doctor_id: target.doctorId ?? "",
				service_id: target.serviceId ?? "",
				concern_id: target.concernId ?? "",
				source: target.source ?? "clinic_page"
			}));
			form.clearErrors();
		}
	}, [
		target?.slug,
		target?.doctorId,
		target?.serviceId
	]);
	if (!target) return null;
	const submit = (e) => {
		e.preventDefault();
		form.post("/leads", {
			preserveScroll: true,
			onSuccess: () => {
				form.reset("comment", "consent", "preferred_date", "preferred_time");
				onClose();
			}
		});
	};
	return /* @__PURE__ */ jsx(Modal, {
		open: true,
		onClose,
		title: `Запись в «${target.name}»`,
		footer: /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onClose,
			children: "Отмена"
		}), /* @__PURE__ */ jsx(Button, {
			type: "submit",
			form: "lead-form",
			loading: form.processing,
			children: "Отправить заявку"
		})] }),
		children: /* @__PURE__ */ jsxs("form", {
			id: "lead-form",
			onSubmit: submit,
			noValidate: true,
			className: "stack",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-muted text-sm",
					children: "Клиника перезвонит и подтвердит время. Стоимость указана «от» — итоговую назовёт врач после осмотра."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "form-grid",
					children: [
						/* @__PURE__ */ jsx(TextField, {
							label: "Ваше имя",
							required: true,
							autoComplete: "given-name",
							value: form.data.name,
							onChange: (e) => form.setData("name", e.target.value),
							error: form.errors.name,
							"data-autofocus": true
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Телефон",
							required: true,
							type: "tel",
							inputMode: "tel",
							autoComplete: "tel",
							placeholder: "+7 (900) 000-00-00",
							value: form.data.phone,
							onChange: (e) => form.setData("phone", e.target.value),
							error: form.errors.phone
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Желаемая дата",
							type: "date",
							min: today(),
							max: maxDate(),
							value: form.data.preferred_date,
							onChange: (e) => form.setData("preferred_date", e.target.value),
							error: form.errors.preferred_date
						}),
						/* @__PURE__ */ jsxs(SelectField, {
							label: "Удобное время",
							value: form.data.preferred_time,
							onChange: (e) => form.setData("preferred_time", e.target.value),
							error: form.errors.preferred_time,
							children: [
								/* @__PURE__ */ jsx("option", {
									value: "",
									children: "Любое"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "утро",
									children: "Утро (до 12:00)"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "день",
									children: "День (12:00–17:00)"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "вечер",
									children: "Вечер (после 17:00)"
								})
							]
						}),
						target.services?.length ? /* @__PURE__ */ jsxs(SelectField, {
							label: "Услуга",
							value: form.data.service_id,
							onChange: (e) => form.setData("service_id", e.target.value),
							error: form.errors.service_id,
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Пока не знаю"
							}), target.services.map((s) => /* @__PURE__ */ jsx("option", {
								value: s.id,
								children: s.name
							}, s.id))]
						}) : null,
						target.doctors?.length ? /* @__PURE__ */ jsxs(SelectField, {
							label: "Врач",
							value: form.data.doctor_id,
							onChange: (e) => form.setData("doctor_id", e.target.value),
							error: form.errors.doctor_id,
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Любой свободный"
							}), target.doctors.map((d) => /* @__PURE__ */ jsx("option", {
								value: d.id,
								children: d.name
							}, d.id))]
						}) : null
					]
				}),
				/* @__PURE__ */ jsx(TextArea, {
					label: "Комментарий (необязательно)",
					maxLength: 300,
					rows: 3,
					value: form.data.comment,
					onChange: (e) => form.setData("comment", e.target.value),
					error: form.errors.comment,
					hint: `${form.data.comment.length}/300. Не указывайте диагнозы, номера документов и результаты анализов.`
				}),
				/* @__PURE__ */ jsx(Check, {
					label: "Запись нужна ребёнку",
					checked: form.data.is_child,
					onChange: (e) => form.setData("is_child", e.target.checked)
				}),
				/* @__PURE__ */ jsx("div", {
					"aria-hidden": "true",
					style: {
						position: "absolute",
						left: "-9999px",
						width: 1,
						height: 1,
						overflow: "hidden"
					},
					children: /* @__PURE__ */ jsxs("label", { children: ["Сайт", /* @__PURE__ */ jsx("input", {
						type: "text",
						tabIndex: -1,
						autoComplete: "off",
						value: form.data.website,
						onChange: (e) => form.setData("website", e.target.value)
					})] })
				}),
				/* @__PURE__ */ jsx(Check, {
					required: true,
					checked: form.data.consent,
					onChange: (e) => form.setData("consent", e.target.checked),
					error: form.errors.consent,
					label: /* @__PURE__ */ jsxs(Fragment, { children: [
						"Согласен на обработку персональных данных (имя, телефон) для записи в клинику — см.",
						" ",
						/* @__PURE__ */ jsx(Link, {
							href: "/consent",
							className: "link",
							target: "_blank",
							children: "согласие"
						}),
						" ",
						"и",
						" ",
						/* @__PURE__ */ jsx(Link, {
							href: "/privacy",
							className: "link",
							target: "_blank",
							children: "политику конфиденциальности"
						}),
						"."
					] })
				}),
				Object.keys(form.errors).length > 0 && !form.errors.name && !form.errors.phone && !form.errors.consent && !form.errors.comment && !form.errors.preferred_date ? /* @__PURE__ */ jsx(Alert, {
					tone: "danger",
					children: "Проверьте поля формы и попробуйте ещё раз."
				}) : null
			]
		})
	});
}
//#endregion
//#region resources/js/components/LeadContext.tsx
var LeadCtx = createContext({ open: () => void 0 });
var useLead = () => useContext(LeadCtx);
function LeadProvider({ children }) {
	const [target, setTarget] = useState(null);
	const open = useCallback((t) => setTarget(t), []);
	const value = useMemo(() => ({ open }), [open]);
	return /* @__PURE__ */ jsxs(LeadCtx.Provider, {
		value,
		children: [children, /* @__PURE__ */ jsx(LeadModal, {
			target,
			onClose: () => setTarget(null)
		})]
	});
}
//#endregion
//#region resources/js/components/SearchBox.tsx
var GROUPS = [
	{
		key: "concerns",
		title: "Что беспокоит",
		icon: "pain"
	},
	{
		key: "services",
		title: "Услуги",
		icon: "tooth"
	},
	{
		key: "specialties",
		title: "Направления",
		icon: "sparkle"
	},
	{
		key: "clinics",
		title: "Клиники",
		icon: "building"
	},
	{
		key: "doctors",
		title: "Врачи",
		icon: "user"
	},
	{
		key: "cities",
		title: "Города",
		icon: "pin"
	}
];
function SearchBox({ variant = "header", placeholder = "Клиника, врач, услуга или что беспокоит", autoFocus, onDone }) {
	const { city } = usePage().props;
	const [q, setQ] = useState("");
	const [data, setData] = useState({});
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [active, setActive] = useState(-1);
	const wrap = useRef(null);
	const listId = useId();
	const flat = useMemo(() => GROUPS.flatMap((g) => (data[g.key] ?? []).map((item) => ({
		...item,
		group: g
	}))), [data]);
	useEffect(() => {
		const query = q.trim();
		if (query.length < 2) {
			setData({});
			setLoading(false);
			return;
		}
		setLoading(true);
		const ctrl = new AbortController();
		const t = window.setTimeout(() => {
			const params = new URLSearchParams({ q: query });
			if (city?.slug) params.set("city", city.slug);
			fetch(`/api/v1/search/suggest?${params}`, {
				signal: ctrl.signal,
				headers: { Accept: "application/json" }
			}).then((r) => r.ok ? r.json() : Promise.reject(r)).then((j) => {
				setData(j.data ?? {});
				setActive(-1);
				setLoading(false);
			}).catch((e) => {
				if (e?.name !== "AbortError") setLoading(false);
			});
		}, 200);
		return () => {
			window.clearTimeout(t);
			ctrl.abort();
		};
	}, [q, city?.slug]);
	useEffect(() => {
		const onDoc = (e) => {
			if (!wrap.current?.contains(e.target)) setOpen(false);
		};
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, []);
	const go = (url) => {
		setOpen(false);
		onDone?.();
		router.visit(url);
	};
	const submit = () => {
		const query = q.trim();
		if (!query) return;
		setOpen(false);
		onDone?.();
		router.get("/search", { q: query });
	};
	const onKey = (e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setOpen(true);
			setActive((a) => Math.min(flat.length - 1, a + 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((a) => Math.max(-1, a - 1));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (active >= 0 && flat[active]) go(flat[active].url);
			else submit();
		} else if (e.key === "Escape") setOpen(false);
	};
	const showList = open && q.trim().length >= 2;
	let index = -1;
	return /* @__PURE__ */ jsxs("div", {
		className: cx("searchbox", `searchbox--${variant}`),
		ref: wrap,
		children: [/* @__PURE__ */ jsxs("form", {
			role: "search",
			className: "searchbox__form",
			onSubmit: (e) => {
				e.preventDefault();
				submit();
			},
			children: [
				/* @__PURE__ */ jsx(Icon, {
					name: "search",
					size: 22,
					className: "searchbox__icon"
				}),
				/* @__PURE__ */ jsx("input", {
					type: "search",
					className: "searchbox__input",
					placeholder,
					"aria-label": "Поиск по клиникам, врачам, услугам",
					role: "combobox",
					"aria-expanded": showList,
					"aria-controls": listId,
					"aria-autocomplete": "list",
					"aria-activedescendant": active >= 0 ? `${listId}-${active}` : void 0,
					autoComplete: "off",
					autoFocus,
					value: q,
					onFocus: () => setOpen(true),
					onChange: (e) => {
						setQ(e.target.value);
						setOpen(true);
					},
					onKeyDown: onKey
				}),
				variant === "hero" ? /* @__PURE__ */ jsx("button", {
					type: "submit",
					className: "btn btn--primary searchbox__submit",
					children: "Найти"
				}) : null
			]
		}), showList ? /* @__PURE__ */ jsxs("div", {
			className: "searchbox__popover",
			id: listId,
			role: "listbox",
			"aria-label": "Подсказки",
			children: [
				flat.length === 0 && !loading ? /* @__PURE__ */ jsxs("p", {
					className: "searchbox__empty",
					children: [
						"Ничего не найдено по запросу «",
						q.trim(),
						"». Попробуйте иначе: «пломба», «брекеты», «болит зуб»."
					]
				}) : null,
				loading && flat.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "searchbox__empty",
					children: "Ищем…"
				}) : null,
				GROUPS.map((g) => {
					const items = data[g.key] ?? [];
					if (!items.length) return null;
					return /* @__PURE__ */ jsxs("div", {
						role: "group",
						"aria-label": g.title,
						children: [/* @__PURE__ */ jsx("div", {
							className: "searchbox__group",
							children: g.title
						}), items.map((item) => {
							index += 1;
							const i = index;
							return /* @__PURE__ */ jsxs("a", {
								id: `${listId}-${i}`,
								role: "option",
								"aria-selected": active === i,
								href: item.url,
								className: cx("searchbox__item", active === i && "is-active"),
								onMouseEnter: () => setActive(i),
								onClick: (e) => {
									e.preventDefault();
									go(item.url);
								},
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "searchbox__item-icon",
										children: /* @__PURE__ */ jsx(Icon, {
											name: g.icon,
											size: 18
										})
									}),
									/* @__PURE__ */ jsxs("span", {
										className: "grow",
										children: [/* @__PURE__ */ jsx("b", { children: item.name }), item.hint ? /* @__PURE__ */ jsx("span", {
											className: "searchbox__hint",
											children: item.hint
										}) : null]
									}),
									item.rating ? /* @__PURE__ */ jsxs("span", {
										className: "rating",
										children: [/* @__PURE__ */ jsx(Icon, {
											name: "star",
											size: 14
										}), item.rating.toFixed(1).replace(".", ",")]
									}) : null
								]
							}, item.url + item.name);
						})]
					}, g.key);
				}),
				flat.length > 0 ? /* @__PURE__ */ jsxs("button", {
					type: "button",
					className: "searchbox__all",
					onClick: submit,
					children: [
						"Все результаты по «",
						q.trim(),
						"»",
						/* @__PURE__ */ jsx(Icon, {
							name: "arrow-right",
							size: 16
						})
					]
				}) : null
			]
		}) : null]
	});
}
//#endregion
//#region resources/js/lib/toast.ts
var seq = 0;
var subs = /* @__PURE__ */ new Set();
function notify(text, kind = "info") {
	const item = {
		id: ++seq,
		text,
		kind
	};
	subs.forEach((s) => s(item));
}
function subscribeToasts(fn) {
	subs.add(fn);
	return () => {
		subs.delete(fn);
	};
}
//#endregion
//#region resources/js/components/ToastHost.tsx
function ToastHost() {
	const [items, setItems] = useState([]);
	const { flash } = usePage().props;
	useEffect(() => subscribeToasts((t) => {
		setItems((prev) => [...prev.slice(-2), t]);
		window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== t.id)), t.kind === "error" ? 7e3 : 4500);
	}), []);
	useEffect(() => {
		if (flash?.success) notify(flash.success);
	}, [flash?.success]);
	useEffect(() => {
		if (flash?.error) notify(flash.error, "error");
	}, [flash?.error]);
	return /* @__PURE__ */ jsx("div", {
		className: "toasts",
		"aria-live": "polite",
		"aria-atomic": "false",
		children: items.map((t) => /* @__PURE__ */ jsxs("div", {
			className: `toast toast--${t.kind}`,
			role: t.kind === "error" ? "alert" : "status",
			children: [
				/* @__PURE__ */ jsx(Icon, {
					name: t.kind === "error" ? "alert" : "check-circle",
					size: 20
				}),
				/* @__PURE__ */ jsx("span", { children: t.text }),
				/* @__PURE__ */ jsx("button", {
					className: "toast__close",
					"aria-label": "Закрыть уведомление",
					onClick: () => setItems((prev) => prev.filter((i) => i.id !== t.id)),
					children: /* @__PURE__ */ jsx(Icon, {
						name: "x",
						size: 18
					})
				})
			]
		}, t.id))
	});
}
//#endregion
//#region resources/js/lib/auth.ts
var can = (user, permission) => !!user && (user.permissions.includes("*") || user.permissions.includes(permission));
var isStaff = (user) => !!user && user.permissions.length > 0;
var isOwner = (user) => !!user && user.role === "clinic_owner";
function accountHome(user) {
	if (isStaff(user)) return "/admin";
	if (isOwner(user)) return "/clinic-cabinet";
	return "/account";
}
function accountLabel(user) {
	if (isStaff(user)) return "Админ-панель";
	if (isOwner(user)) return "Кабинет клиники";
	return "Личный кабинет";
}
//#endregion
//#region resources/js/lib/city.ts
function useCity() {
	const { city, cities } = usePage().props;
	const slug = city?.slug ?? cities?.[0]?.slug ?? "moskva";
	return {
		city,
		slug,
		name: city?.name ?? "Москва",
		nameIn: city?.name_in ?? city?.name ?? "Москве",
		path: (section, query) => {
			const qs = query ? "?" + new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString() : "";
			return `/${slug}/${section}${qs}`;
		},
		direction: (specialty) => `/${slug}/directions/${specialty}`,
		concern: (concern) => `/${slug}/concerns/${concern}`
	};
}
//#endregion
//#region resources/js/lib/collections.ts
var KEY = "stk.collections.v1";
var empty = () => ({
	favorite: {
		clinic: [],
		doctor: []
	},
	compare: {
		clinic: [],
		doctor: []
	}
});
var EMPTY = empty();
var guest = null;
var listeners = /* @__PURE__ */ new Set();
function load() {
	if (guest) return guest;
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
		const base = empty();
		["favorite", "compare"].forEach((k) => ["clinic", "doctor"].forEach((t) => {
			const list = raw?.[k]?.[t];
			if (Array.isArray(list)) base[k][t] = list.map(Number).filter(Boolean);
		}));
		guest = base;
	} catch {
		guest = empty();
	}
	return guest;
}
function save(next) {
	guest = next;
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {}
	listeners.forEach((l) => l());
}
function subscribe(cb) {
	listeners.add(cb);
	const onStorage = (e) => {
		if (e.key === KEY) {
			guest = null;
			cb();
		}
	};
	window.addEventListener("storage", onStorage);
	return () => {
		listeners.delete(cb);
		window.removeEventListener("storage", onStorage);
	};
}
function guestHasItems() {
	const s = load();
	return ["favorite", "compare"].some((k) => s[k].clinic.length + s[k].doctor.length > 0);
}
function guestSnapshot() {
	return load();
}
function clearGuest() {
	save(empty());
}
function useCollections() {
	const { props } = usePage();
	const user = props.auth.user;
	const guestState = useSyncExternalStore(subscribe, load, () => EMPTY);
	const state = user ? props.collections ?? EMPTY : guestState;
	return {
		state,
		has: useCallback((kind, type, id) => state[kind][type].includes(id), [state]),
		count: useCallback((kind) => state[kind].clinic.length + state[kind].doctor.length, [state]),
		toggle: useCallback((kind, type, id) => {
			const label = kind === "favorite" ? "избранное" : "сравнение";
			if (user) {
				router.post("/collections/toggle", {
					kind,
					entity_type: type,
					entity_id: id
				}, {
					preserveScroll: true,
					preserveState: true,
					only: [
						"collections",
						"flash",
						"errors"
					]
				});
				return;
			}
			const s = load();
			const list = s[kind][type];
			const exists = list.includes(id);
			if (!exists && kind === "compare" && list.length >= 4) {
				notify(`В сравнение можно добавить не более 4 позиций.`, "error");
				return;
			}
			save({
				...s,
				[kind]: {
					...s[kind],
					[type]: exists ? list.filter((i) => i !== id) : [...list, id]
				}
			});
			notify(exists ? `Убрано из раздела «${label}»` : `Добавлено в раздел «${label}»`);
		}, [user]),
		isGuest: !user
	};
}
/** После входа переносит гостевые избранное/сравнение в аккаунт. */
function useGuestSync() {
	const { props } = usePage();
	const userId = props.auth.user?.id;
	useEffect(() => {
		if (!userId || !guestHasItems()) return;
		router.post("/collections/sync", guestSnapshot(), {
			preserveScroll: true,
			preserveState: true,
			only: ["collections", "flash"],
			onSuccess: () => clearGuest()
		});
	}, [userId]);
}
//#endregion
//#region resources/js/lib/seo.ts
function upsert(selector, create, attr, value) {
	let el = document.head.querySelector(selector);
	if (!value) {
		el?.remove();
		return;
	}
	if (!el) {
		el = create();
		document.head.appendChild(el);
	}
	el.setAttribute(attr, value);
}
/**
* Первый HTML-ответ уже содержит SEO из Blade (в том числе SSR).
* Этот хук обновляет теги только при клиентской навигации.
*/
function useClientSeo() {
	const { seo, app } = usePage().props;
	useEffect(() => {
		if (!seo) return;
		if (seo.title) document.title = seo.title;
		upsert("meta[name=\"description\"]", () => Object.assign(document.createElement("meta"), { name: "description" }), "content", seo.description);
		upsert("link[rel=\"canonical\"]", () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", seo.canonical);
		upsert("meta[name=\"robots\"]", () => Object.assign(document.createElement("meta"), { name: "robots" }), "content", seo.robots ?? (app.noindex ? "noindex, nofollow" : "index, follow"));
	}, [
		seo?.title,
		seo?.description,
		seo?.canonical,
		seo?.robots,
		app.noindex
	]);
}
//#endregion
//#region resources/js/layouts/CityPicker.tsx
function CityPicker() {
	const { name, slug } = useCity();
	const { cities } = usePage().props;
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState("");
	const list = useMemo(() => {
		const needle = q.trim().toLowerCase();
		return (cities ?? []).filter((c) => !needle || c.name.toLowerCase().includes(needle) || (c.region ?? "").toLowerCase().includes(needle));
	}, [cities, q]);
	const pick = (citySlug) => {
		setOpen(false);
		if (citySlug === slug) return;
		router.post(`/city/${citySlug}`, {}, { preserveScroll: false });
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("button", {
		type: "button",
		className: "city-btn",
		onClick: () => setOpen(true),
		"aria-haspopup": "dialog",
		children: [
			/* @__PURE__ */ jsx(Icon, {
				name: "pin",
				size: 18
			}),
			/* @__PURE__ */ jsx("span", { children: name }),
			/* @__PURE__ */ jsx(Icon, {
				name: "chevron-down",
				size: 16
			})
		]
	}), /* @__PURE__ */ jsx(Modal, {
		open,
		onClose: () => setOpen(false),
		title: "Выберите город",
		children: /* @__PURE__ */ jsxs("div", {
			className: "stack",
			children: [
				/* @__PURE__ */ jsx(SearchInput, {
					label: "Поиск города",
					placeholder: "Начните вводить название",
					value: q,
					onChange: (e) => setQ(e.target.value),
					"data-autofocus": true
				}),
				/* @__PURE__ */ jsx("ul", {
					className: "city-list",
					children: list.map((c) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: c.slug === slug ? "is-active" : "",
						onClick: () => pick(c.slug),
						"aria-current": c.slug === slug ? "true" : void 0,
						children: [
							/* @__PURE__ */ jsx("b", { children: c.name }),
							c.region ? /* @__PURE__ */ jsx("span", {
								className: "text-muted text-sm",
								children: c.region
							}) : null,
							c.slug === slug ? /* @__PURE__ */ jsx(Icon, {
								name: "check",
								size: 18
							}) : null
						]
					}) }, c.slug))
				}),
				list.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-muted",
					children: "Город не найден. Мы постоянно расширяем покрытие."
				}) : null
			]
		})
	})] });
}
//#endregion
//#region resources/js/layouts/Logo.tsx
function LogoMark({ size = 36 }) {
	return /* @__PURE__ */ jsxs("svg", {
		width: size,
		height: size,
		viewBox: "0 0 40 40",
		"aria-hidden": "true",
		focusable: "false",
		children: [/* @__PURE__ */ jsx("rect", {
			width: "40",
			height: "40",
			rx: "12",
			fill: "var(--color-primary)"
		}), /* @__PURE__ */ jsx("path", {
			d: "M13.2 10.5c-3 0-4.8 2.3-4.8 5.3 0 2.4.9 4 1.5 6.2.7 2.7.8 8.5 2.8 8.5 1.6 0 1.8-4.700 2.700-6.600.5-.9 1.300-1.400 2.300-1.400s1.800.5 2.300 1.400c.9 1.900 1.100 6.600 2.700 6.600 2 0 2.100-5.800 2.800-8.500.6-2.200 1.500-3.800 1.500-6.200 0-3-1.800-5.300-4.800-5.300-2 0-3.100 1.200-5.300 1.200S15.200 10.500 13.200 10.500Z",
			fill: "#fff"
		})]
	});
}
function Logo({ to = "/", suffix }) {
	const { app } = usePage().props;
	return /* @__PURE__ */ jsxs(Link, {
		href: to,
		className: "logo",
		"aria-label": `${app.name} — на главную`,
		children: [
			/* @__PURE__ */ jsx(LogoMark, {}),
			/* @__PURE__ */ jsx("span", {
				className: "logo__text",
				children: app.name
			}),
			suffix ? /* @__PURE__ */ jsx("span", {
				className: "logo__suffix",
				children: suffix
			}) : null
		]
	});
}
//#endregion
//#region resources/js/layouts/PublicLayout.tsx
function useActive() {
	const { url } = usePage();
	return (href) => {
		const path = url.split("?")[0];
		return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
	};
}
function Badge({ n }) {
	return n > 0 ? /* @__PURE__ */ jsx("span", {
		className: "count-badge",
		"aria-label": `${n}`,
		children: n > 9 ? "9+" : n
	}) : null;
}
function UserMenu() {
	const { auth } = usePage().props;
	const user = auth.user;
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useDismiss(open, () => setOpen(false), ref);
	if (!user) return /* @__PURE__ */ jsx(LinkButton, {
		href: "/login",
		variant: "dark",
		size: "sm",
		icon: "user",
		className: "hide-mobile",
		children: "Войти"
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "menu",
		ref,
		children: [/* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "icon-link",
			onClick: () => setOpen((o) => !o),
			"aria-expanded": open,
			"aria-haspopup": "menu",
			"aria-label": "Меню профиля",
			children: [/* @__PURE__ */ jsx(Icon, {
				name: "user",
				size: 22
			}), /* @__PURE__ */ jsx(Badge, { n: user.unread })]
		}), open ? /* @__PURE__ */ jsxs("div", {
			className: "menu__panel",
			role: "menu",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "menu__who",
					children: [/* @__PURE__ */ jsx("b", { children: user.name }), /* @__PURE__ */ jsx("span", {
						className: "text-xs text-muted",
						children: user.email
					})]
				}),
				/* @__PURE__ */ jsxs(Link, {
					role: "menuitem",
					href: accountHome(user),
					onClick: () => setOpen(false),
					children: [
						/* @__PURE__ */ jsx(Icon, {
							name: "home",
							size: 18
						}),
						" ",
						accountLabel(user)
					]
				}),
				accountHome(user) !== "/account" ? /* @__PURE__ */ jsxs(Link, {
					role: "menuitem",
					href: "/account",
					onClick: () => setOpen(false),
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "user",
						size: 18
					}), " Мой профиль"]
				}) : null,
				/* @__PURE__ */ jsxs(Link, {
					role: "menuitem",
					href: "/account/leads",
					onClick: () => setOpen(false),
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "calendar",
						size: 18
					}), " Мои записи"]
				}),
				/* @__PURE__ */ jsxs(Link, {
					role: "menuitem",
					href: "/account/notifications",
					onClick: () => setOpen(false),
					children: [
						/* @__PURE__ */ jsx(Icon, {
							name: "bell",
							size: 18
						}),
						" Уведомления",
						/* @__PURE__ */ jsx(Badge, { n: user.unread })
					]
				}),
				/* @__PURE__ */ jsxs(Link, {
					role: "menuitem",
					href: "/logout",
					method: "post",
					as: "button",
					onClick: () => setOpen(false),
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "logout",
						size: 18
					}), " Выйти"]
				})
			]
		}) : null]
	});
}
function CookieBanner() {
	const [show, setShow] = useState(false);
	useEffect(() => {
		try {
			if (!localStorage.getItem("stk.cookie")) setShow(true);
		} catch {}
	}, []);
	if (!show) return null;
	return /* @__PURE__ */ jsxs("div", {
		className: "cookie",
		role: "region",
		"aria-label": "Уведомление о cookie",
		children: [
			/* @__PURE__ */ jsx(Icon, {
				name: "cookie",
				size: 24
			}),
			/* @__PURE__ */ jsxs("p", { children: [
				"Мы используем только необходимые cookie: город, сессия и избранное. Подробнее — в",
				" ",
				/* @__PURE__ */ jsx(Link, {
					href: "/privacy",
					className: "link",
					children: "политике конфиденциальности"
				}),
				"."
			] }),
			/* @__PURE__ */ jsx(Button, {
				size: "sm",
				onClick: () => {
					try {
						localStorage.setItem("stk.cookie", "1");
					} catch {}
					setShow(false);
				},
				children: "Понятно"
			})
		]
	});
}
function Footer() {
	const city = useCity();
	return /* @__PURE__ */ jsxs("footer", {
		className: "footer",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "container footer__grid",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "footer__brand",
					children: [/* @__PURE__ */ jsx(Logo, {}), /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "Сервис поиска стоматологических клиник и врачей по всей России. Сравнивайте цены, читайте проверенные отзывы и записывайтесь онлайн."
					})]
				}),
				/* @__PURE__ */ jsxs("nav", {
					"aria-label": "Каталог",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "footer__title",
						children: "Каталог"
					}), /* @__PURE__ */ jsxs("ul", { children: [
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: city.path("clinics"),
							children: "Клиники"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: city.path("doctors"),
							children: "Врачи"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: city.path("directions"),
							children: "Направления"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: city.path("prices"),
							children: "Цены на услуги"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: city.path("reviews"),
							children: "Отзывы"
						}) })
					] })]
				}),
				/* @__PURE__ */ jsxs("nav", {
					"aria-label": "Пользователям",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "footer__title",
						children: "Пользователям"
					}), /* @__PURE__ */ jsxs("ul", { children: [
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/favorites",
							children: "Избранное"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/compare",
							children: "Сравнение"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/review-rules",
							children: "Правила отзывов"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/about",
							children: "О сервисе"
						}) })
					] })]
				}),
				/* @__PURE__ */ jsxs("nav", {
					"aria-label": "Клиникам и документы",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "footer__title",
						children: "Клиникам"
					}), /* @__PURE__ */ jsxs("ul", { children: [
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/for-clinics",
							children: "Подключить клинику"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/login",
							children: "Кабинет клиники"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/privacy",
							children: "Политика конфиденциальности"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/consent",
							children: "Согласие на обработку данных"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/terms",
							children: "Пользовательское соглашение"
						}) })
					] })]
				})
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "container footer__legal",
			children: [/* @__PURE__ */ jsx("p", { children: "Информация на сайте носит справочный характер и не является медицинской консультацией или публичной офертой. Цены указаны «от», окончательную стоимость лечения называет врач после осмотра. Имеются противопоказания, необходима консультация специалиста." }), /* @__PURE__ */ jsxs("p", { children: [
				"Не отправляйте через сайт диагнозы, результаты анализов и медицинские документы. © ",
				(/* @__PURE__ */ new Date()).getFullYear(),
				" СтомКлиник."
			] })]
		})]
	});
}
function PublicLayout({ children, bare }) {
	const city = useCity();
	const { auth } = usePage().props;
	const active = useActive();
	const { count } = useCollections();
	const [menu, setMenu] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const { url } = usePage();
	useClientSeo();
	useGuestSync();
	useEffect(() => {
		setMenu(false);
		setSearchOpen(false);
	}, [url]);
	const nav = [
		{
			href: city.path("clinics"),
			label: "Клиники"
		},
		{
			href: city.path("doctors"),
			label: "Врачи"
		},
		{
			href: city.path("directions"),
			label: "Направления"
		},
		{
			href: city.path("prices"),
			label: "Цены"
		},
		{
			href: city.path("reviews"),
			label: "Отзывы"
		}
	];
	const favCount = count("favorite");
	const cmpCount = count("compare");
	const tabs = [
		{
			href: "/",
			label: "Главная",
			icon: "home"
		},
		{
			href: "#search",
			label: "Поиск",
			icon: "search",
			action: () => setSearchOpen(true)
		},
		{
			href: city.path("clinics"),
			label: "Клиники",
			icon: "building"
		},
		{
			href: "/favorites",
			label: "Избранное",
			icon: "heart",
			badge: favCount
		},
		{
			href: "/account",
			label: "Профиль",
			icon: "user"
		}
	];
	return /* @__PURE__ */ jsxs(LeadProvider, { children: [
		/* @__PURE__ */ jsx("a", {
			href: "#main",
			className: "skip-link",
			children: "Перейти к содержимому"
		}),
		/* @__PURE__ */ jsxs("header", {
			className: "header",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "container header__row",
				children: [
					/* @__PURE__ */ jsx(Logo, {}),
					/* @__PURE__ */ jsx(CityPicker, {}),
					/* @__PURE__ */ jsx("div", {
						className: "header__search hide-mobile",
						children: /* @__PURE__ */ jsx(SearchBox, {})
					}),
					/* @__PURE__ */ jsxs("nav", {
						className: "header__actions",
						"aria-label": "Быстрые действия",
						children: [
							/* @__PURE__ */ jsxs(Link, {
								href: "/favorites",
								className: "icon-link hide-mobile",
								"aria-label": `Избранное${favCount ? `, ${favCount}` : ""}`,
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "heart",
									size: 22
								}), /* @__PURE__ */ jsx(Badge, { n: favCount })]
							}),
							/* @__PURE__ */ jsxs(Link, {
								href: "/compare",
								className: "icon-link hide-mobile",
								"aria-label": `Сравнение${cmpCount ? `, ${cmpCount}` : ""}`,
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "scale",
									size: 22
								}), /* @__PURE__ */ jsx(Badge, { n: cmpCount })]
							}),
							/* @__PURE__ */ jsx(UserMenu, {}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "icon-link show-mobile",
								onClick: () => setMenu(true),
								"aria-label": "Открыть меню",
								children: /* @__PURE__ */ jsx(Icon, {
									name: "menu",
									size: 24
								})
							})
						]
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "header__nav hide-mobile",
				children: /* @__PURE__ */ jsx("nav", {
					className: "container",
					"aria-label": "Основная навигация",
					children: /* @__PURE__ */ jsxs("ul", { children: [
						nav.map((n) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: n.href,
							className: cx(active(n.href) && "is-active"),
							"aria-current": active(n.href) ? "page" : void 0,
							children: n.label
						}) }, n.href)),
						/* @__PURE__ */ jsx("li", { className: "grow" }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/for-clinics",
							className: "header__b2b",
							children: "Для клиник"
						}) })
					] })
				})
			})]
		}),
		/* @__PURE__ */ jsx("main", {
			id: "main",
			tabIndex: -1,
			className: cx("main", bare && "main--bare"),
			children
		}),
		/* @__PURE__ */ jsx(Footer, {}),
		/* @__PURE__ */ jsx("nav", {
			className: "tabbar",
			"aria-label": "Мобильная навигация",
			children: tabs.map((t) => t.action ? /* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: t.action,
				className: "tabbar__item",
				children: [/* @__PURE__ */ jsx(Icon, {
					name: t.icon,
					size: 24
				}), /* @__PURE__ */ jsx("span", { children: t.label })]
			}, t.label) : /* @__PURE__ */ jsxs(Link, {
				href: t.href,
				className: cx("tabbar__item", active(t.href) && "is-active"),
				"aria-current": active(t.href) ? "page" : void 0,
				children: [/* @__PURE__ */ jsxs("span", {
					className: "tabbar__icon",
					children: [/* @__PURE__ */ jsx(Icon, {
						name: t.icon,
						size: 24
					}), /* @__PURE__ */ jsx(Badge, { n: t.badge ?? 0 })]
				}), /* @__PURE__ */ jsx("span", { children: t.label })]
			}, t.label))
		}),
		/* @__PURE__ */ jsx(Drawer, {
			open: menu,
			onClose: () => setMenu(false),
			title: "Меню",
			children: /* @__PURE__ */ jsxs("ul", {
				className: "drawer-nav",
				children: [
					nav.map((n) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
						href: n.href,
						children: n.label
					}) }, n.href)),
					/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
						href: "/favorites",
						children: ["Избранное ", favCount ? `(${favCount})` : ""]
					}) }),
					/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
						href: "/compare",
						children: ["Сравнение ", cmpCount ? `(${cmpCount})` : ""]
					}) }),
					/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
						href: "/for-clinics",
						children: "Для клиник"
					}) }),
					/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
						href: "/about",
						children: "О сервисе"
					}) }),
					/* @__PURE__ */ jsx("li", { children: auth.user ? /* @__PURE__ */ jsx(Link, {
						href: accountHome(auth.user),
						children: accountLabel(auth.user)
					}) : /* @__PURE__ */ jsx(Link, {
						href: "/login",
						children: "Войти"
					}) })
				]
			})
		}),
		/* @__PURE__ */ jsxs(Drawer, {
			open: searchOpen,
			onClose: () => setSearchOpen(false),
			title: "Поиск",
			side: "right",
			children: [/* @__PURE__ */ jsx(SearchBox, {
				variant: "hero",
				autoFocus: true,
				onDone: () => setSearchOpen(false)
			}), /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				style: { marginTop: 16 },
				children: "Например: «болит зуб», «имплантация», «детский стоматолог», название клиники или фамилия врача."
			})]
		}),
		/* @__PURE__ */ jsx(CookieBanner, {}),
		/* @__PURE__ */ jsx(ToastHost, {})
	] });
}
//#endregion
//#region resources/js/layouts/AccountLayout.tsx
var ITEMS$1 = [
	{
		href: "/account",
		label: "Обзор",
		icon: "home",
		exact: true
	},
	{
		href: "/account/leads",
		label: "Заявки и записи",
		icon: "calendar"
	},
	{
		href: "/account/favorites",
		label: "Избранное",
		icon: "heart"
	},
	{
		href: "/account/compare",
		label: "Сравнение",
		icon: "scale"
	},
	{
		href: "/account/history",
		label: "История просмотров",
		icon: "clock"
	},
	{
		href: "/account/reviews",
		label: "Мои отзывы",
		icon: "thumb"
	},
	{
		href: "/account/notifications",
		label: "Уведомления",
		icon: "bell"
	},
	{
		href: "/account/profile",
		label: "Профиль",
		icon: "settings"
	}
];
function AccountLayout({ children }) {
	const { url } = usePage();
	const { auth } = usePage().props;
	const path = url.split("?")[0];
	return /* @__PURE__ */ jsx(PublicLayout, { children: /* @__PURE__ */ jsxs("div", {
		className: "container account",
		children: [/* @__PURE__ */ jsxs("aside", {
			className: "account__side",
			children: [/* @__PURE__ */ jsxs("p", {
				className: "account__hello",
				children: [
					"Здравствуйте,",
					/* @__PURE__ */ jsx("br", {}),
					/* @__PURE__ */ jsx("b", { children: auth.user?.name })
				]
			}), /* @__PURE__ */ jsx("nav", {
				"aria-label": "Личный кабинет",
				className: "account__nav",
				children: ITEMS$1.map((i) => {
					const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
					return /* @__PURE__ */ jsxs(Link, {
						href: i.href,
						className: cx("account__link", active && "is-active"),
						"aria-current": active ? "page" : void 0,
						children: [
							/* @__PURE__ */ jsx(Icon, {
								name: i.icon,
								size: 20
							}),
							/* @__PURE__ */ jsx("span", { children: i.label }),
							i.href === "/account/notifications" && auth.user?.unread ? /* @__PURE__ */ jsx("span", {
								className: "count-badge count-badge--inline",
								children: auth.user.unread
							}) : null
						]
					}, i.href);
				})
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "account__main",
			children
		})]
	}) });
}
//#endregion
//#region resources/js/layouts/DashboardShell.tsx
function isActive(url, item) {
	const path = url.split("?")[0];
	return item.exact ? path === item.href : path === item.href || path.startsWith(item.href + "/");
}
function SideNav({ items, onNavigate }) {
	const { url } = usePage();
	const groups = {};
	items.forEach((i) => (groups[i.group ?? ""] ||= []).push(i));
	return /* @__PURE__ */ jsx("nav", {
		className: "sidenav",
		"aria-label": "Разделы кабинета",
		children: Object.entries(groups).map(([group, list]) => /* @__PURE__ */ jsxs("div", {
			className: "sidenav__group",
			children: [group ? /* @__PURE__ */ jsx("div", {
				className: "sidenav__title",
				children: group
			}) : null, /* @__PURE__ */ jsx("ul", { children: list.map((i) => {
				const active = isActive(url, i);
				return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
					href: i.href,
					className: cx("sidenav__link", active && "is-active"),
					"aria-current": active ? "page" : void 0,
					onClick: onNavigate,
					children: [
						/* @__PURE__ */ jsx(Icon, {
							name: i.icon,
							size: 20
						}),
						/* @__PURE__ */ jsx("span", { children: i.label }),
						i.badge ? /* @__PURE__ */ jsx("span", {
							className: "count-badge count-badge--inline",
							children: i.badge
						}) : null
					]
				}) }, i.href);
			}) })]
		}, group))
	});
}
function DashboardShell({ children, items, brandSuffix, aside, mobileLabel }) {
	const { auth } = usePage().props;
	const { url } = usePage();
	const [open, setOpen] = useState(false);
	useClientSeo();
	useEffect(() => setOpen(false), [url]);
	const current = items.find((i) => isActive(url, i));
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("a", {
			href: "#main",
			className: "skip-link",
			children: "Перейти к содержимому"
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "shell",
			children: [/* @__PURE__ */ jsx("header", {
				className: "shell__top",
				children: /* @__PURE__ */ jsxs("div", {
					className: "shell__top-row",
					children: [
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "icon-link show-tablet",
							onClick: () => setOpen(true),
							"aria-label": `Открыть меню: ${mobileLabel}`,
							children: /* @__PURE__ */ jsx(Icon, {
								name: "menu",
								size: 24
							})
						}),
						/* @__PURE__ */ jsx(Logo, { suffix: brandSuffix }),
						/* @__PURE__ */ jsx("span", { className: "grow" }),
						/* @__PURE__ */ jsx(Link, {
							href: "/",
							className: "btn btn--outline btn--sm hide-mobile",
							children: "На сайт"
						}),
						auth.user ? /* @__PURE__ */ jsx("div", {
							className: "shell__user hide-mobile",
							children: /* @__PURE__ */ jsxs("span", {
								className: "text-sm",
								children: [
									/* @__PURE__ */ jsx("b", { children: auth.user.name }),
									/* @__PURE__ */ jsx("br", {}),
									/* @__PURE__ */ jsx("span", {
										className: "text-muted text-xs",
										children: accountLabel(auth.user)
									})
								]
							})
						}) : null,
						/* @__PURE__ */ jsxs(Link, {
							href: "/logout",
							method: "post",
							as: "button",
							className: "btn btn--ghost btn--sm",
							type: "button",
							children: [
								/* @__PURE__ */ jsx(Icon, {
									name: "logout",
									size: 18
								}),
								" ",
								/* @__PURE__ */ jsx("span", {
									className: "hide-mobile",
									children: "Выйти"
								})
							]
						})
					]
				})
			}), /* @__PURE__ */ jsxs("div", {
				className: "shell__body container container--wide",
				children: [/* @__PURE__ */ jsxs("aside", {
					className: "shell__side hide-tablet",
					children: [aside, /* @__PURE__ */ jsx(SideNav, { items })]
				}), /* @__PURE__ */ jsxs("main", {
					id: "main",
					tabIndex: -1,
					className: "shell__main",
					children: [/* @__PURE__ */ jsx("div", {
						className: "show-tablet shell__crumb",
						children: /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "chip",
							onClick: () => setOpen(true),
							children: [
								/* @__PURE__ */ jsx(Icon, {
									name: "menu",
									size: 16
								}),
								" ",
								current?.label ?? mobileLabel
							]
						})
					}), children]
				})]
			})]
		}),
		/* @__PURE__ */ jsxs(Drawer, {
			open,
			onClose: () => setOpen(false),
			title: mobileLabel,
			side: "left",
			children: [aside, /* @__PURE__ */ jsx(SideNav, {
				items,
				onNavigate: () => setOpen(false)
			})]
		}),
		/* @__PURE__ */ jsx(ToastHost, {})
	] });
}
//#endregion
//#region resources/js/layouts/AdminLayout.tsx
var ALL = [
	{
		href: "/admin",
		label: "Обзор",
		icon: "home",
		exact: true,
		group: "Работа",
		perm: "admin.dashboard"
	},
	{
		href: "/admin/moderation",
		label: "Модерация",
		icon: "shield",
		group: "Работа",
		perm: "admin.moderation"
	},
	{
		href: "/admin/complaints",
		label: "Жалобы",
		icon: "alert",
		group: "Работа",
		perm: "admin.complaints"
	},
	{
		href: "/admin/duplicates",
		label: "Дубликаты",
		icon: "refresh",
		group: "Работа",
		perm: "admin.duplicates"
	},
	{
		href: "/admin/clinics",
		label: "Клиники",
		icon: "building",
		group: "Каталог",
		perm: "admin.clinics"
	},
	{
		href: "/admin/doctors",
		label: "Врачи",
		icon: "user",
		group: "Каталог",
		perm: "admin.doctors"
	},
	{
		href: "/admin/reviews",
		label: "Отзывы",
		icon: "thumb",
		group: "Каталог",
		perm: "admin.reviews"
	},
	{
		href: "/admin/dictionaries/cities",
		label: "Города",
		icon: "pin",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/districts",
		label: "Районы",
		icon: "grid",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/specialties",
		label: "Направления",
		icon: "sparkle",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/services",
		label: "Услуги",
		icon: "tooth",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/concerns",
		label: "Что беспокоит",
		icon: "pain",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/pages",
		label: "CMS-страницы",
		icon: "file",
		group: "Контент и SEO",
		perm: "admin.cms"
	},
	{
		href: "/admin/dictionaries/seo",
		label: "SEO-шаблоны",
		icon: "globe",
		group: "Контент и SEO",
		perm: "admin.seo"
	},
	{
		href: "/admin/users",
		label: "Пользователи",
		icon: "users",
		group: "Система",
		perm: "admin.users"
	},
	{
		href: "/admin/roles",
		label: "Роли и права",
		icon: "lock",
		group: "Система",
		perm: "admin.roles"
	},
	{
		href: "/admin/audit",
		label: "Журнал аудита",
		icon: "list",
		group: "Система",
		perm: "admin.audit"
	}
];
function AdminLayout({ children }) {
	const { auth } = usePage().props;
	const items = useMemo(() => ALL.filter((i) => can(auth.user, i.perm)), [auth.user]);
	return /* @__PURE__ */ jsx(DashboardShell, {
		items,
		brandSuffix: "админ-панель",
		mobileLabel: "Админ-панель",
		children
	});
}
//#endregion
//#region resources/js/layouts/AuthLayout.tsx
function AuthLayout({ children }) {
	useClientSeo();
	return /* @__PURE__ */ jsxs("div", {
		className: "auth",
		children: [
			/* @__PURE__ */ jsx("a", {
				href: "#main",
				className: "skip-link",
				children: "Перейти к содержимому"
			}),
			/* @__PURE__ */ jsxs("header", {
				className: "auth__top container",
				children: [/* @__PURE__ */ jsx(Logo, {}), /* @__PURE__ */ jsx(Link, {
					href: "/",
					className: "link",
					children: "На главную"
				})]
			}),
			/* @__PURE__ */ jsx("main", {
				id: "main",
				tabIndex: -1,
				className: "auth__main",
				children
			}),
			/* @__PURE__ */ jsx("footer", {
				className: "auth__foot container text-xs text-muted",
				children: "Не указывайте в формах диагнозы и медицинские документы."
			}),
			/* @__PURE__ */ jsx(ToastHost, {})
		]
	});
}
//#endregion
//#region resources/js/layouts/CabinetLayout.tsx
var STATUS_LABEL = {
	draft: "Черновик",
	pending: "На модерации",
	published: "Опубликована",
	rejected: "Отклонена",
	hidden: "Скрыта"
};
var STATUS_TONE = {
	draft: void 0,
	pending: "warning",
	published: "success",
	rejected: "danger",
	hidden: "info"
};
var ITEMS = [
	{
		href: "/clinic-cabinet",
		label: "Обзор",
		icon: "home",
		exact: true,
		group: "Работа"
	},
	{
		href: "/clinic-cabinet/leads",
		label: "Заявки",
		icon: "calendar",
		group: "Работа"
	},
	{
		href: "/clinic-cabinet/reviews",
		label: "Отзывы",
		icon: "thumb",
		group: "Работа"
	},
	{
		href: "/clinic-cabinet/stats",
		label: "Статистика",
		icon: "chart",
		group: "Работа"
	},
	{
		href: "/clinic-cabinet/branches",
		label: "Филиалы",
		icon: "building",
		group: "Профиль"
	},
	{
		href: "/clinic-cabinet/doctors",
		label: "Врачи",
		icon: "users",
		group: "Профиль"
	},
	{
		href: "/clinic-cabinet/prices",
		label: "Услуги и цены",
		icon: "ruble",
		group: "Профиль"
	},
	{
		href: "/clinic-cabinet/schedule",
		label: "График работы",
		icon: "clock",
		group: "Профиль"
	},
	{
		href: "/clinic-cabinet/photos",
		label: "Фото",
		icon: "image",
		group: "Профиль"
	},
	{
		href: "/clinic-cabinet/documents",
		label: "Документы",
		icon: "file",
		group: "Профиль"
	}
];
function BranchSwitcher() {
	const { cabinet } = usePage().props;
	if (!cabinet) return null;
	const { branch, branches, organization } = cabinet;
	const change = (id) => {
		const url = new URL(window.location.href);
		const path = url.pathname.includes("/branches/") ? "/clinic-cabinet" : url.pathname;
		router.get(path, { branch: id });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "cabinet-switch",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "text-xs text-muted",
				children: organization.name
			}),
			branches.length > 0 ? /* @__PURE__ */ jsx(SelectField, {
				label: "Филиал",
				value: branch?.id ?? "",
				onChange: (e) => change(e.target.value),
				children: branches.map((b) => /* @__PURE__ */ jsx("option", {
					value: b.id,
					children: b.name
				}, b.id))
			}) : /* @__PURE__ */ jsx(Link, {
				href: "/clinic-cabinet/branches/create",
				className: "btn btn--primary btn--sm btn--block",
				children: "Добавить филиал"
			}),
			branch ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				style: { gap: 8 },
				children: [/* @__PURE__ */ jsx(Badge$1, {
					tone: STATUS_TONE[branch.status],
					children: STATUS_LABEL[branch.status] ?? branch.status
				}), branch.status === "published" ? /* @__PURE__ */ jsx(Link, {
					href: `/clinics/${branch.slug}`,
					className: "link text-sm",
					children: "Страница на сайте"
				}) : null]
			}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
				className: "row",
				style: { justifyContent: "space-between" },
				children: [/* @__PURE__ */ jsx("span", {
					className: "text-sm",
					children: "Заполненность профиля"
				}), /* @__PURE__ */ jsxs("b", {
					className: "text-sm",
					children: [branch.completeness, "%"]
				})]
			}), /* @__PURE__ */ jsx("div", {
				className: "progress",
				role: "progressbar",
				"aria-valuenow": branch.completeness,
				"aria-valuemin": 0,
				"aria-valuemax": 100,
				"aria-label": "Заполненность профиля",
				children: /* @__PURE__ */ jsx("span", { style: { width: `${branch.completeness}%` } })
			})] })] }) : null
		]
	});
}
function CabinetLayout({ children }) {
	return /* @__PURE__ */ jsx(DashboardShell, {
		items: ITEMS,
		brandSuffix: "для клиник",
		mobileLabel: "Кабинет клиники",
		aside: /* @__PURE__ */ jsx(BranchSwitcher, {}),
		children
	});
}
//#endregion
//#region resources/js/app.tsx
var renderPromise = createInertiaApp({
	resolve: async (name, page) => {
		const pages = /* #__PURE__ */ Object.assign({
			"./pages/Account/Compare.tsx": () => import("./assets/Compare-D2WDZmjP.js"),
			"./pages/Account/Favorites.tsx": () => import("./assets/Favorites-DlTNlf9G.js"),
			"./pages/Account/History.tsx": () => import("./assets/History-bqdY8oFW.js"),
			"./pages/Account/Leads.tsx": () => import("./assets/Leads-CB9yAHAJ.js"),
			"./pages/Account/Notifications.tsx": () => import("./assets/Notifications-Bu5tFctj.js"),
			"./pages/Account/Overview.tsx": () => import("./assets/Overview-CzndFLY2.js"),
			"./pages/Account/Profile.tsx": () => import("./assets/Profile-CV2-QBVU.js"),
			"./pages/Account/Reviews.tsx": () => import("./assets/Reviews-BwXWzyV2.js"),
			"./pages/Admin/Audit.tsx": () => import("./assets/Audit-CxMSv0L8.js"),
			"./pages/Admin/Clinics.tsx": () => import("./assets/Clinics-Bd2Kwn9v.js"),
			"./pages/Admin/Complaints.tsx": () => import("./assets/Complaints-qQ5yqYE0.js"),
			"./pages/Admin/Dashboard.tsx": () => import("./assets/Dashboard-CHwN65UD.js"),
			"./pages/Admin/Dictionary.tsx": () => import("./assets/Dictionary-Ey_zSLk7.js"),
			"./pages/Admin/Doctors.tsx": () => import("./assets/Doctors-IHxSm2Hz.js"),
			"./pages/Admin/Duplicates.tsx": () => import("./assets/Duplicates-CNjf5HXo.js"),
			"./pages/Admin/Moderation.tsx": () => import("./assets/Moderation-DoCqAO1q.js"),
			"./pages/Admin/Reviews.tsx": () => import("./assets/Reviews-CMtogLP5.js"),
			"./pages/Admin/Roles.tsx": () => import("./assets/Roles-DJetN2kN.js"),
			"./pages/Admin/Users.tsx": () => import("./assets/Users-BPqpWRWr.js"),
			"./pages/Auth/Login.tsx": () => import("./assets/Login-CJWe91WT.js"),
			"./pages/Auth/Register.tsx": () => import("./assets/Register-D0ZTvM4B.js"),
			"./pages/Cabinet/BranchForm.tsx": () => import("./assets/BranchForm-BAamllBv.js"),
			"./pages/Cabinet/Branches.tsx": () => import("./assets/Branches-BF8QYS_Z.js"),
			"./pages/Cabinet/Dashboard.tsx": () => import("./assets/Dashboard-DhTnl5R4.js"),
			"./pages/Cabinet/DoctorForm.tsx": () => import("./assets/DoctorForm-CSXwheMX.js"),
			"./pages/Cabinet/Doctors.tsx": () => import("./assets/Doctors-B-wcWlG3.js"),
			"./pages/Cabinet/Documents.tsx": () => import("./assets/Documents-DdwRA-nr.js"),
			"./pages/Cabinet/Leads.tsx": () => import("./assets/Leads-Bgyh_u87.js"),
			"./pages/Cabinet/Photos.tsx": () => import("./assets/Photos-DFn_VNNR.js"),
			"./pages/Cabinet/Prices.tsx": () => import("./assets/Prices-CufGopAr.js"),
			"./pages/Cabinet/Reviews.tsx": () => import("./assets/Reviews--UHfVCwv.js"),
			"./pages/Cabinet/Schedule.tsx": () => import("./assets/Schedule-oxMoJuwJ.js"),
			"./pages/Cabinet/Stats.tsx": () => import("./assets/Stats-ynDeoiC2.js"),
			"./pages/Clinics/Index.tsx": () => import("./assets/Index-BaIZEcru.js"),
			"./pages/Clinics/Show.tsx": () => import("./assets/Show-LUJu56VM.js"),
			"./pages/Collections/Compare.tsx": () => import("./assets/Compare-CycihU2b.js"),
			"./pages/Collections/Favorites.tsx": () => import("./assets/Favorites-C-32pX82.js"),
			"./pages/Concerns/Show.tsx": () => import("./assets/Show-Cc-u7svt.js"),
			"./pages/Directions/Index.tsx": () => import("./assets/Index-qqbdAaBA.js"),
			"./pages/Directions/Show.tsx": () => import("./assets/Show-CQ3fIRZO.js"),
			"./pages/Doctors/Index.tsx": () => import("./assets/Index-DNvWMadu.js"),
			"./pages/Doctors/Show.tsx": () => import("./assets/Show-2UHLC4BN.js"),
			"./pages/Error.tsx": () => import("./assets/Error-BXaUTvGo.js"),
			"./pages/Home.tsx": () => import("./assets/Home-BASpPFH2.js"),
			"./pages/Page.tsx": () => import("./assets/Page-CuJmJuyn.js"),
			"./pages/Prices/Index.tsx": () => import("./assets/Index-Bw_XKiCb.js"),
			"./pages/Reviews/Index.tsx": () => import("./assets/Index-Bm9RzJWG.js"),
			"./pages/Search/Index.tsx": () => import("./assets/Index-ajzPhgw7.js")
		});
		const module = await (pages[`./pages/${name}.tsx`] || pages[`./pages/${name}.jsx`] || pages[`./Pages/${name}.tsx`] || pages[`./Pages/${name}.jsx`])?.();
		if (!module) throw new Error(`Page not found: ${name}`);
		return module.default ?? module;
	},
	layout: (name) => {
		if (name.startsWith("Auth/")) return AuthLayout;
		if (name.startsWith("Account/")) return AccountLayout;
		if (name.startsWith("Cabinet/")) return CabinetLayout;
		if (name.startsWith("Admin/")) return AdminLayout;
		return PublicLayout;
	},
	progress: {
		color: "#FA4F04",
		delay: 150
	}
});
renderPromise.catch((error) => console.error(error));
var renderPage = async (page) => {
	return (await renderPromise)(page, renderToString);
};
createServer(renderPage);
//#endregion
export { TextField as S, Modal as _, Alert as a, SelectField as b, Breadcrumbs as c, Pagination as d, renderPage as default, SectionHead as f, Drawer as g, Tabs as h, useLead as i, EmptyState as l, Stars as m, useCity as n, Avatar as o, Skeleton as p, SearchBox as r, Badge$1 as s, useCollections as t, ErrorState as u, Check as v, TextArea as x, SearchInput as y };

//# sourceMappingURL=app.js.map