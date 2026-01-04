import React, {useEffect, useRef, useMemo, useCallback} from 'react';
import ReactDOM from 'react-dom/client';
import DocCard from '@theme-original/DocCard';
import CategoryIcon from '@theme/CategoryIcon';

function DocCardWrapper(props) {
    const cardRef = useRef(null);

    // Get icon from item's customProps (set by DocCardList)
    const categoryIcon = props.item?.customProps?.icon;

    // Determine if this is a page (link item) or category
    const isPage = props.item?.type === 'link';
    const isCategory = props.item?.type === 'category';

    useEffect(() => {
        // Function to replace items with pages - very aggressive
        const replaceItemsText = () => {
            if (!cardRef.current) return;

            // Find footer using multiple methods
            const footer = cardRef.current.querySelector('.card__footer') ||
                cardRef.current.querySelector('footer') ||
                cardRef.current.querySelector('[class*="footer"]');

            if (footer) {
                // Replace in all text nodes
                const walker = document.createTreeWalker(
                    footer,
                    NodeFilter.SHOW_TEXT,
                    null
                );

                let node;
                while (node = walker.nextNode()) {
                    if (node.textContent && (node.textContent.includes('items') || node.textContent.includes('item'))) {
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

                // Also replace entire footer textContent
                const text = footer.textContent || '';
                if (text && (text.includes('items') || text.includes('item'))) {
                    const newText = text
                        .replace(/\b(\d+)\s+items\b/gi, '$1 pages')
                        .replace(/\b(\d+)\s+item\b/gi, '$1 page')
                        .replace(/\s+items\b/gi, ' pages')
                        .replace(/\s+item\b/gi, ' page');
                    if (newText !== text) {
                        footer.textContent = newText;
                    }
                }
            }
        };

        // Run multiple times with delays
        const replaceTimeouts = [
            setTimeout(replaceItemsText, 0),
            setTimeout(replaceItemsText, 10),
            setTimeout(replaceItemsText, 50),
            setTimeout(replaceItemsText, 100),
            setTimeout(replaceItemsText, 200),
            setTimeout(replaceItemsText, 500),
        ];

        // Function to remove default folder icons/emojis
        const removeDefaultIcons = () => {
            if (!cardRef.current) return;

            const cardTitle = cardRef.current.querySelector('.card__title, h3, h2, [class*="title"]');
            if (!cardTitle) return;

            // Remove any emoji folder icons (common folder emojis: 📁 🗂️ 📂 🗃️)
            const folderEmojis = ['📁', '🗂️', '📂', '🗃️', '📋', '📄'];

            // First, remove entire elements that only contain folder emojis
            const allElements = cardTitle.querySelectorAll('*');
            allElements.forEach(el => {
                const text = el.textContent || '';
                const hasOnlyFolderEmojis = folderEmojis.some(emoji => text.trim() === emoji || text.trim().startsWith(emoji));
                if (hasOnlyFolderEmojis && !el.closest('.category-icon-injected') && !el.querySelector('a')) {
                    el.remove();
                }
            });

            // Then remove emojis from text nodes
            folderEmojis.forEach(emoji => {
                // Remove emoji from text nodes
                const walker = document.createTreeWalker(
                    cardTitle,
                    NodeFilter.SHOW_TEXT,
                    null
                );

                let node;
                while (node = walker.nextNode()) {
                    if (node.textContent && node.textContent.includes(emoji)) {
                        // Escape emoji for regex (some emojis have variation selectors)
                        const emojiEscaped = emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        node.textContent = node.textContent.replace(new RegExp(emojiEscaped, 'g'), '').trim();
                    }
                }
            });

            // Remove any SVG icons (Docusaurus default folder icons)
            const allSvgs = cardTitle.querySelectorAll('svg');
            allSvgs.forEach(svg => {
                // Skip our custom icon
                if (svg.closest('.category-icon-injected')) return;

                // Remove if it's a folder icon or default Docusaurus icon
                const parent = svg.parentElement;
                if (parent && (
                    parent.classList.contains('theme-doc-sidebar-item-icon') ||
                    parent.classList.contains('menu__link-icon') ||
                    svg.getAttribute('aria-label')?.toLowerCase().includes('folder') ||
                    svg.getAttribute('aria-label')?.toLowerCase().includes('category')
                )) {
                    parent.remove();
                } else if (svg.parentElement && svg.parentElement.tagName !== 'A') {
                    // Remove standalone SVG icons that aren't in links
                    svg.remove();
                }
            });

            // Remove any icon elements with folder-related classes or default Docusaurus icon classes
            const iconSelectors = [
                '.theme-doc-sidebar-item-icon',
                '.menu__link-icon',
                '[class*="folder"]',
                '[class*="Folder"]',
                '[class*="icon"]:not(.category-icon-injected)'
            ];

            iconSelectors.forEach(selector => {
                const elements = cardTitle.querySelectorAll(selector);
                elements.forEach(el => {
                    // Only remove if it's not our custom icon
                    if (!el.classList.contains('category-icon-injected') &&
                        !el.closest('.category-icon-injected')) {
                        // Check if it's before our icon or the link
                        const titleLink = cardTitle.querySelector('a');
                        if (titleLink && el.compareDocumentPosition(titleLink) & Node.DOCUMENT_POSITION_FOLLOWING) {
                            el.remove();
                        } else if (!titleLink) {
                            el.remove();
                        }
                    }
                });
            });

            // Remove any span/div elements that only contain emojis or icons before the link
            const titleLink = cardTitle.querySelector('a');
            if (titleLink) {
                let sibling = titleLink.previousSibling;
                while (sibling) {
                    const nextSibling = sibling.previousSibling;
                    if (sibling.nodeType === Node.ELEMENT_NODE) {
                        const el = sibling;
                        // Remove if it's an icon container or only contains emojis
                        if (el.tagName === 'SPAN' || el.tagName === 'DIV' || el.tagName === 'I') {
                            const text = el.textContent || '';
                            const hasOnlyEmojis = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]+$/u.test(text.trim());
                            const hasFolderEmoji = folderEmojis.some(emoji => text.includes(emoji));
                            if (hasOnlyEmojis || hasFolderEmoji || el.querySelector('svg')) {
                                el.remove();
                            }
                        } else if (sibling.nodeType === Node.TEXT_NODE) {
                            // Also check text nodes for folder emojis
                            const text = sibling.textContent || '';
                            if (folderEmojis.some(emoji => text.includes(emoji))) {
                                const emojiEscaped = folderEmojis.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                                sibling.textContent = text.replace(new RegExp(emojiEscaped, 'g'), '').trim();
                            }
                        }
                    } else if (sibling.nodeType === Node.TEXT_NODE) {
                        // Check text nodes for folder emojis
                        const text = sibling.textContent || '';
                        if (folderEmojis.some(emoji => text.includes(emoji))) {
                            const emojiEscaped = folderEmojis.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                            sibling.textContent = text.replace(new RegExp(emojiEscaped, 'g'), '').trim();
                        }
                    }
                    sibling = nextSibling;
                }
            }

            // Also check the first child of cardTitle for emojis
            if (cardTitle.firstChild) {
                if (cardTitle.firstChild.nodeType === Node.TEXT_NODE) {
                    const text = cardTitle.firstChild.textContent || '';
                    if (folderEmojis.some(emoji => text.includes(emoji))) {
                        const emojiEscaped = folderEmojis.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                        cardTitle.firstChild.textContent = text.replace(new RegExp(emojiEscaped, 'g'), '').trim();
                    }
                } else if (cardTitle.firstChild.nodeType === Node.ELEMENT_NODE) {
                    const firstEl = cardTitle.firstChild;
                    const text = firstEl.textContent || '';
                    const hasFolderEmoji = folderEmojis.some(emoji => text.includes(emoji));
                    if (hasFolderEmoji && !firstEl.closest('.category-icon-injected') && !firstEl.querySelector('a')) {
                        // If it only contains the folder emoji, remove it
                        if (text.trim().length <= 2 || folderEmojis.some(emoji => text.trim() === emoji)) {
                            firstEl.remove();
                        } else {
                            // Otherwise just remove the emoji from the text
                            folderEmojis.forEach(emoji => {
                                if (text.includes(emoji)) {
                                    const emojiEscaped = emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    firstEl.textContent = text.replace(new RegExp(emojiEscaped, 'g'), '').trim();
                                }
                            });
                        }
                    }
                }
            }
        };

        // Function to inject card styles
        const injectCardStyles = () => {
            if (!cardRef.current) return;

            // Find the actual card element (could be .theme-doc-card or .card)
            const card = cardRef.current.querySelector('.theme-doc-card, .card, [class*="card"]');
            if (!card) return;

            // Apply card container styles with yellow-green accent
            card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.border = '1px solid rgba(170, 198, 60, 0.3)';
            card.style.borderLeft = '3px solid #AAC63C'; // Yellow-green left border
            card.style.borderRadius = '12px';
            card.style.overflow = 'hidden';
            card.style.background = 'rgba(25, 72, 64, 0.08)';
            card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
            card.style.position = 'relative';

            // Add hover effect via event listeners with gold accent
            const handleMouseEnter = () => {
                card.style.transform = 'translateY(-4px)';
                card.style.boxShadow =
                    '0 12px 24px rgba(0, 0, 0, 0.15), ' +
                    '0 0 20px rgba(254, 213, 0, 0.3), ' +
                    '0 0 40px rgba(254, 213, 0, 0.15)';
                card.style.borderColor = '#FED500'; // Gold border on hover
                card.style.borderLeftWidth = '4px';
                card.style.borderLeftColor = '#FED500'; // Gold left border on hover
            };

            const handleMouseLeave = () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                card.style.borderColor = 'rgba(170, 198, 60, 0.3)';
                card.style.borderLeftWidth = '3px';
                card.style.borderLeftColor = '#AAC63C'; // Yellow-green left border
            };

            card.addEventListener('mouseenter', handleMouseEnter);
            card.addEventListener('mouseleave', handleMouseLeave);

            // Store handlers for cleanup
            card._hoverHandlers = {handleMouseEnter, handleMouseLeave};

            // Style card title
            const cardTitle = card.querySelector('.card__title, h3, h2, [class*="title"]');
            if (cardTitle) {
                cardTitle.style.fontSize = '1.25rem';
                cardTitle.style.fontWeight = '600';
                cardTitle.style.marginBottom = '0.75rem';
                cardTitle.style.lineHeight = '1.4';
                cardTitle.style.color = 'var(--ifm-heading-color)';
                cardTitle.style.transition = 'color 0.2s ease';
                cardTitle.style.overflow = 'visible';
                cardTitle.style.position = 'relative';
                cardTitle.style.zIndex = '5';

                const titleLink = cardTitle.querySelector('a');
                if (titleLink) {
                    titleLink.style.color = 'inherit';
                    titleLink.style.textDecoration = 'none';
                    titleLink.style.transition = 'color 0.2s ease';

                    const handleTitleHover = () => {
                        cardTitle.style.color = '#AAC63C'; // Yellow-green on hover
                    };
                    const handleTitleLeave = () => {
                        cardTitle.style.color = 'var(--ifm-heading-color)';
                    };

                    titleLink.addEventListener('mouseenter', handleTitleHover);
                    titleLink.addEventListener('mouseleave', handleTitleLeave);
                    titleLink._hoverHandlers = {handleTitleHover, handleTitleLeave};
                }
            }

            // Style card body
            const cardBody = card.querySelector('.card__body, [class*="body"]');
            if (cardBody) {
                cardBody.style.padding = '1.25rem';
                cardBody.style.background = 'transparent';

                const paragraphs = cardBody.querySelectorAll('p');
                paragraphs.forEach(p => {
                    p.style.marginBottom = '0.75rem';
                    p.style.color = 'var(--ifm-color-content)';
                    p.style.lineHeight = '1.6';
                    p.style.fontSize = '0.95rem';
                });
            }

            // Style card footer with gold accent
            const cardFooter = card.querySelector('.card__footer, footer, [class*="footer"]');
            if (cardFooter) {
                cardFooter.style.padding = '0.75rem 1.25rem';
                cardFooter.style.backgroundColor = 'rgba(25, 72, 64, 0.12)';
                cardFooter.style.borderTop = '1px solid rgba(170, 198, 60, 0.3)'; // Yellow-green border
                cardFooter.style.fontSize = '0.875rem';
                cardFooter.style.color = 'var(--ifm-color-content)';
                cardFooter.style.position = 'relative';

                // Add gold accent line on hover
                const handleFooterHover = () => {
                    cardFooter.style.borderTopColor = '#FED500'; // Gold on hover
                    cardFooter.style.borderTopWidth = '2px';
                };
                const handleFooterLeave = () => {
                    cardFooter.style.borderTopColor = 'rgba(170, 198, 60, 0.3)';
                    cardFooter.style.borderTopWidth = '1px';
                };

                card.addEventListener('mouseenter', handleFooterHover);
                card.addEventListener('mouseleave', handleFooterLeave);
                if (!card._hoverHandlers) card._hoverHandlers = {};
                card._hoverHandlers.handleFooterHover = handleFooterHover;
                card._hoverHandlers.handleFooterLeave = handleFooterLeave;
            }

            // Style icon with gold accent on hover
            const icon = card.querySelector('.category-icon-injected');
            if (icon) {
                icon.style.transition = 'transform 0.3s ease, color 0.3s ease';
                icon.style.color = '#AAC63C'; // Yellow-green default
                icon.style.overflow = 'visible';
                icon.style.position = 'relative';
                icon.style.zIndex = '10';

                // Ensure the icon container doesn't clip
                const iconSvg = icon.querySelector('svg');
                if (iconSvg) {
                    iconSvg.style.overflow = 'visible';
                }

                const handleIconHover = () => {
                    icon.style.transform = 'scale(1.2)';
                    icon.style.color = '#FED500'; // Gold on hover
                    icon.style.filter = 'drop-shadow(0 0 8px rgba(254, 213, 0, 0.6))';
                };
                const handleIconLeave = () => {
                    icon.style.transform = 'scale(1)';
                    icon.style.color = '#AAC63C'; // Yellow-green default
                    icon.style.filter = 'none';
                };

                card.addEventListener('mouseenter', handleIconHover);
                card.addEventListener('mouseleave', handleIconLeave);
                if (!card._hoverHandlers) card._hoverHandlers = {};
                card._hoverHandlers.handleIconHover = handleIconHover;
                card._hoverHandlers.handleIconLeave = handleIconLeave;
            }
        };

        // Function to inject icon
        const injectIcon = () => {
            if (!cardRef.current) return;

            // First remove any default folder icons
            removeDefaultIcons();

            const cardTitle = cardRef.current.querySelector('.card__title, h3, h2, [class*="title"]');
            if (!cardTitle) return;

            // Determine which icon to use
            let iconToUse = null;
            if (isCategory && categoryIcon) {
                // Category items get their specific icon
                iconToUse = categoryIcon;
            } else if (isPage && categoryIcon) {
                // Single-page categories (link items with category icon) get their category icon
                iconToUse = categoryIcon;
            } else if (isPage) {
                // Regular page items get newspaper icon
                iconToUse = 'newspaper';
            }

            if (!iconToUse) return;

            // Check if icon is already injected
            if (cardTitle.querySelector('.category-icon-injected')) return;

            const iconContainer = document.createElement('span');
            iconContainer.className = 'category-icon-injected';
            iconContainer.style.display = 'inline-flex';
            iconContainer.style.alignItems = 'center';
            iconContainer.style.justifyContent = 'center';
            iconContainer.style.marginRight = '0.5rem';
            iconContainer.style.overflow = 'visible';
            iconContainer.style.padding = '0.25rem';
            iconContainer.style.margin = '0 0.5rem 0 0';

            const titleLink = cardTitle.querySelector('a');
            if (titleLink) {
                cardTitle.insertBefore(iconContainer, titleLink);
            } else if (cardTitle.firstChild) {
                cardTitle.insertBefore(iconContainer, cardTitle.firstChild);
            } else {
                cardTitle.appendChild(iconContainer);
            }

            const root = ReactDOM.createRoot(iconContainer);
            root.render(<CategoryIcon iconName={iconToUse} className="category-icon-injected"/>);
        };

        // Use MutationObserver
        const observer = new MutationObserver(() => {
            replaceItemsText();
            // Always try to remove default icons, and inject our icon if we have one
            removeDefaultIcons();
            injectCardStyles();
            if (categoryIcon || isPage) {
                injectIcon();
            }
        });

        if (cardRef.current) {
            observer.observe(cardRef.current, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: false
            });
        }

        // Cleanup function for event listeners
        const cleanup = () => {
            const card = cardRef.current?.querySelector('.theme-doc-card, .card, [class*="card"]');
            if (card && card._hoverHandlers) {
                if (card._hoverHandlers.handleMouseEnter) {
                    card.removeEventListener('mouseenter', card._hoverHandlers.handleMouseEnter);
                }
                if (card._hoverHandlers.handleMouseLeave) {
                    card.removeEventListener('mouseleave', card._hoverHandlers.handleMouseLeave);
                }
                if (card._hoverHandlers.handleIconHover) {
                    card.removeEventListener('mouseenter', card._hoverHandlers.handleIconHover);
                }
                if (card._hoverHandlers.handleIconLeave) {
                    card.removeEventListener('mouseleave', card._hoverHandlers.handleIconLeave);
                }
                if (card._hoverHandlers.handleFooterHover) {
                    card.removeEventListener('mouseenter', card._hoverHandlers.handleFooterHover);
                }
                if (card._hoverHandlers.handleFooterLeave) {
                    card.removeEventListener('mouseleave', card._hoverHandlers.handleFooterLeave);
                }

                const titleLink = card.querySelector('.card__title a, [class*="title"] a');
                if (titleLink && titleLink._hoverHandlers) {
                    titleLink.removeEventListener('mouseenter', titleLink._hoverHandlers.handleTitleHover);
                    titleLink.removeEventListener('mouseleave', titleLink._hoverHandlers.handleTitleLeave);
                }
            }
        };

        // Try to inject styles and icons multiple times with delays
        const injectTimeouts = [];
        const injectAll = () => {
            removeDefaultIcons();
            injectCardStyles();
            if (categoryIcon || isPage) {
                injectIcon();
            }
        };

        injectAll();
        injectTimeouts.push(setTimeout(injectAll, 50));
        injectTimeouts.push(setTimeout(injectAll, 100));
        injectTimeouts.push(setTimeout(injectAll, 200));
        injectTimeouts.push(setTimeout(injectAll, 500));

        return () => {
            replaceTimeouts.forEach(clearTimeout);
            injectTimeouts.forEach(clearTimeout);
            observer.disconnect();
            cleanup();
        };
    }, [props.item, categoryIcon, isPage, isCategory]);

    return (
        <div ref={cardRef} className="doc-card-wrapper" data-category-icon={categoryIcon || ''}>
            <DocCard {...props} />
            {categoryIcon && (
                <div style={{display: 'none'}} data-icon-name={categoryIcon}/>
            )}
        </div>
    );
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(DocCardWrapper, (prevProps, nextProps) => {
    // Only re-render if item or key props change
    return (
        prevProps.item?.docId === nextProps.item?.docId &&
        prevProps.item?.href === nextProps.item?.href &&
        prevProps.item?.label === nextProps.item?.label &&
        prevProps.item?.customProps?.icon === nextProps.item?.customProps?.icon &&
        prevProps.item?.description === nextProps.item?.description
    );
});

