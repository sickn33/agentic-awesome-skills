#!/usr/bin/env python3
"""Zero-dependency terminal UI rendering helpers for nse-bse-hybrid-trader.

Provides ANSI color support (with Windows VT100 activation, NO_COLOR/FORCE_COLOR,
and automatic TTY detection), Unicode/ASCII box-drawing tables with multi-line cell
wrapping, visual progress bars, status badges, and Indian INR formatting.
Standard library only (Python 3.10+).
"""

from __future__ import annotations

import os
import re
import shutil
import sys
import textwrap
from typing import Any, TextIO

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")

_VT_ENABLED = False


def _enable_windows_vt() -> None:
    """Enable ANSI/VT100 escape sequences on Windows consoles when available."""
    global _VT_ENABLED
    if _VT_ENABLED or os.name != "nt":
        return
    try:
        import ctypes  # noqa: PLC0415

        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
        for std_id in (-11, -12):  # STD_OUTPUT_HANDLE, STD_ERROR_HANDLE
            handle = kernel32.GetStdHandle(std_id)
            if not handle or handle == -1:
                continue
            mode = ctypes.c_uint32()
            if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
                kernel32.SetConsoleMode(handle, mode.value | 0x0004)
        _VT_ENABLED = True
    except (AttributeError, OSError, ValueError):
        pass


def supports_color(stream: TextIO | None = None, force: bool | None = None) -> bool:
    """Determine whether ANSI color escapes should be emitted for `stream`."""
    if force is not None:
        if force:
            _enable_windows_vt()
        return force
    if os.environ.get("NO_COLOR") is not None:
        return False
    env_force = os.environ.get("FORCE_COLOR", "").strip().lower()
    if env_force in ("1", "true", "yes", "on"):
        _enable_windows_vt()
        return True
    target = stream if stream is not None else sys.stdout
    try:
        is_tty = bool(target.isatty())
    except (AttributeError, OSError):
        is_tty = False
    if not is_tty:
        return False
    if os.environ.get("TERM", "").lower() == "dumb":
        return False
    _enable_windows_vt()
    return True


def supports_unicode(stream: TextIO | None = None, force: bool | None = None) -> bool:
    """Return True if the stream encoding can cleanly print box-drawing & symbols."""
    if force is not None:
        return force
    target = stream if stream is not None else sys.stdout
    enc = getattr(target, "encoding", None) or "utf-8"
    sample = "╭─╮│╰─╯┌┬┐├┼┤└┴┘█░▲▼●▸✓✗⚠•"
    try:
        sample.encode(enc)
    except (LookupError, UnicodeEncodeError):
        return False
    return True


def terminal_width(default: int = 96, min_w: int = 60, max_w: int = 96) -> int:
    """Return a clean clamped console width for readable tables.

    Tries Windows Console API first (works even when stdout is piped), then
    falls back to shutil.get_terminal_size which reads COLUMNS env / ioctl.
    """
    # 1. User override via env var
    env_cols = os.environ.get("NSE_TERM_WIDTH") or os.environ.get("COLUMNS")
    if env_cols and env_cols.strip().isdigit():
        return max(min_w, min(int(env_cols.strip()), max_w))

    # 2. Windows Console API — works even when stdout is redirected / piped
    if os.name == "nt":
        try:
            import ctypes  # noqa: PLC0415
            import ctypes.wintypes  # noqa: PLC0415

            class _CSBI(ctypes.Structure):
                _fields_ = [
                    ("dwSize", ctypes.wintypes.COORD),
                    ("dwCursorPosition", ctypes.wintypes.COORD),
                    ("wAttributes", ctypes.wintypes.WORD),
                    ("srWindow", ctypes.wintypes.SMALL_RECT),
                    ("dwMaximumWindowSize", ctypes.wintypes.COORD),
                ]

            k32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
            for std_id in (-11, -12):  # STD_OUTPUT_HANDLE, STD_ERROR_HANDLE
                h = k32.GetStdHandle(std_id)
                if not h or h == ctypes.wintypes.HANDLE(-1).value:
                    continue
                csbi = _CSBI()
                if k32.GetConsoleScreenBufferInfo(h, ctypes.byref(csbi)):
                    win_w = csbi.srWindow.Right - csbi.srWindow.Left + 1
                    if win_w > 10:
                        return max(min_w, min(win_w, max_w))
        except (AttributeError, OSError, ImportError, ValueError):
            pass

    # 3. shutil fallback (Linux/macOS or when COLUMNS is set)
    cols = shutil.get_terminal_size((default, 24)).columns
    return max(min_w, min(cols, max_w))


