from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "assets" / "brand" / "raw" / "evan-logo-white-bg.png"
BRAND_DIR = ROOT / "assets" / "brand"
PNG_DIR = BRAND_DIR / "png"
ICON_DIR = BRAND_DIR / "icons"

PNG_SIZES = (16, 32, 48, 64, 128, 180, 192, 256, 512, 1024)
ICO_SIZES = (16, 32, 48, 64, 128, 256)
FAVICON_SIZES = (16, 32, 48)


def white_to_alpha(
    image: Image.Image,
    transparent_distance: int = 22,
    opaque_distance: int = 68,
    neutral_saturation: float = 0.075,
) -> Image.Image:
    """Convert near-white neutral background pixels to alpha while preserving mint logo highlights."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()

    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            max_channel = max(r, g, b)
            min_channel = min(r, g, b)
            saturation = (max_channel - min_channel) / max(max_channel, 1)
            distance_from_white = max(255 - r, 255 - g, 255 - b)

            if saturation > neutral_saturation:
                continue

            if distance_from_white <= transparent_distance:
                alpha = 0
            elif distance_from_white >= opaque_distance:
                alpha = a
            else:
                alpha = round(
                    a
                    * (distance_from_white - transparent_distance)
                    / (opaque_distance - transparent_distance)
                )

            pixels[x, y] = (r, g, b, alpha)

    return rgba


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if bbox is None:
        raise ValueError("No non-transparent logo pixels found after background removal.")
    return bbox


def square_asset(image: Image.Image, size: int, padding_ratio: float = 0.14) -> Image.Image:
    cropped = image.crop(alpha_bbox(image))
    target_logo_size = round(size * (1 - 2 * padding_ratio))
    scale = min(target_logo_size / cropped.width, target_logo_size / cropped.height)
    resized = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    x = (size - resized.width) // 2
    y = (size - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def flatten_on_white(image: Image.Image) -> Image.Image:
    background = Image.new("RGBA", image.size, (255, 255, 255, 255))
    background.alpha_composite(image)
    return background.convert("RGB")


def save_png_set(master: Image.Image) -> None:
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    for size in PNG_SIZES:
        square_asset(master, size).save(PNG_DIR / f"evan-logo-{size}.png")


def save_ico(master: Image.Image, path: Path, sizes: tuple[int, ...]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    source_size = max(sizes)
    source = square_asset(master, source_size)
    source.save(path, sizes=[(size, size) for size in sizes])


def build_assets(source: Path) -> list[Path]:
    BRAND_DIR.mkdir(parents=True, exist_ok=True)
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    ICON_DIR.mkdir(parents=True, exist_ok=True)

    transparent_uncropped = white_to_alpha(Image.open(source))
    master = square_asset(transparent_uncropped, 1024)

    outputs = [
        BRAND_DIR / "evan-logo-transparent.png",
        BRAND_DIR / "evan-logo-white.png",
        BRAND_DIR / "apple-touch-icon.png",
        BRAND_DIR / "android-chrome-192x192.png",
        BRAND_DIR / "android-chrome-512x512.png",
        ICON_DIR / "favicon.ico",
        ICON_DIR / "evan-logo.ico",
    ]

    master.save(outputs[0])
    flatten_on_white(master).save(outputs[1])
    square_asset(master, 180).save(outputs[2])
    square_asset(master, 192).save(outputs[3])
    square_asset(master, 512).save(outputs[4])
    save_png_set(master)
    save_ico(master, outputs[5], FAVICON_SIZES)
    save_ico(master, outputs[6], ICO_SIZES)

    return outputs + [PNG_DIR / f"evan-logo-{size}.png" for size in PNG_SIZES]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build Evan brand logo assets.")
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help="White-background source logo image.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.source.exists():
        raise FileNotFoundError(f"Source image not found: {args.source}")

    for path in build_assets(args.source):
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
