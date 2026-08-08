#!/usr/bin/env python3
"""
Notion Diary Sync Script
同步 diary-agent 的開發日記到 Notion「每日複盤」頁面的 Business 區塊。
頁面結構（其他生活區塊）由 GAS Agent 建立，本腳本僅負責推送開發日記。

使用方式：
  python sync_to_notion.py <diary_file_path>
  python sync_to_notion.py --create-db <parent_page_id>

環境變數：
  NOTION_TOKEN      - Notion Internal Integration Token
  NOTION_DIARY_DB   - Notion Diary Database ID
"""

import os
import sys
import re
import json
import requests
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

# ── Configuration ──────────────────────────────────────────────
NOTION_TOKEN = os.environ.get("NOTION_TOKEN", "")
NOTION_DIARY_DB = os.environ.get("NOTION_DIARY_DB", "")
NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
}

# ── 注意 ──────────────────────────────────────────────────────
# 頁面結構（Learning / Chemistry / Workout / 心得）由 GAS Agent 建立。
# 本腳本僅負責將開發日記推送至 Business 區塊。


# ── Notion API Helpers ─────────────────────────────────────────

def notion_request(method: str, endpoint: str, data: dict = None) -> dict:
    """Execute a Notion API request with error handling."""
    url = f"{NOTION_API}/{endpoint}"
    resp = getattr(requests, method)(url, headers=HEADERS, json=data)
    if resp.status_code >= 400:
        print(f"❌ Notion API Error ({resp.status_code}): {resp.json().get('message', resp.text)}")
        sys.exit(1)
    return resp.json()


def search_diary_by_date(date_str: str) -> str | None:
    """Search for an existing diary page by date property."""
    data = {
        "filter": {
            "property": "日期",
            "date": {"equals": date_str}
        }
    }
    result = notion_request("post", f"databases/{NOTION_DIARY_DB}/query", data)
    pages = result.get("results", [])
    return pages[0]["id"] if pages else None


# ── Rich Text & Block Helpers ──────────────────────────────────

def parse_rich_text(text: str) -> list:
    """Parse markdown inline formatting to Notion rich_text array."""
    segments = []
    pattern = r'(\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\))'
    last_end = 0

    for match in re.finditer(pattern, text):
        start, end = match.span()
        if start > last_end:
            plain = text[last_end:start]
            if plain:
                segments.append({"type": "text", "text": {"content": plain}})
        full = match.group(0)
        if full.startswith("**"):
            segments.append({"type": "text", "text": {"content": match.group(2)}, "annotations": {"bold": True}})
        elif full.startswith("`"):
            segments.append({"type": "text", "text": {"content": match.group(3)}, "annotations": {"code": True}})
        elif full.startswith("["):
            segments.append({"type": "text", "text": {"content": match.group(4), "link": {"url": match.group(5)}}})
        last_end = end

    if last_end < len(text):
        remaining = text[last_end:]
        if remaining:
            segments.append({"type": "text", "text": {"content": remaining}})
    if not segments:
        segments.append({"type": "text", "text": {"content": text}})
    return segments


def make_heading2(text: str) -> dict:
    return {"object": "block", "type": "heading_2", "heading_2": {"rich_text": parse_rich_text(text)}}


def make_heading3(text: str) -> dict:
    return {"object": "block", "type": "heading_3", "heading_3": {"rich_text": parse_rich_text(text)}}


def make_bullet(text: str) -> dict:
    return {"object": "block", "type": "bulleted_list_item", "bulleted_list_item": {"rich_text": parse_rich_text(text)}}


def make_divider() -> dict:
    return {"object": "block", "type": "divider", "divider": {}}


def make_quote(text: str = " ") -> dict:
    return {"object": "block", "type": "quote", "quote": {"rich_text": [{"type": "text", "text": {"content": text}}]}}


def make_paragraph(text: str) -> dict:
    return {"object": "block", "type": "paragraph", "paragraph": {"rich_text": parse_rich_text(text)}}


