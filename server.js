const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3456;
const DATA_DIR = path.join(__dirname, 'data');
const CACHE_DIR = path.join(DATA_DIR, 'img_cache');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ADAPTERS_DIR = path.join(__dirname, 'adapters');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const BROWSER_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
];
const HEADLESS_BROWSER_BIN = BROWSER_PATHS.find((p) => fs.existsSync(p)) || null;

// ============================================================================
// VERİTABANI
// ============================================================================
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

const insertModelStmt = db.prepare(`
  INSERT INTO models (id, title, url, thumbnail, image_full, source, is_free, price, author, likes, downloads, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(url) DO UPDATE SET
    title = excluded.title,
    thumbnail = CASE WHEN excluded.thumbnail != '' THEN excluded.thumbnail ELSE models.thumbnail END,
    tags = CASE WHEN instr(models.tags, excluded.tags) = 0 THEN models.tags || ' ' || excluded.tags ELSE models.tags END
`);

// ============================================================================
// STEALTH CHROME MOTORU
// ============================================================================
function fetchDomStealth(targetUrl, timeoutMs = 12000) {
  return new Promise((resolve) => {
    if (!HEADLESS_BROWSER_BIN) return resolve('');
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=5000',
      '--dump-dom',
      targetUrl
    ];
    execFile(HEADLESS_BROWSER_BIN, args, { timeout: timeoutMs, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
      resolve(stdout || '');
    });
  });
}

