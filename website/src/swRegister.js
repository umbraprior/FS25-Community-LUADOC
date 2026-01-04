if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // The Docusaurus PWA plugin automatically generates sw.js with the correct baseUrl
        // We just need to register it. The plugin handles the path automatically.
        // For GitHub Pages with baseUrl, the service worker will be at: /FS25-Community-LUADOC/sw.js

        // Get baseUrl from the page's base tag (Docusaurus injects this)
        const baseElement = document.querySelector('base');
        const baseUrl = baseElement ? baseElement.getAttribute('href') : '/';

        // Register service worker
        navigator.serviceWorker
            .register(`${baseUrl}sw.js`)
            .then((registration) => {
                // Service worker registered successfully
                // Optional: Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker available
                                console.log('New service worker available');
                            }
                        });
                    }
                });
            })
            .catch((registrationError) => {
                // Service worker registration failed (might be HTTP instead of HTTPS, or other issue)
                console.warn('SW registration failed: ', registrationError);
            });
    });
}
