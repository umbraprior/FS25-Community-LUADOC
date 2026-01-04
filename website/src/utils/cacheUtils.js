/**
 * Utility functions for managing browser storage (localStorage, sessionStorage, cookies)
 */

// Cache version - increment when data structure changes
const CACHE_VERSION = '1.0';

/**
 * Get item from localStorage with version checking
 */
export function getLocalStorage(key, defaultValue = null) {
    if (typeof window === 'undefined') return defaultValue;

    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;

        const parsed = JSON.parse(item);
        // Check version if it exists
        if (parsed.version && parsed.version !== CACHE_VERSION) {
            localStorage.removeItem(key);
            return defaultValue;
        }

        return parsed.data !== undefined ? parsed.data : parsed;
    } catch (e) {
        console.warn(`Error reading localStorage key "${key}":`, e);
        return defaultValue;
    }
}

/**
 * Set item in localStorage with version
 */
export function setLocalStorage(key, value) {
    if (typeof window === 'undefined') return;

    try {
        const item = {
            data: value,
            version: CACHE_VERSION,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
        console.warn(`Error writing localStorage key "${key}":`, e);
    }
}

/**
 * Get item from sessionStorage with version checking
 */
export function getSessionStorage(key, defaultValue = null) {
    if (typeof window === 'undefined') return defaultValue;

    try {
        const item = sessionStorage.getItem(key);
        if (!item) return defaultValue;

        const parsed = JSON.parse(item);
        // Check version if it exists
        if (parsed.version && parsed.version !== CACHE_VERSION) {
            sessionStorage.removeItem(key);
            return defaultValue;
        }

        return parsed.data !== undefined ? parsed.data : parsed;
    } catch (e) {
        console.warn(`Error reading sessionStorage key "${key}":`, e);
        return defaultValue;
    }
}

/**
 * Set item in sessionStorage with version
 */
export function setSessionStorage(key, value) {
    if (typeof window === 'undefined') return;

    try {
        const item = {
            data: value,
            version: CACHE_VERSION,
            timestamp: Date.now()
        };
        sessionStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
        console.warn(`Error writing sessionStorage key "${key}":`, e);
    }
}

/**
 * Set a cookie
 */
export function setCookie(name, value, days = 365) {
    if (typeof document === 'undefined') return;

    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get a cookie
 */
export function getCookie(name) {
    if (typeof document === 'undefined') return null;

    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * Check if cookies are accepted
 */
export function hasCookieConsent() {
    const consent = getLocalStorage('fs25-cookie-consent');
    return consent && consent.accepted === true;
}

/**
 * Clear all cache (useful for debugging or reset)
 */
export function clearAllCache() {
    if (typeof window === 'undefined') return;

    try {
        localStorage.clear();
        sessionStorage.clear();
        // Note: We can't clear all cookies programmatically, but we can clear known ones
    } catch (e) {
        console.warn('Error clearing cache:', e);
    }
}

