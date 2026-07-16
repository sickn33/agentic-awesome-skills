#!/usr/bin/env python3
"""Check for HTML content in skills and identify which need conversion."""

import json
import re
from pathlib import Path

def check_html_content(skill_path: Path) -> dict:
    """Check if a skill file contains HTML content."""
    try:
        content = skill_path.read_text(encoding='utf-8')
    except Exception as e:
        return {'error': str(e), 'has_html': False}
    
    # HTML patterns (excluding code blocks)
    html_patterns = [
        r'<!DOCTYPE\s+html',
        r'<html\s',
        r'<head\s*>',
        r'<body\s*>',
        r'<script\s',
        r'<style\s',
        r'<link\s+rel=',
        r'<meta\s+charset=',
        r'github\.githubassets\.com',
        r'github-cloud\.s3\.amazonaws\.com'
    ]
    
    lines = content.split('\n')
    in_code_block = False
    html_matches = []
    
    for i, line in enumerate(lines, 1):
        # Track code blocks
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            continue
        
        # Skip HTML in code blocks
        if in_code_block:
            continue
        
        # Check for HTML patterns
        for pattern in html_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                html_matches.append({
                    'line': i,
                    'pattern': pattern,
                    'preview': line[:100].strip()
                })
    
    return {
        'has_html': len(html_matches) > 5,  # Threshold
        'html_count': len(html_matches),
        'matches': html_matches[:10]  # First 10 matches
    }

def main():
    # Load similar skills from analysis
    analysis_file = Path('voltagent_analysis.json')
    if not analysis_file.exists():
        print("❌ voltagent_analysis.json not found")
        return
    
    with open(analysis_file, 'r') as f:
        analysis = json.load(f)
    
    similar_skills = analysis.get('similar_skills', [])
    skills_dir = Path('skills')
    
    print(f"🔍 Checking {len(similar_skills)} similar skills for HTML content...\n")
    
    skills_with_html = []
    skills_checked = 0
    
    for item in similar_skills:
        skill_name = item['voltagent']['normalized_name']
        skill_path = skills_dir / skill_name / 'SKILL.md'
        
        if not skill_path.exists():
            continue
        
        skills_checked += 1
        result = check_html_content(skill_path)
        
        if result.get('has_html'):
            skills_with_html.append({
                'name': skill_name,
                'url': item['voltagent']['url'],
                'description': item['voltagent']['description'],
                'html_count': result['html_count'],
                'matches': result.get('matches', [])
            })
    
    print(f"📊 Checked {skills_checked} skills")
    print(f"⚠️  Found {len(skills_with_html)} skills with HTML content\n")
    
    if skills_with_html:
        print("Skills needing HTML-to-Markdown conversion:")
        for skill in skills_with_html:
            print(f"\n  • {skill['name']}")
            print(f"    HTML patterns: {skill['html_count']}")
            print(f"    URL: {skill['url']}")
            if skill['matches']:
                print(f"    Sample match (line {skill['matches'][0]['line']}): {skill['matches'][0]['preview'][:80]}...")
    
    # Also check recently implemented skills
    print("\n\n🔍 Checking recently implemented skills...\n")
    validation_file = Path('voltagent_validation.json')
    if validation_file.exists():
        with open(validation_file, 'r') as f:
            validation = json.load(f)
        
        validated_skills = validation.get('validated', [])
        recent_with_html = []
        
        for item in validated_skills:
            skill_name = item['skill']['normalized_name']
            skill_path = skills_dir / skill_name / 'SKILL.md'
            
            if not skill_path.exists():
                continue
            
            result = check_html_content(skill_path)
            if result.get('has_html'):
                recent_with_html.append({
                    'name': skill_name,
                    'html_count': result['html_count']
                })
        
        if recent_with_html:
            print(f"⚠️  Found {len(recent_with_html)} recently implemented skills with HTML:")
            for skill in recent_with_html:
                print(f"  • {skill['name']} ({skill['html_count']} HTML patterns)")
        else:
            print("✅ No HTML content found in recently implemented skills")
    
    # Save results
    output = {
        'similar_skills_with_html': skills_with_html,
        'total_checked': skills_checked,
        'total_with_html': len(skills_with_html)
    }
    
    output_file = Path('html_content_analysis.json')
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n💾 Results saved to: {output_file}")

if __name__ == "__main__":
    main()
