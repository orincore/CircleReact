// Real per-pixel color-grading filters, applied via Skia's ColorMatrix paint
// (a genuine 4x5 affine transform over RGBA, same technique CSS/Android
// color filters use) -- not a translucent color overlay.
//
// Each matrix below is a *composition* of simple named transforms (grayscale/
// sepia base, saturate, contrast, brightness, per-channel tint), multiplied
// together as proper 5x5 homogeneous matrices rather than hand-derived, so
// the combined coefficients are exact. See compute-filters.js (scratch,
// not checked in) for the derivation -- regenerate there if these need
// tuning rather than hand-editing individual numbers.
//
// All channel values and offsets are in Skia's normalized 0-1 space (not
// Android/CSS's 0-255 convention).
export const FILTER_PRESETS = [
  { name: 'Normal', matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0] },
  { name: 'Vivid', matrix: [1.462, -0.347, -0.035, 0, -0.04, -0.104, 1.219, -0.035, 0, -0.04, -0.104, -0.347, 1.531, 0, -0.04, 0, 0, 0, 1, 0] },
  { name: 'Mono', matrix: [0.335, 0.657, 0.128, 0, -0.06, 0.335, 0.657, 0.128, 0, -0.06, 0.335, 0.657, 0.128, 0, -0.06, 0, 0, 0, 1, 0] },
  { name: 'Warm', matrix: [1.112, 0, 0, 0, -0.005, 0, 1.03, 0, 0, -0.005, 0, 0, 0.927, 0, -0.005, 0, 0, 0, 1, 0] },
  { name: 'Cool', matrix: [0.948, 0, 0, 0, -0.015, 0, 1.03, 0, 0, -0.015, 0, 0, 1.133, 0, -0.015, 0, 0, 0, 1, 0] },
  { name: 'Fade', matrix: [0.75, 0.091, 0.009, 0, 0.135, 0.027, 0.814, 0.009, 0, 0.135, 0.027, 0.091, 0.732, 0, 0.135, 0, 0, 0, 1, 0] },
  { name: 'Noir', matrix: [0.374, 0.734, 0.143, 0, -0.145, 0.374, 0.734, 0.143, 0, -0.145, 0.374, 0.734, 0.143, 0, -0.145, 0, 0, 0, 1, 0] },
  { name: 'Vintage', matrix: [0.37, 0.723, 0.178, 0, 0.045, 0.332, 0.652, 0.16, 0, 0.045, 0.266, 0.522, 0.128, 0, 0.045, 0, 0, 0, 1, 0] },
];
