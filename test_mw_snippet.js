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
  const idx = stdout.indexOf('/models/1060702-knitted-elephant');
  if (idx !== -1) {
    console.log('Snippet around model:\n', stdout.slice(Math.max(0, idx - 400), idx + 600));
  } else {
    console.log('Model link not found');
  }
});
