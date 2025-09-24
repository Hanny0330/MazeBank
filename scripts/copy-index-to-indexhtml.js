const fs = require('fs');
const path = require('path');

const browserDir = path.join(__dirname, '..', 'dist', 'MazeBankProject', 'browser');
const src = path.join(browserDir, 'index.csr.html');
const dest = path.join(browserDir, 'index.html');

if (!fs.existsSync(browserDir)) {
  console.error('Browser folder not found:', browserDir);
  process.exit(1);
}

if (!fs.existsSync(src)) {
  console.error('Source index.csr.html not found at:', src);
  process.exit(1);
}

try {
  fs.copyFileSync(src, dest);
  console.log('Copied', src, '->', dest);
  process.exit(0);
} catch (e) {
  console.error('Failed to copy index:', e && e.message);
  process.exit(2);
}
