const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'https://www.yeggi.com/q/case/';

const args = [
  '--headless=new',
  '--disable-blink-features=AutomationControlled',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=8000',
  '--dump-dom',
  url
];

execFile(chrome, args, { timeout: 18000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
  if (err) return console.error(err.message);
  console.log('Yeggi Chrome length:', stdout.length);
  const isCf = stdout.includes('Please wait a moment while we check whether you are human');
  console.log('Cloudflare blocked:', isCf);
  const titles = stdout.match(/class="item_title"/g) || [];
  console.log('Yeggi titles:', titles.length);
  const links = stdout.match(/href="https:\/\/www\.yeggi\.com\/goto\/[^"]+"/g) || [];
  console.log('Goto links:', links.length);
  if (links.length > 0) console.log('Sample goto:', links.slice(0, 3));
});
