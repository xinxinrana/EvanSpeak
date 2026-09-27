# 网站资源

资源位置与更新方法见[网站图像资源工作方法](../docs/asset-workflow.md)。

| 路径 | 用途 |
| --- | --- |
| `article.css` | 大部分文章的阅读版式；主题强调色由 `body[data-topic]` 控制 |
| `list.css` | 全站/主题笔记列表和主题落地页 |
| `textures/paper-warm.webp` | 网页使用的纸张纹理 |
| `islands/<主题>.webp` | 首页使用的五个透明岛屿 |
| `brand/` | Logo、favicon 和设备图标 |
| `uncompressed/`、`islands/raw/`、`brand/raw/` | 图片源文件和未压缩存档 |

首页样式位于仓库根目录的 `styles.css`。少量独立版式文章使用页面内样式，不依赖 `article.css`。

图片不承载必须阅读的文字。首页主题名和问题句由 HTML 渲染；更新页面链接或文字时不必重制岛屿图。网页引用压缩后的仓库内资源，并在本地网站检查透明边缘、路径和窄屏显示。
