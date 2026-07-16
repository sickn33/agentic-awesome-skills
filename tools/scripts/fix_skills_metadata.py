import os
import re
import yaml
from _project_paths import find_repo_root

def fix_skills(skills_dir):
    for root, dirs, files in os.walk(skills_dir):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        if "SKILL.md" in files:
            skill_path = os.path.join(root, "SKILL.md")
            if os.path.islink(skill_path):
                print(f"⚠️ Skipping symlinked skill file: {skill_path}")
                continue
            with open(skill_path, 'r', encoding='utf-8') as f:
                content = f.read()

            fm_match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
            if not fm_match:
                continue
            
            fm_text = fm_match.group(1)
            body = content[fm_match.end():]
            folder_name = os.path.basename(root)
            
            try:
                metadata = yaml.safe_load(fm_text) or {}
            except yaml.YAMLError as e:
                print(f"⚠️ {skill_path}: YAML error - {e}")
                continue

            if not isinstance(metadata, dict):
                print(f"⚠️ {skill_path}: Frontmatter must be a mapping, skipping")
                continue

            changed = False
            
            # 1. Fix Name
            if metadata.get('name') != folder_name:
                metadata['name'] = folder_name
                changed = True
            
            # 2. Fix Description length
            desc = metadata.get('description', '')
            if isinstance(desc, str) and len(desc) > 200:
                metadata['description'] = desc[:197] + "..."
                changed = True
            
            if changed:
                new_fm = yaml.dump(metadata, sort_keys=False, allow_unicode=True, width=1000).strip()
                new_content = f"---\n{new_fm}\n---" + body
                with open(skill_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Fixed {skill_path}")

if __name__ == "__main__":
    base_dir = str(find_repo_root(__file__))
    skills_path = os.path.join(base_dir, "skills")
    fix_skills(skills_path)
