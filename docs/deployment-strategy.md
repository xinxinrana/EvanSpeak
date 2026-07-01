# 部署与构建策略

本文档记录 Evan Speak 在 Cloudflare Pages 上的构建工具选择和后续演进判断。

## 当前阶段

当前项目是静态 HTML 网站：

- 首页：`index.html`
- 样式：`styles.css`
- 资源：`assets/`
- 内容页：`notes/`、`topics/` 等目录下的静态 HTML

当前还不需要前端框架或构建系统。

## Cloudflare Pages 当前建议配置

在 Cloudflare Pages 的 Build configuration 中建议：

```text
Framework preset: None
Build command: exit 0
Build output directory: .
```

如果 Cloudflare 当前部署已经能直接读取仓库根目录，也可以保持现状。关键是根目录需要有顶层 `index.html`。

## 为什么现在不急着上框架

当前内容还处在早期阶段，直接引入框架会增加维护成本：

- 需要包管理器、依赖、构建命令
- 部署配置更复杂
- 内容结构还没稳定，过早抽象容易返工
- 当前静态 HTML 已经足够支撑首页、占位页和少量文章

现阶段更重要的是继续沉淀内容和验证信息结构。

## 什么时候需要迁移

当出现这些信号时，再考虑迁移到构建工具：

- 文章超过 10-20 篇
- 需要统一文章布局
- 需要 Markdown / MDX 写作
- 需要自动生成文章列表
- 需要标签、分类、专题页、阅读路径
- 多个页面开始重复维护导航、页头、页脚和元信息
- 手写 HTML 已经明显拖慢更新速度

## 推荐的未来方案：Astro

如果后续内容增长，优先考虑迁移到 Astro。

原因：

- 适合内容型网站、博客和个人数字花园
- 默认可以生成静态 HTML，部署轻量
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
继续使用静态 HTML + Cloudflare Pages Framework preset: None
```

中期：

```text
当内容维护开始重复时，迁移到 Astro
```

不要为了“看起来更专业”提前上框架。真正的判断标准是：内容规模和维护重复度是否已经超过手写静态 HTML 的舒适区。
