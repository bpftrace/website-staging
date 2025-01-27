// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'bpftrace',
  tagline: 'Dynamic Tracing for Linux',
  favicon: 'img/bpftrace_Icon-Black-Yellow_BG.svg',

  // Set the production url of your site here
  url: 'https://bpftrace.org',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',
  // baseUrl: '',
  trailingSlash: false,

  organizationName: 'bpftrace',
  projectName: 'website',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

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
        docs: false,
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],
  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            to: 'https://docs.bpftrace.org/latest',
            from: '/docs',
          },
        ],
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      navbar: {
        logo: {
          alt: 'bpftrace Logo',
         // replace with bpftrace svg 
          src: 'img/bpftrace_Full_Logo-Black.svg',
        },
        items: [
          {
            to: '/learn',
            label: 'Learn',
            position: 'left',
          },
          {
            type: 'dropdown',
            label: 'Docs',
            position: 'left',
            items: [
              {
                label: 'pre-release',
                to: '/docs/pre-release'
              },
              {
                label: '0.22 (latest)ds',
                to: '/docs/0.22'
              },
              {
                label: '0.21',
                to: '/docs/0.21'
              },
            ],
          },
          {to: '/blog', label: 'Blog', position: 'left'},
          {
              href: 'https://github.com/bpftrace/bpftrace/discussions',
              label: 'Discussions',
              position: 'left',
          },
          {
            href: 'https://github.com/bpftrace/bpftrace',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs + Tutorials',
            items: [
              {
                label: 'Documentation',
                to: 'https://docs.bpftrace.org/latest',
                target: '_self',
              },
              {
                label: 'One-Liner Introduction Tutorial',
                to: '/tutorial-one-liners',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'IRC',
                href: 'https://webchat.oftc.net/?nick=&channels=%23bpftrace',
              },
              {
                label: 'Talks',
                href: '/videos',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/bpftrace/bpftrace',
              },
            ],
          },
        ],
        copyright: `Copyright © 2019 Alastair Robertson.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: true,
      },
    }),
};

export default config;
