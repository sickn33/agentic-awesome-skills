#!/usr/bin/env python3
"""
Convert skills with HTML content to clean markdown.

Attempts to download raw markdown files from GitHub, extracts content from HTML if needed,
or creates minimal markdown content as fallback.
"""

import json
import re
import sys
import urllib.request
import urllib.error
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse, urljoin


class MarkdownHTMLParser(HTMLParser):
    """Convert a constrained subset of HTML into markdown without regex tag stripping."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []
        self._ignored_tag: Optional[str] = None
        self._ignored_depth = 0
        self._current_link: Optional[str] = None
        self._list_depth = 0
        self._in_pre = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if self._ignored_tag:
            if tag == self._ignored_tag:
                self._ignored_depth += 1
            return

        if tag in {"script", "style"}:
            self._ignored_tag = tag
            self._ignored_depth = 1
            return

        attrs_dict = dict(attrs)

        if tag in {"article", "main", "div", "section"}:
            self._append("\n")
        elif tag == "br":
            self._append("\n")
        elif tag == "p":
            self._append("\n\n")
        elif tag in {"h1", "h2", "h3"}:
            prefix = {"h1": "# ", "h2": "## ", "h3": "### "}[tag]
            self._append(f"\n\n{prefix}")
        elif tag in {"ul", "ol"}:
            self._list_depth += 1
            self._append("\n")
        elif tag == "li":
            indent = "  " * max(0, self._list_depth - 1)
            self._append(f"\n{indent}- ")
        elif tag == "a":
            self._current_link = attrs_dict.get("href")
            self._append("[")
        elif tag == "pre":
            self._in_pre = True
            self._append("\n\n```\n")
        elif tag == "code" and not self._in_pre:
            self._append("`")

    def handle_endtag(self, tag: str) -> None:
        if self._ignored_tag:
            if tag == self._ignored_tag:
                self._ignored_depth -= 1
                if self._ignored_depth == 0:
                    self._ignored_tag = None
            return

        if tag in {"h1", "h2", "h3", "p"}:
            self._append("\n")
        elif tag in {"ul", "ol"}:
            self._list_depth = max(0, self._list_depth - 1)
            self._append("\n")
        elif tag == "a":
            href = self._current_link or ""
            self._append(f"]({href})")
            self._current_link = None
        elif tag == "pre":
            self._in_pre = False
            self._append("\n```\n")
        elif tag == "code" and not self._in_pre:
            self._append("`")

    def handle_data(self, data: str) -> None:
        if self._ignored_tag or not data:
            return
        self._append(unescape(data))

    def get_markdown(self) -> str:
        markdown = "".join(self._parts)
        markdown = re.sub(r"\n{3,}", "\n\n", markdown)
        return markdown.strip()

    def _append(self, text: str) -> None:
        if text:
            self._parts.append(text)

def parse_frontmatter(content: str) -> Optional[Dict]:
    """Parse YAML frontmatter."""
    fm_match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not fm_match:
        return None
    
    fm_text = fm_match.group(1)
    metadata = {}
    for line in fm_text.split('\n'):
        if ':' in line:
            key, val = line.split(':', 1)
            metadata[key.strip()] = val.strip().strip('"').strip("'")
    return metadata

def has_html_content(content: str) -> bool:
    """Check if content contains HTML document structure."""
    html_patterns = [
        r'<!DOCTYPE\s+html',
        r'<html\s',
        r'github\.githubassets\.com',
        r'github-cloud\.s3\.amazonaws\.com'
    ]
    
    # Check outside code blocks
    lines = content.split('\n')
    in_code_block = False
    html_count = 0
    
    for line in lines:
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            continue
        if not in_code_block:
            for pattern in html_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    html_count += 1
                    break
    
    return html_count > 5

def build_raw_github_url(source_url: str) -> Optional[str]:
    """Convert GitHub tree/blob URL to raw URL."""
    if not source_url or 'github.com' not in source_url:
        return None
    
    # Handle tree URLs: https://github.com/org/repo/tree/main/path
    if '/tree/' in source_url:
        parts = source_url.split('/tree/')
        if len(parts) == 2:
            base = parts[0]
            path = parts[1]
            return f"{base}/raw/{path}/SKILL.md"
    
    # Handle blob URLs: https://github.com/org/repo/blob/main/path/SKILL.md
    if '/blob/' in source_url:
        return source_url.replace('/blob/', '/raw/')
    
    # Handle directory URLs - try common paths
    if source_url.endswith('/'):
        source_url = source_url.rstrip('/')
    
    # Try adding SKILL.md
    variations = [
        f"{source_url}/SKILL.md",
        f"{source_url}/raw/main/SKILL.md",
        f"{source_url}/raw/master/SKILL.md"
    ]
    
    return variations[0] if variations else None

def download_raw_markdown(url: str) -> Tuple[bool, Optional[str]]:
    """Attempt to download raw markdown file."""
    try:
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (compatible; AntigravitySkillsConverter/1.0)')
        
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status == 200:
                content = response.read().decode('utf-8')
                # Validate it's markdown (not HTML)
                if not has_html_content(content):
                    return True, content
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False, None
    except Exception:
        pass
    
    return False, None

def extract_markdown_from_html(html_content: str) -> Optional[str]:
    """Extract markdown content from GitHub HTML page."""
    # Try to find markdown content in common GitHub page structures
    patterns = [
        r'<article[^>]*>(.*?)</article>',
        r'<main[^>]*>(.*?)</main>',
        r'<div[^>]*class="[^"]*markdown[^"]*"[^>]*>(.*?)</div>',
        r'<div[^>]*class="[^"]*readme[^"]*"[^>]*>(.*?)</div>',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, html_content, re.DOTALL | re.IGNORECASE)
        if match:
            content = match.group(1)
            # Basic HTML to markdown conversion
            markdown = convert_html_to_markdown(content)
            if markdown and len(markdown.strip()) > 100:
                return markdown
    
    return None

def convert_html_to_markdown(html: str) -> str:
    """Basic HTML to markdown conversion."""
    parser = MarkdownHTMLParser()
    parser.feed(html)
    parser.close()
    return parser.get_markdown()

def create_minimal_markdown(metadata: Dict, source_url: str) -> str:
    """Create minimal markdown content from metadata."""
    name = metadata.get('name', 'skill')
    description = metadata.get('description', '')
    
    # Extract "When to Use" if it exists in current content
    when_to_use = f"Use this skill when you need to {description.lower()}."
    
    # Create title from name
    title = name.replace('-', ' ').title()
    
    markdown = f"""# {title}

