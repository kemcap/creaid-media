import { redirect, routeFiles } from './scripts/routes.mjs';
import { transformHeadings, preserveClaimStyles } from './scripts/heading-semantics.mjs';

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'public/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'public/robots.txt': 'robots.txt' });
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

  eleventyConfig.addTransform('semantic-headings',function(content){return transformHeadings(content,this.page.outputPath);});
  eleventyConfig.on('eleventy.after',()=>preserveClaimStyles('dist'));
  eleventyConfig.addWatchTarget('src/_data/');
  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: 'dist' },
    templateFormats: ['njk', 'md'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
}
