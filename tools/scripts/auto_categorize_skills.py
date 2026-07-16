#!/usr/bin/env python3
"""
Auto-categorize skills based on their names and descriptions.
Removes "uncategorized" by intelligently assigning categories.

Usage:
  python auto_categorize_skills.py
  python auto_categorize_skills.py --dry-run (shows what would change)
"""

import os
import re
import json
import sys
import argparse
import yaml
from _project_paths import find_repo_root

# Ensure UTF-8 output for Windows compatibility
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Category keywords mapping
CATEGORY_KEYWORDS = {
    'web-development': [
        'react', 'vue', 'angular', 'svelte', 'nextjs', 'gatsby', 'remix',
        'html', 'css', 'javascript', 'typescript', 'frontend', 'web', 'tailwind',
        'bootstrap', 'sass', 'less', 'webpack', 'vite', 'rollup', 'parcel',
        'rest api', 'graphql', 'http', 'fetch', 'axios', 'cors',
        'responsive', 'seo', 'accessibility', 'a11y', 'pwa', 'progressive',
        'dom', 'jsx', 'tsx', 'component', 'router', 'routing'
    ],
    'backend': [
        'nodejs', 'node.js', 'express', 'fastapi', 'django', 'flask',
        'spring', 'java', 'python', 'golang', 'rust', 'c#', 'csharp',
        'dotnet', '.net', 'laravel', 'php', 'ruby', 'rails',
        'server', 'backend', 'api', 'rest', 'graphql', 'database',
        'sql', 'mongodb', 'postgres', 'mysql', 'redis', 'cache',
        'authentication', 'auth', 'jwt', 'oauth', 'session',
        'middleware', 'routing', 'controller', 'model'
    ],
    'database': [
        'database', 'sql', 'postgres', 'postgresql', 'mysql', 'mariadb',
        'mongodb', 'nosql', 'firestore', 'dynamodb', 'cassandra',
        'elasticsearch', 'redis', 'memcached', 'graphql', 'prisma',
        'orm', 'query', 'migration', 'schema', 'index'
    ],
    'ai-ml': [
        'ai', 'artificial intelligence', 'machine learning', 'ml',
        'deep learning', 'neural', 'tensorflow', 'pytorch', 'scikit',
        'nlp', 'computer vision', 'cv', 'llm', 'gpt', 'bert',
        'classification', 'regression', 'clustering', 'transformer',
        'embedding', 'vector', 'embedding', 'training', 'model'
    ],
    'devops': [
        'devops', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'git',
        'github', 'gitlab', 'jenkins', 'gitlab-ci', 'github actions',
        'aws', 'azure', 'gcp', 'terraform', 'ansible', 'vagrant',
        'deploy', 'deployment', 'container', 'orchestration',
        'monitoring', 'logging', 'prometheus', 'grafana'
    ],
    'cloud': [
        'aws', 'amazon', 'azure', 'gcp', 'google cloud', 'cloud',
        'ec2', 's3', 'lambda', 'cloudformation', 'terraform',
        'serverless', 'functions', 'storage', 'cdn', 'distributed'
    ],
    'security': [
        'security', 'encryption', 'cryptography', 'ssl', 'tls',
        'hashing', 'bcrypt', 'jwt', 'oauth', 'authentication',
        'authorization', 'firewall', 'penetration', 'audit',
        'vulnerability', 'privacy', 'gdpr', 'compliance'
    ],
    'testing': [
        'test', 'testing', 'jest', 'mocha', 'jasmine', 'pytest',
        'unittest', 'cypress', 'selenium', 'puppeteer', 'e2e',
        'unit test', 'integration', 'coverage', 'ci/cd'
    ],
    'mobile': [
        'mobile', 'android', 'ios', 'react native', 'flutter',
        'swift', 'kotlin', 'objective-c', 'app', 'native',
        'cross-platform', 'expo', 'cordova', 'xamarin'
    ],
    'game-development': [
        'game', 'unity', 'unreal', 'godot', 'canvas', 'webgl',
        'threejs', 'babylon', 'phaser', 'sprite', 'physics',
        'collision', '2d', '3d', 'shader', 'rendering'
    ],
    'data-science': [
        'data', 'analytics', 'science', 'pandas', 'numpy', 'scipy',
        'jupyter', 'notebook', 'visualization', 'matplotlib', 'plotly',
        'statistics', 'correlation', 'regression', 'clustering'
    ],
    'automation': [
        'automation', 'scripting', 'selenium', 'puppeteer', 'robot',
        'workflow', 'automation', 'scheduled', 'trigger', 'integration'
    ],
    'content': [
        'markdown', 'documentation', 'content', 'blog', 'writing',
        'seo', 'meta', 'schema', 'og', 'twitter', 'description'
    ]
}