function cleanSlugTitle(slug) {
  return (slug || '')
    .replace(/^https?:\/\/[^\/]+\//i, '')
    .replace(/^(?:[a-z]{2}\/)?models\/[0-9]+-/i, '')
    .replace(/^thing:\d+/i, '')
    .replace(/^library\//i, '')
    .replace(/^object\/3d-print-/i, '')
    .replace(/^3d-model\/(?:[a-z0-9_-]+\/)?/i, '')
    .replace(/^3d-print-models\/(?:[a-z0-9_-]+\/)?/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// 1. DESIGNMAK.COM ADAPTER
const designmakAdapter = require('./adapters/designmak.js');
const crealityAdapter = require('./adapters/crealitycloud.js');
const snapmakerAdapter = require('./adapters/snapmaker.js');

// 2. MAKERWORLD
async function scrapeMakerWorld(keyword) {
  const models = [];
  const url = `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(keyword)}`;
  try {
    const html = await fetchDomStealth(url);
    const reg = /<a[^>]+href="(\/(?:[a-z]{2}\/)?models\/([0-9]+)-([^"?#]+))"[^>]*>[\s\S]{1,600}?<img[^>]+alt="([^">]+)"[^>]+src="([^">]+)"/gi;
    let m;
    const seen = new Set();
    while ((m = reg.exec(html)) !== null) {
      const pageUrl = `https://makerworld.com${m[1].replace(/^\/[a-z]{2}\//i, '/en/')}`;
      if (seen.has(pageUrl)) continue;
      seen.add(pageUrl);

      const title = (m[4] || m[3] || '').replace(/[-_]+/g, ' ').trim();
      let img = m[5].startsWith('//') ? 'https:' + m[5] : m[5];

      models.push({
        id: crypto.createHash('md5').update(pageUrl).digest('hex'),
        title: title || 'MakerWorld 3D Model',
        url: pageUrl,
        thumbnail: img,
        image_full: img,
        source: 'MakerWorld',
        is_free: 1,
        price: 'Free',
        author: 'MakerWorld',
        likes: 180,
        downloads: 620,
        tags: `${keyword.toLowerCase()} ${title.toLowerCase()} fdm 3mf bambu`
      });
    }
  } catch (_) {}
  return models;
}

// 3. THINGIVERSE
async function scrapeThingiverse(keyword) {
  const models = [];
  const url = `https://www.thingiverse.com/search?q=${encodeURIComponent(keyword)}&type=things&sort=relevant`;
  try {
    const html = await fetchDomStealth(url);
    const reg = /href="(\/thing:\d+)"[\s\S]{1,500}?<img[^>]+src="([^">]+)"[^>]*alt="([^">]*)"/gi;
    let m;
    const seen = new Set();
    while ((m = reg.exec(html)) !== null) {
      const pageUrl = `https://www.thingiverse.com${m[1]}`;
      if (seen.has(pageUrl)) continue;
      seen.add(pageUrl);

      let img = m[2].replace(/&amp;/g, '&');
      let title = (m[3] || '').replace(/^Thumbnail representing\s*/i, '').trim();
      if (!title) {
        const titleMatch = html.slice(m.index - 200, m.index + 400).match(/title="([^">]+)"/);
        if (titleMatch) title = titleMatch[1];
      }

      models.push({
        id: crypto.createHash('md5').update(pageUrl).digest('hex'),
        title: title || cleanSlugTitle(m[1]),
        url: pageUrl,
        thumbnail: img,
        image_full: img,
        source: 'Thingiverse',
        is_free: 1,
        price: 'Free',
        author: 'Thingiverse',
        likes: 140,
        downloads: 510,
        tags: `${keyword.toLowerCase()} ${(title || '').toLowerCase()} fdm stl`
      });
    }
  } catch (_) {}
  return models;
}

// 4. THANGS
async function scrapeThangs(keyword) {
  const models = [];
  const url = `https://thangs.com/search/${encodeURIComponent(keyword)}?scope=thangs`;
  try {
    const html = await fetchDomStealth(url);
    const reg = /<a[^>]+aria-label="([^">]+)"[^>]+href="(\/designer\/[^\/]+\/3d-model\/[^"?#]+)"[\s\S]{1,800}?<img[^>]+src="([^">]+)"/gi;
    let m;
    const seen = new Set();
    while ((m = reg.exec(html)) !== null) {
      const pageUrl = `https://thangs.com${m[2]}`;
      if (seen.has(pageUrl)) continue;
      seen.add(pageUrl);

      const title = (m[1] || '').trim();
      let img = m[3].replace(/&amp;/g, '&');
      if (img.startsWith('/_next/image?url=')) {
        try {
          const inner = new URL(img, 'https://thangs.com').searchParams.get('url');
          if (inner) img = inner;
        } catch (_) {}
      }

      models.push({
        id: crypto.createHash('md5').update(pageUrl).digest('hex'),
        title: title || cleanSlugTitle(m[2]),
        url: pageUrl,
        thumbnail: img,
        image_full: img,
        source: 'Thangs',
        is_free: 1,
        price: 'Free',
        author: 'Thangs',
        likes: 125,
        downloads: 480,
        tags: `${keyword.toLowerCase()} ${title.toLowerCase()} fdm stl`
      });
    }
  } catch (_) {}
  return models;
}

// 5. PRINTABLES
async function scrapePrintables(keyword, limit = 60, offset = 0) {
  const models = [];
  try {
    const res = await fetch('https://api.printables.com/graphql/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        operationName: 'SearchModels',
        variables: { query: keyword, limit, offset, ordering: 'best_match' },
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
      for (const item of items) {
        if (!item?.id || !item?.image?.filePath) continue;
        const img = item.image.filePath.startsWith('http')
          ? item.image.filePath
          : `https://media.printables.com/${item.image.filePath.replace(/^\/+/, '')}`;
        const pageUrl = `https://www.printables.com/model/${item.id}-${item.slug || 'model'}`;

        models.push({
          id: crypto.createHash('md5').update(pageUrl).digest('hex'),
          title: item.name || 'Printables 3D Model',
          url: pageUrl,
          thumbnail: img,
          image_full: img,
          source: 'Printables',
          is_free: 1,
          price: 'Free',
          author: item.user?.publicUsername || 'Printables',
          likes: item.likesCount || 0,
          downloads: item.downloadCount || 0,
          tags: `${keyword.toLowerCase()} ${(item.name || '').toLowerCase()} fdm stl 3mf`
        });
      }
    }
  } catch (_) {}
  return models;
}

// 6. GRABCAD
async function scrapeGrabCAD(keyword) {
  const models = [];
  const url = `https://grabcad.com/library?page=1&per_page=24&query=${encodeURIComponent(keyword)}`;
  try {
    const html = await fetchDomStealth(url);
    const reg = /<a[^>]+href="(\/library\/[a-zA-Z0-9_-]+)"[^>]*>[\s\S]{1,600}?<img[^>]+src="([^">]+)"/gi;
    let m;
    const seen = new Set();
    while ((m = reg.exec(html)) !== null) {
      if (m[1].includes('/new') || m[1].includes('/popular') || m[1].includes('/software')) continue;
      const pageUrl = `https://grabcad.com${m[1]}`;
      if (seen.has(pageUrl)) continue;
      seen.add(pageUrl);

      const title = cleanSlugTitle(m[1]);
      models.push({
        id: crypto.createHash('md5').update(pageUrl).digest('hex'),
        title: title || 'GrabCAD CAD Model',
        url: pageUrl,
        thumbnail: m[2],
        image_full: m[2],
        source: 'GrabCAD',
        is_free: 1,
        price: 'Free',
        author: 'GrabCAD',
        likes: 85,
        downloads: 320,
        tags: `${keyword.toLowerCase()} ${title.toLowerCase()} step cad fdm`
      });
    }
  } catch (_) {}
  return models;
}

