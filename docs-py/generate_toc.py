#!/usr/bin/env python3
"""
Generate a comprehensive table of contents for the FS25 LUADOC documentation.
"""

import os
import re
from pathlib import Path
from collections import defaultdict
from urllib.parse import quote

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

def get_file_link(relative_path, anchor=None):
    """Generate GitHub blob URL for a file with proper URL encoding."""
    # Convert path separators to forward slashes
    path_str = str(relative_path).replace(os.sep, '/')
    # Split path into components and URL-encode each part
    # This handles spaces and special characters in filenames
    path_parts = path_str.split('/')
    encoded_parts = [quote(part, safe='') for part in path_parts]
    encoded_path = '/'.join(encoded_parts)
    url = f"{REPO_URL}/blob/main/{encoded_path}"
    if anchor:
        url += f"#{anchor}"
    return url

def extract_functions_from_markdown(filepath):
    """Extract function names from a markdown file's Functions section."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the Functions section
        # Pattern: **Functions** followed by a list of links
        functions_pattern = r'\*\*Functions\*\*\s*\n\s*\n((?:- \[.*?\]\(#.*?\)\s*\n?)+)'
        match = re.search(functions_pattern, content)
        
        if not match:
            return []
        
        functions_text = match.group(1)
        # Extract function names and anchors from markdown links
        # Pattern: - [functionName](#anchor)
        function_pattern = r'- \[([^\]]+)\]\(#([^\)]+)\)'
        functions = re.findall(function_pattern, functions_text)
        
        # Return list of (display_name, anchor) tuples
        return [(name.strip(), anchor.strip()) for name, anchor in functions]
    except Exception as e:
        # If file can't be read or parsed, return empty list
        return []

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

def generate_toc(structure):
    """Generate the table of contents markdown."""
    toc_lines = []
    toc_lines.append("# 📚 FS25 Community LUADOC - Table of Contents")
    toc_lines.append("")
    

    categories = sorted(structure.keys())
    
    # Usage tips
    toc_lines.append("## 💡 How to Use This Table of Contents")
    toc_lines.append("")
    toc_lines.append("### Quick Search")
    toc_lines.append("")
    toc_lines.append("- **Use `Ctrl+F` (or `Cmd+F` on Mac)** to search for specific topics, functions, or classes")
    toc_lines.append("- **Click category links** below to jump directly to that section")
    toc_lines.append("- **Function links** are nested under their parent class/page (indented)")
    toc_lines.append("")
    toc_lines.append("### Navigation Tips")
    toc_lines.append("")
    toc_lines.append("- **Engine** - Core engine functions and low-level APIs")
    toc_lines.append("- **Foundation** - Foundation layer APIs and utilities")
    toc_lines.append("- **Script** - Game scripting APIs, classes, and specializations (includes function listings)")
    toc_lines.append("")
    toc_lines.append("### Link Format")
    toc_lines.append("")
    toc_lines.append("- **Page links** → Navigate to the full documentation page")
    toc_lines.append("- **Function links** (indented) → Jump directly to a specific function within a page")
    toc_lines.append("")
    toc_lines.append("---")
    toc_lines.append("")
    
    # Generate quick navigation links
    toc_lines.append("## 🧭 Quick Navigation")
    toc_lines.append("")
    for category in categories:
        category_name = category.capitalize()
        # GitHub automatically creates anchors from headers, lowercase with hyphens
        anchor = category_name.lower().replace(' ', '-')
        subcategories = structure[category]
        category_file_count = sum(len(files) for files in subcategories.values())
        toc_lines.append(f"- **[{category_name}](#{anchor})** - {category_file_count:,} pages")
    toc_lines.append("")
    toc_lines.append("---")
    toc_lines.append("")
    
    # Generate full table of contents
    for category in categories:
        # Category header (GitHub auto-generates anchor from header text)
        category_name = category.capitalize()
        toc_lines.append(f"## 📖 {category_name}")
        toc_lines.append("")
        
        subcategories = structure[category]
        
        # Count files in this category
        category_file_count = sum(len(files) for files in subcategories.values())
        
        # Count functions for script category (pre-calculate to avoid double counting)
        if category == 'script':
            category_functions = 0
            for files in subcategories.values():
                for filename, filepath in files:
                    functions = extract_functions_from_markdown(filepath)
                    category_functions += len(functions)
            toc_lines.append(f"*{category_file_count:,} pages • {category_functions:,} functions*")
        else:
            toc_lines.append(f"*{category_file_count:,} pages*")
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
                    
                    # Extract and add functions for script files
                    if category == 'script':
                        functions = extract_functions_from_markdown(filepath)
                        if functions:
                            for func_name, func_anchor in functions:
                                func_link = get_file_link(f"docs/{rel_path}", func_anchor)
                                toc_lines.append(f"  - [{func_name}]({func_link})")
            else:
                # Subcategory header
                subcategory_name = subcategory.replace('_', ' ').title()
                # Count files in this subcategory
                subcategory_file_count = len(files)
                toc_lines.append(f"### {subcategory_name}")
                toc_lines.append("")
                toc_lines.append(f"*{subcategory_file_count} page{'s' if subcategory_file_count != 1 else ''}*")
                toc_lines.append("")
                
                for filename, filepath in sorted(files):
                    # Get relative path from docs folder for the link
                    rel_path = filepath.relative_to(DOCS_PATH)
                    link = get_file_link(f"docs/{rel_path}")
                    display_name = sanitize_name(filename)
                    toc_lines.append(f"- [{display_name}]({link})")
                    
                    # Extract and add functions for script files
                    if category == 'script':
                        functions = extract_functions_from_markdown(filepath)
                        if functions:
                            for func_name, func_anchor in functions:
                                func_link = get_file_link(f"docs/{rel_path}", func_anchor)
                                toc_lines.append(f"  - [{func_name}]({func_link})")
                
                toc_lines.append("")
        
        toc_lines.append("")
    
    return '\n'.join(toc_lines)

def generate_readme(total_files, total_functions):
    """Generate README.md with statistics."""
    readme_content = """# FS25 Community LUADOC

