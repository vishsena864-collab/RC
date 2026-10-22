// Kept separate from i18n.js so client components can format strings without pulling every
// dictionary into the browser bundle.

/** Replace {placeholders} in a string. */
export function fmt(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : `{${key}}`));
}