// 7. CULTS3D
async function scrapeCults3D(keyword) {
  const models = [];
  const url = `https://duckduckgo.com/?q=${encodeURIComponent('site:cults3d.com/en/3d-model ' + keyword)}&t=h_&ia=web`;
  try {
    const html = await fetchDomStealth(url);
    const reg = /https?:\/\/cults3d\.com\/en\/3d-model\/[a-zA-Z0-9_\-\/]+/gi;
    const matches = html.match(reg) || [];
    const seen = new Set();
    for (const rawUrl of matches) {
      const cleanUrl = rawUrl.replace(/\?.*$/, '').replace(/\/$/, '');
      if (seen.has(cleanUrl) || cleanUrl.endsWith('/3d-model')) continue;
      seen.add(cleanUrl);

      const title = cleanSlugTitle(cleanUrl.split('/3d-model/')[1] || cleanUrl);
      models.push({
        id: crypto.createHash('md5').update(cleanUrl).digest('hex'),
        title: title || 'Cults3D Model',
        url: cleanUrl,
        thumbnail: '',
        image_full: '',
        source: 'Cults3D',
        is_free: 0,
        price: '$3.50',
        author: 'Cults3D',
        likes: 90,
        downloads: 270,
        tags: `${keyword.toLowerCase()} ${title.toLowerCase()} fdm stl`
      });
    }
  } catch (_) {}
  return models;
}

// 8. MYMINIFACTORY
async function scrapeMyMiniFactory(keyword) {
  const models = [];
  const url = `https://duckduckgo.com/?q=${encodeURIComponent('site:myminifactory.com/object ' + keyword)}&t=h_&ia=web`;
  try {
    const html = await fetchDomStealth(url);
    const reg = /https?:\/\/(?:www\.)?myminifactory\.com\/object\/3d-print-[a-zA-Z0-9_\-\/]+/gi;
    const matches = html.match(reg) || [];
    const seen = new Set();
    for (const rawUrl of matches) {
      const cleanUrl = rawUrl.replace(/\?.*$/, '').replace(/\/$/, '');
      if (seen.has(cleanUrl)) continue;
      seen.add(cleanUrl);

      const title = cleanSlugTitle(cleanUrl.split('/object/3d-print-')[1] || cleanUrl);
      models.push({
        id: crypto.createHash('md5').update(cleanUrl).digest('hex'),
        title: title || 'MyMiniFactory Model',
        url: cleanUrl,
        thumbnail: '',
        image_full: '',
        source: 'MyMiniFactory',
        is_free: 0,
        price: '$4.99',
        author: 'MyMiniFactory',
        likes: 110,
        downloads: 390,
        tags: `${keyword.toLowerCase()} ${title.toLowerCase()} sla miniature resin`
      });
    }
  } catch (_) {}
  return models;
}

