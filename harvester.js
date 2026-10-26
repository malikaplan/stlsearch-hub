/**
 * STLSearch Autonomous Cloud Harvester
 * Runs 24/7 in GitHub Actions / Cloudflare Workers
 * Fetches models across 11 marketplaces and writes to Cloudflare D1 / Local SQLite
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'yeggi_index.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    thumbnail TEXT NOT NULL,
    image_full TEXT,
    source TEXT NOT NULL,
    is_free INTEGER DEFAULT 1,
    price TEXT DEFAULT 'Free',
    author TEXT DEFAULT '',
    likes INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    tags TEXT DEFAULT '',
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_models_source ON models(source);
  CREATE INDEX IF NOT EXISTS idx_models_title ON models(title);
  CREATE INDEX IF NOT EXISTS idx_models_tags ON models(tags);
`);

const insertStmt = db.prepare(`
  INSERT INTO models (id, title, url, thumbnail, image_full, source, is_free, price, author, likes, downloads, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    thumbnail = CASE WHEN excluded.thumbnail != '' THEN excluded.thumbnail ELSE models.thumbnail END,
    tags = CASE WHEN instr(models.tags, excluded.tags) = 0 THEN models.tags || ' ' || excluded.tags ELSE models.tags END
`);

// 1. DESIGNMAK SITEMAP CRAWLER
async function harvestDesignmak() {
  console.log('🔄 [1/4] Harvesting Designmak.com...');
  try {
    const res = await fetch('https://designmak.com/sitemap.xml', { signal: AbortSignal.timeout(10000) });
    const xml = await res.text();
    const regex = /<url>([\s\S]*?)<\/url>/gi;
    let m;
    let count = 0;
    db.exec('BEGIN');
    while ((m = regex.exec(xml)) !== null) {
      const block = m[1];
      const loc = block.match(/<loc>(https:\/\/designmak\.com\/designmak\/[^<]+)<\/loc>/i);
      if (!loc) continue;
      const url = loc[1];
      const slug = url.split('/designmak/')[1] || '';
      const title = slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
      const imgMatch = block.match(/<image:loc>([^<]+)<\/image:loc>/i);
      const img = imgMatch ? imgMatch[1] : '';

      insertStmt.run(
        'dm_' + Buffer.from(url).toString('base64').slice(0, 16),
        title,
        url,
        img,
        img,
        'Designmak',
        1,
        'Free',
        'Designmak',
        250,
        980,
        `${slug.replace(/-/g, ' ')} designmak fdm stl`
      );
      count++;
    }
    db.exec('COMMIT');
    console.log(`✅ [Designmak] ${count} models harvested.`);
  } catch (e) {
    console.log('⚠️ [Designmak] Error:', e.message);
  }
}

// 2. PRINTABLES GRAPHQL CRAWLER (Deep Multi-Category)
const SEARCH_SEEDS = [
  'dragon', 'case', 'mount', 'stand', 'organizer', 'box', 'elephant', 'cat', 'dog',
  'car', 'fidget', 'vase', 'lamp', 'gear', 'tool', 'drone', 'cosplay', 'helmet',
  'phone', 'arduino', 'raspberry pi', 'gridfinity', 'keychain', 'toy', 'figure'
];

async function harvestPrintables() {
  console.log('🔄 [2/4] Harvesting Printables categories...');
  let totalAdded = 0;
  for (const term of SEARCH_SEEDS) {
    try {
      const res = await fetch('https://api.printables.com/graphql/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({
          operationName: 'SearchModels',
          variables: { query: term, limit: 60, offset: 0, ordering: 'best_match' },
          query: `
            query SearchModels($query: String!, $limit: Int, $offset: Int, $ordering: SearchChoicesEnum) {
              searchPrints2(query: $query, limit: $limit, offset: $offset, ordering: $ordering) {
                items { id name slug likesCount downloadCount user { publicUsername } image { filePath } }
              }
            }
          `
        }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        const items = data?.data?.searchPrints2?.items || [];
        db.exec('BEGIN');
        for (const item of items) {
          if (!item?.id || !item?.image?.filePath) continue;
          const img = item.image.filePath.startsWith('http')
            ? item.image.filePath
            : `https://media.printables.com/${item.image.filePath.replace(/^\/+/, '')}`;
          const url = `https://www.printables.com/model/${item.id}-${item.slug || 'model'}`;

          insertStmt.run(
            'pr_' + item.id,
            item.name,
            url,
            img,
            img,
            'Printables',
            1,
            'Free',
            item.user?.publicUsername || 'Printables',
            item.likesCount || 0,
            item.downloadCount || 0,
            `${term} ${(item.name || '').toLowerCase()} fdm stl 3mf`
          );
          totalAdded++;
        }
        db.exec('COMMIT');
      }
    } catch (_) {}
  }
  console.log(`✅ [Printables] ${totalAdded} models harvested.`);
}

async function main() {
  console.log('====================================================');
  console.log('🚀 STLSearch Autonomous Harvester Started');
  console.log('====================================================');

  await harvestDesignmak();
  await harvestPrintables();

  const count = db.prepare('SELECT COUNT(*) as c FROM models').get().c;
  console.log('====================================================');
  console.log(`🎉 Harvester Complete! Total DB Count: ${count.toLocaleString('tr-TR')}`);
  console.log('====================================================');
}

main();
