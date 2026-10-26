const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://www.thingiverse.com/search?q=elephant&type=things&sort=relevant';

const args = [
  '--headless=new',
  '--disable-blink-features=AutomationControlled',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  '--dump-dom',
  targetUrl
];

execFile(chrome, args, { timeout: 15000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
  const isCf = stdout.includes('Just a moment') || stdout.includes('challenge-platform');
  console.log('Thingiverse Cloudflare:', isCf);
  const links = stdout.match(/href="([^">]+)"/g) || [];
  console.log('Sample Thingiverse hrefs:', links.slice(0, 15));
});
