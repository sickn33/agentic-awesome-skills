"""user-thoughts sortin — 将 raw 文件处理到 mdbase。

处理流程:
- 读取未处理的 raw 文件
- 提取条目及目标维度（从 `| 待归入:dim` 后缀）
- 按日期分组追加到 mdbase 维度文件
- 标记 raw 文件为已处理
- 更新 LAST_SORTIN 和 README.ai.md 索引

用法:
    python sortin.py [--dry] [--help]
"""
import sys
import re
from datetime import datetime
from pathlib import Path

from common import find_ustht, read_define_ini, write_define_ini, is_processed, validate_dim_name

HELP = """用法: python sortin.py [--dry] [--help]

执行软维护：将 #raw/ 中未处理的条目按维度追加到 mdbase。

选项:
  --dry   预览模式，显示将要执行的操作但不实际写入
  --help  显示此帮助信息

处理流程:
  1. 扫描 #raw/*.md 中未处理的文件
  2. 解析条目（提取时间和维度后缀 | 待归入:dim）
  3. 按维度分组，追加到 mdbase/details/<dim>.md
  4. 在已处理 raw 文件头部插入 <!-- processed --> 标记
  5. 更新 define.ini 的 LAST_SORTIN 时间戳
  6. 更新 mdbase/README.ai.md 索引"""


def parse_entries(filepath: Path) -> list[dict]:
    """解析 raw 文件中的条目。返回 [{time, text, dimension, date}]。"""
    entries = []
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", filepath.stem)
    file_date = date_match.group(1) if date_match else datetime.now().strftime("%Y-%m-%d")

    for line in filepath.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line.startswith("- ["):
            continue

        # 解析: - [HH:MM] text | 待归入:dimension
        m = re.match(r"^- \[(\d{2}:\d{2})\]\s*(.+)$", line)
        if not m:
            continue

        time_str = m.group(1)
        content = m.group(2)

        # 提取维度后缀
        dim = "general"
        if " | 待归入:" in content:
            parts = content.rsplit(" | 待归入:", 1)
            content = parts[0].strip()
            dim = parts[1].strip()
            if not validate_dim_name(dim):
                dim = "general"  # 安全回退

        entries.append({
            "time": time_str,
            "text": content,
            "dimension": dim,
            "date": file_date,
        })

    return entries


def get_dim_file(mdbase: Path, dim: str) -> Path:
    """获取维度文件路径，支持子目录维度（如 ui/outline）。"""
    details = mdbase / "details"
    parts = dim.split("/")
    if len(parts) > 1:
        target = details / "/".join(parts[:-1]) / f"{parts[-1]}.md"
    else:
        target = details / f"{dim}.md"
    return target


def append_to_dim(dim_file: Path, entries: list[dict]):
    """按日期分组追加条目到维度文件。

    若文件已有 `## date` 标题，在该日期块末尾插入新条目。
    若无该日期标题，在文件末尾追加新日期段落。
    """
    # 按日期分组
    by_date: dict[str, list[str]] = {}
    for e in entries:
        date = e["date"]
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(f"- {e['text']}")

    if not dim_file.exists():
        # 创建新文件
        dim_name = dim_file.stem
        lines = [f"# {dim_name}", ""]
        for date in sorted(by_date.keys()):
            lines.append(f"## {date}")
            lines.extend(by_date[date])
            lines.append("")
        dim_file.parent.mkdir(parents=True, exist_ok=True)
        dim_file.write_text("\n".join(lines), encoding="utf-8")
        return

    # 文件已存在 — 插入到已有内容中
    existing = dim_file.read_text(encoding="utf-8")
    lines = existing.splitlines()

    for date in sorted(by_date.keys()):
        heading = f"## {date}"
        new_entries = by_date[date]

        # 查找已有日期标题
        heading_idx = None
        for i, line in enumerate(lines):
            if line.strip() == heading:
                heading_idx = i
                break

        if heading_idx is not None:
            # 找到该日期块末尾（下一个 ## 标题或 EOF）
            insert_idx = heading_idx + 1
            while insert_idx < len(lines):
                if lines[insert_idx].startswith("## "):
                    break
                insert_idx += 1
            # 在下一个标题前插入新条目
            for j, entry in enumerate(new_entries):
                lines.insert(insert_idx + j, entry)
            # 确保插入块与下一个标题之间有空行
            final_idx = insert_idx + len(new_entries)
            if final_idx < len(lines) and lines[final_idx].startswith("## "):
                lines.insert(final_idx, "")
        else:
            # 未找到标题 — 追加到末尾
            if lines and lines[-1].strip():
                lines.append("")
            lines.append(heading)
            lines.extend(new_entries)
            lines.append("")

    dim_file.write_text("\n".join(lines) + "\n", encoding="utf-8")


def mark_processed(raw_file: Path):
    """在 raw 文件头部插入 <!-- processed --> 标记（幂等）。"""
    content = raw_file.read_text(encoding="utf-8")
    if not content.startswith("<!-- processed -->"):
        raw_file.write_text(f"<!-- processed -->\n{content}", encoding="utf-8")


