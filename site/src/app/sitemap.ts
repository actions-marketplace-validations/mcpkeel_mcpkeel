import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/drift`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE.url}/security`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
