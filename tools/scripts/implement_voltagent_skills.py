#!/usr/bin/env python3
"""
Implement validated VoltAgent skills into the local repository.

Downloads and adapts skills from GitHub repositories.
"""

import json
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Optional
from urllib.parse import urlparse, urljoin

def normalize_skill_name(name: str) -> str:
    """Normalize skill name to kebab-case."""
    if '/' in name:
        name = name.split('/')[-1]
    name = re.sub(r'[^a-z0-9-]', '-', name.lower())
    name = re.sub(r'-+', '-', name)
    return name.strip('-')

def download_file(url: str, output_path: Path) -> bool:
    """Download a file from URL."""
    try:
        # Convert blob URL to raw URL
        if '/blob/' in url:
            url = url.replace('/blob/', '/raw/')
        
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (compatible; AntigravitySkillsDownloader/1.0)')
        
        with urllib.request.urlopen(req, timeout=15) as response:
            content = response.read()
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(content)
            return True
    except Exception as e:
        print(f"    ❌ Error downloading {url}: {e}")
        return False

def find_skill_file_url(base_url: str) -> Optional[str]:
    """Find SKILL.md file URL from repository base URL."""
    # Common paths for skill files
    variations = [
        f"{base_url}/SKILL.md",
        f"{base_url}/skill.md",
        f"{base_url}/README.md",
        f"{base_url}/index.md",
        f"{base_url}/SKILL.md",
    ]
    
    # Also try raw GitHub URLs
    if '/tree/' in base_url:
        base_url = base_url.replace('/tree/', '/raw/')
    elif '/blob/' in base_url:
        base_url = base_url.replace('/blob/', '/raw/')
    
    variations.extend([
        f"{base_url}/SKILL.md",
        f"{base_url}/skill.md",
        f"{base_url}/README.md",
    ])
    
    for url in variations:
        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    return url
        except:
            continue
    
    return None

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

def ensure_frontmatter_compliance(content: str, skill_name: str, source_url: str, description: str) -> str:
    """Ensure SKILL.md has compliant frontmatter."""
    # Parse existing frontmatter
    metadata = parse_frontmatter(content)
    
    if not metadata:
        # No frontmatter, add it
        frontmatter = f"""---
name: {skill_name}
description: "{description}"
source: "{source_url}"
risk: safe
---
"""
        # Add after first line if it's a title, otherwise at the beginning
        lines = content.split('\n')
        if lines[0].startswith('#'):
            return '\n'.join([lines[0], '', frontmatter] + lines[1:])
        else:
            return frontmatter + '\n' + content
    
    # Update existing frontmatter
    metadata['name'] = skill_name
    if 'description' not in metadata or not metadata['description']:
        metadata['description'] = description
    if 'source' not in metadata:
        metadata['source'] = source_url
    if 'risk' not in metadata:
        metadata['risk'] = 'safe'
    
    # Rebuild frontmatter
    frontmatter_lines = ['---']
    for key, value in metadata.items():
        if isinstance(value, str) and (' ' in value or ':' in value):
            frontmatter_lines.append(f'{key}: "{value}"')
        else:
            frontmatter_lines.append(f'{key}: {value}')
    frontmatter_lines.append('---')
    
    # Replace frontmatter in content
    content_without_fm = re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, flags=re.DOTALL)
    return '\n'.join(frontmatter_lines) + '\n\n' + content_without_fm

def ensure_when_to_use_section(content: str, description: str) -> str:
    """Ensure 'When to Use' section exists."""
    if re.search(r'^##\s+When to Use', content, re.MULTILINE | re.IGNORECASE):
        return content  # Already has it
    
    # Add section after frontmatter
    when_to_use = f"""
## When to Use This Skill

{description}

Use this skill when you need to work with {description.lower()}.
"""
    
    # Insert after frontmatter
    content_without_fm = re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, flags=re.DOTALL)
    frontmatter_match = re.search(r'^---\s*\n.*?\n---', content, re.DOTALL)
    if frontmatter_match:
        frontmatter = frontmatter_match.group(0)
        return frontmatter + '\n' + when_to_use + '\n' + content_without_fm
    else:
        return when_to_use + '\n\n' + content

