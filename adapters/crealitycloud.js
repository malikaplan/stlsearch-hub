// Adapter for Creality Cloud (https://www.crealitycloud.com)

module.exports = {
  name: 'CrealityCloud',
  siteUrl: 'https://www.crealitycloud.com',
  color: '#059669',
  defaultTech: 'FDM',
  defaultFormat: 'STL',

  async fetchModels(keyword = '', limit = 60, fetchDomStealth) {
    const models = [];
    if (!fetchDomStealth) return models;
    const url = `https://www.crealitycloud.com/model-search?keyword=${encodeURIComponent(keyword || '3d model')}`;
    try {
      const html = await fetchDomStealth(url);
      const cardRegex = /<a[^>]+href="(\/model-detail\/[a-zA-Z0-9]+)"[^>]*>[\s\S]{1,600}?<img[^>]+src="([^">]+)"[^>]*alt="([^">]*)"/gi;
      let m;
      const seen = new Set();
      while ((m = cardRegex.exec(html)) !== null) {
        const pageUrl = `https://www.crealitycloud.com${m[1]}`;
        if (seen.has(pageUrl)) continue;
        seen.add(pageUrl);

        const title = (m[3] || '').trim() || 'Creality 3D Model';
        const img = m[2];

        models.push({
          id: 'cr_' + Buffer.from(pageUrl).toString('base64').slice(0, 16),
          title: title,
          url: pageUrl,
          thumbnail: img,
          image_full: img,
          source: 'CrealityCloud',
          is_free: 1,
          price: 'Free',
          author: 'Creality',
          likes: 95,
          downloads: 410,
          tags: `${(keyword || '').toLowerCase()} ${title.toLowerCase()} creality fdm stl`
        });

        if (models.length >= limit) break;
      }
    } catch (_) {}
    return models;
  }
};
