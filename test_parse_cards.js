const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function dumpCards(name, url) {
  const args = [
    '--headless=new',
    '--disable-blink-features=AutomationControlled',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    '--dump-dom',
    url
  ];
  execFile(chrome, args, { timeout: 15000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
    if (err) return console.log(err.message);
    console.log(`=== ${name} ===`);
    
    if (name === 'MakerWorld') {
      // MakerWorld parse test
      const reg = /<a[^>]+href="(\/[a-z]{2}\/models\/[0-9]+-[^"?#]+)[^>]*>.*?<img[^>]+alt="([^">]+)"[^>]+src="([^">]+)"/gis;
      let m;
      let count = 0;
      while ((m = reg.exec(stdout)) !== null) {
        count++;
        if (count <= 3) console.log({ url: 'https://makerworld.com' + m[1], title: m[2], img: m[3] });
      }
      console.log(`MakerWorld parsed models: ${count}`);
    }

    if (name === 'Thingiverse') {
      // Thingiverse parse test
      const reg = /<a[^>]+href="(\/thing:\d+)"[^>]*>.*?<img[^>]+alt="([^">]*)"[^>]+src="([^">]+)"/gis;
      let m;
      let count = 0;
      while ((m = reg.exec(stdout)) !== null) {
        count++;
        if (count <= 3) console.log({ url: 'https://www.thingiverse.com' + m[1], title: m[2], img: m[3] });
      }
      console.log(`Thingiverse parsed models: ${count}`);
    }

    if (name === 'Thangs') {
      // Thangs parse test
      const reg = /<a[^>]+href="(\/designer\/[^\/]+\/3d-model\/[^"?#]+)"[^>]*>.*?<img[^>]+alt="([^">]*)"[^>]+src="([^">]+)"/gis;
      let m;
      let count = 0;
      while ((m = reg.exec(stdout)) !== null) {
        count++;
        if (count <= 3) console.log({ url: 'https://thangs.com' + m[1], title: m[2], img: m[3] });
      }
      console.log(`Thangs parsed models: ${count}`);
    }
  });
}

dumpCards('MakerWorld', 'https://makerworld.com/en/search/models?keyword=elephant');
dumpCards('Thingiverse', 'https://www.thingiverse.com/search?q=elephant&type=things');
dumpCards('Thangs', 'https://thangs.com/search/elephant?scope=thangs');
