const headingPattern = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;
const firstParagraph = /^\s*(<p\b[^>]*>([\s\S]*?)<\/p>)/i;

export function editorialArticle(html) {
  const first = html.match(firstParagraph);
  const firstText = first?.[2].replace(/<[^>]*>/g, '') ?? '';
  const meta = /^\s*Lesezeit:/.test(firstText) && /Themen:/.test(firstText) ? first[1] : '';
  const toc = [];
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
  const body = (meta ? html.slice(first[0].length) : html).replace(headingPattern, (heading, attributes, content) => {
    const label = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!label) return heading;
    let id = attributes.match(/\sid="([^"]+)"/)?.[1];
    if (!id) {
      const base = label.replace(/&[\w#]+;/g, ' ').normalize('NFD').replace(/\p{M}/gu, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'abschnitt';
      id = 'inhalt-' + base;
      for (let n = 2; ids.has(id); n++) id = 'inhalt-' + base + '-' + n;
      ids.add(id);
      attributes += ' id="' + id + '"';
    }
    toc.push({ id, label });
    return '<h2' + attributes + '>' + content + '</h2>';
  });
  return { body, meta, toc };
}
