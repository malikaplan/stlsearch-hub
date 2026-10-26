const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function testUrl(name, url, modelRegex) {
  const args = [
    '--headless=new',
    '--disable-blink-features=AutomationControlled',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    '--dump-dom',
    url
  ];
  execFile(chrome, args, { timeout: 15000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
    if (err) return console.log(`[${name}] Error:`, err.message);
    const m = stdout.match(modelRegex) || [];
    console.log(`[${name}] DOM: ${stdout.length} | Found: ${m.length} | Unique: ${new Set(m).size}`);
    if (m.length > 0) console.log(`[${name}] Sample:`, [...new Set(m)].slice(0, 3));
  });
}

testUrl('MakerWorld', 'https://makerworld.com/en/search/models?keyword=elephant', /\/models\/[0-9]+[a-zA-Z0-9_-]*/g);
testUrl('Thingiverse', 'https://www.thingiverse.com/search?q=elephant&type=things', /thing:\d+/g);
testUrl('Cults3D', 'https://cults3d.com/en/search?q=elephant', /\/3d-model\/[a-zA-Z0-9_-]+/g);
