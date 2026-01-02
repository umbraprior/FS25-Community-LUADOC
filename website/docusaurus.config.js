// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const {themes} = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: 'FS25 Community LUADOC',
    tagline: 'Comprehensive documentation for all Lua scripting APIs available in Farming Simulator 25',
    favicon: 'img/icon_FS25-COMMUNITY-LUADOC.png',

    // Set the production url of your site here
    url: 'https://umbraprior.github.io',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/FS25-Community-LUADOC/',

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'umbraprior', // Usually your GitHub org/user name.
    projectName: 'FS25-Community-LUADOC', // Usually your repo name.

    onBrokenLinks: 'warn',
    onBrokenAnchors: 'warn',
    markdown: {
        format: 'detect', // Use CommonMark for .md files (no JSX parsing), MDX for .mdx files
    },

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: './sidebars.js',
                    // Point to the existing docs folder
                    path: '../docs',
                    routeBasePath: '/',
                    // Show last update time
                    showLastUpdateTime: true,
                    // Show last update author
                    showLastUpdateAuthor: false,
                },
                blog: false,
                theme: {
                    customCss: require.resolve('./src/css/custom.css'),
                },
            }),
        ],
    ],

    themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            // Replace with your project's social card
            image: 'img/icon_FS25-COMMUNITY-LUADOC.png',
            navbar: {
                title: 'FS25 Community LUADOC',
                logo: {
                    alt: 'FS25 Community LUADOC Logo',
                    src: 'img/icon_FS25-COMMUNITY-LUADOC.png',
                },
                items: [
                    {
                        type: 'docSidebar',
                        sidebarId: 'docsSidebar',
                        position: 'left',
                        label: 'Documentation',
                    },
                    {
                        href: 'https://github.com/umbraprior/FS25-Community-LUADOC',
                        label: 'GitHub',
                        position: 'right',
                    },
                ],
            },
            prism: {
                theme: lightCodeTheme,
                darkTheme: darkCodeTheme,
                additionalLanguages: ['lua'],
            },
            footer: {
                style: 'dark',
                links: [],
                copyright: 'This is an open source community project and does not own any associated rights. Farming Simulator 25 and related trademarks are property of Giants Software. Built with Docusaurus.',
            },
        }),

    plugins: [
        [
            require.resolve('docusaurus-lunr-search'),
            {
                languages: ['en'],
                indexBaseUrl: true,
                maxIndexSize: 10000000,
            },
        ],
    ],

};

module.exports = config;

