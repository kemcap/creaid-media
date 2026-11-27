import { readFileSync } from 'node:fs';
import { editorialArticle } from './scripts/journal-editorial.mjs';
import { redirect, routeFiles } from './scripts/routes.mjs';
import { transformHeadings } from './scripts/heading-semantics.mjs';
import { decoratePageHeadings } from './scripts/heading-dot.mjs';

export default function (eleventyConfig) {
  const releaseReview = process.env.CREAID_RELEASE_REVIEW === '1';
  const draftKeys = releaseReview
    ? new Set(Object.keys(JSON.parse(readFileSync(new URL('./src/_data/wordpressPreviewDrafts.json', import.meta.url), 'utf8'))))
    : new Set();
  eleventyConfig.addGlobalData('releaseReview', releaseReview);
  eleventyConfig.addFilter('releaseJournal', (posts) => releaseReview ? posts.filter((post) => !draftKeys.has(post.slug)) : posts);
  eleventyConfig.addFilter('releaseLinks', (links) => releaseReview && links
    ? links.filter((link) => !draftKeys.has(link.target) && link.target !== 'projekt-detail')
    : links);
  eleventyConfig.addFilter('editorialArticle', editorialArticle);
  eleventyConfig.addFilter('previewArticleLinks', (html) => html.replace(
    /(<a\b[^>]*?\shref=["'])https:\/\/creaid-media\.de(\/[^"']*)(?=["'])/gi,
    (link, prefix, path) => {
      const url = new URL(path.replaceAll('&amp;', '&'), 'https://creaid-media.de');
      const target = redirect(url) ?? (Object.hasOwn(routeFiles, url.pathname) ? url.pathname + url.search : null);
      return target ? prefix + target.replaceAll('&', '&amp;') + url.hash : link;
    }
  ));
  eleventyConfig.addPassthroughCopy({ 'public/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'public/robots.txt': 'robots.txt' });
  if (!releaseReview) {
    eleventyConfig.addPassthroughCopy({ 'docs/CreAid-Media-Style-Guide.html': 'assets/demos/creaid-style-guide.html' });
  }
  for (const subset of ['latin', 'latin-ext']) {
    for (const weight of [300, 400, 500, 700]) {
      const file = `ubuntu-${subset}-${weight}-normal.woff2`;
      eleventyConfig.addPassthroughCopy({
        [`node_modules/@fontsource/ubuntu/files/${file}`]: `assets/fonts/${file}`
      });
    }
  }
  eleventyConfig.addPassthroughCopy({
    'node_modules/@fontsource/ubuntu/LICENSE': 'assets/fonts/UBUNTU-FONT-LICENSE.txt',
    'node_modules/gsap/dist/gsap.min.js': 'assets/vendor/gsap.min.js',
    'node_modules/gsap/dist/ScrollTrigger.min.js': 'assets/vendor/ScrollTrigger.min.js'
  });

  // Alias canonical requests to the underlying preview files while retaining hot reload.
  const aliases = Object.fromEntries(Object.entries(routeFiles).map(([url, file]) => [url, `dist/${file}`]));
  eleventyConfig.setServerOptions({
    host: '127.0.0.1',
    aliases,
    onRequest: {
      '/*': ({ url }) => {
        const destination = redirect(url);
        if (destination) return { status: 301, headers: { Location: destination } };
      }
    }
  });

  eleventyConfig.addTransform('semantic-headings',function(content){return decoratePageHeadings(transformHeadings(content,this.page.outputPath),this.page.outputPath);});
  eleventyConfig.addWatchTarget('src/_data/');
  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: 'dist' },
    templateFormats: ['njk', 'md'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
}
