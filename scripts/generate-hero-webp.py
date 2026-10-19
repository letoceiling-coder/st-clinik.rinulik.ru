#!/usr/bin/env python3
"""Generate responsive WebP variants for hero demo images."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "images" / "demo"

VARIANTS: dict[str, tuple[int, ...]] = {
    "hero-01": (480, 960),
    "hero-02": (256, 512),
    "hero-03": (256, 512),
}


def export_webp(src: Path, width: int) -> None:
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        height = int(width * h / w)
        resized = im.resize((width, height), Image.Resampling.LANCZOS)
        dest = ROOT / f"{src.stem}-{width}.webp"
        resized.save(dest, "WEBP", quality=82, method=6)
        print(dest.name, dest.stat().st_size)


def main() -> None:
    for stem, widths in VARIANTS.items():
        jpg = ROOT / f"{stem}.jpg"
        if not jpg.is_file():
            raise SystemExit(f"Missing {jpg}")
        for width in widths:
            export_webp(jpg, width)


if __name__ == "__main__":
    main()
