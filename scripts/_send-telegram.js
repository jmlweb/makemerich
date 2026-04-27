#!/usr/bin/env node
/**
 * makemerich - Telegram notifier
 *
 * Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from ~/.secrets
 * (dotenv-style KEY=value file) and posts a message to Telegram.
 *
 * Usage:
 *   node scripts/_send-telegram.js "your message"
 *   echo "your message" | node scripts/_send-telegram.js
 *   node scripts/_send-telegram.js --dry-run "your message"
 *
 * Exit codes:
 *   0 success / dry-run
 *   1 missing token, empty message, or API failure
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const SECRETS_FILE = path.join(os.homedir(), '.secrets');
const DEFAULT_CHAT_ID = '159054208';
const DEFAULT_PARSE_MODE = 'Markdown';

const fail = (msg) => {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
};

const readSecrets = () => {
  if (!fs.existsSync(SECRETS_FILE)) return {};
  const text = fs.readFileSync(SECRETS_FILE, 'utf8');
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
};

const readStdin = async () =>
  new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });

const main = async () => {
  const args = process.argv.slice(2);
  let dryRun = false;
  let chatIdOverride = null;
  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--chat-id') chatIdOverride = args[++i];
    else if (arg.startsWith('--chat-id=')) chatIdOverride = arg.slice('--chat-id='.length);
    else positional.push(arg);
  }

  let message = positional.join(' ');
  if (!message && !process.stdin.isTTY) {
    message = (await readStdin()).trim();
  }
  if (!message) fail('Error: empty message (pass as argument or via stdin)');

  if (dryRun) {
    process.stdout.write(`${message}\n`);
    process.exit(0);
  }

  const secrets = readSecrets();
  const token = secrets.TELEGRAM_BOT_TOKEN;
  if (!token) fail('Error: TELEGRAM_BOT_TOKEN not found in ~/.secrets');
  const chatId = chatIdOverride || secrets.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: DEFAULT_PARSE_MODE,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    let detail = '';
    try {
      const data = await response.json();
      detail = data.description ? ` — ${data.description}` : '';
    } catch {
      // ignore
    }
    fail(`Telegram API error: ${response.status}${detail}`);
  }
};

main().catch((err) => fail(`send-telegram failed: ${err && err.message ? err.message : err}`));
