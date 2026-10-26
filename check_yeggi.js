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
  console.log('Len:', html.length);
  const titles = html.match(/class="item_title"/g) || [];
  console.log('Titles found:', titles.length);
  const links = html.match(/https?:\/\/[^\s"']+/g) || [];
  console.log('Total links:', links.length);
  // Bakalım hangi pazaryerleri var
  const mw = html.match(/makerworld/gi) || [];
  const tv = html.match(/thingiverse/gi) || [];
  const cu = html.match(/cults/gi) || [];
  const th = html.match(/thangs/gi) || [];
  const pr = html.match(/printables/gi) || [];
  const mm = html.match(/myminifactory/gi) || [];
  const gc = html.match(/grabcad/gi) || [];
  const cg = html.match(/cgtrader/gi) || [];
  console.log({ mw: mw.length, tv: tv.length, cu: cu.length, th: th.length, pr: pr.length, mm: mm.length, gc: gc.length, cg: cg.length });
})
.catch(e => console.error(e));
