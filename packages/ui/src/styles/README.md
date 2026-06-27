# @munaxa/ui — styles

This directory holds shared, component-level CSS for `@munaxa/ui` (keyframes, base layers,
print styles) that cannot be expressed as Tailwind utilities.

Token-derived CSS custom properties are owned by `@munaxa/design-tokens` and imported via
`@munaxa/design-tokens/css`. Tailwind theme mapping is owned by `@munaxa/config-tailwind`.
Keep this directory limited to genuinely component-scoped styling.
