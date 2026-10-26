const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function testSite(name, url, checkRegex) {
  const args = [
    '--headless=new',
    '--disable-blink-features=AutomationControlled',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=6000',
    '--dump-dom',
    url
  ];
  execFile(chrome, args, { timeout: 18000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
    if (err) return console.log(`[${name}] Error:`, err.message);
    const m = stdout ? stdout.match(checkRegex) || [] : [];
    console.log(`[${name}] DOM length: ${stdout ? stdout.length : 0} | Matches: ${m.length}`);
    if (m.length > 0) console.log(`[${name}] Sample:`, [...new Set(m)].slice(0, 3));
  });
}

// Tüm 8 pazaryerini canlı test edelim
testSite('Cults3D', 'https://cults3d.com/en/search?q=case', /\/en\/3d-model\/[a-zA-Z0-9_-]+/g);
testSite('MyMiniFactory', 'https://www.myminifactory.com/search/?query=case', /\/object\/3d-print-[a-zA-Z0-9_-]+/g);
testSite('GrabCAD', 'https://grabcad.com/library?page=1&per_page=24&query=case', /\/library\/[a-zA-Z0-9_-]+/g);
testSite('CGTrader', 'https://www.cgtrader.com/3d-print-models?keywords=case', /\/3d-print-models\/[a-zA-Z0-9_-]+/g);
