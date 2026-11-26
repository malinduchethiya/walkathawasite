import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PUBLIC_SITE_URL,
  DEFAULT_SITEMAP_CATEGORIES,
  buildSitemapEntries,
  buildSitemapXml,
  normalizeOrigin,
  type SitemapStoryInput,
} from '../src/utils/seoFiles.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

async function runQuery(
  config: FirebaseAppletConfig,
  structuredQuery: Record<string, unknown>
): Promise<FirestoreRunQueryRow[]> {
  if (!config.projectId || !config.apiKey) {
    throw new Error('Missing projectId or apiKey in firebase-applet-config.json');
  }
  const databaseId = config.firestoreDatabaseId || '(default)';
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}` +
    `/databases/${encodeURIComponent(databaseId)}/documents:runQuery` +
    `?key=${encodeURIComponent(config.apiKey)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
  });

  if (!res.ok) {
    throw new Error(`Firestore REST query failed (${res.status}): ${await res.text()}`);
  }
  const payload = (await res.json()) as unknown;
  return Array.isArray(payload) ? (payload as FirestoreRunQueryRow[]) : [];
}

async function main() {
  const configPath = path.join(rootDir, 'firebase-applet-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as FirebaseAppletConfig;

  const origin =
    normalizeOrigin(process.env.SITE_URL || process.env.APP_URL) ?? DEFAULT_PUBLIC_SITE_URL;

  const [storyRows, categoryRows] = await Promise.all([
    runQuery(config, {
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
    runQuery(config, {
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
  for (const base of DEFAULT_SITEMAP_CATEGORIES) {
    categoryMap.set(base.toLowerCase(), base);
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

  stories.sort((a, b) => {
    const aMs = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bMs = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bMs - aMs;
  });

  const categories = Array.from(categoryMap.values());
  const entries = buildSitemapEntries({ origin, stories, categories });
  const xml = buildSitemapXml(entries);

  const outPath = path.join(rootDir, 'public', 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');

  console.log(
    `Updated public/sitemap.xml (${entries.length} total URLs: 1 homepage, ${stories.length} published stories, ${categories.length} categories).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
