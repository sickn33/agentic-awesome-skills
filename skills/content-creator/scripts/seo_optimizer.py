#!/usr/bin/env python3
"""
SEO Content Optimizer - local Markdown diagnostics; no ranking or quality score
"""

import re
from typing import Dict, List, Set
import json
from pathlib import Path


def safe_user_path(path_value, base_dir="."):
    """Resolve a CLI path under the current workspace."""
    if base_dir != ".":
        raise ValueError("Custom base directories are not supported for CLI paths")
    base_path = Path.cwd().resolve()
    resolved_path = Path(path_value).expanduser().resolve()
    try:
        resolved_path.relative_to(base_path)
    except ValueError as exc:
        raise ValueError(f"Path escapes allowed directory: {path_value}") from exc
    return resolved_path

class SEOOptimizer:
    def __init__(self):
        # Common stop words to filter
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
            'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall'
        }
        
        # SEO best practices
        self.best_practices = {
            'title_length': (50, 60),
            'meta_description_length': (150, 160),
            'url_length': (50, 60),
            'paragraph_length': (40, 150),
            'heading_keyword_placement': True,
            # No keyword-density or word-count target is a ranking guarantee.
        }
    
    def analyze(self, content: str, target_keyword: str = None, 
                secondary_keywords: List[str] = None) -> Dict:
        """Analyze content for SEO optimization"""
        
        analysis = {
            'content_length': len(content.split()),
            'keyword_analysis': {},
            'structure_analysis': self._analyze_structure(content),
            'readability': self._analyze_readability(content),
            'meta_suggestions': {},
            'optimization_score': None,  # Legacy field: no defensible aggregate SEO score.
            'method': 'Local text diagnostics; not a ranking or quality assessment',
            'recommendations': []
        }
        
        # Keyword analysis
        if target_keyword:
            analysis['keyword_analysis'] = self._analyze_keywords(
                content, target_keyword, secondary_keywords or []
            )
        
        # Generate meta suggestions
        analysis['meta_suggestions'] = self._generate_meta_suggestions(
            content, target_keyword
        )
        
        # Calculate optimization score
        # Keep the legacy score field null rather than inventing a quality threshold.
        
        # Generate recommendations
        analysis['recommendations'] = self._generate_recommendations(analysis)
        
        return analysis
    
    def _analyze_keywords(self, content: str, primary: str, 
                         secondary: List[str]) -> Dict:
        """Analyze keyword usage and density"""
        content_lower = content.lower()
        word_count = len(content.split())
        
        results = {
            'primary_keyword': {
                'keyword': primary,
                'count': len(re.findall(r'(?<!\w)' + re.escape(primary.lower()) + r'(?!\w)', content_lower)),
                'density': 0,
                'in_title': bool(re.search(r'^# .*?(?<!\w)' + re.escape(primary) + r'(?!\w)', content, re.I | re.M)),
                'in_headings': bool(re.search(r'^#{1,6} .*?(?<!\w)' + re.escape(primary) + r'(?!\w)', content, re.I | re.M)),
                'in_first_paragraph': False
            },
            'secondary_keywords': [],
            'frequent_terms': []
        }
        
        # Calculate primary keyword metrics
        if word_count > 0:
            results['primary_keyword']['density'] = (
                results['primary_keyword']['count'] / word_count
            )
        
        # Check keyword placement
        first_para = content.split('\n\n')[0] if '\n\n' in content else content[:200]
        results['primary_keyword']['in_first_paragraph'] = (
            primary.lower() in first_para.lower()
        )
        
        # Analyze secondary keywords
        for keyword in secondary:
            count = len(re.findall(r'(?<!\w)' + re.escape(keyword.lower()) + r'(?!\w)', content_lower)) if keyword.strip() else 0
            results['secondary_keywords'].append({
                'keyword': keyword,
                'count': count,
                'density': count / word_count if word_count > 0 else 0
            })
        
        # Extract potential LSI keywords
        results['frequent_terms'] = self._extract_frequent_terms(content, primary)
        
        return results
    
    def _analyze_structure(self, content: str) -> Dict:
        """Analyze content structure for SEO"""
        lines = content.split('\n')
        
        structure = {
            'headings': {'h1': 0, 'h2': 0, 'h3': 0, 'total': 0},
            'paragraphs': 0,
            'lists': 0,
            'images': 0,
            'links': {'internal': 0, 'external': 0},
            'avg_paragraph_length': 0
        }
        
        paragraphs = []
        current_para = []
        
        for line in lines:
            # Count headings
            if line.startswith('# '):
                structure['headings']['h1'] += 1
                structure['headings']['total'] += 1
            elif line.startswith('## '):
                structure['headings']['h2'] += 1
                structure['headings']['total'] += 1
            elif line.startswith('### '):
                structure['headings']['h3'] += 1
                structure['headings']['total'] += 1
            
            # Count lists
            if line.strip().startswith(('- ', '* ', '1. ')):
                structure['lists'] += 1
            
            # Count links
            internal_links = len(re.findall(r'\[.*?\]\(/.*?\)', line))
            external_links = len(re.findall(r'\[.*?\]\(https?://.*?\)', line))
            structure['links']['internal'] += internal_links
            structure['links']['external'] += external_links
            
            # Track paragraphs
            if line.strip() and not line.startswith('#'):
                current_para.append(line)
            elif current_para:
                paragraphs.append(' '.join(current_para))
                current_para = []
        
        if current_para:
            paragraphs.append(' '.join(current_para))
        
        structure['paragraphs'] = len(paragraphs)
        
        if paragraphs:
            avg_length = sum(len(p.split()) for p in paragraphs) / len(paragraphs)
            structure['avg_paragraph_length'] = round(avg_length, 1)
        
        return structure
    
    def _analyze_readability(self, content: str) -> Dict:
        """Analyze content readability"""
        sentences = [s.strip() for s in re.split(r'[.!?]+', content) if s.strip()]
        words = content.split()
        
        if not sentences or not words:
            return {'score': 0, 'level': 'Unknown', 'avg_sentence_length': 0}
        
        avg_sentence_length = len(words) / len(sentences)
        
        # Simple readability scoring
        if avg_sentence_length < 15:
            level = 'Easy'
            score = 90
        elif avg_sentence_length < 20:
            level = 'Moderate'
            score = 70
        elif avg_sentence_length < 25:
            level = 'Difficult'
            score = 50
        else:
            level = 'Very Difficult'
            score = 30
        
        return {
            'score': score,
            'level': level,
            'avg_sentence_length': round(avg_sentence_length, 1)
        }
    
    def _extract_frequent_terms(self, content: str, primary_keyword: str) -> List[str]:
        """Count repeated English words; this does not measure semantic relationships"""
        words = re.findall(r'\b[a-z]+\b', content.lower())
        word_freq = {}
        
        # Count word frequencies
        for word in words:
            if word not in self.stop_words and len(word) > 3:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency and return top related terms
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        # Filter out the primary keyword and return top 10
        lsi_keywords = []
        for word, count in sorted_words:
            if word != primary_keyword.lower() and count > 1:
                lsi_keywords.append(word)
            if len(lsi_keywords) >= 10:
                break
        
        return lsi_keywords
    
    def _generate_meta_suggestions(self, content: str, keyword: str = None) -> Dict:
        """Generate SEO meta tag suggestions"""
        # Extract first sentence for description base
        sentences = [s.strip() for s in re.split(r'[.!?]+', content) if s.strip()]
        first_sentence = sentences[0] if sentences else content[:160]
        
        suggestions = {
            'title': '',
            'meta_description': '',
            'url_slug': '',
            'og_title': '',
            'og_description': ''
        }
        
        if keyword:
            # Title suggestion
            suggestions['title'] = f"{keyword.title()} - Overview"
            if len(suggestions['title']) > 60:
                suggestions['title'] = keyword.title()[:57] + "..."
            
            # Meta description
            desc_base = f"Read about {keyword}. {first_sentence}"
            if len(desc_base) > 160:
                desc_base = desc_base[:157] + "..."
            suggestions['meta_description'] = desc_base
            
            # URL slug
            suggestions['url_slug'] = re.sub(r'[^a-z0-9-]+', '-', 
                                            keyword.lower()).strip('-')
            
            # Open Graph tags
            suggestions['og_title'] = suggestions['title']
            suggestions['og_description'] = suggestions['meta_description']
        
        return suggestions
    
    def _generate_recommendations(self, analysis: Dict) -> List[str]:
        """Generate SEO improvement recommendations"""
        recommendations = []
        
        # Presence is an observation, not an instruction to stuff keywords.
        if analysis['keyword_analysis']:
            if analysis['keyword_analysis']['primary_keyword']['count'] == 0:
                recommendations.append('Target phrase absent: check whether the draft answers the intended reader question')

        # Structure recommendations
        struct = analysis['structure_analysis']
        if struct['headings']['total'] == 0:
            recommendations.append("Add headings (H1, H2, H3) to improve content structure")
        if struct['links']['internal'] == 0:
            recommendations.append("Add internal links to related content")
        if struct['avg_paragraph_length'] > 150:
            recommendations.append("Break up long paragraphs for better readability")
        
        # Readability recommendations
        if analysis['readability']['avg_sentence_length'] > 20:
            recommendations.append("Simplify sentences for better readability")
        
        return recommendations

