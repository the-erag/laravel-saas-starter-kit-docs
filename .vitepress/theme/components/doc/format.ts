// Small helpers shared by the docs components.

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Turns `backticks` in a prop string into <code>, so short labels can mention files and commands.
export const inlineCode = (value: string) => escapeHtml(value).replace(/`([^`]+)`/g, '<code>$1</code>');

// Internal links get ".html" (the site doesn't use clean URLs), external links stay as they are.
export const docHref = (link: string) => {
  if (!link.startsWith('/')) {
    return link;
  }

  const [path, hash] = link.split('#');
  const withExt = path.endsWith('/') || /\.[a-z]+$/.test(path) ? path : `${path}.html`;

  return hash ? `${withExt}#${hash}` : withExt;
};

export const isExternal = (link: string) => /^https?:\/\//.test(link);
