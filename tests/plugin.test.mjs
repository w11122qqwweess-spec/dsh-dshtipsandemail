import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { apply } from '../index.js';

async function makeContext(root) {
  const tools = new Map();
  const routes = new Map();
  const created = [];
  const prompts = [];
  const sections = [];
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
      if (name === 'workspaceRegistry') {
        return {
          resolveByPath: async () => ({ id: 'workspace-test' }),
          list: () => [{ id: 'workspace-test', title: 'leidian', path: 'E:\leidian' }],
        };
      }
      return undefined;
    },
    effect(fn) {
      fn();
    },
  };
  apply(ctx);
  return { tools, routes, created, prompts, sections };
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

test('registers eight tools and two authenticated routes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, routes } = await makeContext(root);
  assert.deepEqual([...tools.keys()].sort(), [
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

test('mail_send can deliver a NEW MAIL Session into the named workspace', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, created, prompts } = await makeContext(root);
  const mail = await tools.get('dshtips_mail_send').execute({
    to: 'leidian',
    subject: '请回信',
    body: '这是给 leidian 工作区 agent 的测试邮件。',
    deliver: true,
  });
  assert.equal(mail.sessionId, 'session-from-mail');
  assert.equal(created.length, 1);
  assert.equal(created[0].workspaceId, 'workspace-test');
  assert.match(prompts[0].content[0].text, /\[NEW MAIL\]/);
  assert.match(prompts[0].content[0].text, /leidian/);
});

test('targetSessionId reuses an existing agent instead of creating a Session', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { tools, created, prompts } = await makeContext(root);
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
});

test('a UI send starts a recipient Session with a NEW MAIL notice', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dte-plugin-'));
  process.env.DSH_PROFILE_DIR = root;
  const { routes, created, prompts } = await makeContext(root);
  const response = await routes.get('/api/dshtipsandemail/action').fetch(request({
    action: 'send',
    to: '收信方',
    subject: 'Handoff',
    body: 'Please take this over.',
    deliver: true,
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.sessionId, 'session-from-mail');
  assert.equal(created.length, 1);
  assert.equal(prompts.length, 1);
  assert.match(prompts[0].content[0].text, /\[NEW MAIL\]/);
  assert.equal(body.value.messages[0].startedSessionId, 'session-from-mail');
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
  const mail = await tools.get('dshtips_mail_send').execute({ subject: 'Start me', body: 'Run the task' });
  const response = await routes.get('/api/dshtipsandemail/action').fetch(request({ action: 'start', messageId: mail.id }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.sessionId, 'session-from-mail');
  assert.equal(body.value.messages[0].startedSessionId, 'session-from-mail');
  assert.equal(created.length, 1);
  assert.equal(created[0].workspaceId, 'workspace-test');
  assert.equal(prompts.length, 1);
  assert.match(prompts[0].content[0].text, /Start me/);
  assert.match(prompts[0].content[0].text, /Run the task/);
  assert.match(prompts[0].content[0].text, /```text/);

  const again = await routes.get('/api/dshtipsandemail/action').fetch(request({ action: 'start', messageId: mail.id }));
  assert.equal(again.status, 200);
  assert.equal((await again.json()).sessionId, 'session-from-mail');
  assert.equal(created.length, 1, 'a repeated start must reuse the recorded Session');
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