def optimize_content(content: str, keyword: str = None, 
                     secondary_keywords: List[str] = None) -> str:
    """Main function to optimize content"""
    optimizer = SEOOptimizer()
    
    # Parse secondary keywords from comma-separated string if provided
    if secondary_keywords and isinstance(secondary_keywords, str):
        secondary_keywords = [kw.strip() for kw in secondary_keywords.split(',')]
    
    results = optimizer.analyze(content, keyword, secondary_keywords)
    
    # Format output
    output = [
        "=== SEO Content Analysis ===",
        'Local text diagnostics; no ranking or quality score',
        f"Content Length: {results['content_length']} words",
        f"",
        "Content Structure:",
        f"  Headings: {results['structure_analysis']['headings']['total']}",
        f"  Paragraphs: {results['structure_analysis']['paragraphs']}",
        f"  Avg Paragraph Length: {results['structure_analysis']['avg_paragraph_length']} words",
        f"  Internal Links: {results['structure_analysis']['links']['internal']}",
        f"  External Links: {results['structure_analysis']['links']['external']}",
        f"",
        f"Readability: {results['readability']['level']} (Score: {results['readability']['score']})",
        f""
    ]
    
    if results['keyword_analysis']:
        kw = results['keyword_analysis']['primary_keyword']
        output.extend([
            "Keyword Analysis:",
            f"  Primary Keyword: {kw['keyword']}",
            f"  Count: {kw['count']}",
            f"  Density: {kw['density']:.2%}",
            f"  In First Paragraph: {'Yes' if kw['in_first_paragraph'] else 'No'}",
            f""
        ])
        
        if results['keyword_analysis']['frequent_terms']:
            output.append("  Frequent English Terms (not semantic keywords):")
            for lsi in results['keyword_analysis']['frequent_terms'][:5]:
                output.append(f"    • {lsi}")
            output.append("")
    
    if results['meta_suggestions']:
        output.extend([
            "Meta Tag Suggestions:",
            f"  Title: {results['meta_suggestions']['title']}",
            f"  Description: {results['meta_suggestions']['meta_description']}",
            f"  URL Slug: {results['meta_suggestions']['url_slug']}",
            f""
        ])
    
    output.extend([
        "Recommendations:",
    ])
    
    for rec in results['recommendations']:
        output.append(f"  • {rec}")
    
    return '\n'.join(output)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        with safe_user_path(sys.argv[1]).open('rb') as f:
            raw = f.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            raise SystemExit('Input exceeds 1 MiB')
        content = raw.decode('utf-8')
        
        keyword = sys.argv[2] if len(sys.argv) > 2 else None
        secondary = sys.argv[3] if len(sys.argv) > 3 else None
        
        print(optimize_content(content, keyword, secondary))
    else:
        print("Usage: python seo_optimizer.py <file> [primary_keyword] [secondary_keywords]")