def strip_ansi(text: str) -> str:
    return ANSI_RE.sub("", text)


def vis_len(text: str) -> int:
    return len(ANSI_RE.sub("", text))


def truncate_vis(text: str, width: int) -> str:
    """Truncate potentially ANSI-styled text to `width` visible characters."""
    if width <= 0:
        return ""
    if vis_len(text) <= width:
        return text
    ellipsis = "..." if (width < 6 or not supports_unicode()) else "…"
    plain = strip_ansi(text)
    if len(plain) <= width:
        return plain
    cut = max(0, width - len(ellipsis))
    return plain[:cut] + ellipsis


def pad_vis(text: str, width: int, align: str = "left") -> str:
    """Pad `text` (which may contain ANSI escapes) to exact visible width."""
    vlen = vis_len(text)
    if vlen > width:
        text = truncate_vis(text, width)
        vlen = vis_len(text)
    gap = max(0, width - vlen)
    if align == "right":
        return (" " * gap) + text
    if align == "center":
        left = gap // 2
        right = gap - left
        return (" " * left) + text + (" " * right)
    return text + (" " * gap)


def format_inr(amount: float | int | None, signed: bool = False, decimals: int = 2) -> str:
    """Format an INR number using the Indian numbering system (e.g., Rs. 1,25,000.00)."""
    if amount is None:
        return "N/A"
    val = float(amount)
    neg = val < 0
    abs_val = abs(val)
    fixed = f"{abs_val:.{decimals}f}"
    if "." in fixed:
        whole, frac = fixed.split(".", 1)
        frac_part = f".{frac}"
    else:
        whole, frac_part = fixed, ""
    if len(whole) > 3:
        last3 = whole[-3:]
        rest = whole[:-3]
        groups: list[str] = []
        while len(rest) > 2:
            groups.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.append(rest)
        grouped = ",".join(reversed(groups)) + "," + last3
    else:
        grouped = whole
    sign = "-" if neg else ("+" if signed and val > 0 else "")
    return f"{sign}Rs. {grouped}{frac_part}"


def format_pct(val: float | None, signed: bool = True) -> str:
    if val is None:
        return "N/A"
    return f"{val:+.2f}%" if signed else f"{val:.2f}%"


