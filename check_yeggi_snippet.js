const url = 'https://www.yeggi.com/q/case/';
fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/'
  }
})
.then(r => r.text())
.then(html => {
  const idx = html.indexOf('cults3d.com');
  if (idx !== -1) {
    console.log(html.slice(Math.max(0, idx - 400), idx + 600));
  } else {
    console.log('cults not found');
  }
});
