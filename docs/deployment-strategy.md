# 部署说明

Evan Speak 是纯静态网站。仓库根目录的 HTML、CSS、JavaScript 和图片就是发布文件，没有安装依赖或执行前端构建的步骤。本地网页工作台只是编辑工具；它的 Node 服务不会在 GitHub Pages 上运行。

## GitHub Pages

| 项目 | 当前配置 |
| --- | --- |
| 仓库 | `xinxinrana/EvanSpeak` |
| 发布源 | `main` 分支根目录 |
| 构建类型 | GitHub Pages legacy 分支发布 |
| 网站 | https://xinxinrana.github.io/EvanSpeak/ |

根目录的 `.nojekyll` 让 GitHub Pages 直接提供静态文件，不经过 Jekyll。仓库中的页面使用相对路径，因此本地网站位于根路径、线上网站位于 `/EvanSpeak/` 时都能正常导航。

## 发布流程

1. 在本地查看页面。可运行 `node tools/editor/server.mjs`，访问 http://127.0.0.1:8898/site/；工作台位于 http://127.0.0.1:8898/ 。
2. 修改 HTML/CSS/资源并检查本地效果。
3. 通过工作台“推送到线上”检查站点文件清单，再提交和推送；也可使用 Git 手动提交、推送到 `origin/main`。
4. 访问线上 URL 验证已发布页面、导航和资源。GitHub Pages 构建及缓存可能使页面稍后更新。

工作台只会把站点范围内的文件纳入推送清单，例如 `index.html`、`topics/`、`notes/`、`paths/`、`explore/`、`assets/`、`styles.css`。`docs/`、`tools/` 和 `AGENTS.md` 等仓库维护文件需要用 Git 正常提交。工作台拒绝混入不属于站点范围的已暂存文件；提交前应先检查工作区。

更新了 `tools/editor/server.mjs` 后，要重启正在运行的工作台服务。HTML/CSS/前端脚本文件由服务按请求读取，后端 Node 代码不会在旧进程中自动重新加载。

## 其他托管

仓库没有 Cloudflare Pages 的项目配置或可核实的部署地址，因此不把它列为当前发布目标。若以后需要额外托管，可将仓库根目录作为静态输出目录，不需要构建；具体平台设置以实际项目配置为准。

继续维护静态 HTML 即可。只有当手写列表、重复页面结构或链接维护明显成为负担时，再评估是否引入生成工具；当前不需要为此迁移框架。
