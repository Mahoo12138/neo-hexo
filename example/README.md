# Neo-Hexo Example Site

这是一个 Neo-Hexo 示例博客项目，演示框架的核心功能。

## 项目结构

```
example/
├── neo-hexo.yaml            # 站点配置
├── package.json
├── scaffolds/               # 新建内容模板
│   ├── post.md
│   ├── page.md
│   └── draft.md
├── source/                  # 内容源文件
│   ├── _posts/              # 博客文章 (Markdown)
│   │   ├── hello-world.md
│   │   ├── getting-started-with-neo-hexo.md
│   │   └── advanced-features.md
│   ├── _data/               # 数据文件
│   │   └── navigation.yaml
│   └── about/               # 独立页面
│       └── index.md
└── theme/                   # 主题
    ├── _config.yaml          # 主题配置
    ├── layout/               # Edge.js 模板
    │   ├── base.edge         # 基础布局
    │   ├── index.edge        # 首页
    │   ├── post.edge         # 文章页
    │   ├── page.edge         # 独立页面
    │   └── archive.edge      # 归档页
    ├── source/               # 静态资源
    │   ├── css/
    │   │   └── style.css
    │   └── js/
    │       └── main.js
    └── languages/            # 多语言
        ├── en.yaml
        └── zh-CN.yaml
```

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
pnpm serve

# 3. 生成静态文件
pnpm build

# 4. 创建新文章
pnpm new "My New Post"
```

## 配置说明

所有配置位于 `neo-hexo.yaml`，采用声明式 YAML 格式：

- **站点信息**: title / subtitle / description / author / url
- **目录**: sourceDir / publicDir
- **永久链接**: permalink 模式
- **插件**: 以名称列表声明，框架自动解析

## 主题开发

主题位于 `theme/` 目录，使用 Edge.js 模板引擎：

- `layout/base.edge` — 所有页面的基础 HTML 结构
- `layout/index.edge` — 首页模板，列出最新文章
- `layout/post.edge` — 文章详情页
- `layout/page.edge` — 独立页面

模板中可用的变量：
- `page` — 当前页面/文章数据
- `config` — 站点配置
- `site` — 全局数据（posts / pages / tags / categories）
- `path` — 当前 URL 路径
