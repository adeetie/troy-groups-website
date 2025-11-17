#!/usr/bin/env python3
"""
Remove all CSS comments from style.css
"""

import re

def remove_all_css_comments(css_content):
    """Remove all CSS comments including multiline"""
    # Remove /* ... */ comments (including multiline)
    css_content = re.sub(r'/\*.*?\*/', '', css_content, flags=re.DOTALL)
    
    # Clean up excessive blank lines (more than 2)
    css_content = re.sub(r'\n{3,}', '\n\n', css_content)
    
    # Clean up blank lines at start of file
    css_content = css_content.lstrip('\n')
    
    return css_content

def main():
    # Read style.css
    with open('/var/www/troy-groups/Client/assets/css/style.css', 'r') as f:
        content = f.read()
    
    # Remove all comments
    content = remove_all_css_comments(content)
    
    # Write back
    with open('/var/www/troy-groups/Client/assets/css/style.css', 'w') as f:
        f.write(content)
    
    print("✓ Removed all comments from style.css")
    
    # Count remaining comments
    with open('/var/www/troy-groups/Client/assets/css/style.css', 'r') as f:
        remaining = f.read().count('/*')
    
    print(f"✓ Comments remaining: {remaining}")

if __name__ == '__main__':
    main()
