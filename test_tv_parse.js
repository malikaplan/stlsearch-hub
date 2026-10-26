const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://www.thingiverse.com/search?q=elephant&type=things&sort=relevant';

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
  const cardRegex = /<div[^>]+class="[^"]*ThingCard__thingCard[^"]*"[^>]*>.*?href="(\/thing:\d+)"[^>]*>.*?alt="([^"]*)"[^>]+src="([^"]+)".*?<\/div>/gis;
  // Daha esnek: her thing: linkinin içindeki veya hemen sonrasındaki img
  const thingRegex = /href="(\/thing:\d+)"[\s\S]{1,600}?<img[^>]+(?:alt="([^"]*)")?[^>]+src="([^"]+)"/gi;
  let m;
  const items = [];
  while ((m = thingRegex.exec(stdout)) !== null) {
    items.push({ url: 'https://www.thingiverse.com' + m[1], title: m[2] || '', img: m[3] });
  }
  console.log('Thingiverse parsed items:', items.length);
  if (items.length > 0) console.log('Sample:', items.slice(0, 3));
});
