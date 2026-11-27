import { routeFiles, redirects } from './routes.mjs';
const aliases = new Map(redirects);
// Scope strictly to rendered internal page anchors. Do not touch assets, forms,
// external links, same-page fragments, scripts, or the canonical URL map.
export function canonicalPageLinks(html) {
  if (typeof html !== 'string') return html;
  return html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<a\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, tag => {
    if (!/^<a\b/i.test(tag)) return tag;
    return tag.replace(/(\s+href\s*=\s*)(["'])(.*?)\2/i, (match, prefix, quote, href) => {
      const parts = href.match(/^(?:(?:https?:)?\/\/(?:www\.)?creaid-media\.de)?(\/(?!\/)[^?#]*)([?#][\s\S]*)?$/i);
      if (!parts) return match;
      const target = aliases.get(parts[1]) || parts[1];
      if (!Object.hasOwn(routeFiles,target)) return match;
      const next = target + (parts[2] || '');
      return next === href ? match : prefix + quote + next + quote;
    });
  });
}
