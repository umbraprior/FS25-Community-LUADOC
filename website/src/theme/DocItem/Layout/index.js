import React, {useEffect} from 'react';
import DocItemLayout from '@theme-original/DocItem/Layout';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation} from '@docusaurus/router';

// Helper function to format camelCase strings while preserving acronyms
function formatTitle(str) {
    if (!str) return '';

    // If entire string is uppercase (or uppercase with numbers), it's an acronym - return as is
    if (/^[A-Z0-9]+$/.test(str)) {
        return str;
    }

    // Split on boundaries: lowercase/number followed by uppercase, or uppercase sequence followed by lowercase
    // This preserves acronyms like "AI", "XML", "I3D" while splitting camelCase
    const parts = str
        .split(/(?<=[a-z\d])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/)
        .filter(p => p.length > 0);

    // Join with spaces and capitalize first letter
    return parts
        .join(' ')
        .replace(/^\w/, c => c.toUpperCase());
}

export default function DocItemLayoutWrapper(props) {
    const {siteConfig} = useDocusaurusContext();
    const location = useLocation();

    // Compute metadata synchronously during render
    const pathname = location.pathname;
    const baseUrl = siteConfig.baseUrl;
    let currentPath = pathname.replace(baseUrl, '').replace(/\/$/, '');
    const pathParts = currentPath.split('/').filter(p => p);

    // Extract title from path (last part, formatted properly)
    const pageTitleFromPath = pathParts.length > 0
        ? formatTitle(pathParts[pathParts.length - 1])
        : 'FS25 Community LUADOC';

    // Determine category from path
    let category = '';
    if (pathParts.length >= 1) {
        category = pathParts[0]; // e.g., "script", "engine", "foundation"
    }

    // Generate description based on category and title
    let description = '';
    if (category === 'script') {
        description = `Documentation for ${pageTitleFromPath} - FS25 Script API reference for Farming Simulator 25 modding`;
    } else if (category === 'engine') {
        description = `Documentation for ${pageTitleFromPath} - FS25 Engine API reference for Farming Simulator 25`;
    } else if (category === 'foundation') {
        description = `Documentation for ${pageTitleFromPath} - FS25 Foundation API reference for Farming Simulator 25`;
    } else {
        description = `${pageTitleFromPath} - FS25 Community LUADOC documentation for Farming Simulator 25`;
    }

    const pageTitle = `${pageTitleFromPath} - FS25 Community LUADOC`;
    const metaDescription = description;
    const pageUrl = `${siteConfig.url}${pathname}`;
    const ogImage = `${siteConfig.url}${siteConfig.baseUrl}${siteConfig.themeConfig.image}`;

    // Generate breadcrumb list for structured data
    const generateBreadcrumbList = () => {
        const breadcrumbs = [];
        let currentPath = '';

        // Home page
        breadcrumbs.push({
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": `${siteConfig.url}${siteConfig.baseUrl}`
        });

        // Build breadcrumbs from path parts
        pathParts.forEach((part, index) => {
            currentPath += `/${part}`;
            const position = index + 2;
            const itemUrl = `${siteConfig.url}${siteConfig.baseUrl}${currentPath}`;
            const itemName = formatTitle(part);

            breadcrumbs.push({
                "@type": "ListItem",
                "position": position,
                "name": itemName,
                "item": itemUrl
            });
        });

        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbs
        };
    };

    const breadcrumbList = pathParts.length > 0 ? generateBreadcrumbList() : null;

    // Inject additional styles for tables and content after render
    useEffect(() => {
        // Ensure all tables have consistent styling
        const styleTables = () => {
            const tables = document.querySelectorAll('.theme-doc-markdown table');
            tables.forEach(table => {
                // Add a class to identify styled tables
                if (!table.classList.contains('fs25-styled-table')) {
                    table.classList.add('fs25-styled-table');
                }

                // Ensure headers and data cells have same styling
                const headers = table.querySelectorAll('thead th, th');
                const cells = table.querySelectorAll('td');

                headers.forEach(th => {
                    th.style.backgroundColor = 'transparent';
                    th.style.fontWeight = 'normal';
                    th.style.color = 'var(--ifm-font-color-base)';
                });
            });
        };

        // Run immediately and after a short delay to catch dynamically rendered content
        styleTables();
        const timeout = setTimeout(styleTables, 100);

        // Also watch for DOM changes
        const observer = new MutationObserver(() => {
            styleTables();
        });

        const contentArea = document.querySelector('.theme-doc-markdown');
        if (contentArea) {
            observer.observe(contentArea, {
                childList: true,
                subtree: true
            });
        }

        return () => {
            clearTimeout(timeout);
            observer.disconnect();
        };
    }, [location.pathname]);

    // Generate structured data (JSON-LD)
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": pageTitle,
        "description": metaDescription,
        "url": pageUrl,
        "author": {
            "@type": "Organization",
            "name": "FS25 Community"
        },
        "publisher": {
            "@type": "Organization",
            "name": "FS25 Community",
            "logo": {
                "@type": "ImageObject",
                "url": ogImage
            }
        },
        "datePublished": new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": pageUrl
        }
    };

    return (
        <>
            <Head>
                {/* Meta Description */}
                <meta name="description" content={metaDescription}/>

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="article"/>
                <meta property="og:url" content={pageUrl}/>
                <meta property="og:title" content={pageTitle}/>
                <meta property="og:description" content={metaDescription}/>
                <meta property="og:image" content={ogImage}/>
                <meta property="og:image:alt" content={`${pageTitleFromPath} - FS25 Community LUADOC`}/>
                <meta property="og:site_name" content="FS25 Community LUADOC"/>
                <meta property="og:locale" content="en_US"/>
                <meta property="article:author" content="FS25 Community"/>

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary"/>
                <meta name="twitter:title" content={pageTitle}/>
                <meta name="twitter:description" content={metaDescription}/>
                <meta name="twitter:image" content={ogImage}/>
                <meta name="twitter:image:alt" content={`${pageTitleFromPath} - FS25 Community LUADOC`}/>

                {/* Additional SEO */}
                <meta name="robots" content="index, follow"/>
                <link rel="canonical" href={pageUrl}/>

                {/* Structured Data (JSON-LD) */}
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
                {breadcrumbList && (
                    <script type="application/ld+json">
                        {JSON.stringify(breadcrumbList)}
                    </script>
                )}
            </Head>
            <DocItemLayout {...props} />
        </>
    );
}

