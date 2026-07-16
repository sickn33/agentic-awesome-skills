import os
import re
import yaml
from _project_paths import find_repo_root

def fix_yaml_quotes(skills_dir):
    print(f"Normalizing YAML frontmatter in {skills_dir}...")
    fixed_count = 0
    
    for root, dirs, files in os.walk(skills_dir):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        if 'SKILL.md' in files:
            file_path = os.path.join(root, 'SKILL.md')
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception:
                continue

            fm_match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
            if not fm_match:
                continue
                
            fm_text = fm_match.group(1)
            body = content[fm_match.end():]
            
            try:
                # safe_load and then dump will normalize quoting automatically
                metadata = yaml.safe_load(fm_text) or {}
                new_fm = yaml.dump(metadata, sort_keys=False, allow_unicode=True, width=1000).strip()
                
                # Check if it actually changed something significant (beyond just style)
                # but normalization is good anyway. We'll just compare the fm_text.
                if new_fm.strip() != fm_text.strip():
                    new_content = f"---\n{new_fm}\n---" + body
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    fixed_count += 1
            except yaml.YAMLError as e:
                print(f"⚠️ {file_path}: YAML error - {e}")
                
    print(f"Total files normalized: {fixed_count}")

if __name__ == '__main__':
    base_dir = str(find_repo_root(__file__))
    fix_yaml_quotes(os.path.join(base_dir, 'skills'))
