const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const testSites = [
  { name: 'Printables', url: 'https://www.printables.com/model' },
  { name: 'MakerWorld', url: 'https://makerworld.com/en/search/models?keyword=case' },
  { name: 'Thingiverse', url: 'https://www.thingiverse.com/search?q=case&type=things' },
  { name: 'Thangs', url: 'https://thangs.com/search/case?scope=thangs' },
  { name: 'Cults3D', url: 'https://duckduckgo.com/?q=site:cults3d.com/en/3d-model+case&t=h_&ia=web' },
  { name: 'MyMiniFactory', url: 'https://duckduckgo.com/?q=site:myminifactory.com/object+case&t=h_&ia=web' },
  { name: 'GrabCAD', url: 'https://grabcad.com/library?query=case' },
  { name: 'CGTrader', url: 'https://duckduckgo.com/?q=site:cgtrader.com/3d-print-models+case&t=h_&ia=web' }
];

async function run() {
  for (const s of testSites) {
    await new Promise((resolve) => {
      const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        '--run-all-compositor-stages-before-draw',
        '--virtual-time-budget=6000',
        '--dump-dom',
        s.url
      ];
      execFile(chrome, args, { timeout: 15000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
        const out = stdout || '';
        const isBlocked = out.includes('Just a moment') || out.includes('challenge-platform') || out.length < 5000;
        console.log(`[${s.name}] Result -> Length: ${out.length} | Blocked: ${isBlocked}`);
        resolve();
      });
    });
  }
}

run();