def make_todo(text: str, checked: bool = False) -> dict:
    return {"object": "block", "type": "to_do", "to_do": {"rich_text": parse_rich_text(text), "checked": checked}}


def make_callout(text: str, emoji: str = "💡") -> dict:
    return {"object": "block", "type": "callout", "callout": {"rich_text": parse_rich_text(text), "icon": {"emoji": emoji}}}


# ── Markdown to Business Blocks ────────────────────────────────

def diary_to_business_blocks(md_content: str) -> list:
    """Convert diary markdown into bullet-point blocks for the Business section.

    Extracts the key accomplishments and structures them as Notion blocks.
    """
    blocks = []
    lines = md_content.split("\n")

    for line in lines:
        line = line.rstrip()
        if not line:
            continue

        # Skip the H1 title and timestamp lines
        if line.startswith("# ") or line.startswith("*Allen") or line.startswith("*Generated"):
            continue

        # H3 sections become sub-headings (e.g. ### 1. 跨平台混合雲自動化)
        if line.startswith("### "):
            heading_text = line[4:].strip()
            # Remove leading numbers (e.g. "1. " or "📁 ")
            heading_text = re.sub(r'^\d+\.\s*', '', heading_text)
            blocks.append(make_heading3(heading_text))
            continue

        # H2 sections - skip (they are category headers like "今日回顧", "該改善的地方")
        if line.startswith("## "):
            section = line[3:].strip()
            # Keep the improvement section as a callout
            if "改善" in section or "學習" in section:
                blocks.append(make_divider())
                blocks.append(make_heading3(f"💡 {section}"))
            continue

        # Dividers
        if line.strip() == "---":
            continue
            
        # Callouts (e.g. > 🌟 **今日亮點 (Daily Highlight)**)
        if line.startswith("> "):
            text = line[2:].strip()
            # Extract emoji if present
            emoji = "💡"
            if text and len(text) > 0:
                first_char = text[0]
                # A simple heuristic to check if the first character is an emoji
                import unicodedata
                if ord(first_char) > 0xFFFF or unicodedata.category(first_char) == 'So':
                    emoji = first_char
                    text = text[1:].strip()
            blocks.append(make_callout(text, emoji))
            continue

        # TODO items
        if "- [ ]" in line or "- [x]" in line:
            checked = "- [x]" in line
            text = re.sub(r'^[\s]*-\s\[[ x]\]\s', '', line)
            blocks.append(make_todo(text, checked))
            continue
 
        # Numbered items
        if re.match(r'^[\s]*\d+\.\s', line):
            text = re.sub(r'^[\s]*\d+\.\s', '', line)
            if text:
                blocks.append(make_bullet(text))
            continue
 
        # Bullet points
        if re.match(r'^[\s]*[\-\*]\s', line):
            text = re.sub(r'^[\s]*[\-\*]\s', '', line)
            if text:
                blocks.append(make_bullet(text))
            continue

        # Default: paragraph (only if meaningful)
        if len(line.strip()) > 2:
            blocks.append(make_paragraph(line))

    return blocks


# ── Page Creation ──────────────────────────────────────────────

def build_business_only_blocks(business_blocks: list) -> list:
    """Build page blocks with only Business section (GAS Agent handles the rest)."""
    blocks = []
    blocks.append(make_heading2("💼 Business (YT/AI 網紅 / 自動化開發)"))
    blocks.extend(business_blocks)
    blocks.append(make_divider())
    return blocks


