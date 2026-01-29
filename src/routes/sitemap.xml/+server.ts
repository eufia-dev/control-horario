import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const site = 'https://control-horario.eufia.eu';

	// Only include public pages (most pages require authentication)
	const pages = ['', '/login', '/register'];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(page) => `  <url>
    <loc>${site}${page}</loc>
    <changefreq>monthly</changefreq>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
