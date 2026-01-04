#!/usr/bin/env python3
"""
Generate _category_.json files for Docusaurus category index pages.
This prevents Docusaurus from automatically redirecting to the first page
in a category and instead shows a generated index page.

Also updates descriptions with page counts and function counts.
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict

def get_category_icon(dir_name):
    """Get Font Awesome icon class name for category based on directory name."""
    # Map category names to Font Awesome icon classes (using free solid icons)
    icon_map = {
        # Script categories
        'AI': 'robot',
        'Animation': 'film',
        'Animals': 'paw',
        'Collections': 'layer-group',
        'Components': 'puzzle-piece',
        'Configurations': 'cogs',
        'Contracts': 'file-contract',
        'Data': 'database',
        'Debug': 'bug',
        'Economy': 'coins',
        'Elements': 'th',
        'Errors': 'exclamation-triangle',
        'Events': 'calendar-alt',
        'Extensions': 'plug',
        'Farms': 'tractor',
        'Field': 'seedling',
        'FillTypes': 'chart-bar',
        'Fruits': 'apple-alt',
        'GUI': 'desktop',
        'Graphical': 'image',
        'Graphics': 'images',
        'GuidedTour': 'route',
        'Handtools': 'hammer',
        'Hud': 'mobile-alt',
        'I3d': 'cube',
        'Input': 'keyboard',
        'Instances': 'copy',
        'Jobs': 'briefcase',
        'Materials': 'palette',
        'Misc': 'ellipsis-h',
        'Missions': 'bullseye',
        'Networking': 'network-wired',
        'Objects': 'box',
        'Parameters': 'list',
        'Placeables': 'building',
        'Placement': 'map-marker-alt',
        'Player': 'user',
        'Rollercoaster': 'train',
        'Ship': 'ship',
        'Shop': 'shopping-cart',
        'Sounds': 'volume-up',
        'Specialization': 'star',
        'Specializations': 'star',
        'StateMachine': 'sync-alt',
        'Tasks': 'check-square',
        'Triggers': 'hand-pointer',
        'Utils': 'tools',
        'Vehicles': 'car',
        'Weather': 'cloud-sun',
        'Wheels': 'circle',
        'Activatables': 'toggle-on',
        'Base': 'layer-group',
        'Boatyard': 'anchor',
        'Ferry': 'ferry',
        
        # Engine categories
        'Animation': 'film',
        'Camera': 'camera',
        'Debug': 'bug',
        'Entity': 'cube',
        'Fillplanes': 'square',
        'Foliage': 'leaf',
        'General': 'book',
        'I3D': 'cube',
        'Input': 'keyboard',
        'Lighting': 'lightbulb',
        'Math': 'calculator',
        'NavMesh': 'map',
        'Network': 'network-wired',
        'Node': 'link',
        'NoteNode': 'sticky-note',
        'Overlays': 'layer-group',
        'Particle System': 'wand-magic-sparkles',
        'Physics': 'atom',
        'PointList2D': 'chart-line',
        'Precipitation': 'cloud-rain',
        'Rendering': 'paint-brush',
        'ShallowWaterSimulation': 'water',
        'Shape': 'shapes',
        'Sound': 'volume-up',
        'Spline': 'project-diagram',
        'String': 'font',
        'Terrain': 'mountain',
        'Terrain Detail': 'seedling',
        'Text Rendering': 'text-height',
        'Tire Track': 'road',
        'VoiceChat': 'microphone',
        'XML': 'file-code',
        
        # Foundation categories
        'Scenegraph': 'sitemap',
    }
    
    # Try exact match first
    if dir_name in icon_map:
        return icon_map[dir_name]
    
    # Try case-insensitive match
    dir_lower = dir_name.lower()
    for key, icon in icon_map.items():
        if key.lower() == dir_lower:
            return icon
    
    # Default icon for unmapped categories
    return 'folder'

def get_category_label(dir_name):
    """Convert directory name to a readable label while preserving acronyms."""
    # If entire string is uppercase (or uppercase with numbers), it's an acronym - return as is
    if re.match(r'^[A-Z0-9]+$', dir_name):
        return dir_name
    
    # Replace underscores and hyphens with spaces first
    label = dir_name.replace('_', ' ').replace('-', ' ')
    
    # Split on camelCase boundaries while preserving acronyms
    # Split on: lowercase/number followed by uppercase, or uppercase sequence followed by lowercase
    parts = re.split(r'(?<=[a-z\d])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])', label)
    parts = [p.strip() for p in parts if p.strip()]
    
    # Join with spaces
    result = ' '.join(parts)
    
    # Format words: preserve all-caps acronyms, title case others
    words = result.split()
    formatted_words = []
    for word in words:
        # If word is all uppercase with optional numbers (acronym), keep it as is
        if re.match(r'^[A-Z0-9]+$', word):
            formatted_words.append(word)
        else:
            # Otherwise, title case it
            formatted_words.append(word.title())
    
    return ' '.join(formatted_words)

def count_functions_in_file(md_file):
    """Count the number of functions listed in a markdown file."""
    try:
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Look for the Functions section
        functions_match = re.search(r'\*\*Functions\*\*\s*\n\s*\n((?:- \[.*?\]\(.*?\)\s*\n?)+)', content)
        if functions_match:
            functions_text = functions_match.group(1)
            # Count the number of function list items
            function_count = len(re.findall(r'^- \[.*?\]', functions_text, re.MULTILINE))
            return function_count
        return 0
    except Exception as e:
        print(f"Warning: Could not read {md_file}: {e}")
        return 0

def generate_function_counts_json(docs_dir):
    """Generate a JSON file mapping file paths to function counts."""
    function_counts = {}
    
    # Walk through all markdown files
    for root, dirs, files in os.walk(docs_dir):
        for file in files:
            if file.endswith('.md') and file != '_category_.json':
                md_file = Path(root) / file
                # Get relative path from docs_dir
                rel_path = md_file.relative_to(docs_dir)
                # Convert to URL path (remove .md extension, use forward slashes)
                # This should match Docusaurus docId format
                url_path = str(rel_path).replace('\\', '/').replace('.md', '')
                
                function_count = count_functions_in_file(md_file)
                if function_count > 0:
                    # Store by full path (e.g., "script/AI/AISystem")
                    function_counts[url_path] = function_count
    
    # Write to JSON file in website/static directory
    json_path = Path(__file__).parent.parent / "website" / "static" / "function-counts.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(function_counts, f, indent=2, ensure_ascii=False)
    
    print(f"\nGenerated function counts JSON: {len(function_counts)} files with functions")
    return len(function_counts)

def generate_category_icons_json(docs_dir):
    """Generate a JSON file mapping category paths to their icons."""
    category_icons = {}
    
    # Walk through all directories
    for category_dir in docs_dir.rglob("*"):
        if not category_dir.is_dir():
            continue
        
        # Skip the root docs directory itself
        if category_dir == docs_dir:
            continue
        
        # Get relative path from docs directory
        rel_path = category_dir.relative_to(docs_dir)
        category_path = str(rel_path).replace('\\', '/')
        
        # Skip if it's a main category (engine, foundation, script)
        path_parts = category_path.split('/')
        if len(path_parts) == 1 and path_parts[0] in ['engine', 'foundation', 'script']:
            continue
        
        # Check if this directory has a _category_.json file
        category_json = category_dir / "_category_.json"
        icon = None
        
        if category_json.exists():
            try:
                with open(category_json, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    # Check both old format (icon at root) and new format (icon in customProps)
                    icon = config.get("customProps", {}).get("icon") or config.get("icon")
            except Exception as e:
                print(f"Warning: Could not read {category_json} for icon generation: {e}")
        
        # If no icon from JSON file, try to get icon from directory name
        if not icon:
            dir_name = category_dir.name
            icon = get_category_icon(dir_name)
        
        # Only add if we have an icon and it's not the default 'folder' icon
        if icon and icon != 'folder':
            category_icons[category_path] = icon
    
    # Write to website/static/category-icons.json
    json_path = Path(__file__).parent.parent / "website" / "static" / "category-icons.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(category_icons, f, indent=2, ensure_ascii=False)
    
    print(f"\nGenerated category icons JSON: {len(category_icons)} categories with icons")
    return len(category_icons)

def get_category_description(directory, is_main_category=False):
    """Generate a description for a category based on its contents."""
    md_files = list(directory.glob("*.md"))
    page_count = len(md_files)
    
    if page_count == 0:
        return "Documentation for this category."
    
    if is_main_category:
        # For main categories, just show page count
        return f"{page_count} pages"
    
    # For subcategories, count total functions across all pages
    total_functions = 0
    for md_file in md_files:
        total_functions += count_functions_in_file(md_file)
    
    if total_functions > 0:
        return f"{page_count} pages, {total_functions} functions"
    else:
        return f"{page_count} pages"

def should_update_category_index(directory):
    """Check if a directory should have a category index."""
    md_files = list(directory.glob("*.md"))
    # Update if there are multiple markdown files
    return len(md_files) > 1

def create_or_update_category_json(directory, is_main_category=False):
    """Create or update a _category_.json file for a directory."""
    dir_name = directory.name
    label = get_category_label(dir_name)
    description = get_category_description(directory, is_main_category)
    icon = get_category_icon(dir_name)
    
    json_path = directory / "_category_.json"
    
    # If file exists, read it to preserve other settings
    if json_path.exists():
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                category_config = json.load(f)
        except Exception as e:
            print(f"Warning: Could not read {json_path}: {e}")
            category_config = {}
    else:
        category_config = {}
    
    # Update or create the structure
    if "link" not in category_config:
        category_config["link"] = {}
    
    category_config["label"] = label
    # Remove old root-level icon field if it exists (not allowed by Docusaurus)
    if "icon" in category_config:
        del category_config["icon"]
    # Use customProps for icon (Docusaurus doesn't allow icon at root level)
    if "customProps" not in category_config:
        category_config["customProps"] = {}
    category_config["customProps"]["icon"] = icon
    category_config["link"]["type"] = "generated-index"
    category_config["link"]["title"] = f"{label} Documentation"
    
    # Remove HTML tags from description if present, and update with new counts
    description_clean = re.sub(r'<[^>]+>', '', description).strip()
    category_config["link"]["description"] = description_clean
    
    # Write the JSON file
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(category_config, f, indent=2, ensure_ascii=False)
    
    # Get relative path for display
    docs_dir = Path(__file__).parent.parent / "docs"
    rel_path = json_path.relative_to(docs_dir.parent)
    action = "Updated" if json_path.exists() else "Created"
    print(f"{action}: {rel_path} ({description_clean})")

def update_sidebars_with_page_counts(sidebars_path, docs_dir):
    """Update sidebars.js with page counts for main categories."""
    main_categories = {
        'engine': 'Engine',
        'foundation': 'Foundation',
        'script': 'Script'
    }
    
    # Count pages in each main category
    category_counts = {}
    for category_dir_name, category_label in main_categories.items():
        category_dir = docs_dir / category_dir_name
        if category_dir.exists():
            md_files = list(category_dir.glob("**/*.md"))
            # Exclude _category_.json related files and only count actual doc files
            md_files = [f for f in md_files if f.name != '_category_.json']
            category_counts[category_label] = len(md_files)
    
    # Read the sidebars file
    try:
        with open(sidebars_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Update descriptions for main categories
        for category_label, count in category_counts.items():
            # Find and replace the description line for this category
            # Match: description: '...' within the link object for this category
            escaped_label = re.escape(category_label)
            # Match the description value (non-greedy to stop at the closing quote)
            pattern = rf'(label:\s*[\'"]{escaped_label}[\'"],\s*link:\s*{{[^}}]*?description:\s*[\'"])([^\'"]+)([\'"],)'
            # Use a lambda to avoid group reference issues
            def replace_desc(match):
                return match.group(1) + f"{count} pages" + match.group(3)
            content = re.sub(pattern, replace_desc, content, flags=re.DOTALL)
        
        # Write back
        with open(sidebars_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"\nUpdated sidebars.js with page counts:")
        for category_label, count in category_counts.items():
            print(f"  {category_label}: {count} pages")
            
    except Exception as e:
        print(f"Warning: Could not update sidebars.js: {e}")


def main():
    """Main function to generate category indexes."""
    docs_dir = Path(__file__).parent.parent / "docs"
    sidebars_path = Path(__file__).parent.parent / "website" / "sidebars.js"
    
    if not docs_dir.exists():
        print(f"Error: {docs_dir} does not exist")
        return
    
    updated_count = 0
    main_categories = {'engine', 'foundation', 'script'}
    
    # Walk through all subdirectories in docs
    for root, dirs, files in os.walk(docs_dir):
        directory = Path(root)
        
        # Skip the root docs directory itself
        if directory == docs_dir:
            continue
        
        # Check if this is a main category
        is_main_category = directory.name in main_categories and directory.parent == docs_dir
        
        if should_update_category_index(directory):
            create_or_update_category_json(directory, is_main_category)
            updated_count += 1
    
    # Update sidebars.js with page counts for main categories
    if sidebars_path.exists():
        update_sidebars_with_page_counts(sidebars_path, docs_dir)
    
    # Generate function counts JSON file
    generate_function_counts_json(docs_dir)
    generate_category_icons_json(docs_dir)
    
    print(f"\nProcessed {updated_count} category index files.")

if __name__ == "__main__":
    main()
