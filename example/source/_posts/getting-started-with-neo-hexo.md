---
title: Neo-Hexo 入门指南
date: 2026-03-05 14:30:00
tags:
  - 教程
  - 入门
---

本文将带你了解 Neo-Hexo 的核心概念和基本用法。

<!-- more -->

## 项目结构

一个标准的 Neo-Hexo 项目包含以下目录：

```
my-blog/
├── neo-hexo.yaml       # 站点配置
├── scaffolds/           # 内容模板
├── source/
│   ├── _posts/          # 博客文章
│   ├── _drafts/         # 草稿
│   └── about/           # 独立页面
└── theme/
    ├── layout/          # 模板文件
    ├── source/          # 静态资源
    └── _config.yaml     # 主题配置
```

## 配置文件

所有配置都在 `neo-hexo.yaml` 中声明：

```yaml
title: 我的博客
url: https://example.com

plugins:
  - renderer-markdown
  - renderer-edge
  - generator
  - name: theme
    dir: theme
```

## 写作

### Front-matter

每篇文章都以 YAML front-matter 开头：

```markdown
---
title: 文章标题
date: 2026-03-05 14:30:00
tags:
  - Tag1
  - Tag2
---

正文内容...
```

### 摘要分隔

使用 `<!-- more -->` 标记来分隔文章摘要和正文：

```markdown
这部分是摘要，会显示在文章列表中。

<!-- more -->

这部分是正文，只在文章详情页显示。
```

## 插件系统

Neo-Hexo 的所有功能都是通过插件实现的：

| 插件 | 功能 |
|------|------|
| `renderer-markdown` | Markdown 渲染 |
| `renderer-edge` | Edge.js 模板引擎 |
| `processor` | 源文件处理 |
| `generator` | 路由生成 |
| `filter` | 内容过滤 |
| `highlight` | 语法高亮 |
| `theme` | 主题系统 |
| `server` | 开发服务器 |

每个插件都可以通过 Hook 系统参与生命周期的各个阶段。

## 部署

生成静态文件后，可以部署到任何静态托管服务：

```bash
neo-hexo generate
```

输出目录 `public/` 中的文件可以直接部署到 GitHub Pages、Vercel、Netlify 等平台。
