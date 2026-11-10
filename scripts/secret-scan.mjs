/**
 * Local secret/path scan used by npm run verify and CI.
 * Prints only file, line and rule name; never prints the matched value.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', 'node_modules', 'exports', 'test-output']);
const MAX_BYTES = 1024 * 1024;
const RULES = [
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ['github-pat', /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g],
  ['gitlab-token', /\bglpat-[A-Za-z0-9_-]{20,}\b/g],
  ['npm-token', /\bnpm_[A-Za-z0-9]{30,}\b/g],
  ['openai-key', /\bsk-[A-Za-z0-9]{20,}\b/g],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ['windows-user-path', /\b[A-Za-z]:\\Users\\[^\\\s]+/g],
];

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
      continue;
    }
    if (!entry.isFile()) continue;
    await scan(absolute);
  }
}

async function scan(file) {
  const stat = await fs.stat(file);
  if (stat.size > MAX_BYTES) return;
  const buffer = await fs.readFile(file);
  if (buffer.includes(0)) return;
  const text = buffer.toString('utf8');
  if (!text.isWellFormed()) return;
  const lines = text.split(/\r?\n/);
  for (const [rule, expression] of RULES) {
    for (let index = 0; index < lines.length; index += 1) {
      expression.lastIndex = 0;
      if (expression.test(lines[index])) {
        findings.push(`${path.relative(ROOT, file)}:${index + 1}: ${rule}`);
      }
    }
  }
}

const findings = [];
await walk(ROOT);
if (findings.length > 0) {
  console.error('secret scan failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log('secret scan passed');
}
