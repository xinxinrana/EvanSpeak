# 网站资源清单

这些资源支撑 Evan Speak 站点的视觉与版式。完整的制作与维护流程见 [`../docs/asset-workflow.md`](../docs/asset-workflow.md)。

## 共享样式

站点共用两份样式表，放在这里而不是各页面内联：

- `article.css`
  - 用途：文章页阅读版式（标题层级、段落节奏、引用、表格、关联信息区）。
  - 强调色由页面 `body` 上的 `data-topic` 决定，五个主题各一色。
- `list.css`
  - 用途：笔记列表页与主题落地页的卡片版式。

首页样式单独放在根目录的 `styles.css`（首页是唯一的双栏布局，不与其他页面共用）。

## 纸张纹理

- `textures/paper-warm.webp`
  - 用途：暖色纸面背景纹理。
  - 生成意图：低调的米白纸纹，无文字、无物体、低对比。

## 岛屿资源

站点加载的压缩 WebP：

- `islands/product.webp`
- `islands/ai.webp`
- `islands/business.webp`
- `islands/system.webp`
- `islands/observe.webp`

未压缩的透明 PNG 归档在这里：

- `uncompressed/islands/product.png`
- `uncompressed/islands/ai.png`
- `uncompressed/islands/business.png`
- `uncompressed/islands/system.png`
- `uncompressed/islands/observe.png`

原始色键图保留以便重新抠图：

- `islands/raw/product-raw.png`
- `islands/raw/ai-raw.png`
- `islands/raw/business-raw.png`
- `islands/raw/system-raw.png`
- `islands/raw/observe-raw.png`

岛屿图刻意不含任何文字。主题名和问题句都由 HTML 渲染，保证站点始终可编辑、可维护。

## 品牌资源

可直接使用的 Evan logo 导出在 `brand/` 下：

- `brand/evan-logo-transparent.png`
- `brand/evan-logo-white.png`
- `brand/icons/favicon.ico`
- `brand/icons/evan-logo.ico`
- `brand/png/evan-logo-*.png`

原始 VI 参考板复制在 `brand/references/`，Image Gen 的白底源图保留在 `brand/raw/`。仓库根目录的 `VI/` 是同一批参考板的原始目录。

## 生成说明

- 生成方式：内置 Image Gen。
- 岛屿后处理：以纯色 `#ff00ff` 为底，本地做色键抠图。
- 源格式：岛屿资源为带 alpha 的 PNG。
- 交付格式：缩放并压缩为 WebP 供浏览器加载。
- 视觉方向：克制的水彩图册感，暖纸面，低饱和的鼠尾草绿 / 蓝 / 陶土 / 沙色，不加标注与水印。

## 维护规则

- 不用整页 UI 截图当网站背景。
- 文字不进入图片资源，一律由 HTML 渲染。
- 原始色键文件保留在 `islands/raw/`。
- 未压缩的成品 PNG 保留在 `uncompressed/`。
- HTML/CSS 只引用项目内的压缩资源。
