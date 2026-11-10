/**
 * Profile-local forum and mailbox storage for dsh-dshtipsandemail.
 *
 * One JSON file under the DSH profile keeps the board and inbox shared across
 * Sessions and workspaces. Writes are atomic (temp file + rename) and the
 * state is validated and bounded before use.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

export const STATE_VERSION = 1;
export const MAX_POSTS = 500;
export const MAX_MESSAGES = 500;
export const MAX_TITLE = 200;
export const MAX_BODY = 20000;
export const MAX_TAGS = 8;
export const MAX_FILE_BYTES = 16 * 1024 * 1024;

export function dataFilePath() {
  const profileDir = process.env.DSH_PROFILE_DIR
    || path.join(os.homedir(), '.dsh', 'profiles', process.env.DSH_PROFILE || 'desktop');
  return path.join(profileDir, 'dsh-dshtipsandemail', 'state.json');
}

function text(value, name, max, required = true) {
  if (typeof value !== 'string') {
    if (required) throw new Error(`${name} must be a string`);
    return '';
  }
  const out = value.trim();
  if (required && out.length === 0) throw new Error(`${name} must not be empty`);
  if (out.length > max) throw new Error(`${name} must be at most ${max} characters`);
  return out;
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function tags(value) {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : String(value).split(/[,，]/);
  const out = [];
  for (const entry of list) {
    const tag = String(entry).trim().replace(/^#/, '');
    if (tag === '') continue;
    if (tag.length > 32) throw new Error('tag must be at most 32 characters');
    if (!out.includes(tag)) out.push(tag);
    if (out.length > MAX_TAGS) throw new Error(`at most ${MAX_TAGS} tags are allowed`);
  }
  return out;
}

function emptyState() {
  return { version: STATE_VERSION, posts: [], messages: [], createdAt: Date.now(), updatedAt: Date.now() };
}

function normalizeState(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('state must be an object');
  if (raw.version !== STATE_VERSION) throw new Error('unsupported state version');
  if (!Array.isArray(raw.posts) || !Array.isArray(raw.messages)) throw new Error('state tables are missing');
  const posts = raw.posts.slice(0, MAX_POSTS).filter((post) => post && typeof post === 'object' && typeof post.id === 'string' && typeof post.title === 'string' && typeof post.body === 'string').map((post) => ({
    ...post,
    tags: Array.isArray(post.tags) ? post.tags.filter((tag) => typeof tag === 'string').slice(0, MAX_TAGS) : [],
    author: typeof post.author === 'string' ? post.author : 'DSH',
    kind: post.kind === 'tip' ? 'tip' : 'post',
    subject: typeof post.subject === 'string' ? post.subject : (post.kind === 'tip' ? (post.task || post.title) : post.subject ?? null),
    publisher: typeof post.publisher === 'string' ? post.publisher : (post.kind === 'tip' ? (post.author || 'DSH') : post.publisher ?? null),
    publisherSessionId: typeof post.publisherSessionId === 'string' ? post.publisherSessionId : (post.kind === 'tip' && typeof post.author === 'string' && post.author.startsWith('session-') ? post.author : null),
    createdAt: Number.isFinite(post.createdAt) ? post.createdAt : Date.now(),
    replies: Array.isArray(post.replies)
      ? post.replies.filter((reply) => reply && typeof reply === 'object' && typeof reply.body === 'string').map((reply) => ({
        ...reply,
        id: typeof reply.id === 'string' ? reply.id : id('r'),
        author: typeof reply.author === 'string' ? reply.author : 'DSH',
        body: reply.body,
        createdAt: Number.isFinite(reply.createdAt) ? reply.createdAt : Date.now(),
      })).slice(-200)
      : [],
  }));
  const messages = raw.messages.slice(0, MAX_MESSAGES).filter((message) => message && typeof message === 'object' && typeof message.id === 'string' && typeof message.subject === 'string' && typeof message.body === 'string').map((message) => ({
    ...message,
    from: typeof message.from === 'string' ? message.from : 'DSH',
    to: typeof message.to === 'string' ? message.to : '我',
    createdAt: Number.isFinite(message.createdAt) ? message.createdAt : Date.now(),
    read: message.read === true,
    startedSessionId: typeof message.startedSessionId === 'string' ? message.startedSessionId : null,
    replyTo: typeof message.replyTo === 'string' ? message.replyTo : null,
    threadId: typeof message.threadId === 'string' ? message.threadId : null,
  }));
  return { version: STATE_VERSION, posts, messages, createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(), updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now() };
}

export class TipsAndEmailStore {
  constructor(file = dataFilePath(), { maxFileBytes = MAX_FILE_BYTES } = {}) {
    this.file = file;
    this.maxFileBytes = maxFileBytes;
    this.error = '';
    this.state = this.#load();
  }

  #load() {
    try {
      if (!fs.existsSync(this.file)) return emptyState();
      const stat = fs.statSync(this.file);
      if (stat.size > this.maxFileBytes) throw new Error('state file is too large');
      const textValue = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(textValue);
      const normalized = normalizeState(parsed);
      if (normalized.posts.some((post) => post.kind === 'tip' && (!post.subject || !post.publisher || !post.publisherSessionId))) {
        this.state = normalized;
        try {
          this.#persist();
        } catch {
          // Keep the normalized state in memory even if the migration write fails.
        }
      }
      return normalized;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'state could not be loaded';
      try {
        if (fs.existsSync(this.file)) {
          fs.renameSync(this.file, `${this.file}.corrupt-${Date.now()}`);
        }
      } catch {
        // Keep the original file if the backup move fails; the empty state is still usable.
      }
      return emptyState();
    }
  }

  #persist() {
    this.state.updatedAt = Date.now();
    const payload = `${JSON.stringify(this.state, null, 2)}\n`;
    if (Buffer.byteLength(payload, 'utf8') > this.maxFileBytes) {
      throw new Error('state is too large; delete older entries before adding more');
    }
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp-${process.pid}-${randomUUID()}`;
    fs.writeFileSync(temp, payload, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temp, this.file);
  }

  #commit() {
    try {
      this.#persist();
    } catch (error) {
      this.state = this.#load();
      throw error;
    }
    return this.snapshot();
  }

  snapshot() {
    const posts = this.state.posts.slice().sort((a, b) => b.createdAt - a.createdAt);
    const messages = this.state.messages.slice().sort((a, b) => b.createdAt - a.createdAt);
    return {
      version: this.state.version,
      posts,
      messages,
      stats: {
        posts: posts.length,
        replies: posts.reduce((sum, post) => sum + post.replies.length, 0),
        messages: messages.length,
        unread: messages.filter((message) => !message.read).length,
      },
      ...(this.error ? { warning: this.error } : {}),
      updatedAt: this.state.updatedAt,
    };
  }

  post({ title, body, tags: tagInput, author = 'DSH', kind = 'post', subject = null, publisher = null, publisherSessionId = null, task = null, focus = null }) {
    const post = {
      id: id('p'),
      title: text(title, 'title', MAX_TITLE),
      body: text(body, 'body', MAX_BODY),
      tags: tags(tagInput),
      author: text(author, 'author', 80, false) || 'DSH',
      createdAt: Date.now(),
      kind: kind === 'tip' ? 'tip' : 'post',
      subject: typeof subject === 'string' ? subject : null,
      publisher: typeof publisher === 'string' ? publisher : null,
      publisherSessionId: typeof publisherSessionId === 'string' ? publisherSessionId : null,
      task: typeof task === 'string' ? task : null,
      focus: typeof focus === 'string' ? focus : null,
      replies: [],
    };
    this.state.posts.unshift(post);
    if (this.state.posts.length > MAX_POSTS) this.state.posts.length = MAX_POSTS;
    this.#commit();
    return post;
  }

  reply({ postId, body, author = 'DSH' }) {
    const post = this.state.posts.find((entry) => entry.id === postId);
    if (!post) throw new Error('post not found');
    const reply = {
      id: id('r'),
      body: text(body, 'body', MAX_BODY),
      author: text(author, 'author', 80, false) || 'DSH',
      createdAt: Date.now(),
    };
    post.replies.push(reply);
    if (post.replies.length > 200) post.replies.splice(0, post.replies.length - 200);
    this.#commit();
    return reply;
  }

  send({ to = '我', subject, body, from = 'DSH' }) {
    const message = {
      id: id('m'),
      to: text(to, 'to', 120, false) || '我',
      from: text(from, 'from', 80, false) || 'DSH',
      subject: text(subject, 'subject', MAX_TITLE),
      body: text(body, 'body', MAX_BODY),
      createdAt: Date.now(),
      read: false,
      startedSessionId: null,
      replyTo: null,
      threadId: null,
    };
    this.state.messages.unshift(message);
    if (this.state.messages.length > MAX_MESSAGES) this.state.messages.length = MAX_MESSAGES;
    this.#commit();
    return message;
  }

  replyMail({ messageId, body, from = '我' }) {
    const original = this.state.messages.find((entry) => entry.id === messageId);
    if (!original) throw new Error('message not found');
    const subject = /^re:\s*/i.test(original.subject) ? original.subject : `Re: ${original.subject}`;
    const reply = {
      id: id('m'),
      to: original.from,
      from: text(from, 'from', 80, false) || '我',
      subject,
      body: text(body, 'body', MAX_BODY),
      createdAt: Date.now(),
      read: false,
      startedSessionId: null,
      replyTo: original.id,
      threadId: original.threadId ?? original.id,
    };
    this.state.messages.unshift(reply);
    if (this.state.messages.length > MAX_MESSAGES) this.state.messages.length = MAX_MESSAGES;
    this.#commit();
    return reply;
  }

  markRead(messageId, read = true) {
    const message = this.state.messages.find((entry) => entry.id === messageId);
    if (!message) throw new Error('message not found');
    message.read = Boolean(read);
    this.#commit();
    return message;
  }

  markStarted(messageId, sessionId) {
    const message = this.state.messages.find((entry) => entry.id === messageId);
    if (!message) throw new Error('message not found');
    message.startedSessionId = sessionId;
    message.read = true;
    this.#commit();
    return message;
  }
}
