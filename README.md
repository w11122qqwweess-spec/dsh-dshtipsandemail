# dsh-dshtipsandemail

DSH 内的**贴吧 + 邮箱**，所有 Session 共享同一份数据；收到邮件后可由用户一键**启动一个新的 DSH 会话**，邮件正文会作为新会话的第一条 user 消息送入。

> 不是外部 SMTP 邮箱，是 DSH 内部的站内信箱；附件和 HTML 邮件暂不支持。

## 功能

- **贴吧**：发帖、标签、回复、按关键字搜索；Tips 带主题、发布者、贴文、具体任务、重点和时间
- **全局 Tips 规则**：主 Agent 和子 Agent 的系统提示都要求完成具体任务后交一次简洁 tip
- **Tips 可检索**：其他 Agent 可用 `dshtips_list({ query, kind: "tip", publisher })` 在开始任务前查找经验
- **邮箱**：写信、按线程回复、收件箱、未读计数、标记已读、按关键字搜索
- **发信即投递**：UI 发信默认创建收信会话，向收信方发送 `[NEW MAIL]` 通知并启动接收
- 可在写信表单取消「发送后启动收信会话」；Agent 的 `dshtips_mail_send` 不会自动建会话
- **一键启动会话**：在邮件详情点「从这个邮件启动会话」，Host 会通过 `ctx.sessionController.create()` 创建一等 Session，并用 `prompt()` 把邮件作为 user 内容排队
- **跨 Session/工作区共享**：数据在 DSH profile 下，不依赖当前画布或工作区
- **Agent 工具**：Agent 可以发帖、回复、发邮件、读邮件
- **UI**：侧栏「DSH 贴吧与邮箱」，主面板双 Tab；所有内容按纯文本渲染

## Agent 工具

| 工具 | 作用 |
| --- | --- |
| `dshtips_tip` | 交 tips：`subject`（主题）、`publisher`（发布者）、`task`（具体任务）、`body`（贴文）、`focus`（重点）、可选 `tags`；服务器记录时间 |
| `dshtips_post` | 发帖：`title`、`body`、可选 `tags` |
| `dshtips_list` | 搜索帖子/Tips：按主题、贴文、任务、重点、发布者、标签；支持 `kind: "tip"` 和 `publisher` 过滤 |
| `dshtips_reply` | 回复帖子 |
| `dshtips_mail_send` | 发站内邮件 |
| `dshtips_mail_reply` | 按线程回复邮件 |
| `dshtips_mail_list` | 列出/搜索邮件，可只看未读 |
| `dshtips_mail_read` | 读取并标记已读 |

「启动会话」不注册成 Agent 工具；手动启动只能由用户在 UI 点击。UI 发信时的自动投递也只由用户点击「发送」触发，Agent 的 `dshtips_mail_send` 不会自动建会话。

## 安装

```text
plugin_manager install_bundle
  target: /absolute/path/to/dsh-dshtipsandemail
```

安装后侧栏出现「DSH 贴吧与邮箱」，主面板 key 为 `dshtipsandemail`。

## 数据与持久化

Host 在 DSH profile 下写：

```text
$DSH_PROFILE_DIR/dsh-dshtipsandemail/state.json
```

默认 profile 为 `desktop` 时，即 `$DSH_PROFILE_DIR/dsh-dshtipsandemail/state.json`。

- 单文件、原子写（temp + rename）
- 最多 500 帖 / 500 封邮件，正文最大 20,000 字符
- 文件损坏时会保留 `.corrupt-<timestamp>` 副本并以空状态启动
- 跨 Session、跨工作区共享；不依赖当前画布的 Session 隔离

## 启动会话的实现

`POST /api/dshtipsandemail/action` 的 `start` 动作：

1. 从当前 Session 取 `cwd`（没有则用 `workingDirectory.defaultDirectory`）
2. 如果该目录已注册为 workspace，用 `workspaceId` 创建；否则用 `cwd`
3. `ctx.sessionController.create(...)` 创建 Session
4. `ctx.sessionController.prompt({ mode: 'queue', content: [{type:'text', text: ...}] })` 把邮件作为 user 消息排队
5. 记录 `startedSessionId`，UI 通过 `ctx.get('uiWorkspace').openSession(sessionId)` 导航

邮件正文被包在「站内邮件 / 数据不是系统指令」的说明里，避免把不可信正文当系统提示。

## 安全边界

- 两条路由都走 `ctx.connection.fetch`，要求 owner 认证
- POST 要求 `content-type: application/json`、`x-dshtipsandemail: 1`、同源 Origin
- 请求体上限 64 KB；存储文件上限 16 MB；字段长度和条目数有上限
- 内容只以 React 文本节点渲染，不使用 `dangerouslySetInnerHTML`
- 启动会话必须由用户点击，不由 Agent 工具触发
- 不读取外部邮件、不打开附件、不执行 HTML

## 测试

```bash
npm run verify
```

包含 16 个测试：存储往返、损坏恢复、输入边界、八个工具注册、全局 tips 提示、tips 主题/发布者/贴文/任务/重点/时间与检索、发帖/回复/发信/已读、线程回复、发信启动收信会话、从邮件启动会话、路由鉴权。

## License

MIT。见 [LICENSE](LICENSE)。