This repository contains comprehensive documentation for all Lua scripting APIs available in Farming Simulator 25. All of the original documentation was converted to markdown format via script for easier reading and keeping.

## Documentation

> [!IMPORTANT]
> [View Table of Contents](TABLE_OF_CONTENTS.md)

| Metric | Count |
|--------|-------|
| **Total Pages** | **{total_files:,}** |
| **Total Script Functions** | **{total_functions:,}** |

## Contributing

This is a community-maintained documentation repository, contributions and improvements are welcome!
> [!TIP]
> If you find any errors be sure to let us know by making an issue or pull request.
"""
    return readme_content.format(
        total_files=total_files,
        total_functions=total_functions,
    )

if __name__ == "__main__":
    # Collect structure first to calculate statistics
    structure = collect_docs(DOCS_PATH)
    
    # Count total files and functions
    total_files = sum(
        len(files)
        for category in structure.values()
        for files in category.values()
    )
    
    # Count total functions in script files
    total_functions = 0
    for category_name, subcategories in structure.items():
        if category_name == 'script':
            for files in subcategories.values():
                for filename, filepath in files:
                    functions = extract_functions_from_markdown(filepath)
                    total_functions += len(functions)
    
    # Generate TOC
    toc = generate_toc(structure)
    print(toc)
    
    # Save TOC to root directory
    output_file = ROOT_DIR / "TABLE_OF_CONTENTS.md"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(toc)
    
    print(f"\n\nTable of contents generated and saved to {output_file}")
    
    # Generate and save README
    readme = generate_readme(total_files, total_functions)
    readme_file = ROOT_DIR / "README.md"
    with open(readme_file, 'w', encoding='utf-8') as f:
        f.write(readme)
    
    print(f"README.md updated with statistics at {readme_file}")