# Evan Brand Assets

This folder contains usable logo resources produced from the `VI/` visual references.

## Ready-to-use Files

- `evan-logo-transparent.png` - 1024px transparent master logo.
- `evan-logo-white.png` - 1024px white-background master logo.
- `apple-touch-icon.png` - 180px transparent app icon.
- `android-chrome-192x192.png` - 192px transparent app icon.
- `android-chrome-512x512.png` - 512px transparent app icon.
- `icons/favicon.ico` - multi-size ICO with 16, 32, and 48px layers.
- `icons/evan-logo.ico` - multi-size ICO with 16, 32, 48, 64, 128, and 256px layers.
- `png/evan-logo-*.png` - transparent square PNG exports from 16px to 1024px.

## Source Files

- `raw/evan-logo-white-bg.png` - Image Gen output on a white background.
- `references/` - English-named copies of the original `VI/` reference boards.

## Regenerate

```bash
python scripts/build_brand_assets.py
```

The script removes the near-white background, crops the logo onto a square transparent canvas, and writes all PNG and ICO outputs.
