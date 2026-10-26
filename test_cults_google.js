const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'https://www.google.com/search?q=site:cults3d.com/en/3d-model+case&hl=en';

const args = [
  '--headless=new',
  '--disable-blink-features=AutomationControlled',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=5000',
  '--dump-dom',
  url
];

execFile(chrome, args, { timeout: 15000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
  const models = stdout.match(/https?:\/\/cults3d\.com\/en\/3d-model\/[a-zA-Z0-9_\-\/]+/g) || [];
  console.log('Cults models from Google Stealth:', models.length, [...new Set(models)].slice(0, 5));
});
