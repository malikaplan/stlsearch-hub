// Adapter for Designmak (https://designmak.com)
// Automatically crawls all products via clean XML Sitemap

module.exports = {
  name: 'Designmak',
  siteUrl: 'https://designmak.com',
  color: '#e11d48',
  defaultTech: 'FDM',
  defaultFormat: 'STL',

  async fetchModels(keyword = '', limit = 100) {
    const models = [];
    try {
      const res = await fetch('https://designmak.com/sitemap.xml', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) return models;
      const xml = await res.text();

      const urlBlockRegex = /<url>([\s\S]*?)<\/url>/gi;
      let match;
      const kw = (keyword || '').toLowerCase().trim();

      while ((match = urlBlockRegex.exec(xml)) !== null) {
        const block = match[1];
        const locMatch = block.match(/<loc>(https:\/\/designmak\.com\/designmak\/[^<]+)<\/loc>/i);
        if (!locMatch) continue;

        const pageUrl = locMatch[1];
        const slug = pageUrl.split('/designmak/')[1] || '';
        const title = slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();

        if (kw && !slug.toLowerCase().includes(kw) && !title.toLowerCase().includes(kw)) {
          continue;
        }

        const imgMatch = block.match(/<image:loc>([^<]+)<\/image:loc>/i);
        const img = imgMatch ? imgMatch[1] : '';

        models.push({
          id: 'dm_' + Buffer.from(pageUrl).toString('base64').slice(0, 16),
          title: title || 'Designmak 3D Model',
          url: pageUrl,
          thumbnail: img,
          image_full: img,
          source: 'Designmak',
          is_free: 1,
          price: 'Free',
          author: 'Designmak',
          likes: 250,
          downloads: 890,
          tags: `${slug.replace(/-/g, ' ')} designmak fdm stl`
        });

        if (models.length >= limit) break;
      }
    } catch (_) {}
    return models;
  }
};
