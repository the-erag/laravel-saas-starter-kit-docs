import { existsSync } from 'node:fs';
import { createContentLoader } from 'vitepress';

export interface Post {
  title: string;
  description: string;
  url: string;
  date: string;
  readingTime: number;
  tags: string[];
  author: string;
  category: string;
  /** The post's banner, public/og/blog/<slug>.png, when it has one. */
  image?: string;
}

declare const data: Post[];
export { data };

const banner = (url: string): string | undefined => {
  const image = `/og/blog/${url.replace(/^\/blog\/|\.html$/g, '')}.png`;

  return existsSync(new URL(`../public${image}`, import.meta.url)) ? image : undefined;
};

export default createContentLoader('blog/*.md', {
  includeSrc: true,
  transform: (raw): Post[] =>
    raw
      .map(({ url, frontmatter, src }) => ({
        title: frontmatter.title,
        description: frontmatter.description,
        url,
        date: new Date(frontmatter.date).toISOString(),
        readingTime: Math.max(1, Math.round((src ?? '').replace(/^---[\s\S]*?---/, '').split(/\s+/).length / 220)),
        tags: frontmatter.tags ?? [],
        author: frontmatter.author ?? 'erag',
        category: frontmatter.category ?? '',
        image: banner(url),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
});
