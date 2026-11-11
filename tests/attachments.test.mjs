import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { AttachmentStore } from '../lib/attachments.js';

async function tempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dte-att-'));
}

test('stores and reads an attachment from the central directory', async () => {
  const root = await tempRoot();
  const store = new AttachmentStore(root);
  const meta = store.put(Buffer.from('hello attachment'), 'notes.txt', 'text/plain');
  assert.match(meta.id, /^att-/);
  assert.equal(meta.name, 'notes.txt');
  assert.equal(meta.size, 16);
  const read = store.get(meta.id);
  assert.equal(read.buffer.toString(), 'hello attachment');
  assert.equal(read.meta.type, 'text/plain');
  assert.equal(await fs.readFile(path.join(root, meta.id, 'payload'), 'utf8'), 'hello attachment');
});

test('sanitizes names and rejects empty or oversized files', async () => {
  const root = await tempRoot();
  const store = new AttachmentStore(root, { maxBytes: 4 });
  const meta = store.put(Buffer.from('ok'), '../../secret.txt');
  assert.equal(meta.name, 'secret.txt');
  assert.throws(() => store.put(Buffer.alloc(0), 'empty'), /empty/);
  assert.throws(() => store.put(Buffer.from('12345'), 'big'), /at most/);
});

test('rejects malformed attachment ids', async () => {
  const root = await tempRoot();
  const store = new AttachmentStore(root);
  assert.throws(() => store.get('../../x'), /invalid attachment id/);
});
