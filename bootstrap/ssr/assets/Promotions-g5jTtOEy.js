import { t as Icon } from "./Icon-DQahs-u2.js";
import { n as cx } from "./format-BPZIj7DQ.js";
import { n as Button } from "./Button-D8Mzgn6o.js";
import { l as EmptyState, s as Badge, w as Modal, x as TextField } from "../app.js";
import { r as PageHead, s as Table } from "./Dash-BbiOlhfn.js";
import { n as BANNER_SPECS } from "./banner-specs-BL8mmY3b.js";
import { useForm, usePage } from "@inertiajs/react";
import { useEffect, useId, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import Cropper from "cropperjs";
//#region resources/js/components/BannerCropper.tsx
function pickImage(files) {
	const file = files?.[0];
	if (!file?.type.startsWith("image/")) return null;
	return file;
}
function canvasToFile(canvas, fileName) {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(/* @__PURE__ */ new Error("Не удалось обработать изображение."));
				return;
			}
			resolve(new File([blob], fileName.replace(/\.\w+$/, ".jpg"), {
				type: "image/jpeg",
				lastModified: Date.now()
			}));
		}, "image/jpeg", .92);
	});
}
function BannerCropper({ spec, value, onChange, label = "Изображение баннера", error }) {
	const id = useId();
	const inputRef = useRef(null);
	const imageRef = useRef(null);
	const cropperRef = useRef(null);
	const [dragging, setDragging] = useState(false);
	const [previewUrl, setPreviewUrl] = useState(null);
	const [sourceFile, setSourceFile] = useState(null);
	const [sourceUrl, setSourceUrl] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [processing, setProcessing] = useState(false);
	useEffect(() => {
		if (!value) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(value);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [value]);
	useEffect(() => {
		if (!sourceUrl) return;
		return () => URL.revokeObjectURL(sourceUrl);
	}, [sourceUrl]);
	useEffect(() => {
		if (!modalOpen || !sourceUrl || !imageRef.current) return;
		const image = imageRef.current;
		const init = () => {
			cropperRef.current?.destroy();
			cropperRef.current = new Cropper(image, {
				aspectRatio: spec.aspectRatio,
				viewMode: 1,
				dragMode: "move",
				autoCropArea: 1,
				responsive: true,
				restore: false,
				guides: true,
				center: true,
				highlight: true,
				cropBoxMovable: true,
				cropBoxResizable: true,
				toggleDragModeOnDblclick: false
			});
		};
		if (image.complete) init();
		else image.addEventListener("load", init);
		return () => {
			image.removeEventListener("load", init);
			cropperRef.current?.destroy();
			cropperRef.current = null;
		};
	}, [
		modalOpen,
		sourceUrl,
		spec.aspectRatio
	]);
	const openCropper = (file) => {
		setSourceFile(file);
		setSourceUrl(URL.createObjectURL(file));
		setModalOpen(true);
	};
	const closeCropper = () => {
		setModalOpen(false);
		setSourceFile(null);
		setSourceUrl(null);
		cropperRef.current?.destroy();
		cropperRef.current = null;
		if (inputRef.current) inputRef.current.value = "";
	};
	const applyCrop = async () => {
		const cropper = cropperRef.current;
		if (!cropper || !sourceFile) return;
		setProcessing(true);
		try {
			onChange(await canvasToFile(cropper.getCroppedCanvas({
				width: spec.outputWidth,
				height: spec.outputHeight,
				imageSmoothingEnabled: true,
				imageSmoothingQuality: "high"
			}), sourceFile.name));
			closeCropper();
		} finally {
			setProcessing(false);
		}
	};
	const onPick = (file) => {
		if (!file) return;
		openCropper(file);
	};
	const onInputChange = (event) => {
		onPick(pickImage(event.target.files));
	};
	const onDrop = (event) => {
		event.preventDefault();
		setDragging(false);
		onPick(pickImage(event.dataTransfer.files));
	};
	return /* @__PURE__ */ jsxs("div", {
		className: cx("field", "banner-cropper", error && "is-invalid"),
		children: [
			/* @__PURE__ */ jsx("label", {
				className: "field__label",
				htmlFor: id,
				children: label
			}),
			/* @__PURE__ */ jsx("p", {
				className: "field__hint",
				children: spec.hint
			}),
			/* @__PURE__ */ jsxs("div", {
				className: cx("file-dropzone", dragging && "is-dragover", previewUrl && "has-file", error && "is-invalid"),
				onDragEnter: (e) => {
					e.preventDefault();
					setDragging(true);
				},
				onDragOver: (e) => {
					e.preventDefault();
					setDragging(true);
				},
				onDragLeave: () => setDragging(false),
				onDrop,
				onClick: () => inputRef.current?.click(),
				onKeyDown: (event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						inputRef.current?.click();
					}
				},
				role: "button",
				tabIndex: 0,
				children: [/* @__PURE__ */ jsx("input", {
					ref: inputRef,
					id,
					type: "file",
					accept: "image/jpeg,image/png,image/webp",
					className: "file-dropzone__input",
					onChange: onInputChange
				}), previewUrl ? /* @__PURE__ */ jsxs("div", {
					className: "file-dropzone__preview",
					children: [/* @__PURE__ */ jsx("img", {
						src: previewUrl,
						alt: ""
					}), /* @__PURE__ */ jsxs("div", {
						className: "file-dropzone__overlay",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "upload",
							size: 20
						}), /* @__PURE__ */ jsx("span", { children: "Заменить и обрезать" })]
					})]
				}) : /* @__PURE__ */ jsxs("div", {
					className: "file-dropzone__body",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "file-dropzone__icon",
							"aria-hidden": "true",
							children: /* @__PURE__ */ jsx(Icon, {
								name: "upload",
								size: 22
							})
						}),
						/* @__PURE__ */ jsx("span", {
							className: "file-dropzone__title",
							children: dragging ? "Отпустите файл" : "Загрузите изображение баннера"
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "file-dropzone__text",
							children: ["После загрузки откроется обрезка под формат ", spec.slot === "home" ? "21:9" : "5:2"]
						})
					]
				})]
			}),
			value ? /* @__PURE__ */ jsx("button", {
				type: "button",
				className: "file-dropzone__clear link text-sm",
				onClick: (event) => {
					event.stopPropagation();
					onChange(null);
					if (inputRef.current) inputRef.current.value = "";
				},
				children: "Убрать изображение"
			}) : null,
			error ? /* @__PURE__ */ jsx("p", {
				className: "field__error",
				role: "alert",
				children: error
			}) : null,
			/* @__PURE__ */ jsxs(Modal, {
				open: modalOpen,
				onClose: closeCropper,
				title: `Обрезка баннера · ${spec.placementLabel}`,
				wide: true,
				footer: /* @__PURE__ */ jsxs("div", {
					className: "row row--wrap",
					style: {
						gap: 8,
						justifyContent: "flex-end"
					},
					children: [/* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "outline",
						onClick: closeCropper,
						disabled: processing,
						children: "Отмена"
					}), /* @__PURE__ */ jsx(Button, {
						type: "button",
						onClick: applyCrop,
						disabled: processing,
						children: processing ? "Обработка…" : "Применить обрезку"
					})]
				}),
				children: [/* @__PURE__ */ jsxs("p", {
					className: "text-sm text-muted banner-cropper__hint",
					children: [
						"Перетащите и масштабируйте изображение. Область обрезки соответствует пропорциям баннера на сайте (",
						spec.outputWidth,
						"×",
						spec.outputHeight,
						" px)."
					]
				}), /* @__PURE__ */ jsx("div", {
					className: "banner-cropper__stage",
					children: sourceUrl ? /* @__PURE__ */ jsx("img", {
						ref: imageRef,
						src: sourceUrl,
						alt: "",
						className: "banner-cropper__image"
					}) : null
				})]
			})
		]
	});
}
//#endregion
//#region resources/js/components/BannerPreview.tsx
function BannerPreview({ slot, imageUrl, title, placementLabel }) {
	const [device, setDevice] = useState("desktop");
	return /* @__PURE__ */ jsxs("div", {
		className: "banner-preview",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "banner-preview__head",
				children: [/* @__PURE__ */ jsxs("p", {
					className: "banner-preview__label",
					children: ["Предпросмотр · ", placementLabel]
				}), /* @__PURE__ */ jsxs("div", {
					className: "banner-preview__devices",
					role: "tablist",
					"aria-label": "Устройство предпросмотра",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						role: "tab",
						"aria-selected": device === "desktop",
						className: cx("banner-preview__device-btn", device === "desktop" && "is-active"),
						onClick: () => setDevice("desktop"),
						children: "Desktop"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						role: "tab",
						"aria-selected": device === "mobile",
						className: cx("banner-preview__device-btn", device === "mobile" && "is-active"),
						onClick: () => setDevice("mobile"),
						children: "Mobile"
					})]
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: cx("banner-preview__frame", `banner-preview__frame--${device}`),
				children: /* @__PURE__ */ jsxs("section", {
					className: cx("ad-slot", `ad-slot--${slot}`),
					"aria-label": "Предпросмотр баннера",
					children: [/* @__PURE__ */ jsx("p", {
						className: "ad-slot__label",
						children: "Реклама"
					}), /* @__PURE__ */ jsx("div", {
						className: "ad-slot__grid",
						children: /* @__PURE__ */ jsxs("div", {
							className: "ad-slot__banner ad-slot__banner--static",
							children: [/* @__PURE__ */ jsx("div", {
								className: "ad-slot__media",
								children: imageUrl ? /* @__PURE__ */ jsx("img", {
									src: imageUrl,
									alt: title || "Баннер"
								}) : /* @__PURE__ */ jsx("div", {
									className: "ad-slot__placeholder",
									children: "Загрузите и обрежьте изображение"
								})
							}), /* @__PURE__ */ jsxs("span", {
								className: "ad-slot__meta",
								children: [title || "Заголовок баннера", /* @__PURE__ */ jsx("span", {
									className: "ad-slot__mark",
									children: "Реклама"
								})]
							})]
						})
					})]
				})
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-xs text-muted",
				children: [
					"Так баннер будет выглядеть ",
					slot === "home" ? "на главной" : "в каталоге",
					" на ",
					device === "desktop" ? "компьютере" : "телефоне",
					"."
				]
			})
		]
	});
}
//#endregion
//#region resources/js/pages/Cabinet/Promotions.tsx
function formatPrice(kopecks) {
	if (!kopecks) return "—";
	return `${Math.round(kopecks / 100).toLocaleString("ru-RU")} ₽`;
}
function formatDuration(days) {
	if (days >= 365) return `${Math.round(days / 365)} год`;
	if (days >= 30) return `${Math.round(days / 30)} мес.`;
	return `${days} дн.`;
}
function CheckoutForm({ type, id, requiresBanner, bannerCode, name, price, description, durationDays, disabled, disabledReason }) {
	const bannerSpec = bannerCode ? BANNER_SPECS[bannerCode] : null;
	const form = useForm({
		type,
		id,
		banner_title: "",
		banner_url: "",
		banner_image: null
	});
	const [previewUrl, setPreviewUrl] = useState(null);
	useEffect(() => {
		if (!form.data.banner_image) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(form.data.banner_image);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [form.data.banner_image]);
	const submit = (event) => {
		event.preventDefault();
		form.post("/clinic-cabinet/promotions/checkout", {
			forceFormData: true,
			preserveScroll: true
		});
	};
	const header = /* @__PURE__ */ jsxs("div", {
		className: "promo-offer__head row row--wrap row--between",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "promo-offer__intro",
			children: [
				/* @__PURE__ */ jsx("h3", {
					className: "promo-offer__title",
					children: name
				}),
				durationDays ? /* @__PURE__ */ jsxs("p", {
					className: "text-sm text-muted",
					children: ["Срок: ", formatDuration(durationDays)]
				}) : null,
				description ? /* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: description
				}) : null
			]
		}), /* @__PURE__ */ jsx("strong", {
			className: "promo-offer__price",
			children: formatPrice(price)
		})]
	});
	const footer = /* @__PURE__ */ jsxs("div", {
		className: "promo-offer__footer",
		children: [
			disabledReason ? /* @__PURE__ */ jsx("p", {
				className: "alert alert--warning",
				children: disabledReason
			}) : null,
			/* @__PURE__ */ jsx(Button, {
				type: "submit",
				block: true,
				disabled: form.processing || !price || disabled,
				children: "Оплатить через ЮKassa"
			}),
			"payment" in form.errors && form.errors.payment ? /* @__PURE__ */ jsx("p", {
				className: "field-error",
				children: String(form.errors.payment)
			}) : null
		]
	});
	return /* @__PURE__ */ jsx("form", {
		className: bannerSpec ? "card promo-offer promo-offer--banner" : "card promo-offer",
		onSubmit: submit,
		children: bannerSpec ? /* @__PURE__ */ jsxs(Fragment, { children: [
			header,
			/* @__PURE__ */ jsxs("div", {
				className: "promo-banner-offer__grid",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "promo-banner-offer__form stack",
					children: [
						/* @__PURE__ */ jsx(TextField, {
							label: "Заголовок баннера",
							required: true,
							value: form.data.banner_title,
							onChange: (e) => form.setData("banner_title", e.target.value),
							error: form.errors.banner_title
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Ссылка при клике",
							required: true,
							type: "url",
							value: form.data.banner_url,
							onChange: (e) => form.setData("banner_url", e.target.value),
							error: form.errors.banner_url,
							hint: "Обычно страница клиники или акции"
						}),
						/* @__PURE__ */ jsx(BannerCropper, {
							spec: bannerSpec,
							value: form.data.banner_image,
							onChange: (file) => form.setData("banner_image", file),
							error: form.errors.banner_image
						}),
						/* @__PURE__ */ jsx("p", {
							className: "text-xs text-muted",
							children: "После оплаты баннер отправится на модерацию администратора."
						})
					]
				}), /* @__PURE__ */ jsx("div", {
					className: "promo-banner-offer__preview",
					children: /* @__PURE__ */ jsx(BannerPreview, {
						slot: bannerSpec.slot,
						imageUrl: previewUrl,
						title: form.data.banner_title,
						placementLabel: bannerSpec.placementLabel
					})
				})]
			}),
			footer
		] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
			className: "promo-offer__body stack",
			children: header
		}), footer] })
	});
}
function CabinetPromotions({ products, packages, active, orders, has_publication, yookassa_configured, labels }) {
	const { flash } = usePage().props;
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(PageHead, {
			title: "Продвижение",
			text: "Пакеты — право на публикацию клиники в каталоге. Буст и баннеры покупаются отдельно при активном пакете."
		}),
		flash?.success ? /* @__PURE__ */ jsx("p", {
			className: "alert alert--success",
			children: flash.success
		}) : null,
		!yookassa_configured ? /* @__PURE__ */ jsx("p", {
			className: "alert alert--warning",
			children: "Оплата временно недоступна: не настроена ЮKassa на сервере."
		}) : null,
		active.length > 0 ? /* @__PURE__ */ jsxs("section", {
			className: "stack",
			children: [/* @__PURE__ */ jsx("h2", { children: "Активные услуги" }), /* @__PURE__ */ jsx("div", {
				className: "stack",
				children: active.map((item) => /* @__PURE__ */ jsxs("article", {
					className: "card row row--wrap row--between",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: labels[item.product_code] ?? item.product_code }), /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: item.starts_at ? `${item.starts_at} — ${item.ends_at ?? "…"}` : "Ожидает модерации"
					})] }), /* @__PURE__ */ jsx(Badge, {
						tone: item.status === "active" ? "success" : "warning",
						children: item.status === "active" ? "Активно" : "На модерации"
					})]
				}, item.id))
			})]
		}) : null,
		/* @__PURE__ */ jsxs("section", {
			className: "stack-lg",
			children: [
				/* @__PURE__ */ jsx("h2", { children: "Пакеты публикации" }),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: "Выберите срок размещения клиники на сервисе: 1, 6 или 12 месяцев."
				}),
				packages.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
					title: "Пакеты пока не настроены",
					text: "Обратитесь к администратору каталога."
				}) : /* @__PURE__ */ jsx("div", {
					className: "promo-grid",
					children: packages.map((p) => /* @__PURE__ */ jsx(CheckoutForm, {
						type: "package",
						id: p.id,
						name: p.name,
						price: p.price,
						description: p.description,
						durationDays: p.duration_days,
						requiresBanner: false
					}, p.id))
				})
			]
		}),
		/* @__PURE__ */ jsxs("section", {
			className: "stack-lg",
			children: [
				/* @__PURE__ */ jsx("h2", { children: "Дополнительные опции" }),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: "Подъём в каталоге и рекламные баннеры. Доступны только при активном пакете публикации."
				}),
				!has_publication ? /* @__PURE__ */ jsx("p", {
					className: "alert alert--warning",
					children: "Сначала оформите пакет публикации — без него доп. опции недоступны."
				}) : null,
				products.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Доп. опции пока не настроены" }) : /* @__PURE__ */ jsx("div", {
					className: "promo-grid promo-grid--addons",
					children: products.map((p) => {
						const isBanner = p.code === "banner_home" || p.code === "banner_catalog";
						return /* @__PURE__ */ jsxs("div", {
							className: isBanner ? "promo-grid__item promo-grid__item--wide" : "promo-grid__item",
							children: [p.available === 0 ? /* @__PURE__ */ jsx("p", {
								className: "text-sm text-muted promo-grid__note",
								children: "Свободных мест: 0"
							}) : null, /* @__PURE__ */ jsx(CheckoutForm, {
								type: "product",
								id: p.id,
								name: p.name,
								price: p.price,
								description: p.description,
								durationDays: p.duration_days,
								requiresBanner: p.requires_moderation,
								bannerCode: isBanner ? p.code : void 0,
								disabled: !has_publication || p.available === 0,
								disabledReason: !has_publication ? "Требуется активный пакет публикации." : p.available === 0 ? "Достигнут лимит размещений в вашем городе." : void 0
							})]
						}, p.id);
					})
				})
			]
		}),
		orders.length > 0 ? /* @__PURE__ */ jsxs("section", {
			className: "stack",
			children: [/* @__PURE__ */ jsx("h2", { children: "Последние заказы" }), /* @__PURE__ */ jsx(Table, {
				headers: [
					"Дата",
					"Сумма",
					"Статус",
					""
				],
				children: orders.map((o) => /* @__PURE__ */ jsxs("tr", { children: [
					/* @__PURE__ */ jsx("td", { children: o.created_at }),
					/* @__PURE__ */ jsx("td", { children: formatPrice(o.amount) }),
					/* @__PURE__ */ jsxs("td", { children: [o.status, o.moderation_status ? ` / ${o.moderation_status}` : ""] }),
					/* @__PURE__ */ jsx("td", { children: o.status === "pending_payment" && o.payment_url ? /* @__PURE__ */ jsx("a", {
						href: o.payment_url,
						className: "link",
						children: "Оплатить"
					}) : null })
				] }, o.id))
			})]
		}) : null
	] });
}
//#endregion
export { CabinetPromotions as default };

//# sourceMappingURL=Promotions-g5jTtOEy.js.map