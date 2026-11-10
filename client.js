window.__ModuleLoader__.load({
  id: 'dsh-dshtipsandemail',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useState } = React;

    const NS = 'dsh-dshtipsandemail';
    const DICT = {
      zh: {
        'app.title': 'DSH 贴吧与邮箱',
        'app.subtitle': '站内公告、讨论和邮件，所有 Session 共享',
        'tab.forum': '贴吧',
        'tab.mail': '邮箱',
        'status.live': '同步中',
        'status.offline': '离线',
        'btn.refresh': '刷新',
        'forum.new': '发帖',
        'forum.empty': '还没有帖子',
        'forum.emptyHint': '把发现、公告、问题或交接信息贴上来。',
        'forum.title': '标题',
        'forum.body': '正文',
        'forum.tags': '标签（逗号分隔，可选）',
        'forum.publish': '发布',
        'forum.cancel': '取消',
        'forum.reply': '回复',
        'forum.replyPlaceholder': '写回复…',
        'forum.replies': '{n} 条回复',
        'forum.by': '由 {author}',
        'forum.tip': 'TIP',
        'forum.publisher': '发布者',
        'forum.task': '具体任务',
        'forum.focus': '重点',
        'forum.post': '贴文',
        'forum.detailEmpty': '选择左侧帖子查看内容',
        'mail.new': '写邮件',
        'mail.empty': '邮箱是空的',
        'mail.emptyHint': '给自己或未来的 Session 留一封邮件。',
        'mail.to': '收件人',
        'mail.subject': '主题',
        'mail.body': '正文',
        'mail.send': '发送',
        'mail.cancel': '取消',
        'mail.from': '发件人',
        'mail.started': '已启动会话：{id}',
        'mail.start': '从这个邮件启动会话',
        'mail.detailEmpty': '选择左侧邮件查看内容',
        'mail.unread': '{n} 封未读',
        'mail.read': '标记已读',
        'mail.reply': '回复',
        'mail.replyPlaceholder': '写回复…',
        'mail.thread': '同一线程',
        'mail.deliver': '发送后启动收信会话',
        'mail.replies': '{n} 条回复',
        'error.load': '读取失败：{message}',
        'error.action': '操作失败：{message}',
        'error.start': '启动会话失败：{message}',
        'aria.panel': 'DSH 贴吧与邮箱',
        'time.justNow': '刚刚',
      },
      en: {
        'app.title': 'DSH Board & Mail',
        'app.subtitle': 'Shared notes, discussions and mail across Sessions',
        'tab.forum': 'Board',
        'tab.mail': 'Mail',
        'status.live': 'Live',
        'status.offline': 'Offline',
        'btn.refresh': 'Refresh',
        'forum.new': 'New post',
        'forum.empty': 'No posts yet',
        'forum.emptyHint': 'Post findings, announcements, questions or handoffs.',
        'forum.title': 'Title',
        'forum.body': 'Body',
        'forum.tags': 'Tags (comma separated, optional)',
        'forum.publish': 'Publish',
        'forum.cancel': 'Cancel',
        'forum.reply': 'Reply',
        'forum.replyPlaceholder': 'Write a reply…',
        'forum.replies': '{n} replies',
        'forum.by': 'by {author}',
        'forum.tip': 'TIP',
        'forum.publisher': 'Publisher',
        'forum.task': 'Task',
        'forum.focus': 'Focus',
        'forum.post': 'Post',
        'forum.detailEmpty': 'Select a post to read it',
        'mail.new': 'Compose',
        'mail.empty': 'Mailbox is empty',
        'mail.emptyHint': 'Leave a note for yourself or a future Session.',
        'mail.to': 'To',
        'mail.subject': 'Subject',
        'mail.body': 'Body',
        'mail.send': 'Send',
        'mail.cancel': 'Cancel',
        'mail.from': 'From',
        'mail.started': 'Started Session: {id}',
        'mail.start': 'Start a Session from this mail',
        'mail.detailEmpty': 'Select a message to read it',
        'mail.unread': '{n} unread',
        'mail.read': 'Mark read',
        'mail.reply': 'Reply',
        'mail.replyPlaceholder': 'Write a reply…',
        'mail.thread': 'Thread',
        'mail.deliver': 'Start a recipient Session after sending',
        'mail.replies': '{n} replies',
        'error.load': 'Load failed: {message}',
        'error.action': 'Action failed: {message}',
        'error.start': 'Starting the Session failed: {message}',
        'aria.panel': 'DSH Board and Mail',
        'time.justNow': 'just now',
      },
    };

    const CSS = `
      .dte-panel { height: 100%; min-height: 0; display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-family: inherit; }
      .dte-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 24px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .dte-heading { min-width: 0; }
      .dte-title { margin: 0; font-size: 17px; font-weight: 650; line-height: 1.3; }
      .dte-subtitle { margin: 3px 0 0; font-size: 11px; color: var(--dsw-alias-label-secondary); }
      .dte-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      .dte-pill { font-size: 11px; color: var(--dsw-alias-label-secondary); border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px; padding: 4px 8px; }
      .dte-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 5px; background: var(--dsw-alias-state-success-primary); }
      .dte-dot.offline { background: var(--dsw-alias-state-error-primary); }
      .dte-tabs { display: flex; align-items: center; gap: 4px; padding: 8px 24px 0; }
      .dte-tab { appearance: none; border: 1px solid transparent; border-bottom: 2px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 13px; padding: 8px 10px; cursor: pointer; }
      .dte-tab.active { color: var(--dsw-alias-brand-primary); border-bottom-color: var(--dsw-alias-brand-primary); }
      .dte-tab:hover { color: var(--dsw-alias-label-primary); }
      .dte-main { flex: 1; min-height: 0; display: flex; gap: 0; border-top: 1px solid var(--dsw-alias-border-l1); }
      .dte-list { width: 330px; flex: none; overflow: auto; border-right: 1px solid var(--dsw-alias-border-l1); padding: 10px; }
      .dte-item { width: 100%; text-align: left; appearance: none; border: 1px solid transparent; background: transparent; color: inherit; border-radius: 8px; padding: 9px 10px; cursor: pointer; font: inherit; display: flex; flex-direction: column; gap: 3px; }
      .dte-item:hover { background: var(--dsw-alias-bg-layer-1); }
      .dte-item.selected { background: var(--dsw-alias-bg-layer-1); border-color: var(--dsw-alias-border-l2); }
      .dte-item-title { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dte-item-meta { font-size: 10px; color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dte-unread { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-brand-primary); margin-right: 5px; }
      .dte-detail { flex: 1; min-width: 0; overflow: auto; padding: 20px 26px; }
      .dte-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
      .dte-detail-title { margin: 0; font-size: 20px; line-height: 1.25; font-weight: 650; overflow-wrap: anywhere; }
      .dte-detail-meta { margin-top: 4px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
      .dte-body { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; line-height: 1.65; color: var(--dsw-alias-label-primary); }
      .dte-tags { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0 0; }
      .dte-tip-badge { display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: .08em; color: var(--dsw-alias-brand-primary); border: 1px solid var(--dsw-alias-brand-primary); border-radius: 4px; padding: 1px 4px; margin-right: 5px; }
      .dte-tip-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--dsw-alias-label-secondary); margin-top: 12px; }
      .dte-tip-value { font-size: 13px; line-height: 1.55; margin-top: 3px; overflow-wrap: anywhere; }
      .dte-tag { font-size: 10px; color: var(--dsw-alias-label-secondary); border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px; padding: 2px 7px; }
      .dte-thread { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
      .dte-thread-item { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: 9px; padding: 10px; }
      .dte-thread-item.current { border-color: var(--dsw-alias-border-l2); }
      .dte-thread-meta { font-size: 10px; color: var(--dsw-alias-label-secondary); margin-bottom: 5px; }
      .dte-reply-box { display: flex; flex-direction: column; gap: 7px; margin-top: 12px; }
      .dte-replies { margin-top: 20px; border-top: 1px solid var(--dsw-alias-border-l1); padding-top: 14px; display: flex; flex-direction: column; gap: 10px; }
      .dte-reply { border-left: 2px solid var(--dsw-alias-border-l2); padding-left: 10px; }
      .dte-reply-body { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; line-height: 1.55; margin-top: 3px; }
      .dte-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--dsw-alias-label-secondary); font-size: 12px; text-align: center; }
      .dte-empty strong { color: var(--dsw-alias-label-primary); font-size: 14px; }
      .dte-form { border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); border-radius: 10px; padding: 12px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 8px; }
      .dte-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
      .dte-input, .dte-textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l2); border-radius: 7px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; padding: 7px 8px; }
      .dte-textarea { min-height: 96px; resize: vertical; line-height: 1.5; }
      .dte-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .dte-check { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
      .dte-btn { appearance: none; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 11px; border-radius: 7px; padding: 6px 10px; cursor: pointer; }
      .dte-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-brand-primary); }
      .dte-btn.primary { color: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); }
      .dte-btn:disabled { opacity: .5; cursor: default; }
      .dte-alert { margin: 10px 24px 0; padding: 8px 10px; border: 1px solid var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); border-radius: 7px; font-size: 12px; }
      .dte-reply-form { display: flex; gap: 8px; margin-top: 4px; }
      .dte-reply-form .dte-input { flex: 1; }
      @media (max-width: 760px) {
        .dte-list { width: 44%; }
        .dte-detail { padding: 14px 16px; }
        .dte-header { padding: 14px 16px 10px; }
        .dte-tabs { padding: 6px 16px 0; }
      }
    `;

    function tFactory(ctx) {
      const translate = ctx.locale.bind(NS);
      return (key, params = {}) => {
        let text;
        try {
          text = translate(key, params);
        } catch {
          text = key;
        }
        if (typeof text !== 'string') text = key;
        return text.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? `{${name}}`));
      };
    }

    function Icon({ size, active }) {
      const color = active ? 'var(--dsw-alias-brand-primary)' : 'currentColor';
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { display: 'block' },
      },
        h('rect', { x: 3, y: 5, width: 18, height: 14, rx: 3 }),
        h('path', { d: 'M4 7l8 6 8-6' }),
        h('path', { d: 'M7 17h10' }),
      );
    }

    function formatTime(value) {
      if (!value) return '';
      try {
        return new Date(value).toLocaleString();
      } catch {
        return '';
      }
    }

    function Field({ label, children }) {
      return h('label', { className: 'dte-field' }, h('span', null, label), children);
    }

    function Composer({ t, onCancel, onSubmit, kind }) {
      const [title, setTitle] = useState('');
      const [body, setBody] = useState('');
      const [tags, setTags] = useState('');
      const [to, setTo] = useState('我');
      const [deliver, setDeliver] = useState(true);
      const isMail = kind === 'mail';
      return h('form', {
        className: 'dte-form',
        onSubmit: (event) => {
          event.preventDefault();
          onSubmit(isMail
            ? { action: 'send', to, subject: title, body, deliver }
            : { action: 'post', title, body, tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) });
        },
      },
        isMail ? h(Field, { label: t('mail.to') }, h('input', { className: 'dte-input', value: to, onChange: (e) => setTo(e.target.value), required: true })) : null,
        h(Field, { label: isMail ? t('mail.subject') : t('forum.title') },
          h('input', { className: 'dte-input', value: title, onChange: (e) => setTitle(e.target.value), required: true, maxLength: 200 })),
        !isMail ? h(Field, { label: t('forum.tags') },
          h('input', { className: 'dte-input', value: tags, onChange: (e) => setTags(e.target.value), maxLength: 200 })) : null,
        h(Field, { label: isMail ? t('mail.body') : t('forum.body') },
          h('textarea', { className: 'dte-textarea', value: body, onChange: (e) => setBody(e.target.value), required: true, maxLength: 20000 })),
        isMail ? h('label', { className: 'dte-check' }, h('input', { type: 'checkbox', checked: deliver, onChange: (e) => setDeliver(e.target.checked) }), t('mail.deliver')) : null,
        h('div', { className: 'dte-actions' },
          h('button', { type: 'submit', className: 'dte-btn primary' }, isMail ? t('mail.send') : t('forum.publish')),
          h('button', { type: 'button', className: 'dte-btn', onClick: onCancel }, t('forum.cancel')),
        ),
      );
    }

    function Forum({ t, data, selectedId, setSelectedId, busy, onAction, onError }) {
      const [compose, setCompose] = useState(false);
      const [reply, setReply] = useState('');
      const posts = data.posts || [];
      const selected = posts.find((post) => post.id === selectedId) || posts[0];
      useEffect(() => {
        if (!selectedId && posts[0]) setSelectedId(posts[0].id);
      }, [posts, selectedId, setSelectedId]);
      return h('div', { className: 'dte-main' },
        h('div', { className: 'dte-list' },
          h('div', { className: 'dte-actions', style: { padding: '2px 2px 8px' } },
            h('button', { type: 'button', className: 'dte-btn primary', onClick: () => setCompose((v) => !v) }, t('forum.new')),
          ),
          posts.length === 0 ? h('div', { className: 'dte-empty', style: { minHeight: 160 } }, h('strong', null, t('forum.empty')), h('span', null, t('forum.emptyHint'))) : null,
          posts.map((post) => h('button', {
            type: 'button',
            key: post.id,
            className: `dte-item${selected && selected.id === post.id ? ' selected' : ''}`,
            onClick: () => setSelectedId(post.id),
          },
            h('span', { className: 'dte-item-title' }, post.kind === 'tip' ? h('span', { className: 'dte-tip-badge' }, t('forum.tip')) : null, post.kind === 'tip' ? (post.subject || post.task || post.title) : post.title),
            h('span', { className: 'dte-item-meta' }, post.kind === 'tip' ? `${t('forum.publisher')}: ${post.publisher || post.author} · ${formatTime(post.createdAt)}` : `${t('forum.by', { author: post.author })} · ${t('forum.replies', { n: post.replies.length })}`),
          )),
        ),
        h('div', { className: 'dte-detail' },
          compose ? h(Composer, {
            t,
            kind: 'forum',
            onCancel: () => setCompose(false),
            onSubmit: async (payload) => {
              try {
                await onAction(payload);
                setCompose(false);
              } catch (error) {
                onError(error);
              }
            },
          }) : null,
          selected ? h(React.Fragment, null,
            h('div', { className: 'dte-detail-head' },
              h('div', null,
                h('h2', { className: 'dte-detail-title' }, selected.title),
                h('div', { className: 'dte-detail-meta' }, selected.kind === 'tip' ? `${t('forum.publisher')}: ${selected.publisher || selected.author} · ${formatTime(selected.createdAt)}` : `${t('forum.by', { author: selected.author })} · ${formatTime(selected.createdAt)}`),
                selected.tags.length > 0 ? h('div', { className: 'dte-tags' }, selected.tags.map((tag) => h('span', { className: 'dte-tag', key: tag }, `#${tag}`))) : null,
              ),
            ),
            selected.kind === 'tip' ? h(React.Fragment, null,
              h('div', { className: 'dte-tip-label' }, t('forum.publisher')),
              h('div', { className: 'dte-tip-value' }, selected.publisher || selected.author),
              h('div', { className: 'dte-tip-label' }, t('forum.task')),
              h('div', { className: 'dte-tip-value' }, selected.task || selected.title),
              h('div', { className: 'dte-tip-label' }, t('forum.focus')),
              h('div', { className: 'dte-tip-value' }, selected.focus || selected.body),
              h('div', { className: 'dte-tip-label' }, t('forum.post')),
              h('div', { className: 'dte-tip-value' }, selected.body),
            ) : h('div', { className: 'dte-body' }, selected.body),
            h('div', { className: 'dte-replies' },
              h('div', { className: 'dte-item-meta' }, t('forum.replies', { n: selected.replies.length })),
              selected.replies.map((entry) => h('div', { className: 'dte-reply', key: entry.id },
                h('div', { className: 'dte-item-meta' }, `${entry.author} · ${formatTime(entry.createdAt)}`),
                h('div', { className: 'dte-reply-body' }, entry.body),
              )),
              h('form', {
                className: 'dte-reply-form',
                onSubmit: async (event) => {
                  event.preventDefault();
                  if (reply.trim() === '') return;
                  try {
                    await onAction({ action: 'reply', postId: selected.id, body: reply });
                    setReply('');
                  } catch (error) {
                    onError(error);
                  }
                },
              },
                h('input', { className: 'dte-input', value: reply, onChange: (e) => setReply(e.target.value), placeholder: t('forum.replyPlaceholder'), disabled: busy }),
                h('button', { type: 'submit', className: 'dte-btn', disabled: busy }, t('forum.reply')),
              ),
            ),
          ) : h('div', { className: 'dte-empty' }, h('strong', null, t('forum.empty')), h('span', null, t('forum.emptyHint'))),
        ),
      );
    }

    function Mail({ t, data, selectedId, setSelectedId, busy, onAction, onStart, onError }) {
      const [compose, setCompose] = useState(false);
      const [reply, setReply] = useState('');
      const messages = data.messages || [];
      const selected = messages.find((message) => message.id === selectedId) || messages[0];
      const threadRoot = selected ? (selected.threadId || selected.id) : null;
      const thread = selected
        ? messages
          .filter((message) => message.id === threadRoot || message.threadId === threadRoot || message.replyTo === threadRoot)
          .slice()
          .sort((a, b) => a.createdAt - b.createdAt)
        : [];
      useEffect(() => {
        if (!selectedId && messages[0]) setSelectedId(messages[0].id);
      }, [messages, selectedId, setSelectedId]);
      return h('div', { className: 'dte-main' },
        h('div', { className: 'dte-list' },
          h('div', { className: 'dte-actions', style: { padding: '2px 2px 8px' } },
            h('button', { type: 'button', className: 'dte-btn primary', onClick: () => setCompose((v) => !v) }, t('mail.new')),
          ),
          messages.length === 0 ? h('div', { className: 'dte-empty', style: { minHeight: 160 } }, h('strong', null, t('mail.empty')), h('span', null, t('mail.emptyHint'))) : null,
          messages.map((message) => h('button', {
            type: 'button',
            key: message.id,
            className: `dte-item${selected && selected.id === message.id ? ' selected' : ''}`,
            onClick: () => {
              setSelectedId(message.id);
              if (!message.read) onAction({ action: 'read', messageId: message.id }).catch(onError);
            },
          },
            h('span', { className: 'dte-item-title' }, !message.read ? h('span', { className: 'dte-unread' }) : null, message.subject),
            h('span', { className: 'dte-item-meta' }, `${message.from} → ${message.to} · ${formatTime(message.createdAt)}`),
          )),
        ),
        h('div', { className: 'dte-detail' },
          compose ? h(Composer, {
            t,
            kind: 'mail',
            onCancel: () => setCompose(false),
            onSubmit: async (payload) => {
              try {
                await onAction(payload);
                setCompose(false);
              } catch (error) {
                onError(error);
              }
            },
          }) : null,
          selected ? h(React.Fragment, null,
            h('div', { className: 'dte-detail-head' },
              h('div', null,
                h('h2', { className: 'dte-detail-title' }, selected.subject),
                h('div', { className: 'dte-detail-meta' }, `${t('mail.from')}: ${selected.from} · ${t('mail.to')}: ${selected.to} · ${formatTime(selected.createdAt)}`),
              ),
              h('div', { className: 'dte-actions' },
                h('button', { type: 'button', className: 'dte-btn', disabled: busy || selected.read, onClick: () => onAction({ action: 'read', messageId: selected.id }).catch(onError) }, t('mail.read')),
                h('button', { type: 'button', className: 'dte-btn primary', disabled: busy || Boolean(selected.startedSessionId), onClick: () => onStart(selected.id).catch(onError) }, selected.startedSessionId ? t('mail.started', { id: selected.startedSessionId }) : t('mail.start')),
              ),
            ),
            h('div', { className: 'dte-thread' },
              thread.map((message) => h('div', { className: `dte-thread-item${selected.id === message.id ? ' current' : ''}`, key: message.id },
                h('div', { className: 'dte-thread-meta' }, `${message.from} → ${message.to} · ${formatTime(message.createdAt)}`),
                h('div', { className: 'dte-body' }, message.body),
              )),
              thread.length > 1 ? h('div', { className: 'dte-item-meta' }, t('mail.replies', { n: thread.length - 1 })) : null,
            ),
            h('form', {
              className: 'dte-reply-box',
              onSubmit: async (event) => {
                event.preventDefault();
                if (reply.trim() === '') return;
                try {
                  await onAction({ action: 'replyMail', messageId: selected.id, body: reply });
                  setReply('');
                } catch (error) {
                  onError(error);
                }
              },
            },
              h('textarea', { className: 'dte-textarea', value: reply, onChange: (e) => setReply(e.target.value), placeholder: t('mail.replyPlaceholder'), disabled: busy, maxLength: 20000 }),
              h('div', { className: 'dte-actions' },
                h('button', { type: 'submit', className: 'dte-btn primary', disabled: busy || reply.trim() === '' }, t('mail.reply')),
              ),
            ),
          ) : h('div', { className: 'dte-empty' }, h('strong', null, t('mail.empty')), h('span', null, t('mail.emptyHint'))),
        ),
      );
    }

    function PanelSession(props) {
      if (typeof props.useSessions !== 'function') return h(Panel, { ...props, currentSessionId: null });
      return h(PanelBound, props);
    }

    function PanelBound({ useSessions, ...props }) {
      const snapshot = useSessions((value) => value);
      return h(Panel, { ...props, currentSessionId: snapshot?.current ?? null });
    }

    function Panel({ ctx, currentSessionId }) {
      const t = useMemo(() => tFactory(ctx), [ctx]);
      const [tab, setTab] = useState('forum');
      const [data, setData] = useState(null);
      const [selectedPost, setSelectedPost] = useState('');
      const [selectedMail, setSelectedMail] = useState('');
      const [error, setError] = useState('');
      const [online, setOnline] = useState(true);
      const [busy, setBusy] = useState(false);

      const load = useCallback(async () => {
        try {
          const response = await fetch('api/dshtipsandemail/state', { cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const body = await response.json();
          if (!body || body.ok !== true) throw new Error('invalid state');
          setData(body.value);
          setOnline(true);
          setError('');
        } catch (loadError) {
          setOnline(false);
          setError(t('error.load', { message: loadError instanceof Error ? loadError.message : String(loadError) }));
        }
      }, [t]);

      useEffect(() => {
        let alive = true;
        const tick = () => {
          if (alive) void load();
        };
        tick();
        const timer = setInterval(tick, 1500);
        return () => {
          alive = false;
          clearInterval(timer);
        };
      }, [load]);

      const openSession = useCallback((sessionId) => {
        if (typeof sessionId !== 'string' || sessionId === '') return;
        const workspace = ctx.get?.('uiWorkspace');
        if (!workspace || typeof workspace.openSession !== 'function') return;
        const open = (attempt = 0) => {
          try {
            workspace.openSession(sessionId);
          } catch {
            if (attempt < 5) window.setTimeout(() => open(attempt + 1), 300);
          }
        };
        open();
      }, [ctx]);

      const action = useCallback(async (payload) => {
        setBusy(true);
        setError('');
        try {
          const response = await fetch('api/dshtipsandemail/action', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-dshtipsandemail': '1',
            },
            body: JSON.stringify(payload),
          });
          const body = await response.json().catch(() => null);
          if (!response.ok || !body || body.ok !== true) {
            throw new Error((body && body.message) || `HTTP ${response.status}`);
          }
          if (body.value) setData(body.value);
          if (typeof body.sessionId === 'string') openSession(body.sessionId);
          return body;
        } catch (actionError) {
          const message = t('error.action', { message: actionError instanceof Error ? actionError.message : String(actionError) });
          setError(message);
          throw new Error(message);
        } finally {
          setBusy(false);
        }
      }, [openSession, t]);

      const start = useCallback(async (messageId) => {
        setBusy(true);
        setError('');
        try {
          const response = await fetch('api/dshtipsandemail/action', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-dshtipsandemail': '1',
            },
            body: JSON.stringify({ action: 'start', messageId, ...(currentSessionId ? { sessionId: currentSessionId } : {}) }),
          });
          const body = await response.json().catch(() => null);
          if (!response.ok || !body || body.ok !== true || typeof body.sessionId !== 'string') {
            throw new Error((body && body.message) || `HTTP ${response.status}`);
          }
          if (body.value) setData(body.value);
          openSession(body.sessionId);
          return body;
        } catch (startError) {
          const message = t('error.start', { message: startError instanceof Error ? startError.message : String(startError) });
          setError(message);
          throw new Error(message);
        } finally {
          setBusy(false);
        }
      }, [currentSessionId, openSession, t]);

      if (!data) {
        return h('div', { className: 'dte-panel' },
          h('style', null, CSS),
          h('div', { className: 'dte-empty' }, h('strong', null, t('app.title')), h('span', null, t('app.subtitle'))),
        );
      }

      const unread = data.stats?.unread ?? 0;
      return h('div', { className: 'dte-panel' },
        h('style', null, CSS),
        h('header', { className: 'dte-header' },
          h('div', { className: 'dte-heading' },
            h('h1', { className: 'dte-title' }, t('app.title')),
            h('p', { className: 'dte-subtitle' }, t('app.subtitle')),
          ),
          h('div', { className: 'dte-header-right' },
            h('span', { className: 'dte-pill' }, h('span', { className: `dte-dot${online ? '' : ' offline'}` }), online ? t('status.live') : t('status.offline')),
            h('span', { className: 'dte-pill' }, t('mail.unread', { n: unread })),
            h('button', { type: 'button', className: 'dte-btn', onClick: () => void load(), disabled: busy }, t('btn.refresh')),
          ),
        ),
        h('div', { className: 'dte-tabs' },
          h('button', { type: 'button', className: `dte-tab${tab === 'forum' ? ' active' : ''}`, onClick: () => setTab('forum') }, `${t('tab.forum')} ${data.stats?.posts ?? 0}`),
          h('button', { type: 'button', className: `dte-tab${tab === 'mail' ? ' active' : ''}`, onClick: () => setTab('mail') }, `${t('tab.mail')} ${unread > 0 ? `(${unread})` : ''}`),
        ),
        error ? h('div', { className: 'dte-alert', role: 'alert' }, error) : null,
        tab === 'forum'
          ? h(Forum, { t, data, selectedId: selectedPost, setSelectedId: setSelectedPost, busy, onAction: action, onError: () => {} })
          : h(Mail, { t, data, selectedId: selectedMail, setSelectedId: setSelectedMail, busy, onAction: action, onStart: start, onError: () => {} }),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = tFactory(ctx);
        ctx.effect(() => {
          const disposers = [
            ctx.locale.register(NS, 'zh', DICT.zh),
            ctx.locale.register(NS, 'en', DICT.en),
          ];
          return () => {
            for (const dispose of disposers) dispose();
          };
        });
        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'dshtipsandemail',
          order: 35,
          label: () => t('app.title'),
        }, Icon)));
        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'dshtipsandemail',
        }, (props) => h(PanelSession, { ...props, ctx }))));
      },
    };
  },
});
