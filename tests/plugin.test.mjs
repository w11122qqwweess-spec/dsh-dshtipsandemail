import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { apply } from '../index.js';

const SESSION = 'session-11111111-1111-1111-1111-111111111111';

async function makeContext(root) {
  const tools = new Map();
  const routes = new Map();
  const created = [];
  const prompts = [];
  const sections = [];
  const unarchived = [];
  const archived = [];
  const wakeups = [];
  const ctx = {
    systemPrompt: {
      section(section) {
        sections.push(section);
        return () => {};
      },
    },
    tools: {
      register(definition) {
        tools.set(definition.name, definition);
        return () => tools.delete(definition.name);
      },
    },
    connection: {
      fetch: {
        register(route) {
          routes.set(route.path, route);
          return async () => {};
        },
      },
    },
    sessionController: {
      async inspect() {
        return { meta: { cwd: root } };
      },
      async create(options) {
        created.push(options);
        return { sessionId: 'session-from-mail' };
      },
      async prompt(request) {
        prompts.push(request);
      },
    },
    workingDirectory: {
      defaultDirectory: root,
    },
    get(name) {
      if (name === 'agents') {
        return {
          list: () => [{ id: 'session-11111111-1111-1111-1111-111111111111' }, { id: '22222222-2222-2222-2222-222222222222' }],
          get: (id) => id === '22222222-2222-2222-2222-222222222222'
            ? { id, followup: (message) => { wakeups.push({ id, message }); } }
            : undefined,
        };
      }
      if (name === 'workspaceRegistry') {
        return {
          resolveByPath: async () => ({ id: 'workspace-test' }),
          list: () => [{ id: 'workspace-test', title: 'leidian', path: 'E:\leidian' }],
          unarchiveSession: async (id) => { unarchived.push(id); },
          archiveSession: async (id) => { archived.push(id); },
        };
      }
      return undefined;
    },
    effect(fn) {
      fn();
    },
  };
  apply(ctx);
  return { tools, routes, created, prompts, sections, unarchived, archived, wakeups };
}

function request(body) {
  return new Request('http://127.0.0.1:50833/api/dshtipsandemail/action', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dshtipsandemail': '1',
      origin: 'http://127.0.0.1:50833',
    },
    body: JSON.stringify(body),
  });
}

test('registers twelve tools and three authenticated routes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, routes } = await makeContext(root);
  assert.deepEqual([...tools.keys()].sort(), [
    'dshtips_archive',
    'dshtips_attach',
    'dshtips_directory',
    'dshtips_download',
    'dshtips_list',
    'dshtips_mail_list',
    'dshtips_mail_read',
    'dshtips_mail_reply',
    'dshtips_mail_send',
    'dshtips_post',
    'dshtips_reply',
    'dshtips_tip',
  ]);
  assert.deepEqual([...routes.keys()].sort(), [
    '/api/dshtipsandemail/action',
    '/api/dshtipsandemail/attachment',
    '/api/dshtipsandemail/state',
  ]);
});

test('every Agent gets the task-tip policy in its system prompt', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { sections } = await makeContext(root);
  assert.equal(sections.length, 1);
  assert.match(sections[0].text, /dshtips_tip/);
  assert.match(sections[0].text, /exactly once/);
  assert.match(sections[0].text, /subject/);
  assert.match(sections[0].text, /publisher/);
  assert.match(sections[0].text, /body/);
  assert.match(sections[0].text, /focus/);
});

test('an Agent can submit one timed tip with subject, publisher, task, post and focus', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools } = await makeContext(root);
  const tip = await tools.get('dshtips_tip').execute(
    { subject: 'Threaded mail replies', publisher: 'session-abc', task: 'Threaded mail replies', body: 'A tip post that explains the thread model.', focus: 'Store replyTo and threadId so the UI can group replies.', tags: ['mail'] },
    { agent: { id: 'session-abc' } },
  );
  assert.equal(tip.ok, true);
  assert.equal(tip.subject, 'Threaded mail replies');
  assert.equal(tip.publisher, 'session-abc');
  assert.equal(tip.publisherSessionId, 'session-abc');
  assert.equal(tip.task, 'Threaded mail replies');
  assert.equal(tip.body, 'A tip post that explains the thread model.');
  assert.equal(tip.focus, 'Store replyTo and threadId so the UI can group replies.');
  assert.equal(tip.author, 'session-abc');
  assert.ok(Number.isFinite(tip.createdAt));
  await tools.get('dshtips_post').execute({ title: 'Plain post', body: 'Not a tip' });
  const list = await tools.get('dshtips_list').execute({ query: 'replyTo', kind: 'tip', publisher: 'session-abc' });
  assert.equal(list.posts.length, 1);
  assert.equal(list.posts[0].kind, 'tip');
  assert.equal(list.posts[0].subject, 'Threaded mail replies');
  assert.equal(list.posts[0].publisher, 'session-abc');
  assert.equal(list.posts[0].publisherSessionId, 'session-abc');
  assert.equal(list.posts[0].body, 'A tip post that explains the thread model.');
  assert.equal(list.posts[0].task, 'Threaded mail replies');
  assert.equal(list.posts[0].focus, 'Store replyTo and threadId so the UI can group replies.');
});

