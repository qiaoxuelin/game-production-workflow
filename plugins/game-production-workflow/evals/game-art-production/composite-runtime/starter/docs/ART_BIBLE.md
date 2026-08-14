# Art Bible

## Frozen visual thesis

An expedition field case: compact dark slate hardware, warm ivory labels, amber active focus, and restrained mineral-blue item accents. Information is arranged like dependable equipment rather than ornamental fantasy chrome.

## Style pillars

1. Field-ready geometry: clipped corners, sturdy inset panels, and consistent two-pixel structural lines.
2. Calm hierarchy: title, slots, selected-item detail, and control hints read in that order.
3. State through structure: focus, error, and equip use distinct outline, label, and marker changes rather than color alone.

## Frozen palette and shape language

- Canvas: `#10171c`; panel: `#1b2931`; inset: `#243842`; structural line: `#67808b`.
- Primary text: `#f2ead7`; secondary text: `#a9bec4`; focus: `#f2b84b`; error: `#e66c5c`; item: `#69b9c7`.
- Corners are clipped or four-pixel rounded; item icons use bold simple geometry; decorative marks never cross labels or focus bounds.

## Spatial master

- Runtime target: 1280×720.
- Inventory panel: 760×500 centered, with a 2×4 slot grid on the left, selected-item detail on the right, and control hints along the bottom.
- Slot hit target: at least 72×72 CSS pixels. Focus outline remains outside item geometry.

## Source separation and asset families

- Panel frame and dividers are separate from item icons.
- Each item icon remains editable independently and is never baked with focus, error, or equipped state.
- Focus ring, error message, equipped marker, and controller hints are native stateful components.
- `web/assets/inventory-concept.svg` is a flattened composition reference only.

## Runtime states

- Empty: all eight slots empty and detail reads “No item selected.”
- Full: all eight slots occupied with focus on the first slot.
- Error: equip on an empty focused slot produces an explicit error label tied to that slot.
- Equip: equip on an occupied focused slot records that item and shows a separate equipped marker.
- Controller focus: focus moves among slots, stays visible, and does not change inventory content.

## Originality and provenance

The supplied concept uses only repository-authored SVG geometry and text. Production replacements must record their source and may not introduce third-party marks or copied protected expression.

## Reject when

- A flattened whole-frame image substitutes for project-native components.
- Any renderer duplicates or contradicts `web/state.mjs`.
- State feedback is baked into item art or relies only on color.
- Editable layers, import settings, actual input, runtime captures, or independent review are missing.
