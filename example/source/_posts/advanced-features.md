---
title: 高级特性：插件开发与主题定制
date: 2026-03-10 09:00:00
tags:
  - 高级
  - 插件
  - 主题
---

深入了解 Neo-Hexo 的高级特性：如何开发自定义插件和创建主题。

<!-- more -->

## 插件开发

### 插件结构

一个 Neo-Hexo 插件是一个实现 `NeoHexoPlugin` 接口的对象：

```typescript
import type { NeoHexoPlugin } from '@neo-hexo/core';

export default function myPlugin(options = {}): NeoHexoPlugin {
  return {
    name: 'my-plugin',
    enforce: 'post', // 'pre' | 'post' | undefined

    // 命令式：获取服务容器访问权
    apply(ctx) {
      const router = ctx.inject(RouterServiceKey);
      return { dispose() { /* 清理逻辑 */ } };
    },

    // 声明式：直接声明 Hook 处理器
    hooks: {
      configLoaded(config) { /* ... */ },
      afterPostRender(data) { return data; },
    },
  };
}
```

### Hook 策略

Neo-Hexo 有三种 Hook 执行策略：

- **sequential** — 按优先级顺序依次执行
- **parallel** — 并发执行（如 `generateRoutes`）
- **waterfall** — 每个 tap 变换数据并传递给下一个

### 服务容器

通过 `Context` 获取和注册服务：

```typescript
// 注入已有服务
const router = ctx.inject(RouterServiceKey);
const render = ctx.inject(RenderServiceKey);

// 提供新服务
const myService = new MyService();
ctx.provide(MyServiceKey, myService);
```

## 主题开发

### 模板语法

Neo-Hexo 使用 Edge.js 模板引擎。基本语法：

```edge
{{-- 注释 --}}

{{-- 输出变量（自动转义） --}}
{{ page.title }}

{{-- 原始 HTML 输出 --}}
{{{ page.content }}}

{{-- 条件判断 --}}
@if(page.tags)
  <div class="tags">...</div>
@end

{{-- 循环 --}}
@each(post in site.posts)
  <article>{{ post.title }}</article>
@end

{{-- 布局继承 --}}
@layout('base')
@section('content')
  <h1>内容</h1>
@end
```

### 模板变量

模板中可用的变量：

| 变量 | 说明 |
|------|------|
| `page` | 当前页面/文章数据（title, content, frontMatter...） |
| `config` | 站点配置（title, url, theme...） |
| `site` | 全局数据（posts, pages, tags, categories） |
| `path` | 当前 URL 路径 |

## 开发服务器

开发服务器提供了现代化的开发体验：

- **WebSocket 热重载** — 文件变更自动刷新浏览器
- **错误覆盖层** — 构建错误直接显示在浏览器中
- **懒渲染** — 首次请求时才渲染页面
- **ETag 缓存** — 304 协商缓存提升性能

```bash
neo-hexo server --port 3000 --host 0.0.0.0
```

> **提示**: 使用 `neo-hexo serve` 作为 `neo-hexo server` 的别名。