class UI:
    """Stateful formatter bound to color + Unicode capabilities."""

    def __init__(
        self,
        color: bool | None = None,
        unicode_box: bool | None = None,
        width: int | None = None,
        stream: TextIO | None = None,
    ) -> None:
        self.stream = stream if stream is not None else sys.stdout
        self.color = supports_color(self.stream, force=color)
        self.unicode = supports_unicode(self.stream, force=unicode_box)
        self.width = width if width is not None else terminal_width()

        if self.unicode:
            self.tl, self.tr, self.bl, self.br = "╭", "╮", "╰", "╯"
            self.ctl, self.ctr, self.cbl, self.cbr = "┌", "┐", "└", "┘"
            self.hz, self.vt = "─", "│"
            self.tm, self.bm, self.lm, self.rm, self.xm = "┬", "┴", "├", "┤", "┼"
            self.dhz = "─"
            self.fill_ch, self.empty_ch = "█", "░"
            self.up_ch, self.dn_ch, self.dot_ch = "▲", "▼", "•"
            self.ok_ch, self.bad_ch, self.warn_ch, self.arrow_ch = "✓", "✗", "⚠", "▸"
        else:
            self.tl, self.tr, self.bl, self.br = "+", "+", "+", "+"
            self.ctl, self.ctr, self.cbl, self.cbr = "+", "+", "+", "+"
            self.hz, self.vt = "-", "|"
            self.tm, self.bm, self.lm, self.rm, self.xm = "+", "+", "+", "+", "+"
            self.dhz = "-"
            self.fill_ch, self.empty_ch = "#", "-"
            self.up_ch, self.dn_ch, self.dot_ch = "^", "v", "*"
            self.ok_ch, self.bad_ch, self.warn_ch, self.arrow_ch = "[OK]", "[X]", "[!]", ">"

    # ---------------- Styling primitives

    def style(self, text: str, *codes: str) -> str:
        if not self.color or not codes:
            return text
        joined = ";".join(c for c in codes if c)
        if not joined:
            return text
        return f"\x1b[{joined}m{text}\x1b[0m"

    def bold(self, text: str) -> str:
        return self.style(text, "1")

    def dim(self, text: str) -> str:
        return self.style(text, "2")

    def cyan(self, text: str, bold: bool = False) -> str:
        return self.style(text, "1" if bold else "", "96")

    def green(self, text: str, bold: bool = False) -> str:
        return self.style(text, "1" if bold else "", "92")

    def red(self, text: str, bold: bool = False) -> str:
        return self.style(text, "1" if bold else "", "91")

    def yellow(self, text: str, bold: bool = False) -> str:
        return self.style(text, "1" if bold else "", "93")

    def blue(self, text: str, bold: bool = False) -> str:
        return self.style(text, "1" if bold else "", "94")

    def magenta(self, text: str, bold: bool = False) -> str:
        return self.style(text, "1" if bold else "", "95")

    def tone(self, text: str, tone_name: str, bold: bool = False) -> str:
        t = tone_name.lower()
        if t in ("good", "green", "pass", "bull", "bullish", "ok", "profit"):
            return self.green(text, bold=bold)
        if t in ("bad", "red", "block", "fail", "no-trade", "bear", "bearish", "loss"):
            return self.red(text, bold=bold)
        if t in ("warn", "yellow", "neutral", "caution", "open"):
            return self.yellow(text, bold=bold)
        if t in ("info", "cyan", "accent"):
            return self.cyan(text, bold=bold)
        if t in ("dim", "muted"):
            return self.dim(text)
        return self.bold(text) if bold else text

    def pill(self, text: str, tone_name: str = "info") -> str:
        label = f" {text} "
        if not self.color:
            return f"[{text}]"
        t = tone_name.lower()
        if t in ("good", "green", "pass", "bull", "bullish", "ok", "profit"):
            return self.style(label, "1", "30", "42")
        if t in ("bad", "red", "block", "fail", "no-trade", "bear", "bearish", "loss"):
            return self.style(label, "1", "97", "41")
        if t in ("warn", "yellow", "neutral", "caution"):
            return self.style(label, "1", "30", "43")
        if t in ("info", "cyan", "accent"):
            return self.style(label, "1", "30", "46")
        return self.style(label, "1", "7")

    def trend_pct(self, pct: float | None) -> str:
        if pct is None:
            return self.dim("N/A")
        arrow = self.up_ch if pct > 0 else (self.dn_ch if pct < 0 else self.dot_ch)
        txt = f"{pct:+.2f}% {arrow}"
        if pct > 0:
            return self.green(txt, bold=True)
        if pct < 0:
            return self.red(txt, bold=True)
        return self.yellow(txt)

    def pnl_inr(self, amount: float | None, bold: bool = True) -> str:
        if amount is None:
            return self.dim("N/A")
        txt = format_inr(amount, signed=True)
        if amount > 0:
            return self.green(txt, bold=bold)
        if amount < 0:
            return self.red(txt, bold=bold)
        return self.yellow(txt)

    def bar(
        self,
        value: float,
        max_value: float = 100.0,
        width: int = 16,
        tone_name: str = "good",
    ) -> str:
        ratio = 0.0 if max_value <= 0 else max(0.0, min(1.0, float(value) / float(max_value)))
        filled = round(ratio * width)
        empty = max(0, width - filled)
        filled_s = self.tone(self.fill_ch * filled, tone_name)
        empty_s = self.dim(self.empty_ch * empty)
        return f"{filled_s}{empty_s}"

    # ---------------- Layout blocks

    def banner(
        self,
        title: str,
        subtitle: str = "",
        badge: str | None = None,
        badge_tone: str = "info",
        meta_lines: list[str] | None = None,
    ) -> str:
        inner_w = max(40, self.width - 4)
        top = self.cyan(self.tl + (self.hz * (inner_w + 2)) + self.tr)
        bot = self.cyan(self.bl + (self.hz * (inner_w + 2)) + self.br)
        border_v = self.cyan(self.vt)

        title_styled = self.bold(title)
        if badge:
            badge_s = self.pill(badge, badge_tone)
            gap = inner_w - vis_len(title_styled) - vis_len(badge_s)
            if gap >= 2:
                line1 = title_styled + (" " * gap) + badge_s
            else:
                avail = max(12, inner_w - vis_len(badge_s) - 2)
                line1 = pad_vis(title_styled, avail) + "  " + badge_s
        else:
            line1 = pad_vis(title_styled, inner_w)

        lines = [top, f"{border_v} {pad_vis(line1, inner_w)} {border_v}"]
        if subtitle:
            for chunk in _wrap_styled_or_plain(subtitle, inner_w):
                lines.append(f"{border_v} {pad_vis(self.dim(chunk) if not ANSI_RE.search(chunk) else chunk, inner_w)} {border_v}")
        if meta_lines:
            for ml in meta_lines:
                for chunk in _wrap_styled_or_plain(ml, inner_w):
                    lines.append(f"{border_v} {pad_vis(chunk, inner_w)} {border_v}")
        lines.append(bot)
        return "\n".join(lines)

    def section(self, title: str, hint: str = "") -> str:
        lead = f"{self.dhz * 2} {self.cyan(title, bold=True)} "
        rem = max(4, self.width - vis_len(lead))
        rule = lead + self.dim(self.dhz * rem)
        if hint:
            hint_lines: list[str] = []
            max_w = max(36, self.width - 4)
            for raw_ln in hint.splitlines():
                if not raw_ln.strip():
                    continue
                if vis_len(raw_ln) <= max_w:
                    hint_lines.append("   " + (self.dim(raw_ln) if not ANSI_RE.search(raw_ln) else raw_ln))
                else:
                    for wl in _wrap_styled_or_plain(raw_ln, max_w):
                        hint_lines.append("   " + (self.dim(wl) if not ANSI_RE.search(wl) else wl))
            if hint_lines:
                return rule + "\n" + "\n".join(hint_lines)
        return rule

    def callout(self, title: str, items: list[str], tone_name: str = "warn") -> str:
        if not items:
            return ""
        inner_w = max(36, self.width - 4)
        top = self.tone(self.ctl + (self.hz * (inner_w + 2)) + self.ctr, tone_name)
        bot = self.tone(self.cbl + (self.hz * (inner_w + 2)) + self.cbr, tone_name)
        vb = self.tone(self.vt, tone_name)

        icon = self.warn_ch if tone_name in ("warn", "bad", "red", "block") else self.arrow_ch
        head = self.tone(f"{icon} {title}", tone_name, bold=True)
        out = [top, f"{vb} {pad_vis(head, inner_w)} {vb}"]
        for item in items:
            wrapped = _wrap_plain(strip_ansi(item), inner_w - 2)
            for idx, wline in enumerate(wrapped):
                prefix = f"{self.dot_ch} " if idx == 0 else "  "
                content = self.tone(prefix, tone_name) + wline
                out.append(f"{vb} {pad_vis(content, inner_w)} {vb}")
        out.append(bot)
        return "\n".join(out)

    def decision_brief(
        self,
        symbol: str,
        ltp: float,
        verdict: str | None = None,
        score: float | None = None,
        ema200: float | None = None,
        vwap: float | None = None,
        rsi: float | None = None,
        adx: float | None = None,
        atr: float | None = None,
        entry: float | None = None,
        stop: float | None = None,
        target: float | None = None,
        segment: str = "EQ_DELIVERY",
        summary_note: str | None = None,
    ) -> str:
        """Render a comprehensive structured decision brief for user decision-making."""
        clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "").replace("^NSEI", "NIFTY").replace("^NSEBANK", "BANKNIFTY")
        atr_val = atr if (atr and atr > 0) else (ltp * 0.02)
        e_val = entry if (entry and entry > 0) else ltp
        s_val = stop if (stop and stop > 0) else (ltp - (1.5 * atr_val))
        t_val = target if (target and target > 0) else (ltp + (2.5 * atr_val))

        # 1. Institutional Spine (200 EMA)
        if ema200 and ema200 > 0:
            spine_desc = "BULLISH (Above 200 EMA)" if ltp >= ema200 else "BEARISH (Below 200 EMA)"
            spine_val = f"Rs. {ema200:,.2f}"
        else:
            spine_desc = "Reference Trend Baseline"
            spine_val = "N/A"

        # 2. Session Control (VWAP)
        if vwap and vwap > 0:
            vwap_desc = "BUYER CONTROL (Above VWAP)" if ltp >= vwap else "SELLER PRESSURE (Below VWAP)"
            vwap_val = f"Rs. {vwap:,.2f}"
        else:
            vwap_desc = "Intraday Average Benchmark"
            vwap_val = "N/A"

        # 3. RSI
        if rsi is not None:
            rsi_desc = "STRONG (+) Momentum" if rsi >= 60 else ("WEAK (-) Momentum" if rsi <= 40 else "NEUTRAL / Consolidating")
            rsi_val = f"{rsi:.1f}"
        else:
            rsi_desc = "Momentum Gauge"
            rsi_val = "N/A"

        # 4. ADX
        if adx is not None:
            adx_desc = "CONFIRMED TREND (ADX > 25)" if adx >= 25 else "WEAK / SIDEWAYS CHOP (ADX < 25)"
            adx_val = f"{adx:.1f}"
        else:
            adx_desc = "Trend Strength"
            adx_val = "N/A"

        # Inferred Final Action Badge
        if verdict:
            action_badge = verdict.upper()
            action_tone = "good" if "BUY" in action_badge or "PASS" in action_badge else ("bad" if "SELL" in action_badge or "BLOCK" in action_badge else "warn")
        elif score is not None:
            if score >= 0.20:
                action_badge = "BUY / LONG SETUP"
                action_tone = "good"
            elif score <= -0.20:
                action_badge = "SELL / SHORT SETUP"
                action_tone = "bad"
            else:
                action_badge = "NEUTRAL / WAIT"
                action_tone = "warn"
        else:
            action_badge = "BUY / LONG SETUP" if (ema200 and ltp > ema200) else "ANALYZE SETUP"
            action_tone = "info"

        # Timing & Timeframe
        if segment == "EQ_INTRADAY":
            tf_desc = "Intraday (Must exit before 15:15 IST)"
        elif segment == "FNO_OPT":
            tf_desc = "Options Momentum (15m to 1 Day — Watch Theta!)"
        elif segment == "FNO_FUT":
            tf_desc = "Futures Swing (1 to 5 Days)"
        else:
            tf_desc = "Delivery Swing (1 to 3 Weeks)"

        risk_pct = (abs(e_val - s_val) / e_val * 100.0) if e_val > 0 else 0.0
        reward_pct = (abs(t_val - e_val) / e_val * 100.0) if e_val > 0 else 0.0
        rr_ratio = (reward_pct / risk_pct) if risk_pct > 0 else 1.5

        dec_rows = [
            ["1. Institutional Spine (200 EMA)", spine_val, spine_desc],
            ["2. Session Control (Intraday VWAP)", vwap_val, vwap_desc],
            ["3. Relative Strength (RSI 14)", rsi_val, rsi_desc],
            ["4. Trend Strength Power (ADX 14)", adx_val, adx_desc],
            ["5. Volatility Buffer (Daily ATR)", f"Rs. {atr_val:,.2f}", f"Normal expected daily swing: +/- Rs.{atr_val:,.2f}"],
            ["6. Planned Entry & Timing", f"Rs. {e_val:,.2f}", tf_desc],
            ["7. Structural Stop-Loss", f"Rs. {s_val:,.2f}", f"Risk: {risk_pct:.1f}% (Volatility-safe stop)"],
            ["8. Calculated Target", f"Rs. {t_val:,.2f}", f"Reward: {reward_pct:.1f}% (Net R:R 1:{rr_ratio:.1f})"],
        ]

        takeaway = summary_note or (
            f"{clean_sym} evaluated at Rs.{ltp:,.2f}. Review the confluence of 200 EMA, VWAP, and ADX before placing orders. "
            f"Ensure risk per trade does not exceed your account limit."
        )

        blocks = [
            self.banner(
                title=f"FINAL ACTIONABLE TRADE DECISION & CONCLUSION  •  {clean_sym}",
                subtitle="Synthesized conclusion for user decision-making across all active indicators",
                badge=action_badge,
                badge_tone=action_tone,
            ),
            "",
            self.table(
                headers=["Decision Checkpoint", "Key Technical Value", "Trader Interpretation & Verdict"],
                rows=dec_rows,
                alignments=["left", "left", "left"],
                nowrap_cols={0, 1},
            ),
            "",
            self.callout(
                f"Strategic Takeaway for {clean_sym}",
                [takeaway, "Rule: Always confirm live order tickets on your SEBI-registered broker terminal before placing orders."],
                tone_name="info",
            )
        ]
        return "\n".join(blocks)


    def disclaimer(self) -> str:
        """Render mandatory Indian regulatory & financial risk disclaimer."""
        items = [
            "NOT SEBI REGISTERED: The author/skill is NOT a SEBI-registered Research Analyst (RA) or Investment Advisor (IA).",
            "EDUCATIONAL ONLY: All technical scans, calculations, indicators, and simulations are educational tools only. Nothing here is investment advice, financial tips, or trading recommendations.",
            "CAPITAL AT RISK: Trading Indian equities, intraday, and derivatives (F&O) carries substantial risk of capital loss. Never risk money you cannot afford to lose.",
            "VERIFY INDEPENDENTLY: Always verify live prices, margins, circuit bands, and orders directly on your SEBI-registered broker terminal before trading. Trade strictly at your own risk.",
        ]
        return self.callout("MANDATORY REGULATORY DISCLAIMER & FINANCIAL RISK NOTICE", items, tone_name="warn")

    def kv_table(
        self,
        rows: list[tuple[str, str, str] | tuple[str, str]],
        headers: tuple[str, ...] | None = None,
        title: str | None = None,
        col_widths: list[int] | None = None,
    ) -> str:
        """Convenience wrapper around `table()` for 2- or 3-column summary cards."""
        if not rows:
            return ""
        ncols = len(rows[0])
        if headers is None:
            headers = ("Item", "Value", "Beginner Guide")[:ncols]
        aligns = ["left"] * ncols
        return self.table(
            headers=list(headers),
            rows=[list(r) for r in rows],
            alignments=aligns,
            title=title,
            col_widths=col_widths,
        )

    def table(
        self,
        headers: list[str],
        rows: list[list[str]],
        alignments: list[str] | None = None,
        title: str | None = None,
        footer: str | None = None,
        col_widths: list[int] | None = None,
        max_total_width: int | None = None,
        nowrap_cols: set[int] | None = None,
    ) -> str:
        ncols = len(headers)
        if ncols == 0:
            return ""
        aligns = alignments or ["left"] * ncols
        nowrap = nowrap_cols or set()
        budget_total = max_total_width or self.width
        # Each column needs 2 spaces padding + 1 border char, plus 1 left outer border: 3*ncols + 1 overhead
        overhead = 3 * ncols + 1
        avail_content = max(ncols * 6, budget_total - overhead)

        if col_widths and len(col_widths) == ncols:
            widths = [max(4, int(w)) for w in col_widths]
        else:
            widths = [vis_len(h) for h in headers]
            for r in rows:
                for i in range(min(ncols, len(r))):
                    for part in str(r[i]).splitlines() or [""]:
                        widths[i] = max(widths[i], vis_len(part))

        # Shrink flexible/wide columns first; protect nowrap & compact columns until needed
        while sum(widths) > avail_content:
            flex_cands = [i for i in range(ncols) if i not in nowrap and widths[i] > max(vis_len(headers[i]), 10)]
            if not flex_cands:
                flex_cands = [i for i in range(ncols) if widths[i] > max(6, min(vis_len(headers[i]), 12))]
            if not flex_cands:
                break
            widest = max(flex_cands, key=lambda idx: widths[idx])
            widths[widest] -= 1

        def _border(left: str, mid: str, right: str) -> str:
            parts = [self.hz * (w + 2) for w in widths]
            return self.dim(left + mid.join(parts) + right)

        out: list[str] = []
        if title:
            out.append(self.bold(title))

        out.append(_border(self.ctl, self.tm, self.ctr))
        hdr_cells = [
            " " + pad_vis(self.cyan(headers[i], bold=True), widths[i], aligns[i]) + " "
            for i in range(ncols)
        ]
        vt = self.dim(self.vt)
        out.append(vt + vt.join(hdr_cells) + vt)
        out.append(_border(self.lm, self.xm, self.rm))

        if not rows:
            empty_w = sum(widths) + (3 * (ncols - 1))
            out.append(vt + " " + pad_vis(self.dim("(No rows)"), empty_w, "center") + " " + vt)
        else:
            for r_idx, r in enumerate(rows):
                if r_idx > 0:
                    out.append(_border(self.lm, self.xm, self.rm))
                wrapped_cols: list[list[str]] = []
                max_h = 1
                for i in range(ncols):
                    cell = str(r[i]) if i < len(r) else ""
                    wrapped = _wrap_cell(cell, widths[i])
                    wrapped_cols.append(wrapped)
                    max_h = max(max_h, len(wrapped))
                for line_idx in range(max_h):
                    cells = []
                    for i in range(ncols):
                        txt = wrapped_cols[i][line_idx] if line_idx < len(wrapped_cols[i]) else ""
                        cells.append(" " + pad_vis(txt, widths[i], aligns[i]) + " ")
                    out.append(vt + vt.join(cells) + vt)

        out.append(_border(self.cbl, self.bm, self.cbr))
        if footer:
            out.append("  " + self.dim(footer))
        return "\n".join(out)


