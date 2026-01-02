# FS25 Community LUADOC - Docusaurus Website

This directory contains the Docusaurus website configuration for the FS25 Community LUADOC documentation.

## Getting Started

### Prerequisites

- Node.js >= 18.0
- npm or yarn

### Installation

```bash
cd website
npm install
```

### Local Development

```bash
npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without
having to restart the server.

### Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting
service.

### Deployment

The site is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch.
See `.github/workflows/deploy.yml` for the deployment configuration.

## Configuration

- `docusaurus.config.js` - Main Docusaurus configuration
- `sidebars.js` - Sidebar navigation structure
- `src/pages/index.jsx` - Homepage component
- `src/css/custom.css` - Custom CSS styles

## Search

The site uses [docusaurus-lunr-search](https://github.com/lelouch77/docusaurus-lunr-search) for local search
functionality. No external search service (like Algolia) is required.

## Documentation Structure

The documentation files are located in the `../docs` directory and are automatically processed by Docusaurus. The
structure mirrors the original documentation:

- `engine/` - Core engine functions and low-level APIs
- `foundation/` - Foundation layer APIs and utilities
- `script/` - Game scripting APIs, classes, and specializations


