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
  if (err) return console.error('Error:', err.message);
  console.log('Stealth DOM length:', stdout.length);
  const isCf = stdout.includes('Just a moment') || stdout.includes('challenge-platform');
  console.log('Cloudflare blocked:', isCf);
  const rawModels = stdout.match(/\/models\/[0-9]+[a-zA-Z0-9_-]*/g) || [];
  const uniqueModels = [...new Set(rawModels)];
  console.log('MakerWorld Models extracted:', uniqueModels.length);
  console.log('Sample models:', uniqueModels.slice(0, 10));
});
