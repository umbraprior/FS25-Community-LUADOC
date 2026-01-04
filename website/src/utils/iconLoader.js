/**
 * Dynamic icon loader for Font Awesome icons
 * This allows us to lazy load icons on-demand instead of loading all icons upfront
 */

import {library} from '@fortawesome/fontawesome-svg-core';

// Icon name to import mapping
const iconImports = {
    'robot': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faRobot),
    'film': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faFilm),
    'paw': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faPaw),
    'layer-group': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faLayerGroup),
    'puzzle-piece': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faPuzzlePiece),
    'cogs': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCogs),
    'file-contract': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faFileContract),
    'database': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faDatabase),
    'bug': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faBug),
    'coins': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCoins),
    'th': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faTh),
    'exclamation-triangle': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faExclamationTriangle),
    'calendar-alt': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCalendarAlt),
    'plug': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faPlug),
    'tractor': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faTractor),
    'seedling': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faSeedling),
    'chart-bar': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faChartBar),
    'apple-alt': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faAppleAlt),
    'desktop': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faDesktop),
    'image': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faImage),
    'images': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faImages),
    'route': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faRoute),
    'hammer': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faHammer),
    'mobile-alt': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faMobileAlt),
    'cube': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCube),
    'keyboard': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faKeyboard),
    'copy': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCopy),
    'briefcase': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faBriefcase),
    'palette': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faPalette),
    'ellipsis-h': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faEllipsisH),
    'bullseye': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faBullseye),
    'network-wired': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faNetworkWired),
    'box': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faBox),
    'list': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faList),
    'building': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faBuilding),
    'map-marker-alt': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faMapMarkerAlt),
    'user': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faUser),
    'train': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faTrain),
    'ship': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faShip),
    'shopping-cart': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faShoppingCart),
    'volume-up': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faVolumeUp),
    'star': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faStar),
    'sync-alt': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faSyncAlt),
    'check-square': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCheckSquare),
    'hand-pointer': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faHandPointer),
    'tools': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faTools),
    'car': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCar),
    'cloud-sun': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCloudSun),
    'circle': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCircle),
    'toggle-on': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faToggleOn),
    'anchor': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faAnchor),
    'camera': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCamera),
    'square': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faSquare),
    'leaf': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faLeaf),
    'book': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faBook),
    'lightbulb': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faLightbulb),
    'calculator': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCalculator),
    'map': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faMap),
    'link': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faLink),
    'sticky-note': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faStickyNote),
    'wand-magic-sparkles': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faWandMagicSparkles),
    'atom': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faAtom),
    'chart-line': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faChartLine),
    'cloud-rain': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faCloudRain),
    'paint-brush': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faPaintBrush),
    'water': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faWater),
    'shapes': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faShapes),
    'project-diagram': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faProjectDiagram),
    'font': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faFont),
    'mountain': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faMountain),
    'text-height': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faTextHeight),
    'road': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faRoad),
    'microphone': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faMicrophone),
    'file-code': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faFileCode),
    'sitemap': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faSitemap),
    'folder': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faFolder),
    'newspaper': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faNewspaper),
    'ferry': () => import('@fortawesome/free-solid-svg-icons').then(m => m.faFerry),
};

// Cache for loaded icons to avoid re-importing
const loadedIcons = new Set();

/**
 * Load an icon dynamically and add it to the Font Awesome library
 * @param {string} iconName - The icon name (e.g., 'robot', 'film')
 * @returns {Promise} Promise that resolves when icon is loaded
 */
export async function loadIcon(iconName) {
    if (!iconName) {
        return Promise.resolve();
    }

    // Normalize icon name (handle kebab-case)
    const normalizedName = iconName.toLowerCase().replace(/_/g, '-');

    // Check if already loaded
    if (loadedIcons.has(normalizedName)) {
        return Promise.resolve();
    }

    // Get the import function
    const iconImport = iconImports[normalizedName];

    if (!iconImport) {
        console.warn(`Icon "${iconName}" not found in icon loader`);
        return Promise.resolve();
    }

    try {
        // Dynamically import the icon
        const iconModule = await iconImport();
        const icon = iconModule.default || iconModule;

        // Add to library
        library.add(icon);

        // Mark as loaded
        loadedIcons.add(normalizedName);
    } catch (error) {
        console.warn(`Failed to load icon "${iconName}":`, error);
    }
}

/**
 * Preload multiple icons at once
 * @param {string[]} iconNames - Array of icon names to preload
 * @returns {Promise} Promise that resolves when all icons are loaded
 */
export async function loadIcons(iconNames) {
    const promises = iconNames.map(name => loadIcon(name));
    return Promise.all(promises);
}