// 9. CGTRADER
async function scrapeCGTrader(keyword) {
  const models = [];
  const url = `https://duckduckgo.com/?q=${encodeURIComponent('site:cgtrader.com/3d-print-models ' + keyword)}&t=h_&ia=web`;
  try {
    const html = await fetchDomStealth(url);
    const reg = /https?:\/\/(?:www\.)?cgtrader\.com\/3d-print-models\/[a-zA-Z0-9_\-\/]+/gi;
    const matches = html.match(reg) || [];
    const seen = new Set();
    for (const rawUrl of matches) {
      const cleanUrl = rawUrl.replace(/\?.*$/, '').replace(/\/$/, '');
      if (seen.has(cleanUrl) || cleanUrl.endsWith('/3d-print-models')) continue;
      seen.add(cleanUrl);

      const title = cleanSlugTitle(cleanUrl.split('/3d-print-models/')[1] || cleanUrl);
      models.push({
        id: crypto.createHash('md5').update(cleanUrl).digest('hex'),
        title: title || 'CGTrader Model',
        url: cleanUrl,
        thumbnail: '',
        image_full: '',
        source: 'CGTrader',
        is_free: 0,
        price: '$5.00',
        author: 'CGTrader',
        likes: 95,
        downloads: 310,
        tags: `${keyword.toLowerCase()} ${title.toLowerCase()} 3d obj stl`
      });
    }
  } catch (_) {}
  return models;
}

// ============================================================================
// 11 PAZARYERİ PARALEL ÇALIŞMA MOTORU
// ============================================================================
async function performAll11MarketplacesSearch(keyword, page = 1) {
  const cleanQ = (keyword || '').trim().toLowerCase();
  const printablesOffset = (page - 1) * 60;

  // 11 PAZARYERİ AYNI ANDA TETİKLENİYOR
  const tasks = [
    designmakAdapter.fetchModels(cleanQ, 100),
    scrapeMakerWorld(cleanQ),
    scrapeThingiverse(cleanQ),
    scrapeThangs(cleanQ),
    scrapePrintables(cleanQ, 60, printablesOffset),
    crealityAdapter.fetchModels(cleanQ, 50, fetchDomStealth),
    snapmakerAdapter.fetchModels(cleanQ, 50, fetchDomStealth),
    scrapeGrabCAD(cleanQ),
    scrapeCults3D(cleanQ),
    scrapeMyMiniFactory(cleanQ),
    scrapeCGTrader(cleanQ)
  ];

  const settled = await Promise.allSettled(tasks);
  const newModels = [];
  const seenUrls = new Set();

  settled.forEach((r) => {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      for (const m of r.value) {
        if (!m.url || seenUrls.has(m.url)) continue;
        seenUrls.add(m.url);
        newModels.push(m);
      }
    }
  });

  if (newModels.length > 0) {
    db.exec('BEGIN');
    try {
      for (const m of newModels) {
        insertModelStmt.run(
          m.id,
          m.title,
          m.url,
          m.thumbnail,
          m.image_full,
          m.source,
          m.is_free,
          m.price,
          m.author,
          m.likes,
          m.downloads,
          m.tags
        );
      }
      db.exec('COMMIT');
    } catch (_) {
      try { db.exec('ROLLBACK'); } catch (_) {}
    }
  }

  return newModels;
}

function queryDatabase(query) {
  const cleanQ = (query || '').trim().toLowerCase();
  if (!cleanQ) {
    return db.prepare(`SELECT * FROM models ORDER BY created_at DESC LIMIT 5000`).all();
  }
  const words = cleanQ.split(/\s+/).filter(Boolean);
  const conditions = words.map(() => `(LOWER(title) LIKE ? OR LOWER(tags) LIKE ?)`).join(' AND ');
  const params = [];
  words.forEach((w) => {
    params.push(`%${w}%`, `%${w}%`);
  });
  return db.prepare(`SELECT * FROM models WHERE ${conditions} ORDER BY likes DESC LIMIT 10000`).all(...params);
}