def categorize_skill(skill_name, description):
    """
    Intelligently categorize a skill based on name and description.
    Returns the best matching category or None if no match.
    """
    combined_text = f"{skill_name} {description}".lower()
    
    # Score each category based on keyword matches
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            # Prefer exact phrase matches with word boundaries
            if re.search(r'\b' + re.escape(keyword) + r'\b', combined_text):
                score += 2
            elif keyword in combined_text:
                score += 1
        
        if score > 0:
            scores[category] = score
    
    # Return the category with highest score
    if scores:
        best_category = max(scores, key=scores.get)
        return best_category
    
    return None

def auto_categorize(skills_dir, dry_run=False):
    """Auto-categorize skills and update SKILL.md files"""
    skills = []
    categorized_count = 0
    already_categorized = 0
    failed_count = 0
    
    for root, dirs, files in os.walk(skills_dir):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        if "SKILL.md" in files:
            skill_path = os.path.join(root, "SKILL.md")
            skill_id = os.path.basename(root)
            
            try:
                with open(skill_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract frontmatter and body
                fm_match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
                if not fm_match:
                    continue
                
                fm_text = fm_match.group(1)
                body = content[fm_match.end():]
                
                try:
                    metadata = yaml.safe_load(fm_text) or {}
                except yaml.YAMLError as e:
                    print(f"⚠️ {skill_id}: YAML error - {e}")
                    continue
                
                skill_name = metadata.get('name', skill_id)
                description = metadata.get('description', '')
                current_category = metadata.get('category', 'uncategorized')
                
                # Skip if already has a meaningful category
                if current_category and current_category != 'uncategorized':
                    already_categorized += 1
                    skills.append({
                        'id': skill_id,
                        'name': skill_name,
                        'current': current_category,
                        'action': 'SKIP'
                    })
                    continue
                
                # Try to auto-categorize
                new_category = categorize_skill(skill_name, description)
                
                if new_category:
                    skills.append({
                        'id': skill_id,
                        'name': skill_name,
                        'current': current_category,
                        'new': new_category,
                        'action': 'UPDATE'
                    })
                    
                    if not dry_run:
                        metadata['category'] = new_category
                        new_fm = yaml.dump(metadata, sort_keys=False, allow_unicode=True, width=1000).strip()
                        new_content = f"---\n{new_fm}\n---" + body
                        
                        with open(skill_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                    
                    categorized_count += 1
                else:
                    skills.append({
                        'id': skill_id,
                        'name': skill_name,
                        'current': current_category,
                        'action': 'FAILED'
                    })
                    failed_count += 1
                    
            except Exception as e:
                print(f"❌ Error processing {skill_id}: {str(e)}")
    
    # Print report
    print("\n" + "="*70)
    print("AUTO-CATEGORIZATION REPORT")
    print("="*70)
    print(f"\n📊 Summary:")
    print(f"   ✅ Categorized: {categorized_count}")
    print(f"   ⏭️  Already categorized: {already_categorized}")
    print(f"   ❌ Failed to categorize: {failed_count}")
    print(f"   📈 Total processed: {len(skills)}")
    
    if categorized_count > 0:
        print(f"\n📋 Sample changes:")
        for skill in skills[:10]:
            if skill['action'] == 'UPDATE':
                print(f"   • {skill['id']}")
                print(f"     {skill['current']} → {skill['new']}")
    
    if dry_run:
        print(f"\n🔍 DRY RUN MODE - No changes made")
    else:
        print(f"\n💾 Changes saved to SKILL.md files")
    
    return categorized_count

def main():
    parser = argparse.ArgumentParser(
        description="Auto-categorize skills based on content",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python auto_categorize_skills.py --dry-run
  python auto_categorize_skills.py
        """
    )
    
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be changed without making changes')
    
    args = parser.parse_args()
    
    base_dir = str(find_repo_root(__file__))
    skills_path = os.path.join(base_dir, "skills")
    
    auto_categorize(skills_path, dry_run=args.dry_run)

if __name__ == "__main__":
    main()
