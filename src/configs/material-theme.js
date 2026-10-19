/**
 * 18: Material Tailwind theme overrides.
 * The sidebar is `fixed z-[10000]` and the default dialog backdrop has no z-index, so
 * Learn / Study / Simulate (and every other Dialog) were drawn under the sidebar and
 * cut on the left. Dialogs go above the sidebar; the widgets that render in a portal
 * (Menu, Tooltip, Popover) go above dialogs so they still show inside one.
 */
const ABOVE_SIDEBAR = "z-[10050]";
const ABOVE_DIALOGS = "z-[10100]";

export const materialTheme = {
  dialog: { styles: { base: { backdrop: { zIndex: ABOVE_SIDEBAR } } } },
  menu: { styles: { base: { menu: { zIndex: ABOVE_DIALOGS } } } },
  tooltip: { styles: { base: { zIndex: ABOVE_DIALOGS } } },
  popover: { styles: { base: { zIndex: ABOVE_DIALOGS } } },
};
