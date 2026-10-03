#!/usr/bin/env python3
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1] / "public" / "images" / "demo"
RAW = sorted(ROOT.glob("raw-*.jpg"), key=lambda p: int(p.stem.split("-")[1]))

TARGETS = [
    ("clinic-exterior-01.jpg", (4, 3), (960, 720)),
    ("clinic-exterior-02.jpg", (4, 3), (960, 720)),
    ("clinic-interior-01.jpg", (4, 3), (960, 720)),
    ("clinic-interior-02.jpg", (4, 3), (960, 720)),
    ("clinic-interior-03.jpg", (4, 3), (960, 720)),
    ("clinic-equipment-01.jpg", (4, 3), (960, 720)),
    ("clinic-equipment-02.jpg", (4, 3), (960, 720)),
    ("clinic-team-01.jpg", (4, 3), (960, 720)),
    ("procedure-01.jpg", (4, 3), (960, 720)),
    ("procedure-02.jpg", (4, 3), (960, 720)),
    ("hero-01.jpg", (16, 10), (1280, 800)),
    ("hero-02.jpg", (16, 10), (1280, 800)),
    ("hero-03.jpg", (16, 10), (1280, 800)),
    ("doctor-01.jpg", (1, 1), (640, 640)),
    ("doctor-02.jpg", (1, 1), (640, 640)),
    ("doctor-03.jpg", (1, 1), (640, 640)),
    ("doctor-04.jpg", (1, 1), (640, 640)),
    ("doctor-05.jpg", (1, 1), (640, 640)),
    ("doctor-06.jpg", (1, 1), (640, 640)),
    ("doctor-07.jpg", (1, 1), (640, 640)),
    ("doctor-08.jpg", (1, 1), (640, 640)),
]


def crop_resize(src: Path, dest: Path, aspect: tuple[int, int], size: tuple[int, int]) -> None:
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        w, h = im.size
        tr = aspect[0] / aspect[1]
        cr = w / h
        if cr > tr:
            nw = int(h * tr)
            left = (w - nw) // 2
            im = im.crop((left, 0, left + nw, h))
        else:
            nh = int(w / tr)
            top = (h - nh) // 2
            im = im.crop((0, top, w, top + nh))
        im = im.resize(size, Image.Resampling.LANCZOS)
        im.save(dest, "JPEG", quality=86, optimize=True)


def main() -> None:
    if not RAW:
        raise SystemExit("No raw-*.jpg files in public/images/demo")
    for i, (name, asp, size) in enumerate(TARGETS):
        crop_resize(RAW[i % len(RAW)], ROOT / name, asp, size)
        print(name, (ROOT / name).stat().st_size)
    (ROOT / "ATTRIBUTION.txt").write_text(
        "Demo images sourced via Openverse API (CC0 / CC BY / CC BY-SA).\n"
        "Review licenses at https://openverse.org before production use.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
