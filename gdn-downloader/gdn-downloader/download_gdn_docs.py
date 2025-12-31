#!/usr/bin/env python3
"""
GDN Documentation Downloader
Downloads all GDN documentation pages and converts them to GitHub-flavored markdown.
"""

import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md
import os
import re
import time
import sys
from urllib.parse import urljoin, urlparse, parse_qs
from pathlib import Path
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# Base URL for GDN documentation
BASE_URL = 'https://gdn.giants-software.com/documentation_scripting_fs25.php'
BASE_DOMAIN = 'https://gdn.giants-software.com'

# Headers to mimic a browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

# Rate limiting
REQUEST_DELAY = 0.5  # seconds between requests
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds before retry

class GDNDownloader:
    def __init__(self, output_dir='docs', page_filter=None, max_workers=5):
        self.output_dir = Path(output_dir)
        self.page_filter = page_filter  # Filter to only download specific pages
        self.max_workers = max_workers  # Number of concurrent downloads
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.downloaded_urls = set()
        self.failed_urls = []
        self.stats = {
            'total': 0,
            'downloaded': 0,
            'failed': 0,
            'skipped': 0
        }
        self.stats_lock = Lock()  # Lock for thread-safe stats updates
        self.downloaded_urls_lock = Lock()  # Lock for thread-safe URL tracking
        
    def sanitize_filename(self, name):
        """Sanitize a string to be used as a filename."""
        # Remove or replace invalid characters
        name = re.sub(r'[<>:"/\\|?*]', '_', name)
        # Remove leading/trailing spaces and dots
        name = name.strip('. ')
        # Limit length
        if len(name) > 200:
            name = name[:200]
        return name or 'untitled'
    
    def fetch_page(self, url, retries=MAX_RETRIES):
        """Fetch a page with retry logic."""
        # Use thread-local session for thread safety
        import threading
        if not hasattr(threading.current_thread(), 'local_session'):
            threading.current_thread().local_session = requests.Session()
            threading.current_thread().local_session.headers.update(HEADERS)
        session = threading.current_thread().local_session
        
        for attempt in range(retries):
            try:
                time.sleep(REQUEST_DELAY)
                response = session.get(url, timeout=15)
                response.raise_for_status()
                return response.text
            except requests.exceptions.RequestException as e:
                if attempt < retries - 1:
                    time.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    return None
        return None
    
    def extract_toc_links(self, html_content, from_content_area=False):
        """Extract all documentation links from the TOC with subcategory information.
        
        Args:
            html_content: HTML content to parse
            from_content_area: If True, extract links from main content area instead of TOC sidebar
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        links = []
        current_subcategory = None
        current_version = None
        
        # Find the TOC area (left sidebar) or content area
        if from_content_area:
            # Extract from main content area (for category pages)
            # Category pages list functions in the content area, not in the TOC
            toc_area = soup.find('div', style=lambda x: x and 'margin-left:200px' in x)
            if not toc_area:
                # Fallback: try to find content div
                toc_area = soup.find('div', class_='entry')
                if toc_area:
                    # Remove the TOC sidebar if present
                    for div in toc_area.find_all('div', style=lambda x: x and 'width:200px' in x):
                        div.decompose()
            
            # If extracting from content area, find ALL links in the content (not just in lists)
            # Function pages are typically listed as links in the content area
            if toc_area:
                # Find all links in the content area
                all_content_links = toc_area.find_all('a', href=True)
                current_version = None
                
                # Try to determine version from the page URL or first link
                for link in all_content_links:
                    href = link.get('href', '')
                    if not href:
                        continue
                    
                    # Handle relative URLs
                    if href.startswith('?'):
                        full_url = BASE_URL + href
                    elif href.startswith('/'):
                        full_url = BASE_DOMAIN + href
                    elif 'documentation_scripting_fs25.php' in href:
                        if not href.startswith('http'):
                            full_url = BASE_DOMAIN + '/' + href.lstrip('/')
                        else:
                            full_url = href
                    else:
                        continue
                    
                    # Only process documentation links
                    if 'version=' in full_url:
                        parsed = urlparse(full_url)
                        params = parse_qs(parsed.query)
                        version = params.get('version', [''])[0]
                        if version:
                            current_version = version
                            break
                
                # Now extract all documentation links from content
                for link in all_content_links:
                    href = link.get('href', '')
                    if not href:
                        continue
                    
                    # Handle relative URLs
                    if href.startswith('?'):
                        full_url = BASE_URL + href
                    elif href.startswith('/'):
                        full_url = BASE_DOMAIN + href
                    elif 'documentation_scripting_fs25.php' in href:
                        if not href.startswith('http'):
                            full_url = BASE_DOMAIN + '/' + href.lstrip('/')
                        else:
                            full_url = href
                    else:
                        continue
                    
                    # Only process documentation links with version parameter
                    if 'version=' in full_url:
                        link_text = link.get_text(strip=True)
                        if link_text:
                            parsed = urlparse(full_url)
                            params = parse_qs(parsed.query)
                            version = params.get('version', [''])[0]
                            
                            # Determine subcategory from context or URL
                            subcategory = None
                            if version == 'engine' and 'category' in params:
                                # For Engine, subcategory is the category name
                                # We can try to find it from the page structure or use the category page title
                                # For now, we'll try to extract from nearby text
                                parent = link.find_parent(['p', 'div', 'li'])
                                if parent:
                                    # Look for category name in parent or siblings
                                    parent_text = parent.get_text(strip=True)
                                    # Category name might be in a heading or bold text nearby
                                    heading = parent.find_previous(['h1', 'h2', 'h3', 'h4'])
                                    if heading:
                                        subcategory = heading.get_text(strip=True)
                            
                            link_info = {
                                'url': full_url,
                                'text': link_text,
                                'href': href,
                                'subcategory': subcategory,
                                'version': version or current_version
                            }
                            links.append(link_info)
                
                # Return early since we've extracted from content area
                if links:
                    return links
        else:
            # Find the TOC area (left sidebar)
            toc_area = soup.find('div', style=lambda x: x and 'width:200px' in x)
            if not toc_area:
                # Try alternative selectors
                toc_area = soup.find('div', class_='entry')
        
        if not toc_area:
            return links
        
        def process_link_element(link_element, subcategory=None, version=None):
            """Process a single link element and return link info or None."""
            href = link_element.get('href', '')
            if not href:
                return None
            
            # Handle relative URLs
            if href.startswith('?'):
                full_url = BASE_URL + href
            elif href.startswith('/'):
                full_url = BASE_DOMAIN + href
            elif 'documentation_scripting_fs25.php' in href:
                if not href.startswith('http'):
                    full_url = BASE_DOMAIN + '/' + href.lstrip('/')
                else:
                    full_url = href
            else:
                return None
            
            # Only include documentation links (with version parameter)
            if 'version=' not in full_url:
                return None
            
            link_text = link_element.get_text(strip=True)
            if not link_text:
                return None
            
            return {
                'url': full_url,
                'text': link_text,
                'href': href,
                'subcategory': subcategory,
                'version': version
            }
        
        # Parse the TOC structure recursively
        def process_list_item(li, subcategory=None, version=None):
            """Recursively process a list item and its children."""
            # Check if this li has a nested ul (it's a category with subcategories)
            nested_ul = li.find('ul', recursive=False)
            category_link = li.find('a', recursive=False)
            
            if nested_ul:
                # This is a category/subcategory header with nested items
                if category_link:
                    category_info = process_link_element(category_link, subcategory, version)
                    if category_info:
                        category_name = category_info['text']
                        # For Engine and Foundation, check if this is a main category page
                        # (has category but no class/function/fFunction)
                        parsed = urlparse(category_info['url'])
                        params = parse_qs(parsed.query)
                        page_version = params.get('version', [''])[0]
                        
                        # Check if this is a main category page (no actual content)
                        is_main_category = False
                        if page_version == 'engine':
                            is_main_category = 'category' in params and 'class' not in params and 'function' not in params
                        elif page_version == 'foundation':
                            is_main_category = 'fCategory' in params and 'fFunction' not in params
                        
                        # Only add category pages if they're not main category pages
                        # (main category pages have no content, subcategory pages do)
                        if not is_main_category:
                            links.append(category_info)
                        
                        # Process nested items with this as the subcategory
                        new_subcategory = category_name
                    else:
                        # No link, but still a category header
                        new_subcategory = li.get_text(strip=True).split('\n')[0]
                    
                    # Process nested list items - these are the function pages!
                    for nested_li in nested_ul.find_all('li', recursive=False):
                        process_list_item(nested_li, new_subcategory, version)
                else:
                    # Category header without link
                    category_text = li.get_text(strip=True).split('\n')[0]
                    for nested_li in nested_ul.find_all('li', recursive=False):
                        process_list_item(nested_li, category_text, version)
            else:
                # Regular list item (no nested ul) - it's a page
                if category_link:
                    link_info = process_link_element(category_link, subcategory, version)
                    if link_info:
                        # For Script, if this is a subcategory link (has class but no function),
                        # use the link text as the subcategory name
                        if version == 'script':
                            parsed = urlparse(link_info['url'])
                            params = parse_qs(parsed.query)
                            if 'class' in params and 'function' not in params:
                                # This is a Script subcategory link - use link text as subcategory
                                if not link_info.get('subcategory'):
                                    link_info['subcategory'] = link_info['text']
                        links.append(link_info)
        
        # Walk through the TOC structure
        for element in toc_area.children:
            # Check for version headers
            if element.name == 'h3':
                version_text = element.get_text(strip=True)
                if 'Script' in version_text:
                    current_version = 'script'
                    current_subcategory = None
                elif 'Engine' in version_text:
                    current_version = 'engine'
                    current_subcategory = None
                elif 'Foundation' in version_text:
                    current_version = 'foundation'
                    current_subcategory = None
            
            # Process lists
            if element.name == 'ul':
                # The structure can have <li> followed by <ul> as siblings (expanded subcategory)
                # We need to process them together
                list_items = list(element.find_all('li', recursive=False))
                for i, li in enumerate(list_items):
                    # Check if next element after this <li> is a <ul> (expanded subcategory)
                    # In BeautifulSoup, we need to check siblings differently
                    # Get all direct children of the <ul>
                    ul_children = list(element.children)
                    li_index = None
                    for idx, child in enumerate(ul_children):
                        if child == li:
                            li_index = idx
                            break
                    
                    if li_index is not None and li_index + 1 < len(ul_children):
                        next_child = ul_children[li_index + 1]
                        if hasattr(next_child, 'name') and next_child.name == 'ul':
                            # This <li> has an expanded <ul> as sibling - process it!
                            category_link = li.find('a', recursive=False)
                            if category_link:
                                category_info = process_link_element(category_link, current_subcategory, current_version)
                                if category_info:
                                    subcategory_name = category_info['text']
                                    # Don't add the category link if it has function/class parameter
                                    # (subcategory link and first page share the same URL)
                                    parsed = urlparse(category_info['url'])
                                    params = parse_qs(parsed.query)
                                    if 'function' not in params and 'class' not in params and 'fFunction' not in params:
                                        # Only add if it's a true subcategory index page (no function/class)
                                        links.append(category_info)
                                else:
                                    subcategory_name = li.get_text(strip=True).split('\n')[0]
                            else:
                                subcategory_name = li.get_text(strip=True).split('\n')[0]
                            
                            # Process all <li> items in the sibling <ul> (these are the actual pages!)
                            # For Engine: these are function pages (use their link text, not subcategory name)
                            # For Script: these are class pages (use their link text)
                            # For Foundation: these are function pages (use their link text)
                            for nested_li in next_child.find_all('li', recursive=False):
                                nested_link = nested_li.find('a')
                                if nested_link:
                                    # Use the nested link's text (function/class name), not subcategory name
                                    link_info = process_link_element(nested_link, subcategory_name, current_version)
                                    if link_info:
                                        links.append(link_info)
                            continue  # Skip normal processing since we handled it above
                    
                    # Normal processing for <li> without expanded sibling
                    process_list_item(li, current_subcategory, current_version)
        
        # If we're extracting from a subcategory page and didn't find many links,
        # try a more aggressive approach: find all links in the TOC that match the current page's category
        if from_content_area and len(links) < 5:
            # This might be a subcategory page - try to find all links in nested structures
            # Look for all <a> tags in the TOC area
            all_toc_links = toc_area.find_all('a', href=True)
            for link_elem in all_toc_links:
                link_info = process_link_element(link_elem, None, None)
                if link_info:
                    links.append(link_info)
        
        return links
    
    def extract_content(self, html_content):
        """Extract the main documentation content from a page."""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Find the main content area (right side, margin-left:200px)
        content_div = soup.find('div', style=lambda x: x and 'margin-left:200px' in x)
        
        if not content_div:
            # Fallback: try to find content by class or structure
            entry_div = soup.find('div', class_='entry')
            if entry_div:
                # Get everything after the TOC (which is typically the first div)
                content_div = entry_div.find('div', style=lambda x: x and 'margin-left' in x)
        
        if not content_div:
            # Last resort: get the entry div and remove the TOC
            entry_div = soup.find('div', class_='entry')
            if entry_div:
                # Remove the TOC sidebar
                for div in entry_div.find_all('div', style=lambda x: x and 'width:200px' in x):
                    div.decompose()
                content_div = entry_div
        
        if content_div:
            # Clean up: remove navigation, footer, etc.
            # Remove any remaining TOC elements
            for elem in content_div.find_all(['div'], style=lambda x: x and 'width:200px' in x if x else False):
                elem.decompose()
            
            # Remove clearfix divs
            for elem in content_div.find_all('div', style=lambda x: x and 'clear:both' in x if x else False):
                elem.decompose()
            
            return str(content_div)
        
        return None
    
    def html_to_markdown(self, html_content):
        """Convert HTML content to GitHub-flavored markdown."""
        if not html_content:
            return ""
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Process argument/parameter tables (class='scripting')
        # Convert first row to header (markdown tables require headers)
        # Preserve all rows and columns as-is from original documentation
        arg_tables = soup.find_all('table', class_='scripting')
        for table in arg_tables:
            rows = table.find_all('tr')
            if not rows:
                continue
            
            # Convert the first row to a header (markdown tables require headers)
            # Simply convert <td> tags to <th> tags, preserving all content
            first_row = rows[0]
            first_cells = first_row.find_all(['td', 'th'])
            
            # Check if first row is already a proper header
            is_header = first_cells and first_cells[0].name == 'th'
            
            # If not already a header, convert all cells in first row to <th> tags
            # This preserves the content while making it a proper header
            if not is_header and first_cells:
                for cell in first_cells:
                    if cell.name != 'th':
                        cell.name = 'th'
        
        # Manually convert tables to markdown AFTER processing them
        # This ensures all rows are preserved and tables are properly formatted
        # markdownify sometimes loses table rows, especially single-row tables
        table_markdowns = {}
        for table in soup.find_all('table', class_='scripting'):
            markdown_table = self._convert_html_table_to_markdown(table)
            if markdown_table:
                # Create a unique ID for this table
                table_id = f"table_{id(table)}"
                table_markdowns[table_id] = markdown_table
                # Replace table with a div that has the markdown in a data attribute
                placeholder = soup.new_tag('div')
                placeholder['class'] = 'markdown-table-placeholder'
                placeholder['data-table-id'] = table_id
                # Use a placeholder that markdownify won't escape
                placeholder.string = 'TABLETABLETABLETABLE'
                table.replace_with(placeholder)
        
        # Convert code-listing-table to proper code blocks
        code_tables = soup.find_all('table', class_='code-listing-table')
        for table in code_tables:
            code_lines = []
            for row in table.find_all('tr'):
                code_cell = row.find('td', class_='code-listing-code')
                if code_cell:
                    # Process the cell: replace styled elements and links
                    for style_tag in code_cell.find_all(['span', 'b']):
                        style_tag.replace_with(style_tag.get_text())
                    
                    for link in code_cell.find_all('a'):
                        link.replace_with(link.get_text())
                    
                    # Get the text content (normalize whitespace)
                    text_content = code_cell.get_text(separator=' ', strip=False)
                    # Clean up: normalize multiple spaces to single space
                    text_content = re.sub(r' +', ' ', text_content.strip())
                    
                    code_lines.append(text_content)
            
            if code_lines:
                # Join lines and clean up
                code_content = '\n'.join(code_lines)
                # Remove extra blank lines (but keep single blank lines for readability)
                code_content = re.sub(r'\n{3,}', '\n\n', code_content)
                
                # Create a code block
                code_block = soup.new_tag('pre')
                code_tag = soup.new_tag('code')
                code_tag.string = code_content
                code_block.append(code_tag)
                # Replace table with code block
                table.replace_with(code_block)
        
        # Convert to string for markdownify
        processed_html = str(soup)
        
        # Convert using markdownify with GitHub flavor
        # Note: markdownify doesn't allow both strip and convert, so we'll use convert
        markdown = md(
            processed_html,
            heading_style='ATX',  # Use # for headings
            bullets='-',  # Use - for lists
            code_language='lua',  # Default language for code blocks
            strip=['script', 'style'],  # Remove script and style tags only
        )
        
        # Replace table placeholders with actual markdown tables
        # The placeholders show up as "TABLETABLETABLETABLE" in the markdown
        if table_markdowns:
            table_markdown_list = list(table_markdowns.values())
            placeholder_count = markdown.count('TABLETABLETABLETABLE')
            if placeholder_count > 0:
                # Replace each occurrence with the corresponding table markdown
                for i, table_markdown in enumerate(table_markdown_list):
                    if i >= placeholder_count:
                        break
                    markdown = markdown.replace('TABLETABLETABLETABLE', table_markdown, 1)
        
        # Post-process to improve markdown quality
        # Add language tag to code blocks that don't have one
        # Process line by line to handle code blocks properly
        lines = markdown.split('\n')
        result = []
        in_code_block = False
        
        for line in lines:
            stripped = line.strip()
            
            # Detect code block start
            if stripped.startswith('```'):
                if not in_code_block:
                    # Starting a code block
                    in_code_block = True
                    # Check if it already has a language tag
                    if stripped == '```' or stripped == '```lua':
                        result.append('```lua')  # Ensure lua tag
                    elif len(stripped) > 3:
                        # Has a different language tag, keep it but we'll change to lua
                        result.append('```lua')
                    else:
                        result.append('```lua')
                else:
                    # Ending a code block
                    in_code_block = False
                    result.append('```')
            else:
                result.append(line)
        
        markdown = '\n'.join(result)
        
        # Ensure all code blocks have lua tag (safety check)
        # Replace opening code blocks (``` on a line by itself, followed by code, not closing)
        # We need to be careful not to replace closing tags
        # Pattern: ``` on its own line, followed by content (not immediately followed by another ```)
        def fix_code_block_opening(match):
            return '```lua'
        
        # Replace ``` that starts a code block (not closing)
        # Look for ``` on its own line that's followed by non-empty content
        lines = markdown.split('\n')
        result_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]
            if line.strip() == '```':
                # Check if this is an opening or closing tag
                # If next non-empty line is not ```, it's an opening tag
                is_opening = False
                for j in range(i + 1, min(i + 3, len(lines))):
                    next_line = lines[j].strip()
                    if next_line and next_line != '```':
                        is_opening = True
                        break
                    elif next_line == '```':
                        is_opening = False
                        break
                
                if is_opening:
                    result_lines.append('```lua')
                else:
                    result_lines.append('```')
            else:
                result_lines.append(line)
            i += 1
        
        markdown = '\n'.join(result_lines)
        
        # Fix code block closing tags (remove language from closing if present)
        markdown = re.sub(r'```(\w+)$', '```', markdown, flags=re.MULTILINE)  # Remove language from closing
        
        # Clean up code blocks - remove extra spaces around operators
        # Also ensure all code blocks have lua language tag
        # Apply proper Lua indentation based on syntax
        def indent_lua_code(lines):
            """Apply proper Lua indentation based on syntax rules."""
            indent_level = 0
            indent_size = 4  # 4 spaces per indent level
            result_lines = []
            
            for line in lines:
                stripped = line.strip()
                
                # Skip empty lines but preserve them
                if not stripped:
                    result_lines.append('')
                    continue
                
                # Decrease indent before certain keywords (end, else, elseif)
                if stripped.startswith('end') or stripped.startswith('elseif') or stripped == 'else':
                    if indent_level > 0:
                        indent_level -= 1
                
                # Apply current indent
                indented_line = ' ' * (indent_level * indent_size) + stripped
                result_lines.append(indented_line)
                
                # Increase indent after certain keywords
                # Check for function, if, for, while, else, elseif, do
                # But not if it's a single-line statement (ends with end on same line)
                if re.search(r'\b(function|if|for|while|else|elseif|do)\b', stripped):
                    # Don't increase if it's a single-line (ends with end on same line)
                    if not re.search(r'\bend\b', stripped):
                        indent_level += 1
                
                # Handle elseif/else - they decrease indent then increase it
                if stripped.startswith('elseif') or stripped == 'else':
                    indent_level += 1
            
            return result_lines
        
        def clean_code_block(match):
            code = match.group(1)
            lines = code.split('\n')
            
            # First, clean up spacing issues (remove all leading whitespace)
            cleaned_lines = []
            for line in lines:
                content = line.lstrip()  # Remove all leading whitespace
                if not content:
                    cleaned_lines.append('')
                    continue
                
                # Fix spacing issues
                content = re.sub(r'(\w)\s+([:\.])', r'\1\2', content)
                content = re.sub(r'([:\.])\s+(\w)', r'\1\2', content)
                content = re.sub(r'\s*=\s*', ' = ', content)
                content = re.sub(r'\s*~=\s*', ' ~= ', content)
                content = re.sub(r'(\w)\s*\(', r'\1(', content)
                content = re.sub(r'(if|for|while|function)\s*\(', r'\1 (', content)
                content = re.sub(r'(\w)\s+\.(\w)', r'\1.\2', content)
                content = re.sub(r'\s*\.\.\s*', ' .. ', content)
                content = re.sub(r' +', ' ', content).strip()
                cleaned_lines.append(content)
            
            # Now apply proper Lua indentation
            indented_lines = indent_lua_code(cleaned_lines)
            
            cleaned_code = '\n'.join(indented_lines)
            cleaned_code = re.sub(r'\n{3,}', '\n\n', cleaned_code)
            return f'```lua\n{cleaned_code}\n```'
        
        # Match code blocks with or without language tag
        # First, process blocks that already have lua tag
        markdown = re.sub(r'```lua\n(.*?)```', clean_code_block, markdown, flags=re.DOTALL)
        # Then, process blocks without language tag
        markdown = re.sub(r'```\n(.*?)```', clean_code_block, markdown, flags=re.DOTALL)
        
        # Fix table formatting - handle malformed tables
        # This will be handled by fix_markdown_tables below
        
        # Fix tables with too many columns in separator row
        markdown = re.sub(r'\|\s*---\s*\|\s*---\s*\|\s*---\s*\|', '| --- | --- |', markdown)
        # If we have 2-column content but 3-column separator, fix it
        markdown = re.sub(r'(\|.*\|.*\n)\|\s*---\s*\|\s*---\s*\|\s*---\s*\|', r'\1| --- | --- |', markdown)
        
        # Fix tables with too many columns
        markdown = re.sub(r'\|\s*\|\s*\|\s*\|', '| | |', markdown)
        
        # Clean up excessive blank lines
        markdown = re.sub(r'\n{4,}', '\n\n\n', markdown)
        
        # Clean up bold tags that might be used for section headers
        markdown = re.sub(r'\*\*(\w+)\*\*\s*\n', r'**\1**\n\n', markdown)
        
        # Remove empty code blocks
        markdown = re.sub(r'```\s*\n\s*```', '', markdown)
        
        # Fix anchor links - convert numeric IDs to proper markdown anchors
        # Markdown generates anchors by: lowercase, replace spaces with hyphens
        def generate_markdown_anchor(text):
            """Generate a markdown-style anchor from text."""
            # Convert to lowercase
            anchor = text.lower()
            # Replace spaces and special chars with hyphens
            anchor = re.sub(r'[^\w-]+', '-', anchor)
            # Remove multiple consecutive hyphens
            anchor = re.sub(r'-+', '-', anchor)
            # Remove leading/trailing hyphens
            anchor = anchor.strip('-')
            return anchor
        
        # Fix links in function lists: [functionName](#functionName4491) -> [functionName](#functionname)
        def fix_anchor_link(match):
            link_text = match.group(1)
            anchor_id = match.group(2)
            # Extract the function name from the anchor ID (remove trailing numbers)
            # Pattern: functionName123 -> functionName
            function_name = re.sub(r'\d+$', '', anchor_id)
            # Generate proper markdown anchor (lowercase)
            proper_anchor = generate_markdown_anchor(function_name)
            return f'[{link_text}](#{proper_anchor})'
        
        # Match pattern: [text](#anchorID123) where ID has numbers at the end
        # This matches: [addNamedParameter](#addNamedParameter4491)
        markdown = re.sub(r'\[([^\]]+)\]\(#([^\)]+?)(\d+)\)', fix_anchor_link, markdown)
        
        # Also fix any remaining anchor links with numeric IDs (standalone)
        def fix_standalone_anchor(match):
            anchor_id = match.group(1)
            function_name = re.sub(r'\d+$', '', anchor_id)
            proper_anchor = generate_markdown_anchor(function_name)
            return f'(#{proper_anchor})'
        
        markdown = re.sub(r'\(#([^\)]+?)(\d+)\)', fix_standalone_anchor, markdown)
        
        # Fix malformed tables with extra leading pipes or empty columns
        markdown = self.fix_markdown_tables(markdown)
        
        return markdown.strip()
    
    def fix_markdown_tables(self, markdown):
        """Fix malformed markdown tables with extra leading pipes or empty columns."""
        lines = markdown.split('\n')
        fixed_lines = []
        in_table = False
        table_start = -1
        table_lines = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Detect table rows (lines with pipes)
            if '|' in line and line.strip().startswith('|'):
                if not in_table:
                    in_table = True
                    table_start = len(fixed_lines)
                    table_lines = []
                
                table_lines.append(line)
            else:
                # Not a table line
                if in_table:
                    # Process the table we just finished
                    fixed_table = self._fix_table_structure(table_lines)
                    fixed_lines.extend(fixed_table)
                    in_table = False
                    table_start = -1
                    table_lines = []
                
                fixed_lines.append(line)
            
            i += 1
        
        # Process any remaining table
        if in_table and table_lines:
            fixed_table = self._fix_table_structure(table_lines)
            fixed_lines.extend(fixed_table)
        
        return '\n'.join(fixed_lines)
    
    def _fix_table_structure(self, table_lines):
        """Fix the structure of a single table."""
        if not table_lines:
            return []
        
        # Find separator row (contains ---)
        separator_idx = -1
        for j, line in enumerate(table_lines):
            if '---' in line:
                separator_idx = j
                break
        
        if separator_idx < 0:
            # No separator found, might not be a proper table
            return table_lines
        
        # Split each line into columns
        parsed_lines = []
        for line in table_lines:
            # Split by | but keep empty strings
            parts = line.split('|')
            # Remove leading/trailing empty strings from split
            if parts and not parts[0].strip():
                parts = parts[1:]
            if parts and not parts[-1].strip():
                parts = parts[:-1]
            parsed_lines.append([p.strip() for p in parts])
        
        # Remove completely empty rows (rows where all cells are empty)
        # But keep the separator row and the header row (row before separator)
        filtered_parsed_lines = []
        for j, row in enumerate(parsed_lines):
            if j == separator_idx:
                # Always keep separator
                filtered_parsed_lines.append(row)
            elif separator_idx > 0 and j == separator_idx - 1:
                # Always keep the row before separator (header row)
                filtered_parsed_lines.append(row)
            elif any(cell.strip() for cell in row):
                # Keep rows with at least one non-empty cell
                filtered_parsed_lines.append(row)
            # Skip completely empty rows
        parsed_lines = filtered_parsed_lines
        
        # Update separator_idx if we removed rows before it
        separator_idx = -1
        for j, row in enumerate(parsed_lines):
            if '---' in '|'.join(row):
                separator_idx = j
                break
        
        # Check if first column is empty in all rows (except maybe header)
        if len(parsed_lines) > 0:
            first_col_empty = True
            for j, row in enumerate(parsed_lines):
                # Skip separator row
                if j == separator_idx:
                    continue
                if len(row) > 0 and row[0].strip():
                    first_col_empty = False
                    break
            
            # If first column is empty, remove it
            if first_col_empty:
                for row in parsed_lines:
                    if len(row) > 0:
                        row.pop(0)
        
        # Check if last column is empty in all rows
        if len(parsed_lines) > 0:
            # Remove trailing empty columns (columns where all cells are empty)
            while True:
                if not parsed_lines or not parsed_lines[0]:
                    break
                
                # Check if last column is empty in all non-separator rows
                last_col_empty = True
                for j, row in enumerate(parsed_lines):
                    if j == separator_idx:
                        continue
                    if len(row) > 0 and row[-1].strip():
                        last_col_empty = False
                        break
                
                if last_col_empty and len(parsed_lines[0]) > 0:
                    # Remove last column from all rows
                    for row in parsed_lines:
                        if len(row) > 0:
                            row.pop()
                else:
                    break
            
            # Also check for multiple trailing empty columns
            # Remove all trailing empty columns at once
            if len(parsed_lines) > 0 and len(parsed_lines[0]) > 0:
                # Count trailing empty columns
                trailing_empty_count = 0
                max_cols = len(parsed_lines[0])
                for col_idx in range(max_cols - 1, -1, -1):
                    col_empty = True
                    for j, row in enumerate(parsed_lines):
                        if j == separator_idx:
                            continue
                        if col_idx < len(row) and row[col_idx].strip():
                            col_empty = False
                            break
                    if col_empty:
                        trailing_empty_count += 1
                    else:
                        break
                
                # Remove trailing empty columns
                if trailing_empty_count > 0:
                    for row in parsed_lines:
                        for _ in range(trailing_empty_count):
                            if len(row) > 0:
                                row.pop()
        
        # Ensure all rows have the same number of columns
        if not parsed_lines:
            return table_lines
        
        # Check if table has any data rows (rows with content, excluding separator)
        # We need to distinguish between header rows and data rows
        # Header row is typically the row before the separator
        has_data = False
        header_row_idx = separator_idx - 1 if separator_idx > 0 else -1
        for j, row in enumerate(parsed_lines):
            # Skip separator and header rows when checking for data
            if j != separator_idx and j != header_row_idx and any(cell.strip() for cell in row):
                has_data = True
                break
        
        # If no data rows, we can either:
        # 1. Return empty to remove the table entirely
        # 2. Keep the header structure for empty tables
        # For now, we'll keep the structure (header + separator) even if empty
        # This is useful for "Arguments" sections that have no arguments
        # if not has_data:
        #     return []
        
        # Find the maximum number of columns
        max_cols = max(len(row) for row in parsed_lines) if parsed_lines else 0
        
        # Pad rows that are too short
        for row in parsed_lines:
            while len(row) < max_cols:
                row.append('')
        
        # Ensure we have a header row before separator
        # If separator is first, we need to add a header
        if separator_idx == 0:
            # Add header row based on number of columns
            if max_cols == 2:
                header_row = ['Type', 'Return Value']
            elif max_cols == 3:
                header_row = ['Type', 'Parameter', 'Description']
            else:
                header_row = ['Type', 'Parameter'] + [''] * (max_cols - 2)
            # Pad to max_cols
            while len(header_row) < max_cols:
                header_row.append('')
            parsed_lines.insert(0, header_row)
            separator_idx = 1  # Update separator index
        
        # Reconstruct table lines
        fixed_lines = []
        for j, row in enumerate(parsed_lines):
            if j == separator_idx:
                # Separator row: | --- | --- | ...
                line = '| ' + ' | '.join(['---'] * len(row)) + ' |'
            else:
                # Data row: | col1 | col2 | ...
                line = '| ' + ' | '.join(row) + ' |'
            fixed_lines.append(line)
        
        return fixed_lines
    
    def _convert_html_table_to_markdown(self, table):
        """Manually convert an HTML table to markdown format."""
        rows = table.find_all('tr')
        if not rows:
            return None
        
        # Extract ALL rows with their cell content
        # Don't filter anything - include everything
        table_data = []
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if not cells:
                continue  # Only skip rows with no cells at all
            row_data = [cell.get_text(strip=True) for cell in cells]
            table_data.append(row_data)
        
        if not table_data:
            return None
        
        
        # Determine number of columns
        max_cols = max(len(row) for row in table_data) if table_data else 0
        if max_cols == 0:
            return None
        
        # Ensure all rows have the same number of columns
        for row in table_data:
            while len(row) < max_cols:
                row.append('')
        
        # Check if first row is a header (has <th> tags in HTML)
        first_row = rows[0] if rows else None
        is_header = False
        if first_row:
            first_cells = first_row.find_all(['td', 'th'])
            is_header = first_cells and first_cells[0].name == 'th' if first_cells else False
        
        # Check if first row in table_data looks like a header (text-based check)
        first_data_row = table_data[0] if table_data else []
        first_cell_text = first_data_row[0].lower().strip() if first_data_row and len(first_data_row) > 0 else ''
        looks_like_header_text = first_cell_text in ['type', 'parameter', 'description', '']
        
        # If we don't have a header (neither HTML <th> tags nor header-like text), add one
        if not is_header and not looks_like_header_text:
            # Determine header based on column count
            if max_cols == 2:
                header_row = ['Type', 'Parameter']
            elif max_cols == 3:
                header_row = ['Type', 'Parameter', 'Description']
            else:
                header_row = ['Type', 'Parameter'] + [''] * (max_cols - 2)
            # Pad to max_cols
            while len(header_row) < max_cols:
                header_row.append('')
            # Insert header at the beginning
            table_data.insert(0, header_row)
        
        # Build markdown table - include ALL rows from table_data
        markdown_lines = []
        for i, row in enumerate(table_data):
            # Create markdown row: | col1 | col2 | col3 |
            markdown_row = '| ' + ' | '.join(row) + ' |'
            markdown_lines.append(markdown_row)
            
            # Add separator row after header (first row)
            if i == 0:
                separator = '| ' + ' | '.join(['---'] * len(row)) + ' |'
                markdown_lines.append(separator)
        
        return '\n'.join(markdown_lines)
    
    def get_subcategory_name_from_page(self, html_content):
        """Extract subcategory name from a subcategory page."""
        if not html_content:
            return None
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Try to find subcategory name in page title or heading
        # Look for h1, h2, or h3 that might contain the subcategory name
        for tag in ['h1', 'h2', 'h3']:
            heading = soup.find(tag)
            if heading:
                text = heading.get_text(strip=True)
                # Skip generic titles
                if text and text not in ['LUADOC - FARMING SIMULATOR 25', 'Documentation', '']:
                    return text
        
        # Try to find in page title
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text(strip=True)
            if title and title not in ['LUADOC - FARMING SIMULATOR 25', 'Documentation', '']:
                return title
        
        return None
    
    def get_page_info(self, url):
        """Extract page information from URL and content."""
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        
        version = params.get('version', ['unknown'])[0]
        category = params.get('category', [None])[0]
        class_id = params.get('class', [None])[0]
        function_id = params.get('function', [None])[0]
        
        # Foundation uses different parameter names
        if version == 'foundation':
            category = params.get('fCategory', [category])[0]
            function_id = params.get('fFunction', [function_id])[0]
        
        return {
            'version': version,
            'category': category,
            'class_id': class_id,
            'function_id': function_id
        }
    
    def get_filename_from_content(self, html_content, page_info):
        """Extract a meaningful filename from the page content."""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Try to find the class/function name (for class pages)
        class_name = soup.find('h2', class_='className')
        if class_name:
            name = class_name.get_text(strip=True)
            return self.sanitize_filename(name)
        
        # For function pages, look for the function name (after the anchor)
        # Structure: <a name="functionName123"></a><h2 or h3>functionName</h2 or h3>
        anchor = soup.find('a', attrs={'name': True})
        if anchor:
            anchor_name = anchor.get('name', '')
            # Remove trailing numbers from anchor name (e.g., "getXMLAttributeName863" -> "getXMLAttributeName")
            function_name = re.sub(r'\d+$', '', anchor_name)
            if function_name:
                return self.sanitize_filename(function_name)
        
        # Try h2 or h3 (function pages can have function name in either)
        # Check the one that comes after the anchor
        if anchor:
            # Find h2 or h3 that comes after the anchor
            for tag in ['h2', 'h3']:
                heading = anchor.find_next(tag)
                if heading:
                    name = heading.get_text(strip=True)
                    # Skip if it's the page title like "LUADOC - FARMING SIMULATOR 25"
                    if name and len(name) < 100 and 'LUADOC' not in name.upper() and 'FARMING' not in name.upper():
                        return self.sanitize_filename(name)
        
        # Fallback: try any h2 or h3 (but skip page titles)
        for tag in ['h2', 'h3']:
            heading = soup.find(tag)
            if heading:
                name = heading.get_text(strip=True)
                # Skip if it's the page title like "LUADOC - FARMING SIMULATOR 25"
                if name and len(name) < 100 and 'LUADOC' not in name.upper() and 'FARMING' not in name.upper():
                    return self.sanitize_filename(name)
        
        # Fallback to URL-based name
        if page_info.get('function_id'):
            return f"function_{page_info['function_id']}"
        elif page_info.get('class_id'):
            return f"class_{page_info['class_id']}"
        else:
            return "page"
    
    def save_page(self, markdown_content, filename, page_info):
        """Save a markdown page to the appropriate directory with subcategory organization."""
        version = page_info.get('version', 'unknown')
        subcategory = page_info.get('subcategory')
        
        # Determine base output directory
        if version == 'script':
            base_path = self.output_dir / 'script'
        elif version == 'engine':
            base_path = self.output_dir / 'engine'
        elif version == 'foundation':
            base_path = self.output_dir / 'foundation'
        else:
            base_path = self.output_dir / 'other'
        
        # If we have a subcategory, create a subdirectory for it
        if subcategory:
            # Sanitize subcategory name for filesystem
            subcategory_name = self.sanitize_filename(subcategory)
            output_path = base_path / subcategory_name
        else:
            output_path = base_path
        
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save the file
        file_path = output_path / f"{filename}.md"
        
        # Save without frontmatter - just the markdown content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        return file_path
    
    def download_page(self, url, link_text=None, subcategory=None, version=None):
        """Download and process a single page."""
        # Thread-safe check for already downloaded URLs
        with self.downloaded_urls_lock:
            if url in self.downloaded_urls:
                with self.stats_lock:
                    self.stats['skipped'] += 1
                return None
        
        page_info = self.get_page_info(url)
        # Use provided version/subcategory if available, otherwise from URL
        if version:
            page_info['version'] = version
        if subcategory:
            page_info['subcategory'] = subcategory
        
        # Check if this page should be downloaded (filter)
        if not self.should_download_page(url, page_info):
            with self.stats_lock:
                self.stats['skipped'] += 1
            return None
        
        html_content = self.fetch_page(url)
        if not html_content:
            with self.stats_lock:
                self.failed_urls.append(url)
                self.stats['failed'] += 1
            return None
        
        # Check if this is a main category page with no content (Engine/Foundation main pages)
        # These pages only have TOC and no actual documentation content
        content_html = self.extract_content(html_content)
        if not content_html:
            # Check if this might be a category index page
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            page_version = params.get('version', [''])[0]
            
            # For Engine and Foundation, check if this is a category page (has category but no class/function)
            if page_version in ['engine', 'foundation']:
                has_category = 'category' in params or 'fCategory' in params
                has_content = 'class' in params or 'function' in params or 'fFunction' in params
                
                if has_category and not has_content:
                    # This is a category index page with no content - skip it
                    # (Subcategory links should already be discovered in discover_all_pages)
                    with self.downloaded_urls_lock:
                        self.downloaded_urls.add(url)
                    with self.stats_lock:
                        self.stats['skipped'] += 1
                    return None
            
            self.failed_urls.append(url)
            self.stats['failed'] += 1
            return None
        
        # Convert to markdown
        markdown = self.html_to_markdown(content_html)
        if not markdown or len(markdown.strip()) < 10:
            self.failed_urls.append(url)
            self.stats['failed'] += 1
            return None
        
        # Get filename - for class pages, always extract from content (class name)
        # For function pages, prefer link_text from TOC (function name), fallback to content extraction
        # Note: link_text for class pages is often the subcategory name, not the class name
        if page_info.get('class_id') and not page_info.get('function_id'):
            # This is a class page - always extract class name from content
            filename = self.get_filename_from_content(html_content, page_info)
        elif link_text:
            # For function pages, use link_text from TOC (should be the function name)
            filename = self.sanitize_filename(link_text)
        else:
            # Fallback to content extraction
            filename = self.get_filename_from_content(html_content, page_info)
        
        # Save
        file_path = self.save_page(markdown, filename, page_info)
        
        # Thread-safe update of downloaded URLs and stats
        with self.downloaded_urls_lock:
            self.downloaded_urls.add(url)
        with self.stats_lock:
            self.stats['downloaded'] += 1
        
        return file_path
    
    def discover_all_pages(self):
        """Discover all documentation pages by parsing the TOC."""
        print("Discovering all documentation pages...")
        print(f"Fetching TOC from {BASE_URL}")
        
        html_content = self.fetch_page(BASE_URL)
        if not html_content:
            print("Failed to fetch TOC page!")
            return []
        
        links = self.extract_toc_links(html_content)
        print(f"Found {len(links)} links in main TOC")
        
        # The main TOC shows main categories and subcategories, but not individual pages
        # We need to visit each subcategory link to get the expanded TOC with all pages
        all_links = list(links)
        
        # Identify subcategory links (these are the ones we need to visit)
        # The main TOC shows first pages of subcategories (with function parameter)
        # We need to extract category IDs and construct subcategory URLs, OR visit the first page
        # Visiting the first page will also expand the TOC, so we can use those URLs directly
        engine_subcategory_info = {}  # Store URL -> subcategory_name mapping
        foundation_subcategory_info = {}  # Store URL -> subcategory_name mapping
        script_subcategory_info = {}  # Store URL -> subcategory_name mapping
        
        # Extract unique category IDs from Engine/Foundation links
        engine_category_ids = set()
        foundation_category_ids = set()
        
        for link in links:
            url = link['url']
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            version = params.get('version', [''])[0]
            
            if version == 'engine':
                # Engine links in main TOC are first pages of subcategories (have function)
                # Extract category ID and construct subcategory URL (without function)
                if 'category' in params:
                    category_id = params['category'][0]
                    engine_category_ids.add(category_id)
                    # Store subcategory name from link (prefer subcategory from link, fallback to text)
                    subcategory_name = link.get('subcategory') or link.get('text')
                    if subcategory_name:
                        engine_subcategory_info[url] = subcategory_name
                        # Also ensure the link itself in all_links has the subcategory set
                        for existing_link in all_links:
                            if existing_link['url'] == url:
                                if not existing_link.get('subcategory'):
                                    existing_link['subcategory'] = subcategory_name
                                break
            elif version == 'foundation':
                # Foundation links in main TOC are first pages of subcategories
                if 'fCategory' in params:
                    category_id = params['fCategory'][0]
                    foundation_category_ids.add(category_id)
                    # Store subcategory name from link (prefer subcategory from link, fallback to text)
                    subcategory_name = link.get('subcategory') or link.get('text')
                    if subcategory_name:
                        foundation_subcategory_info[url] = subcategory_name
                        # Also ensure the link itself in all_links has the subcategory set
                        for existing_link in all_links:
                            if existing_link['url'] == url:
                                if not existing_link.get('subcategory'):
                                    existing_link['subcategory'] = subcategory_name
                                break
            elif version == 'script':
                # Script subcategory: has class but no function
                # Store the subcategory name from the link (prefer subcategory from link, fallback to text)
                if 'class' in params and 'function' not in params:
                    subcategory_name = link.get('subcategory') or link.get('text')
                    if subcategory_name:
                        script_subcategory_info[url] = subcategory_name
                        # Also ensure the link itself in all_links has the subcategory set
                        for existing_link in all_links:
                            if existing_link['url'] == url:
                                if not existing_link.get('subcategory'):
                                    existing_link['subcategory'] = subcategory_name
                                break
        
        # We already have the first page URLs which will expand the TOC
        # No need to also visit index URLs - visiting the first page is sufficient
        print(f"  Found {len(engine_category_ids)} Engine subcategories, {len(foundation_category_ids)} Foundation subcategories, {len(script_subcategory_info)} Script subcategories")
        
        # Visit each Engine subcategory to get expanded TOC with all function pages
        print(f"Visiting {len(engine_subcategory_info)} Engine subcategory pages to extract function pages...")
        total_added = 0
        for subcategory_url, subcategory_name_from_toc in tqdm(engine_subcategory_info.items(), desc="Engine subcategories", unit="page", leave=False):
            html_content = self.fetch_page(subcategory_url)
            if html_content:
                # Extract the category ID from the URL we're visiting
                parsed_url = urlparse(subcategory_url)
                url_params = parse_qs(parsed_url.query)
                target_category = url_params.get('category', [''])[0]
                
                # Use subcategory name from TOC, fallback to extracting from page
                subcategory_name = subcategory_name_from_toc
                if not subcategory_name:
                    subcategory_name = self.get_subcategory_name_from_page(html_content)
                
                # When visiting a subcategory page, the TOC expands to show all pages in that subcategory
                # Extract all links from the expanded TOC
                function_links = self.extract_toc_links(html_content, from_content_area=False)
                
                # Also try extracting ALL links from the TOC area (more aggressive approach)
                # The expanded subcategory might not be caught by the structured extraction
                soup = BeautifulSoup(html_content, 'html.parser')
                toc_area = soup.find('div', style=lambda x: x and 'width:200px' in x)
                if toc_area:
                    # Find all links in the TOC area
                    all_toc_links = toc_area.find_all('a', href=True)
                    for link_elem in all_toc_links:
                        href = link_elem.get('href', '')
                        if not href:
                            continue
                        
                        # Handle relative URLs
                        if href.startswith('?'):
                            full_url = BASE_URL + href
                        elif href.startswith('/'):
                            full_url = BASE_DOMAIN + href
                        elif 'documentation_scripting_fs25.php' in href:
                            if not href.startswith('http'):
                                full_url = BASE_DOMAIN + '/' + href.lstrip('/')
                            else:
                                full_url = href
                        else:
                            continue
                        
                        # Only process Engine links with matching category and function
                        if 'version=engine' in full_url and f'category={target_category}' in full_url and 'function=' in full_url:
                            parsed = urlparse(full_url)
                            params = parse_qs(parsed.query)
                            link_text = link_elem.get_text(strip=True)
                            if link_text:
                                link_info = {
                                    'url': full_url,
                                    'text': link_text,
                                    'href': href,
                                    'subcategory': subcategory_name,
                                    'version': 'engine'
                                }
                                # Add if not already in function_links
                                if not any(l['url'] == full_url for l in function_links):
                                    function_links.append(link_info)
                
                # Filter to only Engine links with the same category ID
                # Also ensure all links have the subcategory name
                filtered_links = []
                for link in function_links:
                    parsed = urlparse(link['url'])
                    params = parse_qs(parsed.query)
                    link_category = params.get('category', [''])[0]
                    link_version = params.get('version', [''])[0]
                    
                    # Only include Engine links with matching category and function parameter
                    if link_version == 'engine' and link_category == target_category and 'function' in params:
                        # Ensure subcategory is set
                        if not link.get('subcategory') and subcategory_name:
                            link['subcategory'] = subcategory_name
                        filtered_links.append(link)
                
                for add_link in filtered_links:
                    if add_link['url'] not in [l['url'] for l in all_links]:
                        all_links.append(add_link)
                        total_added += 1
        if total_added > 0:
            print(f"  Added {total_added} new function links from Engine subcategory pages")
        
        # Visit each Foundation subcategory to get expanded TOC with all function pages
        print(f"Visiting {len(foundation_subcategory_info)} Foundation subcategory pages to extract function pages...")
        foundation_added = 0
        for subcategory_url, subcategory_name_from_toc in tqdm(foundation_subcategory_info.items(), desc="Foundation subcategories", unit="page", leave=False):
            html_content = self.fetch_page(subcategory_url)
            if html_content:
                # Use subcategory name from TOC, fallback to extracting from page
                subcategory_name = subcategory_name_from_toc
                if not subcategory_name:
                    subcategory_name = self.get_subcategory_name_from_page(html_content)
                
                # When visiting a subcategory page, the TOC expands to show all pages
                function_links = self.extract_toc_links(html_content, from_content_area=False)
                for add_link in function_links:
                    # Only add function pages (have fFunction parameter)
                    parsed = urlparse(add_link['url'])
                    params = parse_qs(parsed.query)
                    if 'fFunction' in params:
                        # Ensure subcategory is set
                        if not add_link.get('subcategory') and subcategory_name:
                            add_link['subcategory'] = subcategory_name
                        if add_link['url'] not in [l['url'] for l in all_links]:
                            all_links.append(add_link)
                            foundation_added += 1
        if foundation_added > 0:
            print(f"  Added {foundation_added} new function links from Foundation subcategory pages")
        
        # Visit each Script subcategory to get expanded TOC with all class pages
        print(f"Visiting {len(script_subcategory_info)} Script subcategory pages to extract class pages...")
        script_added = 0
        for subcategory_url, subcategory_name_from_toc in tqdm(script_subcategory_info.items(), desc="Script subcategories", unit="page", leave=False):
            html_content = self.fetch_page(subcategory_url)
            if html_content:
                # Extract the category ID from the URL we're visiting
                parsed_url = urlparse(subcategory_url)
                url_params = parse_qs(parsed_url.query)
                target_category = url_params.get('category', [''])[0]
                target_class = url_params.get('class', [''])[0]
                
                # Use subcategory name from TOC, fallback to extracting from page
                subcategory_name = subcategory_name_from_toc
                if not subcategory_name:
                    subcategory_name = self.get_subcategory_name_from_page(html_content)
                
                # When visiting a subcategory page, the TOC expands to show all class pages
                page_links = self.extract_toc_links(html_content, from_content_area=False)
                
                # Filter to only Script links with the same category/class
                # Also ensure all links have the subcategory name
                filtered_links = []
                for link in page_links:
                    parsed = urlparse(link['url'])
                    params = parse_qs(parsed.query)
                    link_category = params.get('category', [''])[0]
                    link_class = params.get('class', [''])[0]
                    link_version = params.get('version', [''])[0]
                    
                    # Only include Script links with matching category and class parameter
                    # (Script subcategories show class pages, not function pages)
                    if (link_version == 'script' and 
                        link_category == target_category and 
                        'class' in params and
                        'function' not in params):  # Class pages, not function pages
                        # Ensure subcategory is set
                        if not link.get('subcategory') and subcategory_name:
                            link['subcategory'] = subcategory_name
                        filtered_links.append(link)
                
                for add_link in filtered_links:
                    if add_link['url'] not in [l['url'] for l in all_links]:
                        all_links.append(add_link)
                        script_added += 1
        if script_added > 0:
            print(f"  Added {script_added} new class pages from Script subcategory pages")
        
        # All subcategories have been visited, no need for additional checks
        
        # Remove duplicates
        seen_urls = set()
        unique_links = []
        for link in all_links:
            if link['url'] not in seen_urls:
                seen_urls.add(link['url'])
                unique_links.append(link)
        
        # Count by type
        script_count = sum(1 for l in unique_links if l.get('version') == 'script')
        engine_count = sum(1 for l in unique_links if l.get('version') == 'engine')
        foundation_count = sum(1 for l in unique_links if l.get('version') == 'foundation')
        print(f"Total unique pages to download: {len(unique_links)}")
        print(f"  Script: {script_count}, Engine: {engine_count}, Foundation: {foundation_count}")
        return unique_links
    
    def create_index(self):
        """Create an index file listing all downloaded pages."""
        index_path = self.output_dir / 'index.md'
        
        index_content = ["# GDN Documentation Index\n"]
        index_content.append(f"Generated on {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        index_content.append(f"\n## Statistics\n")
        index_content.append(f"- Total pages: {self.stats['total']}\n")
        index_content.append(f"- Successfully downloaded: {self.stats['downloaded']}\n")
        index_content.append(f"- Failed: {self.stats['failed']}\n")
        index_content.append(f"- Skipped: {self.stats['skipped']}\n")
        
        # List all files by directory
        for subdir in ['script', 'engine', 'foundation', 'other']:
            subdir_path = self.output_dir / subdir
            if subdir_path.exists():
                files = sorted(subdir_path.glob('*.md'))
                if files:
                    index_content.append(f"\n## {subdir.capitalize()} Documentation\n\n")
                    for file in files:
                        rel_path = file.relative_to(self.output_dir)
                        index_content.append(f"- [{file.stem}]({rel_path.as_posix()})\n")
        
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(''.join(index_content))
        
        print(f"\nIndex created: {index_path}")
    
    def run(self):
        """Main execution method."""
        print("=" * 60)
        print("GDN Documentation Downloader")
        print("=" * 60)
        
        # Discover all pages
        links = self.discover_all_pages()
        self.stats['total'] = len(links)
        
        if not links:
            print("No pages found to download!")
            return
        
        # Filter links if page_filter is set
        if hasattr(self, 'page_filter') and self.page_filter:
            print(f"\nFilter active: {self.page_filter}")
            print(f"Filtering {len(links)} discovered pages...")
            filtered_links = []
            for link in links:
                page_info = self.get_page_info(link['url'])
                if link.get('version'):
                    page_info['version'] = link['version']
                matches = self.should_download_page(link['url'], page_info)
                if matches:
                    filtered_links.append(link)
            links = filtered_links
            print(f"Found {len(links)} pages matching filter")
        
        # Group links by version and subcategory for organized downloading
        # This ensures we finish one subcategory before moving to the next
        grouped_links = {}
        for link in links:
            version = link.get('version', 'unknown')
            subcategory = link.get('subcategory') or 'Uncategorized'
            key = (version, subcategory)
            if key not in grouped_links:
                grouped_links[key] = []
            grouped_links[key].append(link)
        
        # Sort by version, then by subcategory name
        sorted_groups = sorted(grouped_links.items(), key=lambda x: (x[0][0], x[0][1]))
        
        # Download each page, grouped by subcategory
        print(f"\nDownloading {len(links)} pages...")
        print("-" * 60)
        
        total_pages = len(links)
        pages_downloaded = 0
        
        for (version, subcategory), group_links in sorted_groups:
            subcategory_display = subcategory if subcategory != 'Uncategorized' else f'{version} (no subcategory)'
            print(f"\n{version.capitalize()} / {subcategory_display} ({len(group_links)} pages)")
            
            # Download pages in this subcategory concurrently
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # Submit all download tasks
                future_to_link = {
                    executor.submit(
                        self.download_page,
                        link['url'],
                        link['text'],
                        subcategory=link.get('subcategory'),
                        version=link.get('version')
                    ): link for link in group_links
                }
                
                # Process completed downloads with progress bar
                for future in tqdm(as_completed(future_to_link), total=len(group_links), desc=f"{subcategory_display}", unit="page", leave=False):
                    link = future_to_link[future]
                    try:
                        future.result()  # Get result (or raise exception if failed)
                    except Exception as e:
                        # Error already handled in download_page
                        pass
                    pages_downloaded += 1
    
    def should_download_page(self, url, page_info):
        """Check if a page should be downloaded based on filters."""
        if not hasattr(self, 'page_filter') or not self.page_filter:
            return True
        
        # Parse filter (format: version=engine&category=33&function=863)
        filter_params = {}
        for param in self.page_filter.split('&'):
            if '=' in param:
                key, value = param.split('=', 1)
                filter_params[key] = value
        
        # Check if this page matches the filter
        for key, value in filter_params.items():
            if key == 'version':
                if page_info.get('version') != value:
                    return False
            elif key == 'category':
                if str(page_info.get('category')) != value:
                    return False
            elif key == 'fCategory':
                if str(page_info.get('category')) != value:
                    return False
            elif key == 'class':
                if str(page_info.get('class_id')) != value:
                    return False
            elif key == 'function':
                if str(page_info.get('function_id')) != value:
                    return False
            elif key == 'fFunction':
                if str(page_info.get('function_id')) != value:
                    return False
        
        return True
        
        # Print summary
        print("\n" + "=" * 60)
        print("Download Summary")
        print("=" * 60)
        print(f"Total pages: {self.stats['total']}")
        print(f"Downloaded: {self.stats['downloaded']}")
        print(f"Failed: {self.stats['failed']}")
        print(f"Skipped: {self.stats['skipped']}")
        
        if self.failed_urls:
            print(f"\nFailed URLs ({len(self.failed_urls)}):")
            for url in self.failed_urls[:10]:  # Show first 10
                print(f"  - {url}")
            if len(self.failed_urls) > 10:
                print(f"  ... and {len(self.failed_urls) - 10} more")

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Download GDN documentation to markdown')
    parser.add_argument('-o', '--output', default='docs', help='Output directory (default: docs)')
    parser.add_argument('--delay', type=float, default=0.5, help='Delay between requests in seconds (default: 0.5)')
    parser.add_argument('--page-filter', help='Filter to download only specific page (e.g., "version=engine&category=33&function=863")')
    parser.add_argument('--workers', type=int, default=5, help='Number of concurrent download workers (default: 5)')
    
    args = parser.parse_args()
    
    global REQUEST_DELAY
    REQUEST_DELAY = args.delay
    
    downloader = GDNDownloader(output_dir=args.output, page_filter=args.page_filter, max_workers=args.workers)
    downloader.run()

if __name__ == '__main__':
    main()

