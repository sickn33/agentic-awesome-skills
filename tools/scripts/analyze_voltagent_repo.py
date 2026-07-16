#!/usr/bin/env python3
"""
Analyze VoltAgent/awesome-agent-skills repository to extract and normalize skills.

Usage:
    python3 scripts/analyze_voltagent_repo.py [--output OUTPUT.json]
"""

import re
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path
from typing import List, Dict, Optional
from urllib.parse import urlparse

# VoltAgent repo README URL
VOLTAGENT_README_URL = "https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md"

def normalize_skill_name(name: str) -> str:
    """Normalize skill name to kebab-case."""
    # Remove organization prefix if present (e.g., "anthropics/docx" -> "docx")
    if '/' in name:
        name = name.split('/')[-1]
    
    # Convert to lowercase and replace spaces/special chars with hyphens
    name = re.sub(r'[^a-z0-9-]', '-', name.lower())
    # Remove multiple consecutive hyphens
    name = re.sub(r'-+', '-', name)
    # Remove leading/trailing hyphens
    name = name.strip('-')
    return name

def extract_skills_from_markdown(content: str) -> List[Dict[str, str]]:
    """Extract skills from VoltAgent README markdown."""
    skills = []
    
    # Pattern to match: **org/skill-name** or **skill-name** followed by URL
    # Format: - **[org/skill-name](url)** - Description
    pattern = r'\*\*\[([^\]]+)\]\(([^\)]+)\)\*\*'
    
    lines = content.split('\n')
    current_category = None
    
    for i, line in enumerate(lines):
        # Track category sections
        if line.startswith('## '):
            current_category = line.replace('## ', '').strip()
        
        # Match skill entries
        matches = re.findall(pattern, line)
        for skill_ref, url in matches:
            # Extract description (text after the link)
            description = line.split(')**', 1)[-1].strip()
            if description.startswith('- '):
                description = description[2:].strip()
            
            # Normalize skill name
            normalized_name = normalize_skill_name(skill_ref)
            
            # Extract org if present
            org = None
            if '/' in skill_ref:
                org, skill_part = skill_ref.split('/', 1)
            else:
                skill_part = skill_ref
            
            skill_info = {
                'original_ref': skill_ref,
                'normalized_name': normalized_name,
                'org': org,
                'skill_part': skill_part,
                'url': url,
                'description': description,
                'category': current_category or 'uncategorized',
                'line_number': i + 1
            }
            skills.append(skill_info)
    
    return skills

def load_existing_skills(catalog_path: str) -> Dict[str, Dict]:
    """Load existing skills from catalog.json."""
    try:
        with open(catalog_path, 'r', encoding='utf-8') as f:
            catalog = json.load(f)
        
        existing = {}
        for skill in catalog.get('skills', []):
            name = skill.get('name', '').lower()
            normalized = normalize_skill_name(name)
            existing[normalized] = skill
        
        return existing
    except FileNotFoundError:
        print(f"⚠️  Catalog file not found: {catalog_path}")
        return {}
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing catalog.json: {e}")
        return {}

def fetch_readme(url: str) -> Optional[str]:
    """Fetch README content from URL."""
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.read().decode('utf-8')
    except urllib.error.URLError as e:
        print(f"❌ Error fetching README: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None

def find_similar_skills(new_name: str, existing: Dict[str, Dict], threshold: float = 0.8) -> List[str]:
    """Find similar skill names using simple string similarity."""
    similar = []
    new_lower = new_name.lower()
    
    for existing_name, skill_data in existing.items():
        existing_lower = existing_name.lower()
        
        # Simple similarity check
        if new_lower in existing_lower or existing_lower in new_lower:
            similar.append(existing_name)
        elif abs(len(new_lower) - len(existing_lower)) <= 2:
            # Check character overlap
            common_chars = set(new_lower) & set(existing_lower)
            if len(common_chars) / max(len(set(new_lower)), len(set(existing_lower))) >= threshold:
                similar.append(existing_name)
    
    return similar

def main():
    base_dir = Path(__file__).parent.parent
    catalog_path = base_dir / "data" / "catalog.json"
    output_path = base_dir / "voltagent_analysis.json"
    
    print("🔍 Analyzing VoltAgent/awesome-agent-skills repository...")
    print(f"📖 Fetching README from: {VOLTAGENT_README_URL}")
    
    # Fetch README
    readme_content = fetch_readme(VOLTAGENT_README_URL)
    if not readme_content:
        print("❌ Failed to fetch README. Exiting.")
        sys.exit(1)
    
    print("✅ README fetched successfully")
    
    # Extract skills
    print("\n📋 Extracting skills from README...")
    voltagent_skills = extract_skills_from_markdown(readme_content)
    print(f"✅ Found {len(voltagent_skills)} skills in VoltAgent repo")
    
    # Load existing skills
    print(f"\n📚 Loading existing skills from: {catalog_path}")
    existing_skills = load_existing_skills(str(catalog_path))
    print(f"✅ Found {len(existing_skills)} existing skills")
    
    # Compare and categorize
    print("\n🔍 Comparing skills...")
    new_skills = []
    existing_matches = []
    similar_skills = []
    
    for skill in voltagent_skills:
        normalized = skill['normalized_name']
        
        if normalized in existing_skills:
            existing_matches.append({
                'voltagent': skill,
                'existing': existing_skills[normalized]
            })
        else:
            # Check for similar names
            similar = find_similar_skills(normalized, existing_skills)
            if similar:
                similar_skills.append({
                    'voltagent': skill,
                    'similar': similar
                })
            else:
                new_skills.append(skill)
    
    # Generate report
    report = {
        'analysis_date': str(Path(__file__).stat().st_mtime),
        'voltagent_readme_url': VOLTAGENT_README_URL,
        'summary': {
            'total_voltagent_skills': len(voltagent_skills),
            'total_existing_skills': len(existing_skills),
            'new_skills_found': len(new_skills),
            'existing_matches': len(existing_matches),
            'similar_skills': len(similar_skills)
        },
        'new_skills': new_skills,
        'existing_matches': existing_matches,
        'similar_skills': similar_skills
    }
    
    # Save report
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n📊 Analysis Summary:")
    print(f"   Total VoltAgent skills: {len(voltagent_skills)}")
    print(f"   Existing skills: {len(existing_skills)}")
    print(f"   ✨ New skills found: {len(new_skills)}")
    print(f"   ✅ Already present: {len(existing_matches)}")
    print(f"   ⚠️  Similar names: {len(similar_skills)}")
    print(f"\n💾 Report saved to: {output_path}")
    
    if new_skills:
        print(f"\n📋 New skills to evaluate:")
        for skill in new_skills[:20]:  # Show first 20
            print(f"   • {skill['normalized_name']} ({skill['original_ref']})")
        if len(new_skills) > 20:
            print(f"   ... and {len(new_skills) - 20} more")
    
    if similar_skills:
        print(f"\n⚠️  Skills with similar names (may be duplicates):")
        for item in similar_skills[:10]:  # Show first 10
            skill = item['voltagent']
            print(f"   • {skill['normalized_name']} (similar to: {', '.join(item['similar'][:3])})")

if __name__ == "__main__":
    main()
