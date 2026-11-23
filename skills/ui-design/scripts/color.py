"""Measure colours instead of describing them: OKLCH lightness, chroma and hue for each colour, and
the WCAG contrast of every pair. Hue is what tells a tint that drifted (a cobalt whose wash reads
violet); contrast is what tells a border, a text colour or a chart pair that is too faint.

    python color.py "#1f2de6" "#eceefe" "#ffffff"
    python color.py --pairs "#1f2de6/#eaf0ff" "#ffffff/#3d5cff"

Standard library only. Hex in, numbers out; nothing is fetched or written.
"""
import argparse
import math


def _channel(c: float) -> float:
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _rgb(hex_: str) -> tuple[float, float, float]:
    h = hex_.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    if len(h) != 6:
        raise ValueError(f"not a hex colour: {hex_}")
    return tuple(_channel(int(h[i:i + 2], 16)) for i in (0, 2, 4))  # type: ignore[return-value]


def oklch(hex_: str) -> tuple[float, float, float]:
    r, g, b = _rgb(hex_)
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360


def contrast(fg: str, bg: str) -> float:
    def lum(x: str) -> float:
        r, g, b = _rgb(x)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    hi, lo = sorted((lum(fg), lum(bg)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("colours", nargs="*", help="hex colours: each gets OKLCH, and every pair gets a contrast")
    p.add_argument("--pairs", nargs="*", default=[], help="fg/bg pairs to measure on their own")
    a = p.parse_args()
    for c in a.colours:
        L, C, H = oklch(c)
        hue = f"{H:5.1f}" if C >= 0.008 else "  -  "  # below this chroma a hue is invisible
        print(f"{c:>9}  L {L:.3f}  C {C:.3f}  hue {hue}")
    for i, x in enumerate(a.colours):
        for y in a.colours[i + 1:]:
            print(f"{x} on {y}: {contrast(x, y):.2f}:1")
    for pair in a.pairs:
        fg, bg = pair.split("/")
        print(f"{fg} on {bg}: {contrast(fg, bg):.2f}:1")


if __name__ == "__main__":
    main()
