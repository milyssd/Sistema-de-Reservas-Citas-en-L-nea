import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/privacidad`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/cookies`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
