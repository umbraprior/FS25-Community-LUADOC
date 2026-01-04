import React, {useState, useEffect, useRef} from 'react';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import clsx from 'clsx';
import styles from './styles.module.css';

export default function FloatingEditButton() {
    const location = useLocation();
    const {siteConfig} = useDocusaurusContext();
    const [editUrl, setEditUrl] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalRef = useRef(null);
    const previousActiveElementRef = useRef(null);
    const firstFocusableElementRef = useRef(null);
    const lastFocusableElementRef = useRef(null);

    useEffect(() => {
        // Only show on actual markdown documentation pages (not category index pages or other generated pages)
        const baseUrl = siteConfig.baseUrl;
        const pathname = location.pathname;

        // Check if it's a docs page (not homepage, not search, and has content after baseUrl)
        const isDocsPage = pathname.startsWith(baseUrl) &&
            pathname !== baseUrl &&
            pathname !== `${baseUrl}search` &&
            !pathname.includes('/search?');

        if (!isDocsPage) {
            setEditUrl(null);
            return;
        }

        // Remove baseUrl and trailing slash
        let currentPath = pathname.replace(baseUrl, '').replace(/\/$/, '');
        const pathParts = currentPath.split('/').filter(p => p);

        // Check if this is a category index page by URL structure
        // Main categories: engine, foundation, script (1 part)
        // Subcategories: script/AI, engine/Animation (2 parts)
        // Actual pages: script/AI/AISystem (3+ parts)
        const isCategoryIndexByPath = pathParts.length <= 2;

        // Also check DOM after it renders to detect generated-index pages
        const checkPageType = () => {
            // Check for generated-index indicators in the DOM
            const hasGeneratedIndex = document.querySelector('[class*="generated-index"]') !== null ||
                document.querySelector('.theme-doc-markdown h1')?.textContent?.includes('Documentation');

            // Check if page has multiple cards (category index pages show card grids)
            const cardCount = document.querySelectorAll('.theme-doc-card').length;
            const hasCardGrid = cardCount > 1;

            // Check if main content has card list structure
            const hasCardList = document.querySelector('.theme-doc-card-list') !== null;

            return isCategoryIndexByPath || hasGeneratedIndex || (hasCardGrid && hasCardList);
        };

        // Use timeout to check DOM after render
        const timeout = setTimeout(() => {
            const isCategoryIndex = checkPageType();

            if (isCategoryIndex) {
                setEditUrl(null);
                return;
            }

            // This is an actual markdown page - generate edit URL
            let filePath = currentPath;
            if (filePath && !filePath.startsWith('docs/')) {
                filePath = `docs/${filePath}.md`;
            }

            const githubEditUrl = `https://github.com/${siteConfig.organizationName}/${siteConfig.projectName}/edit/main/${filePath}`;
            setEditUrl(githubEditUrl);
        }, 150);

        return () => clearTimeout(timeout);
    }, [location.pathname, siteConfig]);

    // Focus trap and keyboard handling for modal
    // IMPORTANT: This hook must be called before any conditional returns
    // to follow React's rules of hooks (hooks must be called in the same order every render)
    useEffect(() => {
        if (!isModalOpen) return;

        // Store the element that had focus before opening modal
        previousActiveElementRef.current = document.activeElement;

        // Get all focusable elements in the modal
        const getFocusableElements = (element) => {
            const focusableSelectors = [
                'a[href]',
                'button:not([disabled])',
                'textarea:not([disabled])',
                'input:not([disabled])',
                'select:not([disabled])',
                '[tabindex]:not([tabindex="-1"])'
            ].join(', ');

            return Array.from(element.querySelectorAll(focusableSelectors))
                .filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                });
        };

        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = getFocusableElements(modal);
        if (focusableElements.length === 0) return;

        firstFocusableElementRef.current = focusableElements[0];
        lastFocusableElementRef.current = focusableElements[focusableElements.length - 1];

        // Focus first element
        firstFocusableElementRef.current?.focus();

        // Handle Tab key for focus trap
        const handleTabKey = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstFocusableElementRef.current) {
                    e.preventDefault();
                    lastFocusableElementRef.current?.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastFocusableElementRef.current) {
                    e.preventDefault();
                    firstFocusableElementRef.current?.focus();
                }
            }
        };

        // Handle Escape key to close modal
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape') {
                setIsModalOpen(false);
            }
        };

        modal.addEventListener('keydown', handleTabKey);
        document.addEventListener('keydown', handleEscapeKey);

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        return () => {
            modal.removeEventListener('keydown', handleTabKey);
            document.removeEventListener('keydown', handleEscapeKey);
            document.body.style.overflow = '';

            // Return focus to previous element
            if (previousActiveElementRef.current) {
                previousActiveElementRef.current.focus();
            }
        };
    }, [isModalOpen]);

    const handleEditClick = () => {
        if (!editUrl) return;
        window.open(editUrl, '_blank', 'noopener,noreferrer');
        setIsModalOpen(false);
    };

    // Early return after all hooks have been called
    if (!editUrl) {
        return null;
    }

    return (
        <>
            <button
                className={clsx(styles.floatingButton)}
                onClick={() => setIsModalOpen(true)}
                aria-label="Edit this page"
                aria-haspopup="dialog"
                title="Edit this page on GitHub"
                type="button"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>

            {isModalOpen && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setIsModalOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                    aria-describedby="modal-description"
                >
                    <div
                        ref={modalRef}
                        className={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <h3 id="modal-title">Edit this page</h3>
                            <button
                                className={styles.closeButton}
                                onClick={() => setIsModalOpen(false)}
                                aria-label="Close modal"
                                type="button"
                            >
                                <span aria-hidden="true">×</span>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p id="modal-description">
                                This will open the page on GitHub where you can edit it and submit a pull request.
                            </p>
                            <div className={styles.modalActions}>
                                <button
                                    className={clsx(styles.editButton, 'button button--primary')}
                                    onClick={handleEditClick}
                                    type="button"
                                >
                                    Edit on GitHub
                                </button>
                                <button
                                    className={clsx(styles.cancelButton, 'button button--secondary')}
                                    onClick={() => setIsModalOpen(false)}
                                    type="button"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

