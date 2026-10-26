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
  const idx = stdout.indexOf('https://resize.thingiverse.com/?url=https://cdn.thingiverse.com/assets/cf/28/7e/b0/ae/IMG_7409.JPG');
  if (idx !== -1) {
    console.log(stdout.slice(Math.max(0, idx - 400), idx + 600));
  }
});
