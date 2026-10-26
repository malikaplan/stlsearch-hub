const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://makerworld.com/en/search/models?keyword=elephant';

execFile(chrome, ['--headless=new', '--dump-dom', targetUrl], { timeout: 15000 }, (err, stdout) => {
  if (err) return console.error(err.message);
  console.log('MakerWorld direct length:', stdout ? stdout.length : 0);
  const isCf = stdout.includes('Just a moment') || stdout.includes('challenge-platform');
  console.log('Cloudflare blocked:', isCf);
  const models = stdout ? (stdout.match(/\/models\/[0-9]+[a-zA-Z0-9_-]*/g) || []) : [];
  console.log('Direct MakerWorld models found:', models.length, [...new Set(models)].slice(0, 10));
});
