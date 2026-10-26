const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'https://grabcad.com/library?page=1&per_page=24&query=case';

const args = [
  '--headless=new',
  '--disable-blink-features=AutomationControlled',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=6000',
  '--dump-dom',
  url
];

execFile(chrome, args, { timeout: 15000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
  const cardRegex = /<a[^>]+href="(\/library\/[a-zA-Z0-9_-]+)"[^>]*>[\s\S]{1,600}?<img[^>]+src="([^">]+)"/gi;
  let m;
  const items = [];
  while ((m = cardRegex.exec(stdout)) !== null) {
    if (!m[1].includes('/new') && !m[1].includes('/software') && !m[1].includes('/popular')) {
      items.push({ url: 'https://grabcad.com' + m[1], img: m[2] });
    }
  }
  console.log('GrabCAD parsed models:', items.length);
  if (items.length > 0) console.log('Sample:', items.slice(0, 3));
});
