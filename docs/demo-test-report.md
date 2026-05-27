# Claude Task Safety Demo 测试报告

> 测试日期: 2026-05-27  
> 测试范围: v0.1 Demo / P0 闭环  
> 测试环境: Windows 11, Edge Dev 150, Node v25.9.0, pnpm, Vitest 4.1.7, WXT 0.20.26  
> 项目路径: `D:\CodexHome\任务\resume learning\claude-task-safety`

## 结论

Demo 已完成并通过 P0 验证: 可以本地构建为 Chrome MV3/WXT 扩展,在真实 Claude.ai 已登录会话中捕获可见 SSE 输出,写入 IndexedDB,在任务页生成 handoff,并提供复制/打开新 Claude chat 的恢复入口。

仍未验证真实额度耗尽/usage limit 中断,因为这会消耗用户 Claude 额度且触发条件不可控。网络中断、空流、并发消息顺序等风险已通过本地单测覆盖。

## 自动化验证

| 项目 | 命令 | 结果 |
|---|---|---|
| TypeScript | `pnpm compile` | 通过 |
| 单元测试 | `pnpm test` | 通过,4 文件 / 10 case |
| 生产构建 | `pnpm build` | 通过,生成 `.output/chrome-mv3` |

覆盖点:

- SSE parser: 跨 chunk、非法 JSON、`message_stop`。
- Storage repositories: task 复用、recording 追加、完成状态、空可见输出 recording 清理。
- Capture message queue: 快速 start/delta/end 顺序串行化,避免 IndexedDB 写入竞态。
- Handoff generator: 无输出、普通任务、中断任务、长文本尾部保留。

## 真实 Claude.ai 验证

使用用户已登录的 Edge Dev 会话,未新开浏览器窗口:

- CDP 地址: `http://127.0.0.1:9238`
- Claude 页面: `https://claude.ai/new`,账号侧栏显示 `dong / Pro plan`
- 扩展加载方式: `Extensions.loadUnpacked`
- 已加载扩展: `Claude Task Safety`
- 真实 completion endpoint:
  `https://claude.ai/api/organizations/{orgId}/chat_conversations/{conversationId}/completion`

真实发送的短 prompt:

```text
请用 3 点总结浏览器扩展测试要关注什么，每点一句。
```

验证结果:

- Claude 创建真实 conversation: `3634d591-1ebb-48fc-a62e-f782c658a860`
- extension task 正确映射该 conversation id。
- recording 捕获到真实 Claude 输出,`captureMethod` 为 `sse`。
- 捕获文本包含三点回答,证明不是 DOM mock 或本地伪数据。
- task-list 页面可读取该任务并生成 handoff。

实测中发现 Claude 还会产生一条无可见文本的 SSE 请求。已修复:

- `entrypoints/inject.ts`: 只有首个可见 text delta 出现时才发送 `CAPTURE_START`。
- `src/storage/recording-repository.ts`: 完成时清理空可见输出 recording。
- `src/core/handoff/generator.ts`: 防御性过滤 legacy 空完成 recording。
- `tests/storage-repositories.test.ts`: 新增空 recording 清理回归测试。

## 浏览器烟测

已验证:

- popup 可以渲染并进入任务页。
- task-list 空态可以渲染。
- DOM fallback 的模拟捕获可以写入 IndexedDB。
- handoff 预览包含 captured text。
- 复制/打开按钮可点击。

真实剪贴板内容读取受浏览器权限和页面焦点限制,本轮只验证了按钮路径和页面反馈,未把剪贴板作为强断言。

## 后续真实测试素材约定

后续如果还需要消耗 Claude 额度做真实端到端测试,优先使用:

```text
D:\下载\AI产品经理面试题库_个性化回答集.md
```

建议每次取其中一道题,让 Claude 做“详细解析每一道题类似的问题”。这样真实测试同时产出可复用的 AI 产品经理面试准备内容,避免额度花在无价值 prompt 上。

## 未覆盖风险

- 未验证真实 Claude usage/quota 耗尽提示能否被稳定识别为 `usage_limit`。
- artifact/code block 的特殊流事件仍需要更多真实样本。
- DOM fallback 依赖 Claude 页面结构,Claude 改版后可能需要更新选择器。
- P0 未实现完整 quota 监控、风险 badge、输入框状态条、云同步或 AI 总结型 handoff。
