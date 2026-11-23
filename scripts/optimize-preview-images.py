"""Optimize generated preview assets without modifying original images."""
from pathlib import Path
from PIL import Image

root = Path("dist")
logo = root / "assets/creaid-media-logo.webp"
with Image.open(logo) as image:
    image.load()
    if image.width > 1200:
        original = logo.stat().st_size
        image.thumbnail((1200, 140), Image.Resampling.LANCZOS)
        temporary = logo.with_suffix(".optimized.webp")
        image.save(temporary, "WEBP", lossless=True, method=6)
        if temporary.stat().st_size < original:
            temporary.replace(logo)
            print(f"Logo: {original} -> {logo.stat().st_size} bytes, {image.width} x {image.height}")
        else:
            temporary.unlink()

rel = Path("assets/blog/original/2026/04/social-media-strategie-redaktionsplanung-2-1024x683.png")
source = root / rel
target = source.with_suffix(".webp")
if source.exists():
    with Image.open(source) as image:
        image.save(target, "WEBP", quality=86, method=6)
    if target.stat().st_size < source.stat().st_size:
        for page in root.glob("*.html"):
            text = page.read_text(encoding="utf-8")
            new = text.replace("/" + rel.as_posix(), "/" + rel.with_suffix(".webp").as_posix())
            if new != text:
                page.write_text(new, encoding="utf-8")
        print(f"Article image: {source.stat().st_size} -> {target.stat().st_size} bytes")
    else:
        target.unlink()
