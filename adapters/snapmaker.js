// Adapter for Snapmaker (3D Print, Laser & CNC Library)

module.exports = {
  name: 'Snapmaker',
  siteUrl: 'https://snapmaker.com',
  color: '#ea580c',
  defaultTech: 'CNC',
  defaultFormat: 'DXF',

  async fetchModels(keyword = '', limit = 60, fetchDomStealth) {
    const models = [];
    if (!fetchDomStealth) return models;
    const query = `site:snapmaker.com ${keyword || 'cnc laser 3d model'}`;
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&ia=web`;
    try {
      const html = await fetchDomStealth(url);
      const reg = /https?:\/\/(?:www\.)?snapmaker\.com\/[^\s"'>]+/gi;
      const matches = html.match(reg) || [];
      const seen = new Set();
      for (const rawUrl of matches) {
        const cleanUrl = rawUrl.replace(/\?.*$/, '').replace(/\/$/, '');
        if (seen.has(cleanUrl) || cleanUrl.includes('/support') || cleanUrl.includes('/privacy') || cleanUrl.includes('/terms')) continue;
        seen.add(cleanUrl);

        const slug = cleanUrl.split('/').pop() || 'model';
        const title = slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();

        models.push({
          id: 'sm_' + Buffer.from(cleanUrl).toString('base64').slice(0, 16),
          title: title || 'Snapmaker Project',
          url: cleanUrl,
          thumbnail: '',
          image_full: '',
          source: 'Snapmaker',
          is_free: 1,
          price: 'Free',
          author: 'Snapmaker',
          likes: 80,
          downloads: 290,
          tags: `${(keyword || '').toLowerCase()} ${title.toLowerCase()} snapmaker cnc laser fdm dxf`
        });

        if (models.length >= limit) break;
      }
    } catch (_) {}
    return models;
  }
};
