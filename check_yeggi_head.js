const url = 'https://www.yeggi.com/q/case/';
fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  }
})
.then(r => r.text())
.then(html => {
  console.log('First 1200 chars:\n', html.slice(0, 1200));
});
