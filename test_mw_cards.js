const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://makerworld.com/en/search/models?keyword=elephant';

const args = [
  '--headless=new',
  '--disable-blink-features=AutomationControlled',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  '--dump-dom',
  targetUrl
];

execFile(chrome, args, { timeout: 15000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
  if (err) return console.error('Error:', err.message);
  
  // Model linklerini ve hemen yanındaki başlık/resimleri ara
  const cardRegex = /href="(\/models\/[0-9]+[a-zA-Z0-9_-]*)"[^>]*>.*?<img[^>]+src="([^">]+)"[^>]*alt="([^">]*)"/gis;
  let match;
  const cards = [];
  while ((match = cardRegex.exec(stdout)) !== null) {
    cards.push({ url: 'https://makerworld.com' + match[1], img: match[2], title: match[3] });
  }
  console.log('Cards parsed with title & img:', cards.length);
  if (cards.length > 0) console.log('Sample card:', cards[0]);

  // Alternatif img etiketleri
  const allImages = stdout.match(/https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp)/gi) || [];
  console.log('All image URLs found:', allImages.length, allImages.slice(0, 3));
});
