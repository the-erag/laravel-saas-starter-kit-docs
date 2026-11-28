import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { defineConfig, type DefaultTheme, type HeadConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { pageMarkdown } from './markdown';
import { isGuidePage, seoHead, writeLlmsFiles, writePageMarkdownFiles } from './seo';
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
      { text: kits[framework].docsBridge.text, link: `${base}/${kits[framework].docsBridge.page}.html` },
      { text: 'Development', link: `${base}/development.html` },
    ],
  };
}

const srcDir = fileURLToPath(new URL('..', import.meta.url));

// In dev, opening or fetching /docs/vue.md returns the page as plain Markdown, like the .md files written next to the HTML
// on build. Vite's own module requests for the same URL (scripts or ?query) still go to VitePress.
const pageMarkdownServer: Plugin = {
  name: 'page-markdown',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const [path, query] = decodeURI(req.url ?? '').split('?');
      const file = join(srcDir, path);
      const isModuleRequest = query !== undefined || req.headers['sec-fetch-dest'] === 'script';

      if (isModuleRequest || !path.endsWith('.md') || !existsSync(file)) {
        return next();
      }

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.end(pageMarkdown(await readFile(file, 'utf8')));
    });
  },
};

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
      { text: 'Notifications', link: '/docs/core/notifications.html' },
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
  sitemap: {
    hostname: site.url,
    // Pages with `lastUpdated: false` (home, pricing, kits, blog, authors, ...) only hide the date on the page,
    // but VitePress then leaves lastmod out of the sitemap too. These pages are mostly built from components, so
    // their lastmod is the newest git commit date of the page, the components it uses and those components'
    // direct imports (site.ts, home-faqs.ts, posts.data.ts, ...). The blog index also counts its newest post.
    // Only committed files have a git date; never-committed files are ignored.
    transformItems(items) {
      const srcDir = fileURLToPath(new URL('..', import.meta.url));
      const componentsDir = join(srcDir, '.vitepress/theme/components');
      const gitDates = new Map<string, number>();

      const gitDate = (file: string): number => {
        if (!gitDates.has(file)) {
          let time = 0;

          try {
            const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { cwd: srcDir, encoding: 'utf8' }).trim();
            time = out ? new Date(out).getTime() : 0;
          } catch {
            time = 0;
          }

          gitDates.set(file, time);
        }

        return gitDates.get(file) ?? 0;
      };

      // A component file plus the local files it imports directly (other components, site.ts, data loaders).
      // Components live in components/ or one of its subfolders (doc/, tools/).
      const componentFiles = (name: string): string[] => {
        const file = ['', 'doc', 'tools'].map((folder) => join(componentsDir, folder, `${name}.vue`)).find((candidate) => existsSync(candidate));

        if (!file) {
          return [];
        }

        const imports = [...readFileSync(file, 'utf8').matchAll(/from '(\.{1,2}\/[^']+)'/g)].flatMap(([, spec]) => {
          const base = join(dirname(file), spec);

          return [base, `${base}.ts`, `${base}.vue`].filter((candidate) => existsSync(candidate) && !candidate.endsWith('/'));
        });

        return [file, ...imports];
      };

      const newestPostDate = (): number =>
        Math.max(
          0,
          ...readdirSync(join(srcDir, 'blog'))
            .filter((name) => name.endsWith('.md'))
            .map((name) => {
              const date = readFileSync(join(srcDir, 'blog', name), 'utf8').match(/^date:\s*(\S+)/m)?.[1];

              return date && gitDate(join('blog', name)) ? new Date(date).getTime() : 0;
            }),
        );

      return items.map((item) => {
        if (item.lastmod) {
          return item;
        }

        const page = item.url === '' ? 'index.md' : item.url.replace(/\.html$/, '.md');
        const pagePath = join(srcDir, page);

        if (!existsSync(pagePath)) {
          return item;
        }

        const components = [...new Set([...readFileSync(pagePath, 'utf8').matchAll(/<([A-Z][A-Za-z]+)/g)].map(([, name]) => name))];
        const files = [page, ...components.flatMap(componentFiles).map((file) => relative(srcDir, file))];
        const times = files.map(gitDate);

        if (page === 'blog.md') {
          times.push(gitDate('blog/posts.data.ts'), newestPostDate());
        }

        const newest = Math.max(0, ...times);

        return newest ? { ...item, lastmod: new Date(newest).toISOString() } : item;
      });
    },
  },
  // Site data and the page hash map go into one cached chunk instead of being inlined in every page.
  metaChunk: true,
  vite: {
    plugins: [pageMarkdownServer],
    resolve: {
      alias: [
        // Social icon links with a hidden text label (see theme/components/SocialLink.vue).
        {
          find: /^.*\/VPSocialLink\.vue$/,
          replacement: fileURLToPath(new URL('./theme/components/SocialLink.vue', import.meta.url)),
        },
        // A <main> landmark on pages with `layout: page`, like the home page (see theme/components/PageMain.vue).
        {
          find: /^.*\/VPPage\.vue$/,
          replacement: fileURLToPath(new URL('./theme/components/PageMain.vue', import.meta.url)),
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
  // Blog posts and guide pages (use cases, tools, the tutorial, ...) with long titles drop the " | SaaS Laravel"
  // suffix, so the rendered <title> stays at 60 characters or less and isn't cut off in search results.
  // og:title and twitter:title already use the bare title.
  transformPageData(pageData) {
    const title = pageData.frontmatter.title as string | undefined;

    if ((pageData.relativePath.startsWith('blog/') || isGuidePage(pageData.relativePath)) && title && title.length + ` | ${site.name}`.length > 60) {
      pageData.titleTemplate = false;
      pageData.frontmatter.titleTemplate = false;
    }
  },
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
    await writePageMarkdownFiles(siteConfig.srcDir, siteConfig.outDir, siteConfig.pages);
    await writeFile(
      join(siteConfig.srcDir, 'public', 'sitemap.xml'),
      await readFile(join(siteConfig.outDir, 'sitemap.xml'), 'utf8'),
    );
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
