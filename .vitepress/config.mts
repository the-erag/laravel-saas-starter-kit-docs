import { defineConfig, type DefaultTheme, type HeadConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';
import { seoHead, writeLlmsFiles } from './seo';
import { frameworkKeys, kits, site, type FrameworkKey } from './site';

function kitSidebar(framework: FrameworkKey): DefaultTheme.SidebarItem {
  const base = `/docs/${framework}`;

  return {
    text: kits[framework].title,
    collapsed: true,
    items: [
      { text: 'Overview & Installation', link: `${base}.html` },
      { text: 'Architecture', link: `${base}/architecture.html` },
      { text: 'Components', link: `${base}/components.html` },
      { text: 'Pages', link: `${base}/pages.html` },
      { text: 'Layouts', link: `${base}/layouts.html` },
      { text: 'Inertia', link: `${base}/inertia.html` },
      { text: 'Development', link: `${base}/development.html` },
    ],
  };
}

const docsSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Getting Started',
    items: [
      { text: 'Introduction', link: '/docs.html' },
      { text: 'Requirements', link: '/docs/getting-started/requirements.html' },
      { text: 'Installation', link: '/docs/getting-started/installation.html' },
      { text: 'Local Development', link: '/docs/getting-started/local-development.html' },
      { text: 'Project Structure', link: '/docs/getting-started/project-structure.html' },
      { text: 'Configuration', link: '/docs/getting-started/configuration.html' },
    ],
  },
  {
    text: 'Core',
    items: [
      { text: 'Architecture', link: '/docs/core/architecture.html' },
      { text: 'Authentication', link: '/docs/core/authentication.html' },
      { text: 'Users, Roles & Permissions', link: '/docs/core/users-roles-permissions.html' },
      { text: 'Multi-Tenancy', link: '/docs/core/multi-tenancy.html' },
      { text: 'Domains', link: '/docs/core/domains.html' },
      { text: 'Maintenance & Suspension', link: '/docs/core/maintenance-and-suspension.html' },
      { text: 'Localization', link: '/docs/core/localization.html' },
      { text: 'Navigation & Layouts', link: '/docs/core/navigation-and-layouts.html' },
      { text: 'Database', link: '/docs/core/database.html' },
      { text: 'Testing', link: '/docs/core/testing.html' },
    ],
  },
  {
    text: 'Starter Kits',
    items: frameworkKeys.map(kitSidebar),
  },
  {
    text: 'Purchase',
    items: [
      { text: 'Pricing', link: '/pricing.html' },
      { text: 'How to Pay', link: '/how-to-pay.html' },
      { text: 'Repository Access', link: '/docs/purchase/repository-access.html' },
      { text: 'Updates', link: '/docs/purchase/updates.html' },
      { text: 'Release Notes', link: '/releases.html' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Commands', link: '/docs/reference/commands.html' },
      { text: 'Environment', link: '/docs/reference/environment.html' },
      { text: 'Packages', link: '/docs/reference/packages.html' },
      { text: 'Troubleshooting', link: '/docs/reference/troubleshooting.html' },
      { text: 'FAQ', link: '/docs/reference/faq.html' },
    ],
  },
];

export default defineConfig({
  lang: 'en-US',
  srcExclude: ['README.md', 'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'SECURITY.md', '.github/**'],
  title: site.name,
  titleTemplate: `:title | ${site.name}`,
  description: site.description,
  cleanUrls: false,
  // Site data and the page hash map go into one cached chunk instead of being inlined in every page.
  metaChunk: true,
  vite: {
    resolve: {
      alias: [
        // Social icon links with a hidden text label (see theme/components/SocialLink.vue).
        {
          find: /^.*\/VPSocialLink\.vue$/,
          replacement: fileURLToPath(new URL('./theme/components/SocialLink.vue', import.meta.url)),
        },
        // Sidebar group titles as text instead of headings (see theme/components/SidebarItem.vue).
        {
          find: /^.*\/VPSidebarItem\.vue$/,
          replacement: fileURLToPath(new URL('./theme/components/SidebarItem.vue', import.meta.url)),
        },
      ],
    },
  },
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['link', { rel: 'alternate', type: 'text/plain', title: 'LLM summary', href: '/llms.txt' }],
    ['meta', { name: 'theme-color', content: site.themeColor }],
    ['meta', { name: 'application-name', content: site.name }],
    ['meta', { name: 'apple-mobile-web-app-title', content: site.name }],
    ['meta', { name: 'author', content: site.name }],
    ['meta', { name: 'format-detection', content: 'telephone=no' }],
    ['meta', { property: 'og:site_name', content: site.name }],
    ['meta', { name: 'twitter:site', content: site.social.xHandle }],
    ['meta', { name: 'twitter:creator', content: site.social.xHandle }],
    ['meta', { property: 'og:locale', content: 'en_US' }],
    ...(site.googleSiteVerification
      ? ([['meta', { name: 'google-site-verification', content: site.googleSiteVerification }]] as HeadConfig[])
      : []),
  ],
  transformHead({ pageData, title, description, content }): HeadConfig[] {
    return seoHead(pageData, title, description, content);
  },
  // Write "React & Svelte" instead of "React &amp; Svelte" in the <head>, so SEO tools show a plain "&".
  // A bare "&" followed by a space is valid HTML5; any other "&amp;" (e.g. in URLs) is left alone.
  transformHtml(html) {
    const end = html.indexOf('</head>');

    return html.slice(0, end).replace(/&amp; /g, '& ') + html.slice(end);
  },
  async buildEnd(siteConfig) {
    await writeLlmsFiles(siteConfig.srcDir, siteConfig.outDir, docsSidebar);
  },
  themeConfig: {
    logo: { src: '/logo.svg', alt: site.name, width: 24, height: 24 },
    siteTitle: site.name,
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/docs.html', activeMatch: '^/docs($|/(?!getting-started/local-development))' },
      {
        text: 'Starter Kits',
        activeMatch: '^/kits/',
        items: frameworkKeys.map((framework) => ({ text: kits[framework].title, link: `/kits/${framework}.html` })),
      },
      { text: 'Pricing', link: '/pricing.html', activeMatch: '^/pricing($|/)' },
      { text: 'How to Pay', link: '/how-to-pay.html' },
      { text: 'Blog', link: '/blog.html', activeMatch: '^/(blog|authors)($|/)' },
    ],
    socialLinks: [
      { icon: 'github', link: site.social.github, ariaLabel: 'SaaS Laravel on GitHub' },
      { icon: 'linkedin', link: site.social.linkedin, ariaLabel: 'ERAG on LinkedIn' },
      { icon: 'x', link: site.social.x, ariaLabel: 'ERAG on X' },
    ],
    sidebar: {
      '/docs': docsSidebar,
    },
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    docFooter: {
      prev: 'Previous page',
      next: 'Next page',
    },
    editLink: {
      pattern: site.docsEditPattern,
      text: 'Edit this page on GitHub',
    },
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'medium',
      },
    },
    search: {
      provider: 'local',
    },
    externalLinkIcon: true,
  },
});