def extract_metadata(md_content: str, filename: str) -> dict:
    """Extract metadata from diary markdown content."""
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    date_str = date_match.group(1) if date_match else datetime.now().strftime("%Y-%m-%d")

    # Build title
    title = f"📊 {date_str} 每日複盤"

    # Extract project names
    # Matches old format `### 📁 ` and new format e.g., `### 🔵 ` or `### 🟢 `
    projects = re.findall(r'###\s+[\U00010000-\U0010ffff📁]\s+(\S+)', md_content)
    if not projects:
        projects = re.findall(r'###\s+\d+\.\s+(.+?)[\s🚀🛠️🧪☁️🔧🧩]*(?:\n|$)', md_content)
        projects = [p.strip()[:20] for p in projects]

    # Auto-tag
    tags = {"Business"}  # Always tagged as Business since diary-agent produces dev content
    tag_keywords = {
        "自動化": ["自動化", "GAS", "Agent", "觸發器"],
        "AI": ["Gemini", "AI", "語義", "LLM"],
        "影片": ["Remotion", "影片", "渲染", "OpenShorts"],
        "投資": ["投資", "分析", "道氏", "酒田"],
        "Discord": ["Discord", "Listener"],
        "YouTube": ["YouTube", "YT", "Guardian"],
    }
    for tag, keywords in tag_keywords.items():
        if any(kw in md_content for kw in keywords):
            tags.add(tag)

    return {
        "date": date_str,
        "title": title,
        "projects": projects if projects else ["general"],
        "tags": list(tags),
    }


def create_diary_page(metadata: dict, blocks: list) -> str:
    """Create a new diary page in Notion database."""
    children = blocks[:100]
    data = {
        "parent": {"database_id": NOTION_DIARY_DB},
        "icon": {"emoji": "📊"},
        "properties": {
            "標題": {"title": [{"text": {"content": metadata["title"]}}]},
            "日期": {"date": {"start": metadata["date"]}},
            "專案": {"multi_select": [{"name": p} for p in metadata["projects"][:10]]},
            "標籤": {"multi_select": [{"name": t} for t in metadata["tags"][:10]]},
        },
        "children": children
    }
    result = notion_request("post", "pages", data)
    page_id = result["id"]

    # Append remaining blocks in chunks of 100
    if len(blocks) > 100:
        remaining = blocks[100:]
        for i in range(0, len(remaining), 100):
            chunk = remaining[i:i+100]
            notion_request("patch", f"blocks/{page_id}/children", {"children": chunk})

    return page_id


def update_business_section(page_id: str, metadata: dict, business_blocks: list):
    """Update ONLY the Business section of an existing page, preserving all other content."""
    # Update properties
    notion_request("patch", f"pages/{page_id}", {
        "properties": {
            "標題": {"title": [{"text": {"content": metadata["title"]}}]},
            "專案": {"multi_select": [{"name": p} for p in metadata["projects"][:10]]},
            "標籤": {"multi_select": [{"name": t} for t in metadata["tags"][:10]]},
        }
    })

    # Read all existing blocks
    all_blocks = []
    cursor = None
    while True:
        endpoint = f"blocks/{page_id}/children?page_size=100"
        if cursor:
            endpoint += f"&start_cursor={cursor}"
        result = notion_request("get", endpoint)
        all_blocks.extend(result.get("results", []))
        if not result.get("has_more"):
            break
        cursor = result.get("next_cursor")

    # Find the Business section boundaries
    business_start = None
    business_end = None

    for idx, block in enumerate(all_blocks):
        if block["type"] == "heading_2":
            text = ""
            for rt in block.get("heading_2", {}).get("rich_text", []):
                text += rt.get("plain_text", rt.get("text", {}).get("content", ""))
            if "Business" in text:
                business_start = idx
            elif business_start is not None and business_end is None:
                # Next H2 after Business = end of Business section
                business_end = idx
                break

    if business_start is None:
        print("⚠️ 找不到 Business 區塊，將覆蓋整頁內容")
        blocks_to_delete = all_blocks
        after_block_id = None
    else:
        # If no end found, look for a divider after business content
        if business_end is None:
            for idx in range(business_start + 1, len(all_blocks)):
                if all_blocks[idx]["type"] == "divider":
                    business_end = idx + 1  # Include the divider
                    break
            if business_end is None:
                business_end = len(all_blocks)

        # Delete old Business content (between heading and next section)
        blocks_to_delete = all_blocks[business_start + 1:business_end]
        
        # Find the block AFTER which to insert (the Business heading itself)
        after_block_id = all_blocks[business_start]["id"]

    for block in blocks_to_delete:
        try:
            requests.delete(f"{NOTION_API}/blocks/{block['id']}", headers=HEADERS)
        except Exception:
            pass

    # Insert new Business blocks after the heading, or at the end of the page
    for i in range(0, len(business_blocks), 100):
        chunk = business_blocks[i:i+100]
        payload = {"children": chunk}
        if after_block_id:
            payload["after"] = after_block_id
            
        result = notion_request("patch", f"blocks/{page_id}/children", payload)
        
        # Update after_block_id to the last inserted block for ordering
        if chunk and result.get("results"):
            after_block_id = result["results"][-1]["id"]

    # Re-add divider after business content
    if after_block_id:
        notion_request("patch", f"blocks/{page_id}/children", {
            "children": [make_divider()],
            "after": after_block_id
        }) 
    else:
        notion_request("patch", f"blocks/{page_id}/children", {
            "children": [make_divider()]
        })

    print("✅ Business 區塊已更新（其他區塊未受影響）")


