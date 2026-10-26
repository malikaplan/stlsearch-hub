const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://www.thingiverse.com/search?q=elephant&type=things';

const args = [
  '--headless=new',
  '--disable-blink-features=AutomationControlled',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  '--dump-dom',
  targetUrl
];

execFile(chrome, args, { timeout: 15000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
  const m = stdout.match(/thing:\d+/g) || [];
  console.log('Things in DOM:', m.slice(0, 5));
  if (m.length > 0) {
    const idx = stdout.indexOf(m[0]);
    console.log('Snippet around first item:\n', stdout.slice(Math.max(0, idx - 300), idx + 600));
  }
});
