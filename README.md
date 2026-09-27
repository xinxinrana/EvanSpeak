# Evan Speak

Evan Speak 是按主题组织的个人数字花园。网站是直接发布的静态 HTML/CSS/JavaScript，没有前端构建步骤。

线上地址：https://xinxinrana.github.io/EvanSpeak/

首页有产品、AI、商业、自我系统、观察五个主题岛屿。选择主题后，右侧展示该主题的介绍和笔记链接；全站笔记列表位于 `notes/`。`paths/`、`explore/` 和主题下的路径页目前是“待更新”占位页。

## 目录

| 路径 | 用途 |
| --- | --- |
| `index.html`、`styles.css` | 首页结构、主题数据和样式 |
| `topics/<主题>/notes/<slug>/index.html` | 文章 HTML；少量页面有独立布局或同目录的其他 HTML |
| `topics/<主题>/notes/index.html`、`notes/index.html` | 主题和全站笔记列表 |
| `topics/<主题>/index.html` | 主题落地页 |
| `assets/` | 共享样式、图像和品牌资源 |
| `tools/editor/` | 只在本机运行的网页工作台 |
| `docs/` | 内容、设计、资源和部署说明 |

文章 HTML 是内容源。AI 可以直接写文件，也可以在工作台中打开现有页面精修。新文章需要同时维护列表和首页的手写链接，见[内容规范](docs/content-spec.md)。

## 本地查看与编辑

在仓库根目录运行：

~~~bash
node tools/editor/server.mjs
~~~

- 工作台：http://127.0.0.1:8898/
- 本地网站：http://127.0.0.1:8898/site/

在本地网站找到文章，复制 URL 到工作台，编辑后点击“更新 HTML”，再检查并推送站点文件。工作台不要求先建立草稿；说明见[本地网页工作台](tools/editor/README.md)。**工作台服务启动后如果更新了 `server.mjs`，需要重启服务**，否则浏览器可能显示新版界面、后端却仍是旧版。

只查看网站时，也可以运行 `python3 -m http.server 8899 --bind 127.0.0.1` 并访问 http://127.0.0.1:8899/ 。不要用 `file://` 直接打开站内目录 URL。

## 获取仓库

~~~bash
git clone https://github.com/xinxinrana/EvanSpeak.git
cd EvanSpeak
~~~

## 维护文档

- [内容规范](docs/content-spec.md)
- [数字花园设计方向](docs/digital-garden-brief.md)
- [网站资源工作方法](docs/asset-workflow.md)
- [部署说明](docs/deployment-strategy.md)
- [资源清单](assets/README.md)
- [Agent 工作约定](AGENTS.md)
