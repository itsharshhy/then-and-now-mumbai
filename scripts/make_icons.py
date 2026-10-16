"""Draw the app icon as 32x32 pixel art and export it at every size the install flow needs.

A cutting-chai glass with steam over a little skyline, on taxi yellow. Run: python3 scripts/make_icons.py
"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

PAL = {
    "Y": (242, 194, 48),   # taxi yellow
    "y": (217, 169, 26),   # deeper yellow
    "K": (28, 28, 34),     # ink
    "N": (38, 54, 94),     # dusk skyline
    "n": (26, 37, 68),
    "L": (255, 226, 154),  # lit windows
    "G": (232, 217, 181),  # glass
    "g": (200, 182, 140),
    "C": (176, 122, 58),   # chai
    "c": (138, 90, 40),
    "W": (255, 255, 255),  # steam
    "w": (236, 236, 236),
    "R": (184, 35, 47),    # BEST red
}

ART = [
    "YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
    "YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
    "YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
    "YYYYYYYYYYYYYYwYYYYYYYYYYYYYYYYY",
    "YYYYYYYYYYYYYWYYYYwYYYYYYYYYYYYY",
    "YYYYYYYYYYYYYWYYYWYYYYYYYYYYYYYY",
    "YYYYYYYYYYYYYYWYYWYYYYYYYYYYYYYY",
    "YYYYYYYYYYYYYYWYYYWYYYYYYYYYYYYY",
    "YYYYYYYYYYYYYWYYYYWYYYYYYYYYYYYY",
    "YYYYYYYYYYKKKKKKKKKKKKYYYYYYYYYY",
    "YYYYYYYYYYKGGGGGGGGGGKYYYYYYYYYY",
    "YYYYYYYYYYKGCCCCCCCCgKYYYYYYYYYY",
    "YYYYYYYYYYKGCCCCCCCCgKYYYYYYYYYY",
    "YYYYYYYYYYYKGCCCCCCgKYYYYYYYYYYY",
    "YYYYYYYYYYYKGCCCCCCgKYYYYYYYYYYY",
    "YYYYYYYYYYYKGCCCCCCgKYYYYYYYYYYY",
    "YYYYYYYYYYYYKGCCCCgKYYYYYYYYYYYY",
    "YYYYYYYYYYYYKGCCCCgKYYYYYYYYYYYY",
    "YYYYYYYYYYYYKGCCCCgKYYYYYYYYYYYY",
    "YYYYYYYYYYYYKGGGGGgKYYYYYYYYYYYY",
    "YYYYYYYYYYYYYKKKKKKYYYYYYYYYYYYY",
    "YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
    "yyyNNyyyyyyyyyyyyyyyyyyNNNyyyyyy",
    "yyyNNyyyNNNyyyyyyyyyyyyNLNyyNNyy",
    "yNNNLNyyNLNyyyNNNNyyyyyNNNyyNLNy",
    "yNLNNNyyNNNyyyNLLNyyNNNNLNyyNNNy",
    "NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN",
    "nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn",
    "nnRRRRRRRRRRRRRnnnnnnnnnnnnnnnnn",
    "nnRWRWRWRWRWRWRnnnnnnnnnnnnnnnnn",
    "nnRRRRRRRRRRRRRnnnnnnnnnnnnnnnnn",
    "nnnnKnnnnnnnnKnnnnnnnnnnnnnnnnnn",
]


def render(size: int, pad: float = 0.0) -> Image.Image:
    base = Image.new("RGB", (32, 32))
    for y, row in enumerate(ART):
        for x, ch in enumerate(row):
            base.putpixel((x, y), PAL[ch])
    if pad <= 0:
        return base.resize((size, size), Image.NEAREST)
    # maskable icons must keep their subject inside the middle 80%: shrink the art onto a yellow field
    inner = round(size * (1 - pad * 2))
    canvas = Image.new("RGB", (size, size), PAL["Y"])
    art = base.resize((inner, inner), Image.NEAREST)
    canvas.paste(art, ((size - inner) // 2, (size - inner) // 2))
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    render(192).save(OUT / "icon-192.png")
    render(512).save(OUT / "icon-512.png")
    render(512, pad=0.1).save(OUT / "maskable-512.png")
    render(180).save(OUT / "apple-touch-icon.png")
    render(32).save(OUT / "favicon-32.png")
    render(64).save(OUT / "favicon-64.png")
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
