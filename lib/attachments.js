/**
 * Central attachment store for dsh-dshtipsandemail.
 *
 * Uploaded files live under the DSH profile, not the sender's or recipient's
 * workspace. Mail carries only metadata + an attachment id; every agent reads
 * the same copy from this store.
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MAIL = 5;
export const MAX_MAIL_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const ATTACHMENT_ID_RE = /^att-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeName(name) {
  const base = String(name ?? '').replaceAll('\\', '/').split('/').pop() ?? '';
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .trim()
    .replace(/^\.+$/, '');
  return (cleaned || 'attachment').slice(0, 120);
}

function safeType(type) {
  const value = String(type ?? '').trim();
  return /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(value) ? value : 'application/octet-stream';
}

export class AttachmentStore {
  constructor(root, { maxBytes = MAX_ATTACHMENT_BYTES } = {}) {
    this.root = root;
    this.maxBytes = maxBytes;
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  }

  put(buffer, name, type = 'application/octet-stream') {
    if (!Buffer.isBuffer(buffer)) throw new Error('attachment data must be a Buffer');
    if (buffer.length === 0) throw new Error('attachment must not be empty');
    if (buffer.length > this.maxBytes) throw new Error(`attachment must be at most ${this.maxBytes} bytes`);
    const id = `att-${randomUUID()}`;
    const dir = path.join(this.root, id);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const meta = {
      id,
      name: safeName(name),
      size: buffer.length,
      type: safeType(type),
      createdAt: Date.now(),
    };
    try {
      fs.writeFileSync(path.join(dir, 'payload'), buffer, { flag: 'wx', mode: 0o600 });
      fs.writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    } catch (error) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
      throw error;
    }
    return meta;
  }

  get(id) {
    if (!ATTACHMENT_ID_RE.test(String(id ?? ''))) throw new Error('invalid attachment id');
    const dir = path.join(this.root, String(id));
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    const buffer = fs.readFileSync(path.join(dir, 'payload'));
    if (buffer.length !== meta.size) throw new Error('attachment size mismatch');
    return { meta, buffer };
  }

  has(id) {
    try {
      return ATTACHMENT_ID_RE.test(String(id ?? '')) && fs.existsSync(path.join(this.root, String(id), 'meta.json'));
    } catch {
      return false;
    }
  }
}
