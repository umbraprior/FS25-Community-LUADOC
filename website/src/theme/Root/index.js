import React, {useEffect} from 'react';
import FloatingEditButton from '@theme/FloatingEditButton';
import CookieConsent from '@site/src/components/CookieConsent';
import {useLocation} from '@docusaurus/router';

// Wrapper that provides children to the Root component
export default function Root({children}) {
    const location = useLocation();

    useEffect(() => {
        // Global function to replace "items" with "pages" in all DocCard footers
        const replaceItemsWithPages = () => {
            // Try multiple selectors to find card footers
            const selectors = [
                '.theme-doc-card .card__footer',
                '.card__footer',
                '[class*="card__footer"]',
                '.theme-doc-card footer',
                'article .card__footer',
                '.card footer',
                '[class*="card"] footer'
            ];

            let foundAny = false;
            selectors.forEach(selector => {
                const footers = document.querySelectorAll(selector);
                if (footers.length > 0) foundAny = true;
                footers.forEach(footer => {
                    // Get all text nodes
                    const walker = document.createTreeWalker(
                        footer,
                        NodeFilter.SHOW_TEXT,
                        null
                    );

                    let node;
                    while (node = walker.nextNode()) {
                        if (node.textContent) {
                            const text = node.textContent.trim();
                            // Match patterns like "11 items", "1 item", "items", etc.
                            if (text.match(/\d+\s+items?/i) || text.match(/items?/i)) {
                                const newText = node.textContent
                                    .replace(/\b(\d+)\s+items\b/gi, '$1 pages')
                                    .replace(/\b(\d+)\s+item\b/gi, '$1 page')
                                    .replace(/\s+items\b/gi, ' pages')
                                    .replace(/\s+item\b/gi, ' page');

                                if (newText !== node.textContent) {
                                    node.textContent = newText;
                                }
                            }
                        }
                    }

                    // Also try direct textContent replacement
                    const text = footer.textContent || footer.innerText || '';
                    if (text && (text.includes('items') || text.includes('item'))) {
                        const match = text.match(/(\d+)\s+(items?)/i);
                        if (match) {
                            const number = match[1];
                            footer.setAttribute('data-item-count', number);
                            const newText = text
                                .replace(/\b(\d+)\s+items\b/gi, '$1 pages')
                                .replace(/\b(\d+)\s+item\b/gi, '$1 page')
                                .replace(/\s+items\b/gi, ' pages')
                                .replace(/\s+item\b/gi, ' page');

                            if (newText !== text) {
                                // Replace all text nodes
                                footer.childNodes.forEach(child => {
                                    if (child.nodeType === Node.TEXT_NODE) {
                                        child.textContent = child.textContent
                                            .replace(/\b(\d+)\s+items\b/gi, '$1 pages')
                                            .replace(/\b(\d+)\s+item\b/gi, '$1 page');
                                    }
                                });
                            }
                        }
                    }
                });
            });

            // If no footers found with selectors, try finding any element containing "items"
            if (!foundAny) {
                const allElements = document.querySelectorAll('*');
                allElements.forEach(el => {
                    const text = el.textContent || '';
                    if (text.match(/\d+\s+items?/i) && el.children.length === 0) {
                        // This is likely a text node parent
                        const newText = text
                            .replace(/\b(\d+)\s+items\b/gi, '$1 pages')
                            .replace(/\b(\d+)\s+item\b/gi, '$1 page');
                        if (newText !== text) {
                            el.textContent = newText;
                        }
                    }
                });
            }
        };

        // Run immediately and with multiple delays
        replaceItemsWithPages();
        const timeouts = [
            setTimeout(replaceItemsWithPages, 50),
            setTimeout(replaceItemsWithPages, 100),
            setTimeout(replaceItemsWithPages, 200),
            setTimeout(replaceItemsWithPages, 500),
            setTimeout(replaceItemsWithPages, 1000),
        ];

        // Use MutationObserver with more aggressive settings
        const observer = new MutationObserver((mutations) => {
            let shouldRun = false;
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    shouldRun = true;
                }
            });
            if (shouldRun) {
                replaceItemsWithPages();
            }
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: false
            });
        }

        // Also observe the main content area
        const mainContent = document.querySelector('main, [role="main"]');
        if (mainContent) {
            observer.observe(mainContent, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        return () => {
            timeouts.forEach(clearTimeout);
            observer.disconnect();
        };
    }, [location.pathname]);

    return (
        <>
            {/* Skip to content link for keyboard navigation */}
            <a href="#__docusaurus" className="skip-to-content">
                Skip to main content
            </a>
            {children}
            <FloatingEditButton/>
            <CookieConsent/>
        </>
    );
}

