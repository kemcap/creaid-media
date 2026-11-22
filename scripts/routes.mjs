import { readFileSync } from 'node:fs';

const load = (name) => JSON.parse(readFileSync(new URL(`../src/_data/${name}.json`, import.meta.url), 'utf8'));
const keep = load('routes');
export const routeFiles = Object.fromEntries(Object.entries(keep).map(([key, url]) => [url, `${key}.html`]));

const pathVariants = Object.entries(keep).flatMap(([key, url]) => {
  const variants = [[`/${key}.html`, url]];
  if (`/${key}` !== url) variants.push([`/${key}`, url]);
  if (url !== '/') variants.push([`${url}/`, url]);
  return variants;
});
const aliases = new Map([...pathVariants, ...Object.entries(load('aliases'))]);
export const redirects = [...aliases].sort(([a], [b]) => a < b ? -1 : (a > b ? 1 : 0));

export function redirect(url) {
  const target = aliases.get(url.pathname);
  return target ? target + url.search : null;
}
