# 部署与构建策略

本文档记录 Evan Speak 的部署目标、构建方式选择和后续演进判断。

## 当前部署

站点同时发布到两个静态托管，两边都在监听同一个仓库的 `main` 分支，push 后各自重建。

### GitHub Pages（主站）

| 项 | 值 |
| --- | --- |
| 仓库 | `xinxinrana/EvanSpeak` |
| 发布源 | `main` 分支根目录（legacy 分支构建，不使用 Actions） |
| 地址 | https://xinxinrana.github.io/EvanSpeak/ |
| 仓库 homepage 字段 | 指向上述地址 |

仓库根目录的 `.nojekyll` 用来跳过 Jekyll 构建。站点是纯静态 HTML，不需要 Jekyll 处理；关掉它能避免中文路径和资源被二次处理。

### Cloudflare Pages

Build configuration 建议：

```text
Framework preset: None
Build command: exit 0
Build output directory: .
```

关键是根目录要有顶层 `index.html`。

## 当前阶段

项目是纯静态 HTML 网站，无需前端框架或构建系统：

- 首页：`index.html`
- 首页样式：`styles.css`
- 文章页样式：`assets/article.css`
- 列表页样式：`assets/list.css`
- 资源：`assets/`
- 内容页：`topics/<主题>/notes/<slug>/index.html`
- 列表页：`notes/index.html`、`topics/<主题>/notes/index.html`

## 为什么现在不急着上框架

当前内容还处在早期阶段，直接引入框架会增加维护成本：

- 需要包管理器、依赖、构建命令
- 部署配置更复杂
- 内容结构还没稳定，过早抽象容易返工
- 当前静态 HTML 已经足够支撑首页、列表页和文章页

现阶段更重要的是继续沉淀内容和验证信息结构。

## 什么时候需要迁移

当出现这些信号时，再考虑迁移到构建工具：

- 文章超过 30-50 篇，手写列表页开始明显拖慢更新
- 需要 Markdown / MDX 直接写作，不再想手工转 HTML
- 需要自动生成文章列表、标签页、分类页
- 需要标签、分类、专题页、阅读路径
- 多个页面开始重复维护导航、页头、页脚和元信息

## 推荐的未来方案：Astro

如果后续内容增长，优先考虑迁移到 Astro。

原因：

- 适合内容型网站、博客和个人数字花园
- 默认生成静态 HTML，可以直接部署到 GitHub Pages 或 Cloudflare Pages
- 支持 Markdown / MDX，适合长期写文章
- 可以保留当前高度自定义的首页设计
- 可以继续嵌入或迁移现有独立 HTML 内容
- 相比 React/Vue/Svelte SPA，更适合这个站点的内容属性

## 不优先选择的方案

### Next.js

除非后续需要复杂应用、登录、后台、SSR 或动态数据，否则对当前项目偏重。

### Vue / Svelte / React SPA

更适合应用型产品，不是最适合文章型数字花园。

### VitePress / Docusaurus

适合文档站，但 Evan Speak 更像个人数字花园，不是纯技术文档站。

### Hugo

速度快，但对当前这种定制首页、嵌入内容和后续交互设计来说，Astro 更灵活。

## 当前结论

短期：

```text
继续使用静态 HTML，同时发布到 GitHub Pages 与 Cloudflare Pages
```

中期：

```text
当文章规模或列表维护重复度超过手写静态 HTML 的舒适区时，迁移到 Astro
```

判断标准是内容规模和维护重复度，不是"看起来更专业"。
