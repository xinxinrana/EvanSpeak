# 网站图像资源工作方法

页面结构、文字、链接和交互由 HTML/CSS/JavaScript 承担。图片用于岛屿、纸张纹理、Logo 和文章插图；不要把整张页面设计稿或必须阅读的文字放进图片。页面只引用仓库内的文件。

## 资源位置

| 用途 | 网页使用的文件 | 保留的源文件 |
| --- | --- | --- |
| 五个主题岛屿 | `assets/islands/<主题>.webp` | `assets/uncompressed/islands/<主题>.png`、`assets/islands/raw/<主题>-raw.png` |
| 纸张纹理 | `assets/textures/paper-warm.webp` | `assets/uncompressed/textures/paper-warm.png` |
| Logo 与图标 | `assets/brand/` 下的 PNG、ICO | `assets/brand/raw/evan-logo-white-bg.png`、`assets/brand/references/` 和 `VI/` |
| 文章插图 | 对应文章目录的 `images/`，或 `assets/` 中共享资源 | 根据素材来源保留可编辑源文件 |

五个主题名为 `product`、`ai`、`business`、`system`、`observe`。岛屿图保留透明通道，主题名和问题句写在首页 HTML 中，不能烘焙到图片里。

## 新增或替换资源

1. 把源文件和网页要加载的文件放入上述目录；网页优先使用压缩后的 WebP/PNG。
2. 检查透明背景、边缘、尺寸、文件体积和窄屏显示，避免明显色键残边。
3. 使用相对路径引用；不要指向个人电脑、临时生成目录或外部会失效的文件。
4. 在本地网站核对资源加载。文章插图应有合适的 `alt` 文本；装饰图使用空 `alt`。

仓库只提供 Logo 的重新生成脚本；岛屿图片的抠图与 WebP 导出没有随仓库分发的脚本。修改岛屿时可使用现有图像工具完成处理，输出到约定路径，并检查成品。

## 重新生成 Logo 导出

`scripts/build_brand_assets.py` 使用 `assets/brand/raw/evan-logo-white-bg.png` 作为默认输入，依赖 Python 3 和 Pillow。在已安装 Pillow 的 Python 环境中，从仓库根目录运行：

~~~bash
python3 scripts/build_brand_assets.py
~~~

脚本也支持 `--source <图片路径>`。它会输出透明和白底主图、Apple/Android 图标、多个尺寸的 PNG，以及 `assets/brand/icons/` 中的 ICO。执行后检查小尺寸图标是否清晰，透明图角落是否透明，并在提交前核对生成文件清单。

## 页面引用

首页使用相对于根目录的路径，例如：

~~~html
<link rel="icon" href="assets/brand/icons/favicon.ico" sizes="any" />
<img class="island-img" src="assets/islands/ai.webp" alt="" aria-hidden="true" />
~~~

文章页位于四层目录下时，引用共享资源使用 `../../../../assets/...`。站点根目录和 GitHub Pages 的 `/EvanSpeak/` 路径不同，不要把其中一个地址写死在 HTML 中。
