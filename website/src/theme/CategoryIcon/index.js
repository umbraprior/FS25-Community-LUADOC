import React, {useState, useEffect} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {loadIcon} from '@site/src/utils/iconLoader';

/**
 * CategoryIcon component - displays Font Awesome icon for a category
 * Uses dynamic icon loading to reduce initial bundle size
 * @param {string} iconName - The Font Awesome icon name (e.g., 'robot', 'film')
 * @param {string} className - Additional CSS classes
 */
export default function CategoryIcon({iconName, className = ''}) {
    const [iconLoaded, setIconLoaded] = useState(false);

    useEffect(() => {
        if (!iconName) {
            return;
        }

        // Load icon dynamically
        loadIcon(iconName)
            .then(() => {
                setIconLoaded(true);
            })
            .catch((error) => {
                console.warn(`Failed to load icon "${iconName}":`, error);
            });
    }, [iconName]);

    if (!iconName || !iconLoaded) {
        // Return a placeholder or null while loading
        // This prevents layout shift
        return null;
    }

    return (
        <FontAwesomeIcon
            icon={['fas', iconName]}
            className={className}
            aria-hidden="true"
        />
    );
}

