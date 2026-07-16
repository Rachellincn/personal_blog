import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    documentTitle: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    subject: z.string(),
    tags: z.array(z.string()),
    readingTime: z.number().int().positive(),
    language: z.string().default('zh-CN'),
    legacyPath: z.string(),
  }),
});

export const collections = { notes };
