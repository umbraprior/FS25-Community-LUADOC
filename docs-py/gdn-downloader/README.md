# GDN Documentation Downloader

Downloads and converts GDN (GIANTS Developer Network) LUADOC for FS25 documentation pages to GitHub-flavored Markdown
format.

## Features

- Downloads all documentation pages from the GDN website
- Converts HTML to GitHub-flavored Markdown
- Organizes pages by version (Script, Engine, Foundation) and subcategory
- Preserves original documentation structure
- Concurrent downloads for faster processing

## Usage

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Download all documentation pages:

```bash
python download_gdn_docs.py -o ../docs
```

## Command-Line Options

- `-o, --output`: Output directory (default: `docs`)
- `--delay`: Delay between requests in seconds (default: `0.5`)
- `--page-filter`: Filter to download only specific page (e.g., `"version=engine&category=33&function=863"`)
- `--workers`: Number of concurrent download workers (default: `5`)

## Output Structure

Pages are organized by version and subcategory:

```
docs/
├── script/
│   ├── Vehicles/
│   │   ├── VehicleMotor.md
│   │   └── ...
│   ├── XML/
│   │   └── ...
│   └── ...
├── engine/
│   ├── XML/
│   │   └── ...
│   ├── Input/
│   │   └── ...
│   └── ...
└── foundation/
    └── ...
```