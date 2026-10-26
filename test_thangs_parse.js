const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://thangs.com/search/elephant?scope=thangs';

const args = [
  '--headless=new',
  '--disable-blink-features=AutomationControlled',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=6000',
  '--dump-dom',
  targetUrl
];

execFile(chrome, args, { timeout: 15000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
  const cardRegex = /<a[^>]+href="(\/designer\/[^\/]+\/3d-model\/[^"?#]+)"[\s\S]{1,800}?<img[^>]+src="([^">]+)"[^>]+alt="([^">]*)"/gi;
  let m;
  const items = [];
  while ((m = cardRegex.exec(stdout)) !== null) {
    if (m[2].includes('enhanced_images') || m[2].includes('thangs')) {
      items.push({ url: 'https://thangs.com' + m[1], img: m[2].replace(/&amp;/g, '&'), title: m[3] });
    }
  }
  console.log('Thangs parsed cards:', items.length);
  if (items.length > 0) console.log('Sample:', items.slice(0, 3));
});
