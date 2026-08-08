#!/usr/bin/env python3
"""
Manage skill date_added metadata.

Usage:
  python manage_skill_dates.py list                    # List all skills with their dates
  python manage_skill_dates.py add-missing [--date YYYY-MM-DD]  # Add dates to skills without them
  python manage_skill_dates.py add-all [--date YYYY-MM-DD]      # Add/update dates for all skills
  python manage_skill_dates.py update <skill-id> YYYY-MM-DD     # Update a specific skill's date
"""

import os
import re
import sys
import argparse
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
import yaml
from _project_paths import find_repo_root

# Ensure UTF-8 output for Windows compatibility
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def get_project_root():
    """Get the project root directory."""
    return str(find_repo_root(__file__))

def parse_frontmatter(content):
    """Parse frontmatter from SKILL.md content using PyYAML."""
    fm_match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not fm_match:
        return None, content
    
    fm_text = fm_match.group(1)
    try:
        metadata = yaml.safe_load(fm_text) or {}
        return metadata, content
    except yaml.YAMLError as e:
        print(f"⚠️ YAML parsing error: {e}")
        return None, content

def reconstruct_frontmatter(metadata):
    """Reconstruct frontmatter from metadata dict using PyYAML."""
    # Ensure important keys are at the top if they exist
    ordered = {}
    priority_keys = ['id', 'name', 'description', 'category', 'risk', 'source', 'tags', 'date_added']
    
    for key in priority_keys:
        if key in metadata:
            ordered[key] = metadata[key]
    
    # Add any remaining keys
    for key, value in metadata.items():
        if key not in ordered:
            ordered[key] = value
            
    fm_text = yaml.dump(ordered, sort_keys=False, allow_unicode=True, width=1000).strip()
    return f"---\n{fm_text}\n---"

def update_skill_frontmatter(skill_path, metadata):
    """Update a skill's frontmatter with new metadata."""
    try:
        with safe_user_path(skill_path).open('r', encoding='utf-8') as f:
            content = f.read()
        
        old_metadata, body_content = parse_frontmatter(content)
        if old_metadata is None:
            print(f"❌ {skill_path}: Could not parse frontmatter")
            return False
        
        # Merge metadata
        old_metadata.update(metadata)
        
        # Reconstruct content
        new_frontmatter = reconstruct_frontmatter(old_metadata)
        
        # Find where the frontmatter ends in the original content
        fm_end = content.find('---', 3)  # Skip first ---
        if fm_end == -1:
            print(f"❌ {skill_path}: Could not locate frontmatter boundary")
            return False
        
        body_start = fm_end + 3
        body = content[body_start:]
        
        new_content = new_frontmatter + body
        
        with safe_user_path(skill_path).open('w', encoding='utf-8') as f:
            f.write(new_content)
        
        return True
    except Exception as e:
        print(f"❌ Error updating {skill_path}: {str(e)}")
        return False

def list_skills():
    """List all skills with their date_added values."""
    skills_dir = os.path.join(get_project_root(), 'skills')
    skills_with_dates = []
    skills_without_dates = []
    
    for root, dirs, files in os.walk(skills_dir):
        # Skip hidden/disabled directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        if "SKILL.md" in files:
            skill_name = os.path.basename(root)
            skill_path = os.path.join(root, "SKILL.md")
            
            try:
                with safe_user_path(skill_path).open('r', encoding='utf-8') as f:
                    content = f.read()
                
                metadata, _ = parse_frontmatter(content)
                if metadata is None:
                    continue
                
                date_added = metadata.get('date_added', 'N/A')
                
                if date_added == 'N/A':
                    skills_without_dates.append(skill_name)
                else:
                    skills_with_dates.append((skill_name, date_added))
            except Exception as e:
                print(f"⚠️  Error reading {skill_path}: {str(e)}", file=sys.stderr)
    
    # Sort by date
    skills_with_dates.sort(key=lambda x: x[1], reverse=True)
    
    print(f"\n📅 Skills with Date Added ({len(skills_with_dates)}):")
    print("=" * 60)
    
    if skills_with_dates:
        for skill_name, date in skills_with_dates:
            print(f"  {date}  │  {skill_name}")
    else:
        print("  (none)")
    
    print(f"\n⏳ Skills without Date Added ({len(skills_without_dates)}):")
    print("=" * 60)
    
    if skills_without_dates:
        for skill_name in sorted(skills_without_dates):
            print(f"  {skill_name}")
    else:
        print("  (none)")
    
    total = len(skills_with_dates) + len(skills_without_dates)
    percentage = (len(skills_with_dates) / total * 100) if total > 0 else 0
    print(f"\n📊 Coverage: {len(skills_with_dates)}/{total} ({percentage:.1f}%)")

