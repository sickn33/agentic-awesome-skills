import os
import re
from _project_paths import find_repo_root

def fix_dangling_links(skills_dir):
    print(f"Scanning for dangling links in {skills_dir}...")
    pattern = re.compile(r'\[([^\]]*)\]\(([^)]+)\)')
    fixed_count = 0
    
    for root, dirs, files in os.walk(skills_dir):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            if not file.endswith('.md'): continue
            
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception:
                continue

            def replacer(match):
                nonlocal fixed_count
                text = match.group(1)
                href = match.group(2)
                href_clean = href.split('#')[0].strip()
                
                # Ignore empty links, web URLs, emails, etc.
                if not href_clean or href_clean.startswith(('http://', 'https://', 'mailto:', '<', '>')):
                    return match.group(0)
                if os.path.isabs(href_clean):
                    return match.group(0)
                
                target_path = os.path.normpath(os.path.join(root, href_clean))
                if not os.path.exists(target_path):
                    # Dangling link detected. Replace markdown link with just its text.
                    print(f"Fixing dangling link in {os.path.relpath(file_path, skills_dir)}: {href}")
                    fixed_count += 1
                    return text
                return match.group(0)
            
            new_content = pattern.sub(replacer, content)
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
    
    print(f"Total dangling links fixed: {fixed_count}")

if __name__ == '__main__':
    base_dir = str(find_repo_root(__file__))
    fix_dangling_links(os.path.join(base_dir, 'skills'))
