const { execFile } = require('child_process');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://makerworld.com/en/search/models?keyword=elephant';
const userProfile = 'C:\\Users\\WS\\AppData\\Local\\Google\\Chrome\\User Data';

const args = [
  '--headless=new',
  `--user-data-dir=${userProfile}`,
  '--profile-directory=Default',
  '--dump-dom',
  targetUrl
];

execFile(chrome, args, { timeout: 15000 }, (err, stdout) => {
  if (err) return console.error('Error:', err.message);
  console.log('User profile length:', stdout ? stdout.length : 0);
  console.log('Blocked:', stdout.includes('Just a moment') || stdout.includes('challenge-platform'));
  const models = stdout ? (stdout.match(/\/models\/[0-9]+[a-zA-Z0-9_-]*/g) || []) : [];
  console.log('Found with real profile:', models.length, [...new Set(models)].slice(0, 10));
});
