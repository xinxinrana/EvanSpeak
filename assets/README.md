# Website Asset Inventory

These assets support the map-style digital garden homepage.

For the full creation and maintenance workflow, see [`../docs/asset-workflow.md`](../docs/asset-workflow.md).

## Textures

- `textures/paper-warm.png`
  - Use: warm paper background texture.
  - Prompt intent: subtle off-white paper grain, no text, no objects, low contrast.

## Island Assets

Compressed WebP files used by the site:

- `islands/product.webp`
- `islands/ai.webp`
- `islands/business.webp`
- `islands/system.webp`
- `islands/observe.webp`

Uncompressed transparent PNGs are archived here:

- `uncompressed/islands/product.png`
- `uncompressed/islands/ai.png`
- `uncompressed/islands/business.png`
- `uncompressed/islands/system.png`
- `uncompressed/islands/observe.png`

Raw chroma-key generations are kept for reprocessing:

- `islands/raw/product-raw.png`
- `islands/raw/ai-raw.png`
- `islands/raw/business-raw.png`
- `islands/raw/system-raw.png`
- `islands/raw/observe-raw.png`

The island images intentionally contain no UI text. Theme names and questions are rendered in HTML so the site remains editable and maintainable.

## Brand Assets

Ready-to-use Evan logo exports are in `brand/`:

- `brand/evan-logo-transparent.png`
- `brand/evan-logo-white.png`
- `brand/icons/favicon.ico`
- `brand/icons/evan-logo.ico`
- `brand/png/evan-logo-*.png`

The original VI reference boards are copied into `brand/references/`, and the Image Gen white-background source is kept in `brand/raw/`.

## Generation Notes

- Generation mode: built-in Image Gen.
- Island post-processing: local chroma-key removal from a flat `#ff00ff` background.
- Source format: PNG with alpha for island assets.
- Delivery format: resized WebP for browser loading.
- Visual direction: restrained watercolor atlas, warm paper, muted sage/blue/clay/sand tones, no labels or watermark.

## Maintenance Rules

- Do not use a full-page UI screenshot as a website background.
- Keep text out of image assets; render text in HTML.
- Keep raw chroma-key files under `islands/raw/`.
- Keep uncompressed final PNGs under `uncompressed/`.
- Reference only project-local compressed assets from HTML/CSS.
