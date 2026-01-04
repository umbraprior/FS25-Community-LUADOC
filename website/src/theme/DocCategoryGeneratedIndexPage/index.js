import React from 'react';
import DocCategoryGeneratedIndexPage from '@theme-original/DocCategoryGeneratedIndexPage';
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

export default function DocCategoryGeneratedIndexPageWrapper(props) {
    const {siteConfig} = useDocusaurusContext();
    const location = useLocation();

    // Compute metadata synchronously during render
    const pathParts = location.pathname.replace(siteConfig.baseUrl, '').split('/').filter(p => p);

    // Extract category name from path (formatted properly)
    const categoryName = pathParts.length > 0
        ? formatTitle(pathParts[pathParts.length - 1])
        : 'Documentation';

    const pageTitle = `${categoryName} - FS25 Community LUADOC`;
    const pageDescription = `Browse ${categoryName} documentation - FS25 Community LUADOC`;
    const pageUrl = `${siteConfig.url}${location.pathname}`;
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

            // Format title properly
            let itemName = '';
            if (/^[A-Z0-9]+$/.test(part)) {
                itemName = part; // Acronym
            } else {
                const parts = part
                    .split(/(?<=[a-z\d])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/)
                    .filter(p => p.length > 0);
                itemName = parts
                    .join(' ')
                    .replace(/^\w/, c => c.toUpperCase());
            }

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

    // Generate structured data (JSON-LD) for category pages
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "headline": pageTitle,
        "description": pageDescription,
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
        }
    };

    return (
        <>
            <Head>
                {/* Meta Description */}
                <meta name="description" content={pageDescription}/>

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website"/>
                <meta property="og:url" content={pageUrl}/>
                <meta property="og:title" content={pageTitle}/>
                <meta property="og:description" content={pageDescription}/>
                <meta property="og:image" content={ogImage}/>
                <meta property="og:image:alt" content={pageTitle}/>
                <meta property="og:site_name" content="FS25 Community LUADOC"/>
                <meta property="og:locale" content="en_US"/>

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary"/>
                <meta name="twitter:title" content={pageTitle}/>
                <meta name="twitter:description" content={pageDescription}/>
                <meta name="twitter:image" content={ogImage}/>
                <meta name="twitter:image:alt" content={pageTitle}/>

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
            <DocCategoryGeneratedIndexPage {...props} />
        </>
    );
}

