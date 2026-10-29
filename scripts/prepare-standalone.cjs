const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');
const source = path.join(root, '.next', 'static');
const target = path.join(standalone, '.next', 'static');

if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  throw new Error('Standalone Next.js build missing; run next build first.');
}
if (!fs.existsSync(source)) {
  throw new Error('Next.js static assets missing after build.');
}
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true, force: true });
const publicSource = path.join(root, 'public');
if (fs.existsSync(publicSource)) {
  fs.cpSync(publicSource, path.join(standalone, 'public'), { recursive: true, force: true });
}
console.log('[AdPanda] Standalone static assets copied successfully.');
