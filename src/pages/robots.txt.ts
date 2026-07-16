export function GET({ site }: { site?: URL }) {
  const base = site ?? new URL('https://www.rachellinxg-personal-blog.top');
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap-index.xml', base)}\n`, { headers: { 'Content-Type': 'text/plain' } });
}
