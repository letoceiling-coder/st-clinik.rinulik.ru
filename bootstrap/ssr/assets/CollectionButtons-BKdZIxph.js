import { t as Icon } from "./Icon-DQahs-u2.js";
import { n as cx } from "./format-BPZIj7DQ.js";
import { t as useCollections } from "../app.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/CollectionButtons.tsx
function FavoriteButton({ type, id, name, floating = true }) {
	const { has, toggle } = useCollections();
	const active = has("favorite", type, id);
	return /* @__PURE__ */ jsx("button", {
		type: "button",
		className: cx("fav-btn", floating && "fav-btn--floating", active && "is-active"),
		"aria-pressed": active,
		"aria-label": active ? `Убрать «${name}» из избранного` : `Добавить «${name}» в избранное`,
		onClick: (e) => {
			e.preventDefault();
			e.stopPropagation();
			toggle("favorite", type, id);
		},
		children: /* @__PURE__ */ jsx(Icon, {
			name: active ? "heart-fill" : "heart",
			size: 22
		})
	});
}
function CompareButton({ type, id, name, compact }) {
	const { has, toggle } = useCollections();
	const active = has("compare", type, id);
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		className: cx("btn btn--outline btn--sm compare-btn", compact && "btn--icon btn--round", active && "is-active"),
		"aria-pressed": active,
		"aria-label": active ? `Убрать «${name}» из сравнения` : `Добавить «${name}» к сравнению`,
		onClick: () => toggle("compare", type, id),
		children: [/* @__PURE__ */ jsx(Icon, {
			name: "scale",
			size: 18
		}), compact ? null : /* @__PURE__ */ jsx("span", { children: active ? "В сравнении" : "Сравнить" })]
	});
}
//#endregion
export { FavoriteButton as n, CompareButton as t };

//# sourceMappingURL=CollectionButtons-BKdZIxph.js.map