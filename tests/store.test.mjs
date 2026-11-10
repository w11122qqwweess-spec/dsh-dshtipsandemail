import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { TipsAndEmailStore } from '../lib/store.js';

async function tempFile() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-store-'));
  return path.join(dir, 'state.json');
}

test('posts, replies, mails and persists across reload', async () => {
  const file = await tempFile();
  const store = new TipsAndEmailStore(file);
  const post = store.post({ title: 'Finding', body: 'A durable note.', tags: ['dsh', 'note'] });
  assert.equal(post.title, 'Finding');
  store.reply({ postId: post.id, body: 'Reply body' });
  const mail = store.send({ subject: 'Hello', body: 'Mail body', to: 'me' });
  const reply = store.replyMail({ messageId: mail.id, body: 'Threaded answer', from: 'me' });
  assert.equal(reply.replyTo, mail.id);
  assert.equal(reply.threadId, mail.id);
  assert.equal(reply.subject, 'Re: Hello');
  assert.equal(mail.read, false);

  const snapshot = store.snapshot();
  assert.equal(snapshot.stats.posts, 1);
  assert.equal(snapshot.stats.replies, 1);
  assert.equal(snapshot.stats.messages, 2);
  assert.equal(snapshot.stats.unread, 2);

  const reloaded = new TipsAndEmailStore(file);
  const again = reloaded.snapshot();
  assert.equal(again.posts[0].title, 'Finding');
  assert.equal(again.posts[0].replies[0].body, 'Reply body');
  assert.equal(again.messages[0].subject, 'Re: Hello');
  assert.equal(again.stats.unread, 2);
});

test('marks mail read and started idempotently at the storage layer', async () => {
  const file = await tempFile();
  const store = new TipsAndEmailStore(file);
  const mail = store.send({ subject: 'Task', body: 'Do it' });
  const read = store.markRead(mail.id, true);
  assert.equal(read.read, true);
  const started = store.markStarted(mail.id, 'session-123');
  assert.equal(started.startedSessionId, 'session-123');
  const snapshot = store.snapshot();
  assert.equal(snapshot.stats.unread, 0);
  assert.equal(snapshot.messages[0].startedSessionId, 'session-123');
});

test('rejects empty, oversized and malformed input', async () => {
  const file = await tempFile();
  const store = new TipsAndEmailStore(file);
  assert.throws(() => store.post({ title: '', body: 'x' }), /title/);
  assert.throws(() => store.post({ title: 'x', body: '' }), /body/);
  assert.throws(() => store.post({ title: 'x', body: 'x'.repeat(20001) }), /body/);
  assert.throws(() => store.reply({ postId: 'missing', body: 'x' }), /post not found/);
  assert.throws(() => store.markRead('missing'), /message not found/);
});

test('rejects a write that exceeds the state budget without losing the old file', async () => {
  const file = await tempFile();
  const store = new TipsAndEmailStore(file, { maxFileBytes: 300 });
  assert.throws(
    () => store.post({ title: 'too big', body: 'x'.repeat(1000) }),
    /too large/,
  );
  assert.equal(store.snapshot().posts.length, 0);
  assert.equal((await fs.stat(file).catch(() => null)), null);
});

test('normalizes a damaged entry instead of making the snapshot throw', async () => {
  const file = await tempFile();
  await fs.writeFile(file, JSON.stringify({
    version: 1,
    posts: [{ id: 'p-1', title: 'ok', body: 'body', tags: null, createdAt: 1 }],
    messages: [],
    createdAt: 1,
    updatedAt: 1,
  }), 'utf8');
  const store = new TipsAndEmailStore(file);
  const snapshot = store.snapshot();
  assert.equal(snapshot.posts.length, 1);
  assert.deepEqual(snapshot.posts[0].replies, []);
});

test('recovers from a corrupt state file without losing the bad copy', async () => {
  const file = await tempFile();
  await fs.writeFile(file, '{not json', 'utf8');
  const store = new TipsAndEmailStore(file);
  assert.ok(store.error);
  assert.equal(store.snapshot().stats.posts, 0);
  const entries = await fs.readdir(path.dirname(file));
  assert.ok(entries.some((name) => name.includes('.corrupt-')));
});
