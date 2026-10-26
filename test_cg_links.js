const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'https://www.cgtrader.com/3d-print-models?keywords=case';

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
  const matches = stdout.match(/href="(\/3d-print-models\/[^"]+)"/g) || [];
  console.log('CG links:', matches.slice(0, 10));
});
