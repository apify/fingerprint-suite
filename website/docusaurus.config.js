const { createHref } = require('./tools/utils/createHref');

/** @type {Partial<import('@docusaurus/types').DocusaurusConfig>} */
module.exports = {
  title: 'Fingerprint Suite',
  tagline: 'Modern privacy for your scrapers.',
  url: 'https://apify.github.io',
  baseUrl: '/fingerprint-suite/',
  organizationName: 'apify',
  projectName: 'fingerprint-suite',
  favicon: 'img/favicon.ico',
  customFields: {
      markdownOptions: {
          html: true,
      },
      gaGtag: true,
      repoUrl: 'https://github.com/apify/fingerprint-suite',
  },
  onBrokenLinks:
  /** @type {import('@docusaurus/types').ReportingSeverity} */ ('error'),
  onBrokenMarkdownLinks:
  /** @type {import('@docusaurus/types').ReportingSeverity} */ ('error'),
  presets: /** @type {import('@docusaurus/types').PresetConfig[]} */ ([
    [
        '@docusaurus/preset-classic',
        /** @type {import('@docusaurus/preset-classic').Options} */
        ({
            docs: {
                lastVersion: 'current',
                versions: {
                    current: {
                        label: '2.0.0',
                    },
                },
                showLastUpdateAuthor: true,
                showLastUpdateTime: true,
                path: '../docs',
                sidebarPath: './sidebars.js',
            },
            theme: {
                customCss: '/src/css/customTheme.css',
            },
        }),
    ],
  ]),
  plugins: [
      [
          'docusaurus-plugin-typedoc-api',
          {
              projectRoot: `${__dirname}/..`,
              changelogs: true,
              packages: [
                  {
                      path: 'packages/fingerprint-generator',
                  },
                  {
                      path: 'packages/header-generator',
                  },
                  {
                      path: 'packages/fingerprint-injector',
                  },
              ],
              typedocOptions: {
                  excludeExternals: false,
              },
          },
      ],
  ],
  themeConfig:
  /** @type {import('@docusaurus/preset-classic').ThemeConfig} */ ({
      docs: {
          versionPersistence: 'localStorage',
          sidebar: {
              hideable: true,
          },
      },
      navbar: {
          hideOnScroll: true,
          title: 'Fingerprint Suite',
          logo: {
              src: 'img/logo.svg',
              srcDark: 'img/logo_white.svg',
          },
          items: [
              {
                  type: 'docsVersion',
                  to: 'docs/guides',
                  label: 'Guides',
                  position: 'left',
              },
              {
                  type: 'docsVersion',
                  to: 'docs/examples',
                  label: 'Examples',
                  position: 'left',
              },
              {
                  type: 'docsVersion',
                  to: 'api/',
                  label: 'API reference',
                  position: 'left',
              },
              {
                  href: 'https://github.com/apify/fingerprint-suite',
                  label: 'GitHub',
                  title: 'View on GitHub',
                  position: 'right',
                  className: 'icon',
              },
              {
                  href: 'https://discord.com/invite/jyEM2PRvMU',
                  label: 'Discord',
                  title: 'Chat on Discord',
                  position: 'right',
                  className: 'icon',
              },
          ],
      },
      colorMode: {
          defaultMode: 'light',
          disableSwitch: false,
          respectPrefersColorScheme: true,
      },
      prism: {
          defaultLanguage: 'typescript',
          theme: require('prism-react-renderer/themes/github'),
          darkTheme: require('prism-react-renderer/themes/dracula'),
          additionalLanguages: ['docker'],
      },
      metadata: [],
      image: 'img/apify_og_SDK.png',
      footer: {
          links: [
              {
                  title: 'Docs',
                  items: [
                      {
                          label: 'Guides',
                          to: 'docs/guides',
                      },
                      {
                          label: 'Examples',
                          to: 'docs/examples',
                      },
                      {
                          label: 'API reference',
                          to: 'api',
                      },
                  ],
              },
              {
                  title: 'Community',
                  items: [
                      {
                          label: 'Discord',
                          href: 'https://discord.com/invite/jyEM2PRvMU',
                      },
                      {
                          label: 'Stack Overflow',
                          href: 'https://stackoverflow.com/questions/tagged/apify',
                      },
                      {
                          label: 'Twitter',
                          href: 'https://twitter.com/apify',
                      },
                      {
                          label: 'Facebook',
                          href: 'https://www.facebook.com/apifytech',
                      },
                  ],
              },
              {
                  title: 'More',
                  items: [
                      {
                          html: createHref(
                              'https://apify.com',
                              'Apify Platform',
                          ),
                      },
                      {
                          html: createHref(
                              'https://docusaurus.io',
                              'Docusaurus',
                          ),
                      },
                      {
                          html: createHref(
                              'https://github.com/apify/apify-js',
                              'GitHub',
                          ),
                      },
                  ],
              },
          ],
          copyright: `Copyright © ${new Date().getFullYear()} Apify Technologies s.r.o.`,
          logo: {
              src: 'img/apify_logo.svg',
              href: '/',
              width: '60px',
              height: '60px',
          },
      },
  }),
};