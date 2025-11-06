#!/usr/bin/env python3
"""
Merge home.css into style.css, removing old overrides and comments
"""

import re

def remove_comments(css_content):
    """Remove CSS comments"""
    css_content = re.sub(r'/\*.*?\*/', '', css_content, flags=re.DOTALL)
    return css_content

def remove_old_home_styles(style_content):
    """Remove old styles that will be replaced by home.css"""
    
    # Patterns to remove (old implementations that home.css replaces)
    patterns_to_remove = [
        # Old .hero styles (lines 357-400)
        r'\.hero\s+\.container\s*\{[^}]*\}',
        r'\.hero__head\s*\{[^}]*\}',
        r'\.hero__media\s*\{[^}]*\}',
        r'\.hero__media::after\s*\{[^}]*\}',
        
        # Old .cta-hero styles (lines 1645-1730, 3988-4007)
        r'\.cta-hero\s*\{[^}]*\}',
        r'\.cta-hero::before\s*\{[^}]*\}',
        r'\.cta-hero::after\s*\{[^}]*\}',
        r'\.cta-hero\s+\.sch-rail-wrap\s*\{[^}]*\}',
        r'\.cta-hero\s+\.sch-rail\s*\{[^}]*\}',
        r'\.cta-hero\s+\.track\s*\{[^}]*\}',
        r'\.cta-hero\s+\.track-b\s*\{[^}]*\}',
        r'\.cta-hero\s+\.cta-eyebrow\s*\{[^}]*\}',
        r'\.cta-hero\s+\.cta-sub\s*\{[^}]*\}',
        r'\.cta-hero\s+\.cta-title\s*\{[^}]*\}',
        r'\.cta-hero\s+\.cta-title\s+a\s*\{[^}]*\}',
        r'\.cta-hero\s+\.cta-title\s+a:hover\s*\{[^}]*\}',
        
        # Old .kpi-lite styles (lines 4016-4110)
        r'\.kpi-lite\s*\{[^}]*\}',
        r'\.kpi-lite__list\s*\{[^}]*\}',
        r'\.kpi-lite__item\s*\{[^}]*\}',
        r'\.kpi-lite__bubble\s*\{[^}]*\}',
        r'\.kpi-lite__num\s*\{[^}]*\}',
        r'\.kpi-lite__icon\s*\{[^}]*\}',
        r'\.kpi-lite__label\s*\{[^}]*\}',
        
        # Animation keyframes
        r'@keyframes\s+sch-rail-move\s*\{[^}]*\}',
        r'@keyframes\s+ctaSpin\s*\{[^}]*\}',
    ]
    
    for pattern in patterns_to_remove:
        style_content = re.sub(pattern, '', style_content, flags=re.DOTALL)
    
    # Remove empty lines (more than 2 consecutive)
    style_content = re.sub(r'\n{3,}', '\n\n', style_content)
    
    return style_content

def main():
    # Read files
    with open('/var/www/troy-groups/Client/assets/css/home.css', 'r') as f:
        home_content = f.read()
    
    with open('/var/www/troy-groups/Client/assets/css/style.css', 'r') as f:
        style_content = f.read()
    
    # Remove comments from home.css
    home_content = remove_comments(home_content)
    
    # Remove old styles from style.css
    style_content = remove_old_home_styles(style_content)
    
    # Append home.css content to style.css
    merged_content = style_content.rstrip() + '\n\n' + home_content.strip() + '\n'
    
    # Remove extra blank lines
    merged_content = re.sub(r'\n{3,}', '\n\n', merged_content)
    
    # Write merged content
    with open('/var/www/troy-groups/Client/assets/css/style.css', 'w') as f:
        f.write(merged_content)
    
    print("✓ Merged home.css into style.css")
    print("✓ Removed all comments")
    print("✓ Removed old overrides")

if __name__ == '__main__':
    main()
