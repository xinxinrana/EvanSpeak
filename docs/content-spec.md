# 内容规范

这份文档定义 Evan Speak 里一篇笔记从原始内容到发布页的固定做法。加新文章时照这里写，站点就能保持结构一致。

## 目录与路径

```
topics/<主题>/notes/<slug>/index.html     ← 文章页
topics/<主题>/notes/index.html            ← 该主题的笔记列表
topics/<主题>/index.html                  ← 主题落地页
notes/index.html                          ← 全站笔记列表
index.html                                ← 首页（右栏直接列出各主题笔记）
```

主题目录名固定为英文，共五个：

| 目录 | 中文名 |
| --- | --- |
| `topics/product` | 产品 |
| `topics/ai` | AI |
| `topics/business` | 商业 |
| `topics/system` | 自我系统 |
| `topics/observe` | 观察 |

`<slug>` 用小写英文短横线，例如 `sensation-to-cognition`、`a-warm-croissant`。

## 相对路径深度（最容易出错的地方）

| 页面位置 | 回站点根 | 回主题页 | 回笔记列表 |
| --- | --- | --- | --- |
| `topics/<主题>/notes/<slug>/index.html` | `../../../../` | `../../` | `../` |
| `topics/<主题>/notes/index.html` | `../../../` | `../` | — |
| `topics/<主题>/index.html` | `../../` | — | — |
| `notes/index.html` | `../` | — | — |

同站文章之间的关联链接，从文章页出发是 `../../../<主题>/notes/<slug>/`（三层，别写成两层）。

## 文章页结构

```html
<main class="page">
  <nav class="crumbs reveal">Evan Speak / 主题 / 相关笔记</nav>
  <header class="hero reveal">
    <span class="kicker">主题 / 子类</span>
    <h1>标题</h1>
    <p class="summary">一句话摘要</p>
    <div class="meta">
      <span class="state">成型</span>
      <div class="tags"><span>标签</span></div>
    </div>
  </header>
  <article class="body">正文</article>
  <aside class="related reveal" aria-label="关联信息">
    <div><h2>这篇文章回应的问题</h2><p>…</p></div>
    <div><h2>关联阅读</h2><p><a href="…">标题</a> —— 一句说明</p></div>
  </aside>
  <p class="foot reveal"><a href="../">← 返回主题相关笔记</a></p>
</main>
```

- 样式统一引用 `assets/article.css`，页面里不写内联样式。强调色由 `body` 上的 `data-topic` 决定。
- 结构用 `IntersectionObserver` 做进场过渡，脚本原样复制即可。
- 首屏 `head` 里包含 `meta description`、字体 preconnect、favicon、apple-touch-icon，路径按上表换算。

## 正文可用元素

`assets/article.css` 已覆盖这些：

| 元素 | 说明 |
| --- | --- |
| `<h2>` / `<h3>` | 章节标题。原文用 `#`/`##`/`###` 的，按层级映射，最多到三级 |
| `<p>` | 段落；作者在同一段内的换行用 `<br />` 保留 |
| `<ul>` / `<ol>` | 列表 |
| `<blockquote>` | 引用，左侧一条强调色竖线 |
| `<hr />` | 分隔线 |
| `<div class="table-wrap"><table>` | 表格必须包在 `.table-wrap` 里，窄屏横向滚动；表头首列会自动不换行 |
| `<strong>` / `<em>` / `<code>` | 行内强调 |

## 状态标记

每篇给一个：`萌芽` / `成型` / `修订中` / `长期有效`。

按内容实际完成度给，不要为了好看往上抬。原始素材（还没成篇的）标 `萌芽`，已经可以当成品读的标 `成型`。

## 从 Obsidian 原文转页面时要做的处理

1. 去掉 frontmatter（`agentnote` / `id` / `背景` / `source` / `pinned` 这些是笔记库内部字段，不进站点）。
2. `tags` 保留成页面标签，但去掉平台性标记（如 `小红书`）。
3. 正文里指向笔记库内部的双链 `[[…]]` 去掉括号，只留显示文本。
4. ASCII 双引号在中文语境下换成中文引号，英文正文保持原样。
5. 只做版式与链接层面的适配，不改写原文措辞。

## 加一篇新文章时要同步的四处

使用[本地编辑工作台](../tools/editor/README.md)新建并应用文章时，以下列表和篇数会自动同步。手动新建 HTML 页面时，按下面的路径更新。

1. 新建 `topics/<主题>/notes/<slug>/index.html`。
2. 在 `topics/<主题>/notes/index.html` 的 `.note-list` 里加一张卡片（按既定顺序插入）。
3. 在 `topics/<主题>/index.html` 的「相关笔记」卡片里更新篇数。
4. 在 `notes/index.html` 里加一张卡片，并在 `index.html` 的 `topics[].notes` 数组里加一条 —— 首页右栏的数据是手写的，不会自动同步。

## 其他约定

- 不引入构建系统，所有页面都是可直接打开的真实 HTML/CSS。
- 不在交付目录里留临时脚本或截图。
- 主题定位用 `.island.<主题>` 这样的复合选择器，不要用裸类名 `.ai`、`.observe`——右侧面板的圆点元素也带同名 class，裸类名会误伤它。