def implement_skill(skill_data: Dict, skills_dir: Path) -> tuple[bool, str]:
    """Implement a single skill."""
    skill_name = skill_data['skill']['normalized_name']
    skill_url = skill_data['skill_file_url'] or skill_data['skill']['url']
    description = skill_data['skill']['description']
    source_url = skill_data['skill']['url']
    
    skill_dir = skills_dir / skill_name
    
    # Check if already exists
    if skill_dir.exists():
        return False, f"Skill directory already exists: {skill_name}"
    
    print(f"  📦 Implementing {skill_name}...")
    
    # Create directory
    skill_dir.mkdir(parents=True, exist_ok=True)
    
    # Download SKILL.md
    skill_file_url = find_skill_file_url(skill_url)
    if not skill_file_url:
        # Try to construct from base URL
        if '/tree/' in skill_url:
            base_path = skill_url.split('/tree/')[1]
            repo_base = skill_url.split('/tree/')[0]
            skill_file_url = f"{repo_base}/raw/{base_path}/SKILL.md"
        else:
            skill_file_url = skill_url.rstrip('/') + '/SKILL.md'
    
    skill_md_path = skill_dir / "SKILL.md"
    
    if download_file(skill_file_url, skill_md_path):
        # Read and fix content
        content = skill_md_path.read_text(encoding='utf-8')
        
        # Ensure compliance
        content = ensure_frontmatter_compliance(content, skill_name, source_url, description)
        content = ensure_when_to_use_section(content, description)
        
        skill_md_path.write_text(content, encoding='utf-8')
        print(f"    ✅ SKILL.md created")
    else:
        # Create minimal SKILL.md
        minimal_skill = f"""---
name: {skill_name}
description: "{description}"
source: "{source_url}"
risk: safe
---

# {skill_name.replace('-', ' ').title()}

## Overview

{description}

## When to Use This Skill

Use this skill when you need to work with {description.lower()}.

## Instructions

This skill provides guidance and patterns for {description.lower()}.

For more information, see the [source repository]({source_url}).
"""
        skill_md_path.write_text(minimal_skill, encoding='utf-8')
        print(f"    ⚠️  Created minimal SKILL.md (source file not found)")
    
    return True, f"Successfully implemented {skill_name}"

def main():
    base_dir = Path(__file__).parent.parent
    validation_file = base_dir / "voltagent_validation.json"
    skills_dir = base_dir / "skills"
    
    if not validation_file.exists():
        print(f"❌ Validation file not found: {validation_file}")
        print("   Run validate_voltagent_sources.py first")
        sys.exit(1)
    
    with open(validation_file, 'r', encoding='utf-8') as f:
        validation = json.load(f)
    
    validated_skills = validation.get('validated', [])
    
    if not validated_skills:
        print("❌ No validated skills to implement")
        sys.exit(1)
    
    print(f"🚀 Implementing {len(validated_skills)} validated skills...")
    print()
    
    implemented = []
    failed = []
    
    for i, skill_data in enumerate(validated_skills, 1):
        skill_name = skill_data['skill']['normalized_name']
        print(f"[{i}/{len(validated_skills)}] {skill_name}")
        
        success, message = implement_skill(skill_data, skills_dir)
        
        if success:
            implemented.append(skill_name)
            print(f"  ✅ {message}")
        else:
            failed.append({'name': skill_name, 'error': message})
            print(f"  ❌ {message}")
        
        print()
    
    print("=" * 60)
    print("📊 Implementation Summary:")
    print(f"   ✅ Implemented: {len(implemented)}")
    print(f"   ❌ Failed: {len(failed)}")
    
    if implemented:
        print(f"\n✅ Successfully implemented skills:")
        for name in implemented:
            print(f"   • {name}")
    
    if failed:
        print(f"\n❌ Failed implementations:")
        for item in failed:
            print(f"   • {item['name']}: {item['error']}")

if __name__ == "__main__":
    main()
