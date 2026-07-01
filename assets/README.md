# Website Asset Inventory

These assets support the map-style digital garden homepage.

## Textures

- `textures/paper-warm.png`
  - Use: warm paper background texture.
  - Prompt intent: subtle off-white paper grain, no text, no objects, low contrast.

## Island Assets

Final transparent PNGs used by the site:

- `islands/product.png`
- `islands/ai.png`
- `islands/business.png`
- `islands/system.png`
- `islands/observe.png`

Raw chroma-key generations are kept for reprocessing:

- `islands/raw/product-raw.png`
- `islands/raw/ai-raw.png`
- `islands/raw/business-raw.png`
- `islands/raw/system-raw.png`
- `islands/raw/observe-raw.png`

The island images intentionally contain no UI text. Theme names and questions are rendered in HTML so the site remains editable and maintainable.

## Generation Notes

- Generation mode: built-in Image Gen.
- Island post-processing: local chroma-key removal from a flat `#ff00ff` background.
- Output format: PNG with alpha for island assets.
- Visual direction: restrained watercolor atlas, warm paper, muted sage/blue/clay/sand tones, no labels or watermark.
