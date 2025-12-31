#!/usr/bin/env python3
"""
Generate a comprehensive table of contents for the FS25 LUADOC documentation.
"""

import os
from pathlib import Path
from collections import defaultdict

# Base repository URL
REPO_URL = "https://github.com/umbraprior/FS25-Community-LUADOC"
# Script is in gdn-downloader/, docs are in ../docs/, output goes to ../
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
DOCS_PATH = ROOT_DIR / "docs"

def sanitize_name(name):
    """Convert filename to a readable name."""
    # Remove .md extension
    name = name.replace('.md', '')
    # Convert camelCase to Title Case
    import re
    name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    # Capitalize first letter
    return name[0].upper() + name[1:] if name else name

def get_file_link(relative_path):
    """Generate GitHub blob URL for a file."""
    return f"{REPO_URL}/blob/main/{relative_path.replace(os.sep, '/')}"

def collect_docs(docs_path):
    """Collect all markdown files organized by directory structure."""
    structure = defaultdict(lambda: defaultdict(list))
    
    for root, dirs, files in os.walk(docs_path):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        # Get relative path from docs_path
        rel_path = Path(root).relative_to(docs_path)
        
        # Get category (engine, foundation, script)
        if len(rel_path.parts) > 0:
            category = rel_path.parts[0]
            subcategory = rel_path.parts[1] if len(rel_path.parts) > 1 else None
            
            # Collect markdown files
            md_files = sorted([f for f in files if f.endswith('.md')])
            
            if md_files:
                if subcategory:
                    structure[category][subcategory].extend([
                        (f, Path(root) / f) for f in md_files
                    ])
                else:
                    structure[category]['_root'].extend([
                        (f, Path(root) / f) for f in md_files
                    ])
    
    return structure

def generate_toc():
    """Generate the table of contents markdown."""
    structure = collect_docs(DOCS_PATH)
    
    toc_lines = []
    toc_lines.append("# Table of Contents")
    toc_lines.append("")
    toc_lines.append("> [!NOTE]")
    toc_lines.append("> This documentation contains a lot of pages. Use Ctrl+F to search for specific topics.")
    toc_lines.append("")
    
    # Count total files
    total_files = sum(
        len(files)
        for category in structure.values()
        for files in category.values()
    )
    toc_lines.append(f"**Total Documentation Pages:** {total_files}")
    toc_lines.append("")
    
    # Sort categories
    categories = sorted(structure.keys())
    
    # Generate quick navigation links
    toc_lines.append("## Quick Navigation")
    toc_lines.append("")
    for category in categories:
        category_name = category.capitalize()
        # GitHub automatically creates anchors from headers, lowercase with hyphens
        anchor = category_name.lower().replace(' ', '-')
        toc_lines.append(f"- [{category_name}](#{anchor})")
    toc_lines.append("")
    toc_lines.append("---")
    toc_lines.append("")
    
    # Generate full table of contents
    for category in categories:
        # Category header (GitHub auto-generates anchor from header text)
        category_name = category.capitalize()
        toc_lines.append(f"## {category_name}")
        toc_lines.append("")
        
        subcategories = structure[category]
        
        # Count files in this category
        category_file_count = sum(len(files) for files in subcategories.values())
        toc_lines.append(f"*{category_file_count} pages*")
        toc_lines.append("")
        
        # Sort subcategories, but put _root first
        sorted_subs = sorted([k for k in subcategories.keys() if k != '_root'])
        if '_root' in subcategories:
            sorted_subs.insert(0, '_root')
        
        for subcategory in sorted_subs:
            files = subcategories[subcategory]
            
            if subcategory == '_root':
                # Files in root of category
                for filename, filepath in sorted(files):
                    # Get relative path from docs folder for the link
                    rel_path = filepath.relative_to(DOCS_PATH)
                    link = get_file_link(f"docs/{rel_path}")
                    display_name = sanitize_name(filename)
                    toc_lines.append(f"- [{display_name}]({link})")
            else:
                # Subcategory header
                subcategory_name = subcategory.replace('_', ' ').title()
                toc_lines.append(f"### {subcategory_name}")
                toc_lines.append("")
                
                for filename, filepath in sorted(files):
                    # Get relative path from docs folder for the link
                    rel_path = filepath.relative_to(DOCS_PATH)
                    link = get_file_link(f"docs/{rel_path}")
                    display_name = sanitize_name(filename)
                    toc_lines.append(f"- [{display_name}]({link})")
                
                toc_lines.append("")
        
        toc_lines.append("")
    
    return '\n'.join(toc_lines)

if __name__ == "__main__":
    toc = generate_toc()
    print(toc)
    
    # Save to root directory (one level up from script location)
    output_file = ROOT_DIR / "TABLE_OF_CONTENTS.md"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(toc)
    
    print(f"\n\nTable of contents generated and saved to {output_file}")