def _wrap_plain(text: str, width: int) -> list[str]:
    if width <= 4:
        return [text]
    lines: list[str] = []
    for raw_ln in (text or "").splitlines() or [""]:
        wrapped = textwrap.wrap(raw_ln, width=width, break_long_words=True, break_on_hyphens=False)
        lines.extend(wrapped or [""])
    return lines or [""]


def _wrap_styled_or_plain(text: str, width: int) -> list[str]:
    if vis_len(text) <= width:
        return [text]
    if ANSI_RE.search(text):
        # Preserve styling on plain wrapped lines only when single-line overflows
        return _wrap_plain(strip_ansi(text), width)
    return _wrap_plain(text, width)


def _wrap_cell(text: str, width: int) -> list[str]:
    if width <= 3:
        return [truncate_vis(text, max(1, width))]
    raw_lines = text.splitlines() or [""]
    if len(raw_lines) == 1 and vis_len(raw_lines[0]) <= width:
        return raw_lines
    out: list[str] = []
    for ln in raw_lines:
        if vis_len(ln) <= width:
            out.append(ln)
            continue
        # Preserve outer single ANSI wrapper if entire line is wrapped in one SGR color
        m = re.match(r"^((?:\x1b\[[0-9;]*m)+)(.*?)(\x1b\[0m)$", ln, re.DOTALL)
        if m and not ANSI_RE.search(m.group(2)):
            prefix, inner, suffix = m.group(1), m.group(2), m.group(3)
            parts = _wrap_plain(inner, width)
            out.extend(f"{prefix}{p}{suffix}" for p in parts)
        else:
            out.extend(_wrap_plain(strip_ansi(ln), width))
    return out or [""]


def safe_print(text: str, stream: TextIO | None = None) -> None:
    """Print text cleanly without crashing on cp1252 / restricted Windows encodings."""
    target = stream if stream is not None else sys.stdout
    enc = getattr(target, "encoding", None) or "utf-8"
    try:
        print(text, file=target)
    except UnicodeEncodeError:
        cleaned = text.encode(enc, errors="replace").decode(enc, errors="replace")
        print(cleaned, file=target)
