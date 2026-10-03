#!/usr/bin/env python3
"""Resize Openverse raw images into demo assets + attribution file."""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "images" / "demo"
RAW = OUT / "_raw"
HEADERS = {"User-Agent": "StClinikDemo/1.0 (demo prototype)"}

# target filename -> (query hint, aspect w/h, size)
TARGETS: dict[str, tuple[str, tuple[int, int], tuple[int, int]]] = {
    "clinic-exterior-01.jpg": ("dental clinic building", (4, 3), (960, 720)),
    "clinic-exterior-02.jpg": ("dental clinic exterior", (4, 3), (960, 720)),
    "clinic-interior-01.jpg": ("dental clinic interior", (4, 3), (960, 720)),
    "clinic-interior-02.jpg": ("dental office room", (4, 3), (960, 720)),
    "clinic-interior-03.jpg": ("modern dental office", (4, 3), (960, 720)),
    "clinic-equipment-01.jpg": ("dental equipment chair", (4, 3), (960, 720)),
    "clinic-equipment-02.jpg": ("dental xray equipment", (4, 3), (960, 720)),
    "clinic-team-01.jpg": ("dental team staff", (4, 3), (960, 720)),
    "procedure-01.jpg": ("dental treatment patient", (4, 3), (960, 720)),
    "procedure-02.jpg": ("dentist working", (4, 3), (960, 720)),
    "hero-01.jpg": ("dental clinic reception", (16, 10), (1280, 800)),
    "hero-02.jpg": ("smile dental care", (16, 10), (1280, 800)),
    "hero-03.jpg": ("dentist consultation", (16, 10), (1280, 800)),
    "doctor-01.jpg": ("dentist portrait male", (1, 1), (640, 640)),
    "doctor-02.jpg": ("dentist portrait female", (1, 1), (640, 640)),
    "doctor-03.jpg": ("dental surgeon portrait", (1, 1), (640, 640)),
    "doctor-04.jpg": ("orthodontist portrait", (1, 1), (640, 640)),
    "doctor-05.jpg": ("female dentist white coat", (1, 1), (640, 640)),
    "doctor-06.jpg": ("male dentist portrait", (1, 1), (640, 640)),
    "doctor-07.jpg": ("dental doctor portrait", (1, 1), (640, 640)),
    "doctor-08.jpg": ("stomatologist portrait", (1, 1), (640, 640)),
}


def fetch_openverse(query: str, page_size: int = 8) -> list[dict]:
    api = (
        "https://api.openverse.org/v1/images/?"
        + urllib.parse.urlencode(
            {
                "q": query,
                "page_size": page_size,
                "format": "json",
                "license": "cc0,by,by-sa",
            }
        )
    )
    req = urllib.request.Request(api, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    return data.get("results", [])


def download(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 8000:
        return True
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=45) as resp:
            blob = resp.read()
        if len(blob) < 8000:
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(blob)
        return True
    except Exception:
        return False


def crop_resize(src: Path, dest: Path, aspect: tuple[int, int], size: tuple[int, int]) -> None:
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        w, h = im.size
        target_ratio = aspect[0] / aspect[1]
        current = w / h
        if current > target_ratio:
            new_w = int(h * target_ratio)
            left = (w - new_w) // 2
            im = im.crop((left, 0, left + new_w, h))
        else:
            new_h = int(w / target_ratio)
            top = (h - new_h) // 2
            im = im.crop((0, top, w, top + new_h))
        im = im.resize(size, Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, "JPEG", quality=86, optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    attributions: list[str] = [
        "Demo images for StomKlinik prototype.",
        "Sources: Openverse (CC0 / CC BY / CC BY-SA). Not for production without license review.",
        "",
    ]
    used_urls: set[str] = set()

    for filename, (query, aspect, size) in TARGETS.items():
        dest = OUT / filename
        picked: dict | None = None
        raw_path: Path | None = None

        for result in fetch_openverse(query):
            url = result.get("url")
            if not url or url in used_urls:
                continue
            slug = urllib.parse.quote(url, safe="")[:48]
            raw_path = RAW / f"{slug}.jpg"
            if download(url, raw_path):
                picked = result
                used_urls.add(url)
                break

        if not picked or not raw_path:
            # fallback: any existing raw file
            raws = sorted(RAW.glob("*.jpg"), key=lambda p: p.stat().st_size, reverse=True)
            if not raws:
                raise SystemExit(f"No source for {filename}")
            raw_path = raws[0]
            picked = {"title": raw_path.name, "creator": "unknown", "license": "unknown", "foreign_landing_url": ""}

        crop_resize(raw_path, dest, aspect, size)
        attributions.append(
            f"{filename}: {picked.get('title', '')} — {picked.get('creator', 'unknown')} "
            f"({picked.get('license', '')}) {picked.get('foreign_landing_url', '')}"
        )
        print("wrote", filename, dest.stat().st_size)

    (OUT / "ATTRIBUTION.txt").write_text("\n".join(attributions) + "\n", encoding="utf-8")
    print("done", len(TARGETS), "images")


if __name__ == "__main__":
    main()
