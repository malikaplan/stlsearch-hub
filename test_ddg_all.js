const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function testDDG(name, siteQuery) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(siteQuery)}&t=h_&ia=web`;
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
    if (err) return console.log(err.message);
    let m = [];
    if (name === 'MMF') m = stdout.match(/https?:\/\/(?:www\.)?myminifactory\.com\/object\/3d-print-[a-zA-Z0-9_\-\/]+/gi) || [];
    if (name === 'CGTrader') m = stdout.match(/https?:\/\/(?:www\.)?cgtrader\.com\/3d-print-models\/[a-zA-Z0-9_\-\/]+/gi) || [];
    console.log(`[${name} via DDG] Models:`, m.length, [...new Set(m)].slice(0, 3));
  });
}

testDDG('MMF', 'site:myminifactory.com/object case');
testDDG('CGTrader', 'site:cgtrader.com/3d-print-models case');
