const fs = require('node:fs'), {execFileSync} = require('node:child_process');

function has(command) {
  try {
    execFileSync('which', [command], {stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
}

function findChrome() {
  const candidates = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', 'google-chrome', 'chromium', 'chromium-browser'];
  return candidates.find(c => c.startsWith('/') ? fs.existsSync(c) : has(c));
}

module.exports = {has, findChrome};
