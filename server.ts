import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PUBLIC_SITE_URL,
  DEFAULT_SITEMAP_CATEGORIES,
  buildRobotsTxt,
  buildSitemapEntries,
  buildSitemapXml,
  resolveSiteOrigin,
  type SitemapStoryInput,
} from './src/utils/seoFiles.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId?: string;
  apiKey?: string;
  firestoreDatabaseId?: string;
}

interface FirestoreFieldValue {
  stringValue?: string;
  timestampValue?: string;
}

interface FirestoreRunQueryRow {
  document?: {
    name?: string;
    updateTime?: string;
    fields?: Record<string, FirestoreFieldValue>;
  };
}

interface CachedSitemapData {
  fetchedAtMs: number;
  stories: SitemapStoryInput[];
  categories: string[];
}

const SITEMAP_CACHE_TTL_MS = 60_000;
const FIRESTORE_FETCH_TIMEOUT_MS = 4_000;

let sitemapCache: CachedSitemapData | null = null;

function readFirebaseConfig(): FirebaseAppletConfig {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw) as FirebaseAppletConfig;
  } catch {
    return {};
  }
}

async function runPublicFirestoreQuery(
  config: FirebaseAppletConfig,
  structuredQuery: Record<string, unknown>
): Promise<FirestoreRunQueryRow[]> {
  if (!config.projectId || !config.apiKey) {
    return [];
  }
  const databaseId = config.firestoreDatabaseId || '(default)';
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}` +
    `/databases/${encodeURIComponent(databaseId)}/documents:runQuery` +
    `?key=${encodeURIComponent(config.apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIRESTORE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as FirestoreRunQueryRow[]) : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPublicSitemapData(): Promise<{
  stories: SitemapStoryInput[];
  categories: string[];
}> {
  if (sitemapCache && Date.now() - sitemapCache.fetchedAtMs < SITEMAP_CACHE_TTL_MS) {
    return {
      stories: sitemapCache.stories,
      categories: sitemapCache.categories,
    };
  }

  const config = readFirebaseConfig();
  const [storyRows, categoryRows] = await Promise.all([
    runPublicFirestoreQuery(config, {
      from: [{ collectionId: 'stories' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'EQUAL',
          value: { stringValue: 'published' },
        },
      },
      select: {
        fields: [
          { fieldPath: 'status' },
          { fieldPath: 'category' },
          { fieldPath: 'updatedAt' },
        ],
      },
    }),
    runPublicFirestoreQuery(config, {
      from: [{ collectionId: 'categories' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'EQUAL',
          value: { stringValue: 'active' },
        },
      },
      select: {
        fields: [{ fieldPath: 'name' }, { fieldPath: 'status' }],
      },
    }),
  ]);

  const stories: SitemapStoryInput[] = [];
  const categoryMap = new Map<string, string>();
  for (const baseCat of DEFAULT_SITEMAP_CATEGORIES) {
    categoryMap.set(baseCat.toLowerCase(), baseCat);
  }

  for (const row of categoryRows) {
    const name = row.document?.fields?.name?.stringValue?.trim();
    if (name && !categoryMap.has(name.toLowerCase())) {
      categoryMap.set(name.toLowerCase(), name);
    }
  }

  for (const row of storyRows) {
    const docName = row.document?.name;
    if (!docName) continue;
    const id = docName.split('/').pop()?.trim();
    if (!id) continue;

    const updatedAt =
      row.document?.fields?.updatedAt?.timestampValue ?? row.document?.updateTime;
    stories.push({ id, updatedAt });

    const storyCat = row.document?.fields?.category?.stringValue?.trim();
    if (storyCat && !categoryMap.has(storyCat.toLowerCase())) {
      categoryMap.set(storyCat.toLowerCase(), storyCat);
    }
  }

  const categories = Array.from(categoryMap.values());
  sitemapCache = {
    fetchedAtMs: Date.now(),
    stories,
    categories,
  };

  return { stories, categories };
}

function getRequestOrigin(req: express.Request): string {
  return resolveSiteOrigin({
    forwardedProto: req.headers['x-forwarded-proto'],
    forwardedHost: req.headers['x-forwarded-host'],
    host: req.headers.host,
    protocol: req.protocol,
    envUrl: process.env.SITE_URL || process.env.APP_URL,
    fallbackUrl: DEFAULT_PUBLIC_SITE_URL,
  });
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.set('trust proxy', true);

  app.get('/robots.txt', (req, res) => {
    const origin = getRequestOrigin(req);
    const body = buildRobotsTxt(origin);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(body);
  });

  app.get('/sitemap.xml', async (req, res) => {
    const origin = getRequestOrigin(req);
    const { stories, categories } = await fetchPublicSitemapData();
    const entries = buildSitemapEntries({
      origin,
      stories,
      categories,
    });
    const xml = buildSitemapXml(entries);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(xml);
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

void startServer();
