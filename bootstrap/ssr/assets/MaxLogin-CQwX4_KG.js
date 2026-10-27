import { t as AnchorButton } from "./Button-B5alqlNe.js";
import { s as Alert } from "../app.js";
import { Link, router } from "@inertiajs/react";
import { useEffect, useRef } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Auth/MaxLogin.tsx
function MaxLogin({ code, bot_url, expires_in }) {
	const stopped = useRef(false);
	useEffect(() => {
		stopped.current = false;
		const started = Date.now();
		const tick = () => {
			if (stopped.current) return;
			if (Date.now() - started > expires_in * 1e3) return;
			fetch(`/auth/max/status/${code}`, { headers: { Accept: "application/json" } }).then((r) => r.json()).then((data) => {
				if (data.status === "ready" && data.complete_url) {
					stopped.current = true;
					router.visit(data.complete_url);
				}
			}).catch(() => void 0);
		};
		const id = window.setInterval(tick, 2e3);
		tick();
		return () => {
			stopped.current = true;
			window.clearInterval(id);
		};
	}, [code, expires_in]);
	return /* @__PURE__ */ jsxs("div", {
		className: "auth-card card card--shadow stack",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "auth-card__title",
				children: "Вход через MAX"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-muted",
				children: "Откройте бота в MAX и нажмите «Start». Эта страница автоматически завершит вход."
			})] }),
			!bot_url && /* @__PURE__ */ jsx(Alert, {
				tone: "warning",
				children: "Username бота не настроен. Укажите его в интеграции MAX в админке."
			}),
			bot_url && /* @__PURE__ */ jsx(AnchorButton, {
				href: bot_url,
				target: "_blank",
				rel: "noopener noreferrer",
				block: true,
				size: "lg",
				children: "Открыть MAX"
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted text-center",
				children: [
					"Код сессии: ",
					code.slice(0, 8),
					"…"
				]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm text-center",
				children: /* @__PURE__ */ jsx(Link, {
					href: "/login",
					className: "link",
					children: "Другой способ входа"
				})
			})
		]
	});
}
//#endregion
export { MaxLogin as default };

//# sourceMappingURL=MaxLogin-CQwX4_KG.js.map