def update_index(mdbase: Path):
    """更新 README.ai.md 索引，保留模板结构。"""
    readme = mdbase / "README.ai.md"
    details = mdbase / "details"

    dims = []
    if details.exists():
        for f in sorted(details.rglob("*.md")):
            rel = f.relative_to(details)
            dim = str(rel.with_suffix("")).replace("\\", "/")
            content = f.read_text(encoding="utf-8")
            count = sum(1 for l in content.splitlines() if l.strip().startswith("- "))
            dims.append((dim, count))

    # 构建维度表格行
    table_rows = []
    for dim, count in dims:
        table_rows.append(f"| [details/{dim}.md](details/{dim}.md) | {dim} | {count} 条 |")

    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    # 读取已有内容以保留头部
    if readme.exists():
        existing = readme.read_text(encoding="utf-8")
        marker = "## 文档目录"
        if marker in existing:
            before = existing[:existing.index(marker)]
            rest = existing[existing.index(marker):]
            lines_after_marker = rest.splitlines()

            # 查找表格结束位置：跳过标题行和表头分隔线，然后找到表格体结束
            table_end = len(lines_after_marker)
            past_header = False
            for i, line in enumerate(lines_after_marker):
                stripped = line.strip()
                # 跳过 section 标题、最后更新行、空行、表头行、分隔线
                if i <= 2 or stripped.startswith("| 文件") or stripped.startswith("|------"):
                    continue
                # 第一个非表格行即为表格结束
                if stripped.startswith("|"):
                    past_header = True
                    continue
                if past_header:
                    table_end = i
                    break

            after = "\n".join(lines_after_marker[table_end:])
            new_section = f"{marker}\n\n最后更新：{now}\n\n| 文件 | 维度 | 条目数 |\n|------|------|--------|\n"
            for row in table_rows:
                new_section += row + "\n"
            new_section += "\n" + after
            readme.write_text(before + new_section, encoding="utf-8")
            return

    # 回退：从头创建（含维护规则）
    lines = [
        "# user-thoughts — 设计决策文档索引",
        "",
        "> 本目录记录当前项目中用户提出的全部设计细节与架构决策。按维度拆分为独立文档，便于检索和维护。",
        "",
        "---",
        "",
        "## 维护规则",
        "",
        "- **不得丢失用户表述的细节**：每条用户决策必须完整保留原始意图和约束条件，不得简化或省略",
        "- **实时跟进**：用户发言中的新设计决策、需求、细节须实时同步到对应文档",
        "- **按维度归类**：新内容根据主题归入已有文档，必要时新建维度文档",
        "- **触发条件**：任何新决策或需求变更均需更新本文档",
        "",
        "---",
        "",
        f"最后更新：{now}",
        "",
        "## 文档目录",
        "",
        "| 文件 | 维度 | 条目数 |",
        "|------|------|--------|",
    ]
    for row in table_rows:
        lines.append(row)
    lines.append("")
    readme.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("错误：未找到 .ustht/ 目录。请先执行 /ustht init 初始化。")
        sys.exit(1)

    cfg = read_define_ini(ustht)
    if cfg.get("SKILL_STATUS") == "off":
        print("SKILL 已关闭，操作已忽略。使用 /ustht skill on 开启。")
        sys.exit(0)

    dry_run = "--dry" in sys.argv

    raw_dir = ustht / "raw"
    mdbase = ustht / "mdbase"

    if not raw_dir.exists():
        print("无未处理记录。")
        sys.exit(0)

    # 查找未处理文件
    files = sorted(raw_dir.glob("*.md"))
    unprocessed = [f for f in files if not is_processed(f)]

    if not unprocessed:
        print("无未处理记录。所有 raw 文件已标记为 processed。")
        sys.exit(0)

    # 解析所有条目
    all_entries = []
    for f in unprocessed:
        all_entries.extend(parse_entries(f))

    if not all_entries:
        print("raw 文件中未找到有效条目。")
        sys.exit(0)

    # 按维度分组
    by_dim: dict[str, list[dict]] = {}
    for e in all_entries:
        dim = e["dimension"]
        if dim not in by_dim:
            by_dim[dim] = []
        by_dim[dim].append(e)

    # 摘要
    if dry_run:
        print("预览模式：")
    else:
        print(f"已执行软维护，处理 {len(all_entries)} 条想法：")

    for dim, entries in sorted(by_dim.items()):
        dim_file = get_dim_file(mdbase, dim)
        exists = dim_file.exists()
        label = f"{dim}.md" if exists else f"{dim}.md [新建维度]"
        previews = []
        for e in entries[:3]:
            text = e["text"]
            preview = text[:20] + "…" if len(text) > 20 else text
            previews.append(preview)
        suffix = f"（{'；'.join(previews)}）" if previews else ""
        print(f"  → {label}: +{len(entries)}{suffix}")

    if dry_run:
        print(f"  共 {len(all_entries)} 条，不实际写入。")
        return

    # 执行：写入维度文件
    for dim, entries in by_dim.items():
        dim_file = get_dim_file(mdbase, dim)
        append_to_dim(dim_file, entries)

    # 标记 raw 文件为已处理
    for f in unprocessed:
        mark_processed(f)

    # 更新 LAST_SORTIN
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    cfg["LAST_SORTIN"] = now
    write_define_ini(ustht, cfg)

    # 更新索引
    update_index(mdbase)

    print(f"  LAST_SORTIN 已更新为 {now}")


if __name__ == "__main__":
    main()
