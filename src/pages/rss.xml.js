import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const notes = await getCollection('notes');
  return rss({
    title: "Ganlin's field notes",
    description: 'Physics, mathematical methods, and AI for Science study notes.',
    site: context.site,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.description,
      pubDate: note.data.date,
      link: note.data.legacyPath,
      categories: note.data.tags,
    })),
  });
}
