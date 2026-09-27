# Evan Speak

Evan Speak 是一个地图式数字花园站点，用于承载个人主页和长期思考留存。

线上地址：https://xinxinrana.github.io/EvanSpeak/

这个站点不以时间线为核心，而是把内容组织成主题地图。当前首页包含五个主题岛屿：

- 产品
- AI
- 商业
- 自我系统
- 观察

每个主题下承载已经整理完成的笔记，尚未铺开的内容保留“待更新”状态。点击首页的主题岛屿，右侧会直接列出该主题的笔记，不需要再进一层。

## 项目结构

```text
.
├── index.html                 # 首页
├── styles.css                 # 首页样式
├── assets/                    # 网站图像资源与共享样式
│   ├── article.css            # 文章页阅读版式
│   ├── list.css               # 列表页与主题落地页样式
│   ├── textures/              # 纸张纹理
│   ├── islands/               # 透明岛屿 WebP（网页加载用）
│   ├── islands/raw/           # 原始色键图（存档）
│   ├── uncompressed/          # 未压缩透明 PNG（存档）
│   └── brand/                 # Logo、favicon 与 VI 参考资料
├── docs/                      # 项目文档
├── notes/                     # 所有笔记列表
├── paths/                     # 阅读路径占位页
├── explore/                   # 继续探索占位页
├── scripts/                   # 本地资源生成脚本
├── tools/editor/              # 本地网页编辑工作台
└── topics/                    # 主题页面与主题下的笔记/路径
```

新增笔记的做法见[内容规范](docs/content-spec.md)。

## 本地预览

```bash
python -m http.server 8899 --bind 127.0.0.1
```

然后访问 http://127.0.0.1:8899/ 。

**要用本地服务，不能直接双击打开 `index.html`。** 站内页面在子目录里（如 `topics/ai/notes/xxx/`），`file://` 协议不会自动解析子目录下的 `index.html`，会落到浏览器的目录列表页。

## 本地编辑工作台

```bash
node tools/editor/server.mjs
```

浏览器访问 http://127.0.0.1:8898/ ，粘贴本地网页 URL，直接编辑完整页面，更新 HTML 后检查并推送站点文件。使用说明见 [编辑工作台](tools/editor/README.md)。

## 克隆

仓库约 27 MB，其中四分之三是存档用的原始图片（`VI/`、`assets/uncompressed/`、`assets/islands/raw/`、`assets/brand/raw/` 与 `assets/brand/references/`）。只改页面内容时不必全量下载，用稀疏检出几秒即可完成：

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/xinxinrana/EvanSpeak.git
cd EvanSpeak
git sparse-checkout set --no-cone '/*' '!/assets/uncompressed' '!/assets/islands/raw' '!/VI' '!/assets/brand/raw' '!/assets/brand/references'
```

## 设计文档

- [地图式数字花园设计简报](docs/digital-garden-brief.md)
- [内容规范](docs/content-spec.md)
- [网站图像资源工作方法](docs/asset-workflow.md)
- [部署与构建策略](docs/deployment-strategy.md)
- [资源清单](assets/README.md)

## 维护原则

- 首页结构使用真实 HTML/CSS，不使用整页设计稿贴图。
- 岛屿、纸张纹理等视觉资产可以是图片资源，但文字、链接和内容状态必须由 HTML 渲染。
- 新增内容页时优先使用相对路径，避免写死绝对地址。
- 未完成内容统一显示“待更新”。
- 图像素材应保留原始生成文件和最终可用文件，方便后续重新抠图或替换。