def add_missing_dates(date_str=None):
    """Add date_added to skills that don't have it."""
    if date_str is None:
        date_str = datetime.now().strftime('%Y-%m-%d')
    
    # Validate date format
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        print(f"❌ Invalid date format: {date_str}. Use YYYY-MM-DD.")
        return False
    
    skills_dir = os.path.join(get_project_root(), 'skills')
    updated_count = 0
    skipped_count = 0
    
    for root, dirs, files in os.walk(skills_dir):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        if "SKILL.md" in files:
            skill_name = os.path.basename(root)
            skill_path = os.path.join(root, "SKILL.md")
            
            try:
                with safe_user_path(skill_path).open('r', encoding='utf-8') as f:
                    content = f.read()
                
                metadata, _ = parse_frontmatter(content)
                if metadata is None:
                    print(f"⚠️  {skill_name}: Could not parse frontmatter, skipping")
                    continue
                
                if 'date_added' not in metadata:
                    if update_skill_frontmatter(skill_path, {'date_added': date_str}):
                        print(f"✅ {skill_name}: Added date_added: {date_str}")
                        updated_count += 1
                    else:
                        print(f"❌ {skill_name}: Failed to update")
                else:
                    skipped_count += 1
            except Exception as e:
                print(f"❌ Error processing {skill_name}: {str(e)}")
    
    print(f"\n✨ Updated {updated_count} skills, skipped {skipped_count} that already had dates")
    return True

def add_all_dates(date_str=None):
    """Add/update date_added for all skills."""
    if date_str is None:
        date_str = datetime.now().strftime('%Y-%m-%d')
    
    # Validate date format
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        print(f"❌ Invalid date format: {date_str}. Use YYYY-MM-DD.")
        return False
    
    skills_dir = os.path.join(get_project_root(), 'skills')
    updated_count = 0
    
    for root, dirs, files in os.walk(skills_dir):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        if "SKILL.md" in files:
            skill_name = os.path.basename(root)
            skill_path = os.path.join(root, "SKILL.md")
            
            try:
                if update_skill_frontmatter(skill_path, {'date_added': date_str}):
                    print(f"✅ {skill_name}: Set date_added: {date_str}")
                    updated_count += 1
                else:
                    print(f"❌ {skill_name}: Failed to update")
            except Exception as e:
                print(f"❌ Error processing {skill_name}: {str(e)}")
    
    print(f"\n✨ Updated {updated_count} skills")
    return True

def update_skill_date(skill_name, date_str):
    """Update a specific skill's date_added."""
    # Validate date format
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        print(f"❌ Invalid date format: {date_str}. Use YYYY-MM-DD.")
        return False
    
    skills_dir = os.path.join(get_project_root(), 'skills')
    skill_path = os.path.join(skills_dir, skill_name, 'SKILL.md')
    
    if not os.path.exists(skill_path):
        print(f"❌ Skill not found: {skill_name}")
        return False
    
    if update_skill_frontmatter(skill_path, {'date_added': date_str}):
        print(f"✅ {skill_name}: Updated date_added to {date_str}")
        return True
    else:
        print(f"❌ {skill_name}: Failed to update")
        return False

def main():
    parser = argparse.ArgumentParser(
        description="Manage skill date_added metadata",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python manage_skill_dates.py list
  python manage_skill_dates.py add-missing
  python manage_skill_dates.py add-missing --date 2024-01-15
  python manage_skill_dates.py add-all --date 2025-01-01
  python manage_skill_dates.py update my-skill-name 2024-06-01
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # list command
    subparsers.add_parser('list', help='List all skills with their date_added values')
    
    # add-missing command
    add_missing_parser = subparsers.add_parser('add-missing', help='Add date_added to skills without it')
    add_missing_parser.add_argument('--date', help='Date to use (YYYY-MM-DD), defaults to today')
    
    # add-all command
    add_all_parser = subparsers.add_parser('add-all', help='Add/update date_added for all skills')
    add_all_parser.add_argument('--date', help='Date to use (YYYY-MM-DD), defaults to today')
    
    # update command
    update_parser = subparsers.add_parser('update', help='Update a specific skill date')
    update_parser.add_argument('skill_name', help='Name of the skill')
    update_parser.add_argument('date', help='Date to set (YYYY-MM-DD)')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == 'list':
        list_skills()
    elif args.command == 'add-missing':
        add_missing_dates(args.date)
    elif args.command == 'add-all':
        add_all_dates(args.date)
    elif args.command == 'update':
        update_skill_date(args.skill_name, args.date)

if __name__ == '__main__':
    main()
