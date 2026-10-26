const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://grabcad.com/library?page=1&per_page=24&query=elephant';

const args = [
  '--headless=new',
  '--disable-blink-features=AutomationControlled',
  '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  '--dump-dom',
  targetUrl
];

execFile(chrome, args, { timeout: 15000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
  if (err) return console.error('Error:', err.message);
  console.log('GrabCAD DOM length:', stdout.length);
  const models = stdout.match(/\/library\/[a-zA-Z0-9_-]+/g) || [];
  console.log('GrabCAD items found:', models.length, [...new Set(models)].slice(0, 10));
});
