#!/usr/bin/env python3
"""
Fetch Diaries Context Preparer (Targeted Mode)
用於 Unified Diary System 方案 A。

此腳本不再全盤掃描，而是採用精準打擊：
接收 AI 傳入的「當前專案日記絕對路徑」，並同時讀取「今日的全域日記」。
將兩者並列印出在終端機，供 AI 進行不遺漏、不覆蓋的安全腦內融合。

Usage:
  python fetch_diaries.py <path_to_current_project_diary.md>
"""

import os
import sys
from datetime import datetime
from pathlib import Path


def safe_user_path(path_value, base_dir="."):
    """Resolve a CLI path under the current workspace."""
    if base_dir != ".":
        raise ValueError("Custom base directories are not supported for CLI paths")
    base_path = Path.cwd().resolve()
    resolved_path = Path(path_value).expanduser().resolve()
    try:
        resolved_path.relative_to(base_path)
    except ValueError as exc:
        raise ValueError(f"Path escapes allowed directory: {path_value}") from exc
    return resolved_path

# --- Configuration ---
GLOBAL_DIARY_ROOT = Path(os.environ.get("GLOBAL_DIARY_ROOT", str(Path(__file__).resolve().parent.parent / "diary")))

def get_today():
    return datetime.now().strftime("%Y-%m-%d")

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 2:
        print("❌ 用法錯誤。請提供當前專案的日記絕對路徑。")
        print("Usage: python fetch_diaries.py <path_to_current_project_diary.md>")
        sys.exit(1)

    proj_diary_path = safe_user_path(sys.argv[1])
    if not proj_diary_path.exists():
        print(f"⚠️ 找不到專案日記: {proj_diary_path}")
        sys.exit(1)

    date_str = get_today()
    y, m, _ = date_str.split("-")
    global_diary_path = GLOBAL_DIARY_ROOT / y / m / f"{date_str}.md"

    print(f"=== FETCH MODE: {date_str} ===")
    
    # --- 1. 讀取全域日記 ---
    print("\n" + "=" * 60)
    print(f"🌐 [現有全域日記] ({global_diary_path})")
    
    if global_diary_path.exists():
        print("⚠️ 警告：此全域日記已存在，代表今天可能有其他專案寫過進度了！")
        print("⚠️ 鐵律：請務必保留下方既有的內容，只能「追加或融合」新的專案進度，絕對不可粗暴覆寫抹除前人的紀錄！")
        print("-" * 60)
        try:
            global_content = global_diary_path.read_text(encoding="utf-8").strip()
            print(global_content)
        except Exception as e:
            print(f"讀取全域日記時發生錯誤: {e}")
    else:
        print("ℹ️ 這是今天的「第一筆」紀錄，全域檔案尚未建立。請直接為今日創建好的排版結構。")
        print("-" * 60)

    # --- 2. 讀取當前專案日記 ---
    print("\n" + "=" * 60)
    print(f"📁 [當前專案最新進度] ({proj_diary_path})")
    print("請將以下內容，優雅地消化並融合進上方的全域日記中。")
    print("-" * 60)
    try:
        content = proj_diary_path.read_text(encoding="utf-8")
        # 過濾掉雜訊標題與 footer
        lines = content.split('\n')
        meaningful = []
        for line in lines:
            if line.startswith("# "): continue
            if line.startswith("*Allen") or line.startswith("*Generated"): continue
            meaningful.append(line)
        print("\n".join(meaningful).strip())
    except Exception as e:
        print(f"讀取專案日記時發生錯誤: {e}")

    print("\n" + "=" * 60)
    print("✅ 素材提供完畢。請 IDE Agent 執行融合，並寫入/更新至全域日記檔案。")

if __name__ == "__main__":
    main()
