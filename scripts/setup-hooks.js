#!/usr/bin/env node
/**
 * Setup git hooks for MakeMeRich
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HOOKS_SRC = path.join(ROOT, 'hooks');
const HOOKS_DST = path.join(ROOT, '.git', 'hooks');

if (!fs.existsSync(HOOKS_DST)) {
  console.error('Not a git repository');
  process.exit(1);
}

for (const hook of fs.readdirSync(HOOKS_SRC)) {
  const src = path.join(HOOKS_SRC, hook);
  const dst = path.join(HOOKS_DST, hook);
  fs.copyFileSync(src, dst);
  fs.chmodSync(dst, 0o755);
  console.log(`✅ Installed ${hook}`);
}
