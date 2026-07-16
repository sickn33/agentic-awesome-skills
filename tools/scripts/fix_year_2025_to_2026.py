#!/usr/bin/env python3
"""
Update all skill dates from 2025 to 2026.
Fixes the year mismatch issue.
"""

import os
import re
import sys
from _project_paths import find_repo_root

# Ensure UTF-8 output for Windows compatibility
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def update_dates(skills_dir):
    """Update all dates from 2025 to 2026"""
    updated_count = 0
    
    for root, dirs, files in os.walk(skills_dir):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        if "SKILL.md" in files:
            skill_path = os.path.join(root, "SKILL.md")
            skill_id = os.path.basename(root)
            
            try:
                with open(skill_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace 2025 with 2026 in date_added field
                if 'date_added: "2025-' in content:
                    new_content = content.replace('date_added: "2025-', 'date_added: "2026-')
                    
                    with open(skill_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    
                    print(f"OK {skill_id}")
                    updated_count += 1
            except Exception as e:
                print(f"Error updating {skill_id}: {str(e)}")
    
    print(f"\nUpdated {updated_count} skills to 2026")
    return updated_count

if __name__ == "__main__":
    base_dir = str(find_repo_root(__file__))
    skills_path = os.path.join(base_dir, "skills")
    
    print("Updating all dates from 2025 to 2026...\n")
    update_dates(skills_path)
    print("\nDone! Run: python tools/scripts/generate_index.py")
