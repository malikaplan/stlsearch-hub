const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://www.google.com/search?q=site:makerworld.com/en/models+elephant&tbm=isch&hl=en';

execFile(chrome, ['--headless=new', '--dump-dom', targetUrl], { timeout: 15000 }, (err, stdout) => {
  if (err) return console.error(err.message);
  console.log('Google Images length:', stdout ? stdout.length : 0);
  const isCaptcha = stdout.includes('captcha') || stdout.includes('recaptcha');
  console.log('Is Captcha:', isCaptcha);
  const mwModels = stdout ? (stdout.match(/makerworld\.com\/en\/models\/[0-9]+[a-zA-Z0-9_-]*/g) || []) : [];
  console.log('MakerWorld Models found in Google Images:', mwModels.length, [...new Set(mwModels)].slice(0, 5));
});