test('agents can post, reply, send and read', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools } = await makeContext(root);
  const post = await tools.get('dshtips_post').execute({ title: 'Hello', body: 'World', tags: ['test'] });
  assert.equal(post.title, 'Hello');
  const list = await tools.get('dshtips_list').execute({ query: 'hello' });
  assert.equal(list.posts.length, 1);
  await tools.get('dshtips_reply').execute({ postId: post.id, body: 'A reply' });
  const mail = await tools.get('dshtips_mail_send').execute({ subject: 'Task', body: 'Please handle this' });
  const reply = await tools.get('dshtips_mail_reply').execute({ messageId: mail.id, body: 'A threaded reply' });
  assert.equal(reply.replyTo, mail.id);
  assert.equal(reply.threadId, mail.id);
  const inbox = await tools.get('dshtips_mail_list').execute({});
  assert.equal(inbox.messages.length, 2);
  const read = await tools.get('dshtips_mail_read').execute({ messageId: mail.id });
  assert.equal(read.subject, 'Task');
  const after = await tools.get('dshtips_mail_list').execute({ unreadOnly: true });
  assert.equal(after.messages.length, 1);
});

test('archive only accepts a Session started by this mailbox', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, archived } = await makeContext(root);
  await assert.rejects(() => tools.get('dshtips_archive').execute({ sessionId: 'session-unknown' }), /was not started/);
  const mail = await tools.get('dshtips_mail_send').execute({ to: SESSION, subject: 'Archive me', body: 'x', deliver: true });
  const result = await tools.get('dshtips_archive').execute({ sessionId: mail.sessionId });
  assert.equal(result.ok, true);
  assert.deepEqual(archived, [mail.sessionId]);
});

test('central attachment upload, mail metadata and download', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, routes } = await makeContext(root);
  const source = path.join(root, 'source.txt');
  await fs.writeFile(source, 'attachment body', 'utf8');
  const exec = { agent: { session: { header: { cwd: root } } } };
  const attached = await tools.get('dshtips_attach').execute({ file: 'source.txt', name: 'report.txt' }, exec);
  assert.match(attached.id, /^att-/);
  assert.equal(attached.name, 'report.txt');

  const mail = await tools.get('dshtips_mail_send').execute({
    to: SESSION,
    subject: 'With file',
    body: 'See attachment',
    deliver: true,
    attachmentIds: [attached.id],
  }, { agent: { session: { header: { cwd: root } } } });
  assert.equal(mail.attachments.length, 1);
  assert.equal(mail.attachments[0].id, attached.id);

  const read = await tools.get('dshtips_mail_read').execute({ messageId: mail.id });
  assert.equal(read.attachments[0].name, 'report.txt');
  const downloaded = await tools.get('dshtips_download').execute({ attachmentId: attached.id, path: 'got.txt' }, exec);
  assert.equal(await fs.readFile(downloaded.path, 'utf8'), 'attachment body');

  const upload = await routes.get('/api/dshtipsandemail/attachment').fetch(new Request('http://127.0.0.1:50833/api/dshtipsandemail/attachment', {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
      'x-dshtipsandemail': '1',
      'x-file-name': encodeURIComponent('http.txt'),
      origin: 'http://127.0.0.1:50833',
    },
    body: Buffer.from('http attachment'),
  }));
  assert.equal(upload.status, 200);
  const uploaded = await upload.json();
  const download = await routes.get('/api/dshtipsandemail/attachment').fetch(new Request(`http://127.0.0.1:50833/api/dshtipsandemail/attachment?id=${encodeURIComponent(uploaded.attachment.id)}`));
  assert.equal(download.status, 200);
  assert.equal(await download.text(), 'http attachment');
});

test('every live agent and subagent has a mailbox address', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools } = await makeContext(root);
  const directory = await tools.get('dshtips_directory').execute({});
  assert.deepEqual(directory.entries.map((entry) => entry.address), [
    'session-11111111-1111-1111-1111-111111111111',
    'subagent-22222222-2222-2222-2222-222222222222',
  ]);
  assert.deepEqual(directory.entries.map((entry) => entry.kind), ['main', 'subagent']);
});