def create_database(parent_page_id: str) -> str:
    """Create the Diary database under a parent page."""
    data = {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "title": [{"type": "text", "text": {"content": "📔 AI 日記"}}],
        "icon": {"emoji": "📊"},
        "is_inline": False,
        "properties": {
            "標題": {"title": {}},
            "日期": {"date": {}},
            "專案": {"multi_select": {"options": []}},
            "標籤": {"multi_select": {"options": []}},
        }
    }
    result = notion_request("post", "databases", data)
    db_id = result["id"]
    print(f"✅ Created Notion Diary Database: {db_id}")
    print(f"   請將此 ID 設為環境變數：")
    print(f'   $env:NOTION_DIARY_DB = "{db_id}"')
    return db_id


# ── Main ───────────────────────────────────────────────────────

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
    if not NOTION_TOKEN:
        print("❌ 請設定環境變數 NOTION_TOKEN")
        print('   $env:NOTION_TOKEN = "ntn_xxx"')
        sys.exit(1)

    # Handle --create-db flag
    if len(sys.argv) >= 3 and sys.argv[1] == "--create-db":
        parent_id = sys.argv[2].replace("-", "")
        create_database(parent_id)
        return

    if not NOTION_DIARY_DB:
        print("❌ 請設定環境變數 NOTION_DIARY_DB")
        print('   $env:NOTION_DIARY_DB = "abc123..."')
        print("")
        print("如需建立新 Database：")
        print('   python sync_to_notion.py --create-db <parent_page_id>')
        sys.exit(1)

    if len(sys.argv) < 2:
        print("用法：python sync_to_notion.py <diary_file.md>")
        print("      python sync_to_notion.py --create-db <parent_page_id>")
        sys.exit(1)

    diary_path = safe_user_path(sys.argv[1])
    if not diary_path.exists():
        print(f"❌ 找不到日記文件：{diary_path}")
        sys.exit(1)

    # Read diary
    md_content = diary_path.read_text(encoding="utf-8")
    filename = diary_path.name

    print(f"📖 讀取日記：{diary_path}")

    # Extract metadata
    metadata = extract_metadata(md_content, filename)
    print(f"   日期：{metadata['date']}")
    print(f"   標題：{metadata['title']}")
    print(f"   專案：{', '.join(metadata['projects'])}")
    print(f"   標籤：{', '.join(metadata['tags'])}")

    # Convert diary to Business blocks
    business_blocks = diary_to_business_blocks(md_content)
    print(f"   Business 區塊數：{len(business_blocks)}")

    # Check if page already exists
    existing_page = search_diary_by_date(metadata["date"])

    if existing_page:
        print(f"🔄 更新已有頁面的 Business 區塊 (page: {existing_page})")
        update_business_section(existing_page, metadata, business_blocks)
    else:
        print(f"📝 建立新頁面（僅 Business 區塊）...")
        biz_blocks = build_business_only_blocks(business_blocks)
        page_id = create_diary_page(metadata, biz_blocks)
        print(f"✅ 已同步到 Notion！(page: {page_id})")


if __name__ == "__main__":
    main()
