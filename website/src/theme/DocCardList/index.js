import React, {useEffect, useState} from 'react';
import DocCardList from '@theme-original/DocCardList';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation} from '@docusaurus/router';

function DocCardListWrapper(props) {
    const {siteConfig} = useDocusaurusContext();
    const location = useLocation();
    const [functionCounts, setFunctionCounts] = useState({});
    const [categoryIcons, setCategoryIcons] = useState({});

    useEffect(() => {
        // Cache key for storing JSON data in sessionStorage
        const FUNCTION_COUNTS_CACHE_KEY = 'fs25-function-counts';
        const CATEGORY_ICONS_CACHE_KEY = 'fs25-category-icons';
        const CACHE_VERSION = '1.0'; // Increment when JSON structure changes

        // Helper function to fetch with caching
        const fetchWithCache = async (url, cacheKey) => {
            // Try to get from sessionStorage first
            try {
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const {data, version} = JSON.parse(cached);
                    if (version === CACHE_VERSION) {
                        return data;
                    }
                }
            } catch (e) {
                // Ignore cache errors
            }

            // Fetch from network
            try {
                const response = await fetch(url, {
                    // Add cache headers for browser caching
                    cache: 'default',
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                // Store in sessionStorage for faster subsequent loads
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        data,
                        version: CACHE_VERSION,
                        timestamp: Date.now()
                    }));
                } catch (e) {
                    // Ignore storage errors (e.g., private browsing)
                }

                return data;
            } catch (error) {
                console.warn(`Could not load ${url}:`, error);
                return {};
            }
        };

        // Load function counts JSON with caching
        fetchWithCache(`${siteConfig.baseUrl}function-counts.json`, FUNCTION_COUNTS_CACHE_KEY)
            .then(data => setFunctionCounts(data));

        // Load category icons JSON with caching
        fetchWithCache(`${siteConfig.baseUrl}category-icons.json`, CATEGORY_ICONS_CACHE_KEY)
            .then(data => setCategoryIcons(data));
    }, [siteConfig.baseUrl]);

    // Enhance items with function counts and category icons
    // This needs to be computed every render to pick up functionCounts when they load
    const enhancedItems = React.useMemo(() => {
        if (!props.items) return props.items;

        // Get current category path from location
        const getCurrentCategoryPath = () => {
            const pathname = location.pathname;
            const baseUrl = siteConfig.baseUrl;
            let currentPath = pathname.replace(baseUrl, '').replace(/\/$/, '');
            const pathParts = currentPath.split('/').filter(p => p);

            // If we're on a category index page (1-2 parts), return the category path
            if (pathParts.length <= 2) {
                return pathParts.join('/');
            }

            // If we're on an actual page (3+ parts), return the category path (first 2 parts)
            if (pathParts.length >= 2) {
                return pathParts.slice(0, 2).join('/');
            }

            return null;
        };

        return props.items.map((item, index) => {
            // Process category items to add icons
            if (item.type === 'category') {
                // Handle category items with href (multi-page categories)
                if (item.href) {
                    // Extract category path from href
                    const href = item.href;
                    const baseUrl = siteConfig.baseUrl;
                    let categoryPath = href.replace(baseUrl, '').replace(/\/$/, '');
                    const pathParts = categoryPath.split('/').filter(p => p);

                    // For category cards, path should be 2 parts (e.g., script/AI)
                    if (pathParts.length === 2) {
                        const categoryKey = `${pathParts[0]}/${pathParts[1]}`;
                        const icon = categoryIcons[categoryKey];

                        if (icon) {
                            return {
                                ...item,
                                customProps: {
                                    ...item.customProps,
                                    icon: icon
                                }
                            };
                        }
                    }
                        // Also check if it's a single-page category (3+ parts in href)
                    // Single-page categories might have href like "script/Activatables/VehicleBuyingStationActivatable"
                    else if (pathParts.length >= 3) {
                        const categoryKey = `${pathParts[0]}/${pathParts[1]}`;
                        const icon = categoryIcons[categoryKey];

                        if (icon) {
                            return {
                                ...item,
                                customProps: {
                                    ...item.customProps,
                                    icon: icon
                                }
                            };
                        }
                    }
                }
                // Handle category items without href (single-page categories)
                // These only have a label, so we need to construct the category path from context
                if (!item.href && item.label) {
                    // Only process if categoryIcons has loaded
                    if (categoryIcons && Object.keys(categoryIcons).length > 0) {
                        const currentCategoryPath = getCurrentCategoryPath();
                        if (currentCategoryPath) {
                            // Extract the main category (script, engine, foundation) from current path
                            const mainCategory = currentCategoryPath.split('/')[0];

                            // Try exact match first
                            const categoryKey = `${mainCategory}/${item.label}`;
                            if (categoryIcons[categoryKey]) {
                                const icon = categoryIcons[categoryKey];
                                return {
                                    ...item,
                                    customProps: {
                                        ...item.customProps,
                                        icon: icon
                                    }
                                };
                            }

                            // Try case-insensitive match
                            const labelLower = item.label.toLowerCase();
                            for (const [key, icon] of Object.entries(categoryIcons)) {
                                const keyParts = key.split('/');
                                if (keyParts.length === 2 && keyParts[0] === mainCategory && keyParts[1].toLowerCase() === labelLower) {
                                    return {
                                        ...item,
                                        customProps: {
                                            ...item.customProps,
                                            icon: icon
                                        }
                                    };
                                }
                            }
                        }
                    }
                }
                return item;
            }

            // Only process link items (not category items) for function counts
            if (item.type !== 'link' || !item.docId) {
                return item;
            }

            const currentCategoryPath = getCurrentCategoryPath();
            let functionCount = null;
            let categoryIconForLink = null;

            // Check if this link item represents a single-page category
            // Only check if categoryIcons has loaded
            if (categoryIcons && Object.keys(categoryIcons).length > 0) {
                const docIdParts = item.docId.split('/');

                // Strategy 1: Check if docId itself is a 2-part category (e.g., "script/AI")
                if (docIdParts.length === 2) {
                    const categoryKey = item.docId;
                    if (categoryIcons[categoryKey]) {
                        categoryIconForLink = categoryIcons[categoryKey];
                    }
                }

                // Strategy 2: If docId has 3+ parts, check if the first 2 parts form a category
                // (e.g., "script/Activatables/VehicleBuyingStationActivatable" -> "script/Activatables")
                if (!categoryIconForLink && docIdParts.length >= 3) {
                    const categoryKey = `${docIdParts[0]}/${docIdParts[1]}`;
                    if (categoryIcons[categoryKey]) {
                        categoryIconForLink = categoryIcons[categoryKey];
                    }
                }

                // Strategy 3: Try extracting from href if available
                if (!categoryIconForLink && item.href) {
                    const href = item.href;
                    const baseUrl = siteConfig.baseUrl;
                    let categoryPath = href.replace(baseUrl, '').replace(/\/$/, '');
                    const hrefParts = categoryPath.split('/').filter(p => p);

                    // If href has 2 parts, check if it's a category
                    if (hrefParts.length === 2) {
                        const categoryKey = hrefParts.join('/');
                        if (categoryIcons[categoryKey]) {
                            categoryIconForLink = categoryIcons[categoryKey];
                        }
                    }
                    // If href has 3+ parts, check if first 2 parts form a category
                    else if (hrefParts.length >= 3) {
                        const categoryKey = `${hrefParts[0]}/${hrefParts[1]}`;
                        if (categoryIcons[categoryKey]) {
                            categoryIconForLink = categoryIcons[categoryKey];
                        }
                    }
                }

                // Strategy 4: If docId is just a filename and we have a current category path,
                // try constructing the full category path (e.g., "Base" -> "script/Base")
                if (!categoryIconForLink && currentCategoryPath && docIdParts.length === 1) {
                    const categoryKey = `${currentCategoryPath}/${item.docId}`;
                    if (categoryIcons[categoryKey]) {
                        categoryIconForLink = categoryIcons[categoryKey];
                    }
                }

                // Strategy 5: Try matching by filename across all categories
                if (!categoryIconForLink && docIdParts.length === 1) {
                    const filename = item.docId;
                    for (const [categoryPath, icon] of Object.entries(categoryIcons)) {
                        // Check if category path ends with this filename
                        if (categoryPath.endsWith(`/${filename}`)) {
                            categoryIconForLink = icon;
                            break;
                        }
                    }
                }
            }

            // Skip if functionCounts hasn't loaded yet (but still process category icons)
            if (!functionCounts || Object.keys(functionCounts).length === 0) {
                // If this is a single-page category, add the icon
                if (categoryIconForLink) {
                    return {
                        ...item,
                        customProps: {
                            ...item.customProps,
                            icon: categoryIconForLink
                        }
                    };
                }
                return item;
            }

            // Try multiple matching strategies
            // Strategy 1: Exact match with item.docId
            if (functionCounts[item.docId]) {
                functionCount = functionCounts[item.docId];
            }

            // Strategy 2: If we have a current category path, try constructing the full path
            if (!functionCount && currentCategoryPath) {
                // If docId is relative (doesn't start with script/engine/foundation), prepend current category
                const docIdParts = item.docId.split('/');
                if (docIdParts.length > 0 && !['script', 'engine', 'foundation'].includes(docIdParts[0])) {
                    const fullPath = `${currentCategoryPath}/${item.docId}`;
                    if (functionCounts[fullPath]) {
                        functionCount = functionCounts[fullPath];
                    }
                }

                // Strategy 3: Try currentCategoryPath/filename
                if (!functionCount) {
                    const filename = item.docId.split('/').pop();
                    const fullPath = `${currentCategoryPath}/${filename}`;
                    if (functionCounts[fullPath]) {
                        functionCount = functionCounts[fullPath];
                    }
                }

                // Strategy 4: Find any path in current category ending with filename
                if (!functionCount) {
                    const filename = item.docId.split('/').pop();
                    for (const [path, count] of Object.entries(functionCounts)) {
                        if (path.startsWith(currentCategoryPath + '/') && path.endsWith(`/${filename}`)) {
                            functionCount = count;
                            break;
                        }
                    }
                }
            }

            // Strategy 5: Fallback - match by filename across all categories (last resort)
            if (!functionCount) {
                const filename = item.docId.split('/').pop();
                for (const [path, count] of Object.entries(functionCounts)) {
                    if (path.endsWith(`/${filename}`)) {
                        functionCount = count;
                        break;
                    }
                }
            }

            // Build the result object
            const result = {...item};

            // Add category icon if this is a single-page category
            if (categoryIconForLink) {
                // Ensure customProps exists
                if (!result.customProps) {
                    result.customProps = {};
                }
                result.customProps = {
                    ...result.customProps,
                    icon: categoryIconForLink
                };
            }

            // Add description if we found a function count
            if (functionCount && functionCount > 0) {
                result.description = `${functionCount} functions`;
            }

            return result;
        });
    }, [props.items, functionCounts, categoryIcons, location.pathname, siteConfig.baseUrl]);

    return <DocCardList {...props} items={enhancedItems || props.items}/>;
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(DocCardListWrapper, (prevProps, nextProps) => {
    // Only re-render if items array reference changes
    // The enhancedItems useMemo will handle item-level changes
    return prevProps.items === nextProps.items;
});