## Overview

{description}

## When to Use This Skill

{when_to_use}

## Instructions

This skill provides guidance and patterns for {description.lower()}.

## Resources

For more information, see the [source repository]({source_url}).
"""
    return markdown

def convert_skill(skill_path: Path) -> Dict:
    """Convert a single skill from HTML to markdown."""
    skill_name = skill_path.parent.name
    result = {
        'skill': skill_name,
        'method': None,
        'success': False,
        'error': None
    }
    
    try:
        content = skill_path.read_text(encoding='utf-8')
    except Exception as e:
        result['error'] = f"Failed to read file: {e}"
        return result
    
    # Parse frontmatter
    metadata = parse_frontmatter(content)
    if not metadata:
        result['error'] = "No frontmatter found"
        return result
    
    source_url = metadata.get('source', '')
    
    # Extract frontmatter and "When to Use" section
    frontmatter_match = re.search(r'^(---\s*\n.*?\n---)', content, re.DOTALL)
    frontmatter = frontmatter_match.group(1) if frontmatter_match else ''
    
    when_to_use_match = re.search(r'##\s+When to Use.*?\n(.*?)(?=\n<!DOCTYPE|\n##|\Z)', content, re.DOTALL | re.IGNORECASE)
    when_to_use_content = when_to_use_match.group(1).strip() if when_to_use_match else None
    
    # Try method 1: Download raw markdown
    raw_url = build_raw_github_url(source_url)
    if raw_url:
        success, raw_content = download_raw_markdown(raw_url)
        if success and raw_content:
            # Preserve frontmatter from original
            raw_metadata = parse_frontmatter(raw_content)
            if raw_metadata:
                # Merge metadata (keep original source)
                raw_metadata['source'] = source_url
                raw_metadata['risk'] = metadata.get('risk', 'safe')
                
                # Rebuild frontmatter
                new_frontmatter = '---\n'
                for key, value in raw_metadata.items():
                    if isinstance(value, str) and (' ' in value or ':' in value):
                        new_frontmatter += f'{key}: "{value}"\n'
                    else:
                        new_frontmatter += f'{key}: {value}\n'
                new_frontmatter += '---\n'
                
                # Remove frontmatter from raw content
                raw_content_no_fm = re.sub(r'^---\s*\n.*?\n---\s*\n', '', raw_content, flags=re.DOTALL)
                
                new_content = new_frontmatter + '\n' + raw_content_no_fm
                
                skill_path.write_text(new_content, encoding='utf-8')
                result['method'] = 'raw_download'
                result['success'] = True
                return result
    
    # Try method 2: Extract from HTML
    if has_html_content(content):
        markdown_content = extract_markdown_from_html(content)
        if markdown_content and len(markdown_content.strip()) > 100:
            # Rebuild with frontmatter
            new_content = frontmatter + '\n\n' + markdown_content
            skill_path.write_text(new_content, encoding='utf-8')
            result['method'] = 'html_extraction'
            result['success'] = True
            return result
    
    # Method 3: Create minimal content
    minimal_content = create_minimal_markdown(metadata, source_url)
    new_content = frontmatter + '\n\n' + minimal_content
    skill_path.write_text(new_content, encoding='utf-8')
    result['method'] = 'minimal_creation'
    result['success'] = True
    
    return result

def main():
    base_dir = Path(__file__).parent.parent
    skills_dir = base_dir / "skills"
    
    # Find skills with HTML content
    print("🔍 Identifying skills with HTML content...")
    
    skills_with_html = []
    for skill_dir in skills_dir.iterdir():
        if not skill_dir.is_dir() or skill_dir.name.startswith('.'):
            continue
        
        skill_file = skill_dir / 'SKILL.md'
        if not skill_file.exists():
            continue
        
        try:
            content = skill_file.read_text(encoding='utf-8')
            if has_html_content(content):
                skills_with_html.append(skill_file)
        except Exception:
            continue
    
    print(f"✅ Found {len(skills_with_html)} skills with HTML content\n")
    
    if not skills_with_html:
        print("No skills with HTML content found.")
        return
    
    # Create backup directory
    backup_dir = base_dir / "skills_backup_html"
    backup_dir.mkdir(exist_ok=True)
    
    print(f"📦 Creating backups in: {backup_dir}")
    for skill_file in skills_with_html:
        backup_path = backup_dir / skill_file.parent.name / 'SKILL.md'
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        backup_path.write_bytes(skill_file.read_bytes())
    print("✅ Backups created\n")
    
    # Convert each skill
    print(f"🔄 Converting {len(skills_with_html)} skills...\n")
    
    results = []
    for i, skill_file in enumerate(skills_with_html, 1):
        skill_name = skill_file.parent.name
        print(f"[{i}/{len(skills_with_html)}] {skill_name}")
        
        result = convert_skill(skill_file)
        results.append(result)
        
        if result['success']:
            print(f"  ✅ Converted using method: {result['method']}")
        else:
            print(f"  ❌ Failed: {result.get('error', 'Unknown error')}")
        print()
    
    # Summary
    print("=" * 60)
    print("📊 Conversion Summary:")
    print(f"   Total skills: {len(skills_with_html)}")
    print(f"   ✅ Successful: {sum(1 for r in results if r['success'])}")
    print(f"   ❌ Failed: {sum(1 for r in results if not r['success'])}")
    
    methods = {}
    for r in results:
        if r['success']:
            method = r['method']
            methods[method] = methods.get(method, 0) + 1
    
    print(f"\n   Methods used:")
    for method, count in methods.items():
        print(f"     • {method}: {count}")
    
    # Save report
    report = {
        'total_skills': len(skills_with_html),
        'successful': sum(1 for r in results if r['success']),
        'failed': sum(1 for r in results if not r['success']),
        'results': results,
        'backup_location': str(backup_dir)
    }
    
    report_file = base_dir / "html_conversion_results.json"
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Report saved to: {report_file}")
    print(f"📦 Backups saved to: {backup_dir}")

if __name__ == "__main__":
    main()
