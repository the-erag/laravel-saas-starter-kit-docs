export const readFrontmatter = (source: string): { title?: string; description?: string; body: string } => {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  const field = (name: string): string | undefined =>
    match?.[1].match(new RegExp(`^${name}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1];

  return { title: field('title'), description: field('description'), body: match ? source.slice(match[0].length) : source };
};

export const cleanMarkdown = (body: string): string =>
  body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<Badge[^>]*text="([^"]*)"[^>]*\/>/g, '$1')
    .replace(/<[A-Z][A-Za-z]*[^>]*\/>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** A page as plain Markdown for LLMs: its title, description and body without frontmatter or Vue components. */
export const pageMarkdown = (source: string): string => {
  const { title, description, body } = readFrontmatter(source);
  const content = cleanMarkdown(body);
  const [firstLine, ...rest] = content.split('\n');
  const hasHeading = firstLine.startsWith('# ');
  const heading = hasHeading ? firstLine : title ? `# ${title}` : '';
  const text = hasHeading ? rest.join('\n').trim() : content;
  const summary = description ? `> ${description}\n\n` : '';

  return `${heading ? `${heading}\n\n` : ''}${summary}${text}\n`;
};
