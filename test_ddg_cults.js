const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'https://duckduckgo.com/?q=site%3Acults3d.com%2Fen%2F3d-model+case&t=h_&ia=web';

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
  const models = stdout.match(/https?:\/\/cults3d\.com\/en\/3d-model\/[a-zA-Z0-9_\-\/]+/g) || [];
  console.log('Cults models from DDG:', models.length, [...new Set(models)].slice(0, 5));
});
