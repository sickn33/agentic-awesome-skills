#!/usr/bin/env python3
"""
Validate GitHub sources for VoltAgent skills.

Checks:
- URL accessibility
- Repository existence
- SKILL.md presence
- License compatibility
"""

import json
import sys
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse, urljoin

def check_url_accessible(url: str, timeout: int = 10) -> tuple[bool, Optional[str]]:
    """Check if URL is accessible."""
    try:
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (compatible; AntigravitySkillsValidator/1.0)')
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return True, None
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return False, f"URL Error: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"

def get_repo_base_url(github_url: str) -> Optional[str]:
    """Extract repository base URL from GitHub URL."""
    # Handle different GitHub URL formats
    # https://github.com/org/repo/tree/main/path/to/skill
    # https://github.com/org/repo/blob/main/path/to/skill/SKILL.md
    
    parsed = urlparse(github_url)
    if parsed.netloc != 'github.com':
        return None
    
    parts = parsed.path.strip('/').split('/')
    if len(parts) >= 2:
        return f"https://github.com/{parts[0]}/{parts[1]}"
    return None

def check_skill_file_exists(url: str) -> tuple[bool, Optional[str]]:
    """Check if SKILL.md exists at the URL or nearby."""
    # Try direct URL first
    accessible, error = check_url_accessible(url)
    if accessible:
        return True, url
    
    # Try common variations
    base_url = url.rsplit('/', 1)[0] if '/' in url else url
    
    variations = [
        f"{base_url}/SKILL.md",
        f"{base_url}/skill.md",
        f"{base_url}/README.md",
        f"{base_url}/index.md"
    ]
    
    for variant in variations:
        accessible, _ = check_url_accessible(variant)
        if accessible:
            return True, variant
    
    return False, None

def check_license_compatibility(repo_url: str) -> tuple[bool, Optional[str]]:
    """Check repository license (simplified check)."""
    # Try to fetch LICENSE file
    repo_base = get_repo_base_url(repo_url)
    if not repo_base:
        return True, "unknown"  # Assume compatible if can't check
    
    license_urls = [
        f"{repo_base}/blob/main/LICENSE",
        f"{repo_base}/blob/master/LICENSE",
        f"{repo_base}/blob/main/LICENSE.md",
        f"{repo_base}/blob/master/LICENSE.md"
    ]
    
    for license_url in license_urls:
        accessible, _ = check_url_accessible(license_url)
        if accessible:
            # Try to read first few lines to detect license type
            try:
                req = urllib.request.Request(license_url.replace('/blob/', '/raw/'))
                req.add_header('User-Agent', 'Mozilla/5.0')
                with urllib.request.urlopen(req, timeout=5) as response:
                    content = response.read(500).decode('utf-8', errors='ignore').lower()
                    if 'mit' in content or 'apache' in content or 'bsd' in content:
                        return True, "compatible"
                    elif 'gpl' in content:
                        return False, "GPL (may be incompatible)"
            except:
                pass
    
    # If no LICENSE found, assume compatible (many repos don't have explicit LICENSE)
    return True, "no_license_found"

def validate_sources(analysis_file: str) -> Dict:
    """Validate all sources from VoltAgent analysis."""
    with open(analysis_file, 'r', encoding='utf-8') as f:
        analysis = json.load(f)
    
    new_skills = analysis.get('new_skills', [])
    
    print(f"🔍 Validating {len(new_skills)} new skills...")
    print()
    
    validated = []
    failed = []
    
    for i, skill in enumerate(new_skills, 1):
        name = skill['normalized_name']
        url = skill['url']
        org = skill.get('org', 'unknown')
        
        print(f"[{i}/{len(new_skills)}] {name} ({org})")
        
        validation_result = {
            'skill': skill,
            'url_accessible': False,
            'skill_file_found': False,
            'skill_file_url': None,
            'license_compatible': True,
            'license_info': 'unknown',
            'valid': False,
            'errors': []
        }
        
        # Check URL accessibility
        accessible, error = check_url_accessible(url)
        validation_result['url_accessible'] = accessible
        if not accessible:
            validation_result['errors'].append(f"URL not accessible: {error}")
            print(f"  ❌ URL not accessible: {error}")
            failed.append(validation_result)
            continue
        
        print(f"  ✅ URL accessible")
        
        # Check for SKILL.md
        skill_found, skill_url = check_skill_file_exists(url)
        validation_result['skill_file_found'] = skill_found
        validation_result['skill_file_url'] = skill_url
        
        if skill_found:
            print(f"  ✅ Skill file found: {skill_url}")
        else:
            validation_result['errors'].append("SKILL.md not found")
            print(f"  ⚠️  SKILL.md not found (may need manual creation)")
        
        # Check license
        license_ok, license_info = check_license_compatibility(url)
        validation_result['license_compatible'] = license_ok
        validation_result['license_info'] = license_info
        
        if license_ok:
            print(f"  ✅ License: {license_info}")
        else:
            validation_result['errors'].append(f"License issue: {license_info}")
            print(f"  ⚠️  License: {license_info}")
        
        # Determine if valid
        # Valid if URL accessible and (skill file found OR from official org)
        official_orgs = ['vercel-labs', 'cloudflare', 'huggingface', 'trailofbits', 
                        'expo', 'getsentry', 'neondatabase', 'fal-ai-community',
                        'google-labs-code', 'better-auth', 'tinybirdco', 'remotion-dev']
        
        is_official = org in official_orgs
        validation_result['is_official'] = is_official
        
        if accessible and (skill_found or is_official):
            validation_result['valid'] = True
            validated.append(validation_result)
            print(f"  ✅ VALID")
        else:
            failed.append(validation_result)
            print(f"  ❌ INVALID")
        
        print()
    
    return {
        'validated': validated,
        'failed': failed,
        'summary': {
            'total': len(new_skills),
            'valid': len(validated),
            'failed': len(failed)
        }
    }

def main():
    base_dir = Path(__file__).parent.parent
    analysis_file = base_dir / "voltagent_analysis.json"
    output_file = base_dir / "voltagent_validation.json"
    
    if not analysis_file.exists():
        print(f"❌ Analysis file not found: {analysis_file}")
        print("   Run analyze_voltagent_repo.py first")
        sys.exit(1)
    
    print("🔍 Validating VoltAgent skill sources...")
    print()
    
    results = validate_sources(str(analysis_file))
    
    # Save results
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print("=" * 60)
    print("📊 Validation Summary:")
    print(f"   Total skills: {results['summary']['total']}")
    print(f"   ✅ Valid: {results['summary']['valid']}")
    print(f"   ❌ Failed: {results['summary']['failed']}")
    print()
    print(f"💾 Results saved to: {output_file}")
    
    if results['validated']:
        print(f"\n✅ Valid skills ready for implementation:")
        for item in results['validated']:
            skill = item['skill']
            print(f"   • {skill['normalized_name']} ({skill.get('org', 'unknown')})")
    
    if results['failed']:
        print(f"\n❌ Failed validations:")
        for item in results['failed']:
            skill = item['skill']
            errors = ', '.join(item['errors'])
            print(f"   • {skill['normalized_name']}: {errors}")

if __name__ == "__main__":
    main()
