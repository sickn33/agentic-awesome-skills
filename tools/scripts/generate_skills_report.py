#!/usr/bin/env python3
"""
Generate a report of skills with their date_added metadata in JSON format.

Usage:
  python generate_skills_report.py [--output report.json] [--sort date|name]
"""

import os
import re
import json
import sys
import argparse
from datetime import datetime
from pathlib import Path
import yaml
from _project_paths import find_repo_root
from risk_classifier import suggest_risk

def get_project_root():
    """Get the project root directory."""
    return str(find_repo_root(__file__))

def parse_frontmatter(content):
    """Parse frontmatter from SKILL.md content using PyYAML."""
    fm_match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not fm_match:
        return None
    
    fm_text = fm_match.group(1)
    try:
        return yaml.safe_load(fm_text) or {}
    except yaml.YAMLError:
        return None

def generate_skills_report(output_file=None, sort_by='date', project_root=None):
    """Generate a report of all skills with their metadata."""
    root = str(project_root or get_project_root())
    skills_dir = os.path.join(root, 'skills')
    skills_data = []
    
    for root, dirs, files in os.walk(skills_dir):
        # Skip hidden/disabled directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        if "SKILL.md" in files:
            skill_name = os.path.basename(root)
            skill_path = os.path.join(root, "SKILL.md")
            
            try:
                with open(skill_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                metadata = parse_frontmatter(content)
                if metadata is None:
                    continue

                suggested_risk = suggest_risk(content, metadata)
                
                date_added = metadata.get('date_added', None)
                if date_added is not None:
                    date_added = date_added.isoformat() if hasattr(date_added, 'isoformat') else str(date_added)

                skill_info = {
                    'id': metadata.get('id', skill_name),
                    'name': metadata.get('name', skill_name),
                    'description': metadata.get('description', ''),
                    'date_added': date_added,
                    'source': metadata.get('source', 'unknown'),
                    'risk': metadata.get('risk', 'unknown'),
                    'suggested_risk': suggested_risk.risk,
                    'suggested_risk_reasons': list(suggested_risk.reasons),
                    'category': metadata.get('category', metadata.get('id', '').split('-')[0] if '-' in metadata.get('id', '') else 'other'),
                }
                
                skills_data.append(skill_info)
            except Exception as e:
                print(f"⚠️  Error reading {skill_path}: {str(e)}", file=sys.stderr)
    
    # Sort data
    if sort_by == 'date':
        # Sort by date_added (newest first), then by name
        skills_data.sort(key=lambda x: (x['date_added'] or '0000-00-00', x['name']), reverse=True)
    elif sort_by == 'name':
        skills_data.sort(key=lambda x: x['name'])
    
    # Prepare report
    report = {
        'generated_at': datetime.now().isoformat(),
        'total_skills': len(skills_data),
        'skills_with_dates': sum(1 for s in skills_data if s['date_added']),
        'skills_without_dates': sum(1 for s in skills_data if not s['date_added']),
        'skills_with_suggested_risk': sum(1 for s in skills_data if s['suggested_risk'] != 'unknown'),
        'suggested_risk_counts': {
            risk: sum(1 for skill in skills_data if skill['suggested_risk'] == risk)
            for risk in sorted({skill['suggested_risk'] for skill in skills_data if skill['suggested_risk'] != 'unknown'})
        },
        'coverage_percentage': round(
            sum(1 for s in skills_data if s['date_added']) / len(skills_data) * 100 if skills_data else 0, 
            1
        ),
        'sorted_by': sort_by,
        'skills': skills_data
    }
    
    # Output
    if output_file:
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            print(f"✅ Report saved to: {output_file}")
        except Exception as e:
            print(f"❌ Error saving report: {str(e)}")
            return None
    else:
        # Print to stdout
        print(json.dumps(report, indent=2, ensure_ascii=False))
    
    return report

def main():
    parser = argparse.ArgumentParser(
        description="Generate a skills report with date_added metadata",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_skills_report.py
  python generate_skills_report.py --output skills_report.json
  python generate_skills_report.py --sort name --output sorted_skills.json
        """
    )
    
    parser.add_argument('--output', '-o', help='Output file (JSON). If not specified, prints to stdout')
    parser.add_argument('--sort', choices=['date', 'name'], default='date', help='Sort order (default: date)')
    
    args = parser.parse_args()
    
    generate_skills_report(output_file=args.output, sort_by=args.sort)

if __name__ == '__main__':
    main()