test('mail can address a subagent mailbox without creating a Session', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, created, prompts, wakeups } = await makeContext(root);
  const mail = await tools.get('dshtips_mail_send').execute({
    to: 'subagent-22222222-2222-2222-2222-222222222222',
    subject: 'Subagent mail',
    body: 'Hello subagent',
    deliver: true,
  });
  assert.equal(mail.sessionId, '22222222-2222-2222-2222-222222222222');
  assert.equal(created.length, 0);
  assert.equal(prompts.length, 0);
  assert.equal(wakeups.length, 1);
  assert.match(wakeups[0].message.content[0].text, /NEW MAIL/);
});

test('mail_send rejects a workspace label but accepts an explicit session mailbox', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, created, prompts } = await makeContext(root);
  await assert.rejects(
    () => tools.get('dshtips_mail_send').execute({ to: 'leidian', subject: 'No', body: 'No', deliver: true }),
    /mailbox address/,
  );
  const mail = await tools.get('dshtips_mail_send').execute({
    to: SESSION,
    subject: '请回信',
    body: '这是给明确 Session 的测试邮件。',
    deliver: true,
  });
  assert.equal(mail.sessionId, SESSION);
  assert.equal(created.length, 0);
  assert.match(prompts[0].content[0].text, /\[NEW MAIL\]/);
});

test('targetSessionId reuses an existing agent instead of creating a Session', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, created, prompts, unarchived } = await makeContext(root);
  const mail = await tools.get('dshtips_mail_send').execute({
    to: 'leidian',
    subject: 'Follow-up',
    body: 'Continue the consultation.',
    deliver: true,
    targetSessionId: 'session-existing',
  });
  assert.equal(mail.sessionId, 'session-existing');
  assert.equal(created.length, 0);
  assert.equal(prompts[0].sessionId, 'session-existing');
  assert.deepEqual(unarchived, ['session-existing']);
});

test('a UI send uses the explicit session mailbox and never creates', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { routes, created, prompts } = await makeContext(root);
  const response = await routes.get('/api/dshtipsandemail/action').fetch(request({
    action: 'send',
    to: SESSION,
    subject: 'Handoff',
    body: 'Please take this over.',
    deliver: true,
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.sessionId, SESSION);
  assert.equal(created.length, 0);
  assert.equal(prompts.length, 1);
  assert.match(prompts[0].content[0].text, /\[NEW MAIL\]/);
  assert.equal(body.value.messages[0].startedSessionId, SESSION);
});

test('the UI action creates a threaded mail reply', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, routes } = await makeContext(root);
  const mail = await tools.get('dshtips_mail_send').execute({ subject: 'Thread me', body: 'Original' });
  const response = await routes.get('/api/dshtipsandemail/action').fetch(request({ action: 'replyMail', messageId: mail.id, body: 'Reply body' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.value.messages.length, 2);
  const reply = body.value.messages.find((message) => message.replyTo === mail.id);
  assert.equal(reply.threadId, mail.id);
  assert.equal(reply.subject, 'Re: Thread me');
});

test('the UI action starts a Session from a mail and records the id', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, routes, created, prompts } = await makeContext(root);
  const mail = await tools.get('dshtips_mail_send').execute({ to: SESSION, subject: 'Start me', body: 'Run the task' });
  const response = await routes.get('/api/dshtipsandemail/action').fetch(request({ action: 'start', messageId: mail.id }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.sessionId, SESSION);
  assert.equal(body.value.messages[0].startedSessionId, SESSION);
  assert.equal(created.length, 0);
  assert.equal(prompts.length, 1);
  assert.match(prompts[0].content[0].text, /Start me/);
  assert.match(prompts[0].content[0].text, /Run the task/);
  assert.match(prompts[0].content[0].text, /```text/);

  const again = await routes.get('/api/dshtipsandemail/action').fetch(request({ action: 'start', messageId: mail.id }));
  assert.equal(again.status, 200);
  assert.equal((await again.json()).sessionId, SESSION);
  assert.equal(created.length, 0, 'a repeated start must reuse the recorded Session');
  assert.equal(prompts.length, 1, 'a repeated start must not queue a second prompt');
});

test('state route is GET-only and action requires the custom header', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { routes } = await makeContext(root);
  const state = await routes.get('/api/dshtipsandemail/state').fetch(new Request('http://127.0.0.1:50833/api/dshtipsandemail/state'));
  assert.equal(state.status, 200);
  const wrong = await routes.get('/api/dshtipsandemail/action').fetch(new Request('http://127.0.0.1:50833/api/dshtipsandemail/action', { method: 'POST', body: '{}' }));
  assert.equal(wrong.status, 403);
});