function interleaveBySource(models) {
  const buckets = new Map();
  // Designmak en başta olacak şekilde 11 pazar yeri
  const order = [
    'Designmak',
    'MakerWorld',
    'Thingiverse',
    'Printables',
    'CrealityCloud',
    'Snapmaker',
    'Cults3D',
    'MyMiniFactory',
    'Thangs',
    'GrabCAD',
    'CGTrader'
  ];
  for (const s of order) buckets.set(s, []);
  for (const m of models) {
    if (!buckets.has(m.source)) buckets.set(m.source, []);
    buckets.get(m.source).push(m);
  }
  const interleaved = [];
  let added = true;
  while (added) {
    added = false;
    for (const [, list] of buckets) {
      if (list.length > 0) {
        interleaved.push(list.shift());
        added = true;
      }
    }
  }
  return interleaved;
}

// ============================================================================
// GÖRSEL PROXY
// ============================================================================
async function handleImageProxy(req, res, targetUrl) {
  if (!targetUrl) {
    res.writeHead(400);
    return res.end('Missing URL');
  }
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': new URL(targetUrl).origin + '/'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) throw new Error();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await response.arrayBuffer());
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(buf);
  } catch (_) {
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#64748b">3D Model Preview</text></svg>`;
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    res.end(fallbackSvg);
  }
}

// ============================================================================
// HTTP SUNUCU
// ============================================================================
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  if (pathname === '/api/suggest') {
    const q = (reqUrl.searchParams.get('q') || '').trim().toLowerCase();
    const dbModels = queryDatabase(q);
    const phrases = new Set();
    dbModels.slice(0, 150).forEach((m) => {
      const words = (m.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
      for (let i = 0; i < words.length; i++) {
        if (words[i].includes(q)) {
          phrases.add(words[i]);
          if (i + 1 < words.length) phrases.add(`${words[i]} ${words[i + 1]}`);
        }
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      phrases: Array.from(phrases).slice(0, 16),
      instantModels: interleaveBySource(dbModels).slice(0, 40),
      totalIndexed: db.prepare('SELECT COUNT(*) as c FROM models').get().c
    }));
  }

  if (pathname === '/api/search') {
    const q = reqUrl.searchParams.get('q') || '';
    const page = parseInt(reqUrl.searchParams.get('page') || '1', 10) || 1;

    // 11 PAZARYERİ CANLI TARANIYOR
    if (q.trim()) {
      await performAll11MarketplacesSearch(q, page);
    }

    const allMatches = interleaveBySource(queryDatabase(q));
    const totalCount = db.prepare('SELECT COUNT(*) as c FROM models').get().c;

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      ok: true,
      models: allMatches,
      totalIndexed: totalCount,
      page
    }));
  }

  if (pathname === '/api/image') {
    return handleImageProxy(req, res, reqUrl.searchParams.get('url'));
  }

  let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  console.log(`\n=============================================================`);
  console.log(`🚀 STLSearch 11 Pazaryeri Motoru Devrede!`);
  console.log(`🌐 Port: http://localhost:${PORT}`);
  console.log(`📦 Toplam İndekslenen: ${db.prepare('SELECT COUNT(*) as c FROM models').get().c}`);
  console.log(`=============================================================\n`);

  // İlk açılışta Designmak modellerini hemen içeri al
  try {
    const dmModels = await designmakAdapter.fetchModels('', 200);
    if (dmModels.length > 0) {
      db.exec('BEGIN');
      for (const m of dmModels) {
        insertModelStmt.run(m.id, m.title, m.url, m.thumbnail, m.image_full, m.source, m.is_free, m.price, m.author, m.likes, m.downloads, m.tags);
      }
      db.exec('COMMIT');
      console.log(`✅ Designmak.com'dan ${dmModels.length} model veritabanına aktarıldı!`);
    }
  } catch (_) {}
});
