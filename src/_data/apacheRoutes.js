import { redirects, routeFiles } from '../../scripts/routes.mjs';

const pattern = (path) => path.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default {
  aliases: redirects.map(([path, to]) => ({ from: pattern(path), to })),
  paths: Object.entries(routeFiles)
    .filter(([path]) => path !== '/')
    .map(([path, file]) => ({ from: pattern(path), file }))
};
