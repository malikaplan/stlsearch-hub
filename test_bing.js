const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://www.bing.com/images/search?q=site:makerworld.com/en/models+elephant';

execFile(chrome, ['--headless=new', '--dump-dom', targetUrl], { timeout: 15000 }, (err, stdout) => {
  if (err) return console.error(err.message);
  const re = /murl&quot;:&quot;(https?:[^&]+)&quot;/g;
  const pUrls = [];
  const pRegex = /purl&quot;:&quot;(https?:[^&]+)&quot;/g;
  let m;
  while ((m = pRegex.exec(stdout)) !== null) {
    pUrls.push(m[1]);
  }
  console.log('Bing PURLs found:', pUrls.length);
  console.log('Sample PURLs:', pUrls.slice(0, 5));
});
