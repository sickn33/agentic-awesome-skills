import os
import json
import subprocess
import sys

def run_gh_command(args):
    try:
        result = subprocess.run(['gh'] + args, capture_output=True, text=True, check=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error running gh command: {e.stderr}", file=sys.stderr)
        return None

def hunt():
    print("🎯 Hunting for high-impact OSS issues...")
    
    # 1. Find trending repos (stars > 1000 created/updated recently)
    repos_json = run_gh_command(['api', 'search/repositories?q=stars:>1000+pushed:>2026-02-01&sort=stars&order=desc', '--jq', '.items[] | {full_name: .full_name, stars: .stargazers_count, description: .description}'])
    
    if not repos_json:
        print("No trending repositories found.")
        return
    
    repos = [json.loads(line) for line in repos_json.strip().split('\n')[:10]]
    
    dossier = []
    
    for repo in repos:
        name = repo['full_name']
        print(f"Checking {name}...")
        
        # 2. Search for help-wanted issues
        issues_json = run_gh_command(['issue', 'list', '--repo', name, '--label', 'help wanted', '--json', 'number,title,url', '--limit', '3'])
        
        if issues_json:
            try:
                issues = json.loads(issues_json)
                for issue in issues:
                    dossier.append({
                        'repo': name,
                        'stars': repo['stars'],
                        'number': issue['number'],
                        'title': issue['title'],
                        'url': issue['url']
                    })
            except json.JSONDecodeError:
                pass
    
    print("\n--- 📂 OSS CONTRIBUTION DOSSIER ---")
    for item in dossier:
        print(f"\n[{item['repo']} ★{item['stars']}]")
        print(f"Issue #{item['number']}: {item['title']}")
        print(f"Link: {item['url']}")

if __name__ == "__main__":
    hunt()
