# 网站图像资源工作方法

本文档记录 Evan Speak 网站图像资源的创建、整理、处理和引用方式。

## 核心原则

网站不能把整张 UI 设计图当成页面背景。正确做法是：

- 页面结构、文字、链接、状态、交互使用 HTML/CSS/JS 实现。
- 图像只承担视觉资产职责，例如纸张纹理、水彩岛屿、装饰纹理。
- 图像资源不内嵌重要文字，避免后续无法维护。
- 项目中引用的资源必须复制到当前仓库，不依赖 Codex 默认生成目录。

## 当前资源类型

### 品牌 Logo 资源

最终资源：

```text
assets/brand/evan-logo-transparent.png
assets/brand/evan-logo-white.png
assets/brand/apple-touch-icon.png
assets/brand/android-chrome-192x192.png
assets/brand/android-chrome-512x512.png
assets/brand/icons/favicon.ico
assets/brand/icons/evan-logo.ico
assets/brand/png/evan-logo-*.png
```

源文件与参考资料：

```text
assets/brand/raw/evan-logo-white-bg.png
assets/brand/references/logo-visual-reference-main.png
assets/brand/references/logo-visual-reference-applications.png
assets/brand/references/logo-visual-reference-digital.png
VI/
```

用途：

- 网站 favicon
- Apple touch icon
- Android/PWA 图标
- 站内品牌标识、头像、分享图或后续视觉物料

要求：

- `raw/` 保留图像生成得到的白底主图
- `evan-logo-transparent.png` 作为透明底主图，尺寸为 1024px 正方形
- `evan-logo-white.png` 作为白底主图
- `png/` 中保留常用尺寸透明 PNG
- `icons/` 中保留可直接使用的 ICO 文件
- 不直接引用 `VI/` 中的整页视觉参考图

### 纸张纹理

位置：

```text
assets/textures/paper-warm.webp
```

未压缩源文件：

```text
assets/uncompressed/textures/paper-warm.png
```

用途：

- 页面整体背景
- 地图画布背景

要求：

- 低对比度
- 暖白、米色、纸感
- 无文字
- 无明显污渍或大图案
- 可以平铺或大面积铺底

### 岛屿资源

网页加载资源：

```text
assets/islands/product.webp
assets/islands/ai.webp
assets/islands/business.webp
assets/islands/system.webp
assets/islands/observe.webp
```

未压缩透明 PNG 归档：

```text
assets/uncompressed/islands/product.png
assets/uncompressed/islands/ai.png
assets/uncompressed/islands/business.png
assets/uncompressed/islands/system.png
assets/uncompressed/islands/observe.png
```

原始资源：

```text
assets/islands/raw/product-raw.png
assets/islands/raw/ai-raw.png
assets/islands/raw/business-raw.png
assets/islands/raw/system-raw.png
assets/islands/raw/observe-raw.png
```

用途：

- 首页主题地图中的水彩岛屿背景
- HTML 文字叠加在岛屿之上

要求：

- 不包含主题名、问题文字或任何 UI 文本
- 风格统一：克制、水彩、手绘地图感
- 边缘柔和但主体清晰
- 最终文件必须有透明通道

## 生成方法

使用内置 Image Gen 生成网站资产。

### Logo 白底图 Prompt 模板

```text
Use case: logo-brand
Asset type: clean master logo source for favicon/app icon generation
Primary request: recreate a polished vector-friendly Evan brand mark based on the provided reference images: a stylized uppercase E made from three rounded horizontal ribbon strokes, mint teal/cyan gradient, subtle dimensional bevel like the reference, no wordmark.
Input images: VI reference images are brand references for shape, color, and proportion.
Scene/backdrop: pure flat white background.
Subject: single centered Evan E logo mark only.
Style/medium: clean 3D-polished brand mark, vector-friendly silhouette, crisp antialiased edges.
Composition/framing: square canvas, centered logo, generous even padding, no crop.
Lighting/mood: soft minimal studio finish, no cast shadow.
Color palette: mint teal gradient similar to #A7F3E6 to #4FD1C5 with subtle darker teal depth.
Constraints: background must be completely white; preserve the reference logo geometry closely; no text, no watermark, no extra icons, no mockup frame, no dark background.
```

生成后复制到：

```text
assets/brand/raw/evan-logo-white-bg.png
```

### 纸张纹理 Prompt 模板

```text
Use case: website asset
Asset type: seamless paper background texture for a personal digital garden website
Primary request: Create a subtle warm off-white paper texture tile, square composition, suitable as a repeatable website background.
Style/medium: refined natural paper scan, quiet handmade texture, very subtle fibers and grain.
Composition/framing: flat full-frame texture, no objects, no borders, no vignette, no text.
Color palette: warm ivory, parchment, faint beige, very low contrast.
Constraints: seamless/repeatable feel, no visible text, no marks, no stains, no large pattern, no shadows, no watermark.
```

### 岛屿 Prompt 模板

```text
Use case: website asset
Asset type: transparent-style watercolor island cutout for homepage theme map
Primary request: Generate one soft watercolor island blob for the theme {主题名}, no text.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for background removal; background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Subject: {颜色和岛内小图案描述} watercolor island shape with uneven hand-painted edge, subtle inner paper wash, tiny delicate line-art details inside the island.
Style/medium: refined Chinese editorial watercolor, quiet hand-drawn atlas illustration.
Composition/framing: centered subject, generous padding, square image, island roughly 70% of canvas, no cast shadow.
Color palette: {低饱和色系}; do not use #ff00ff in the subject.
Constraints: no text, no labels, no letters, no watermark, crisp separated edge, flat chroma-key background only.
```

主题建议：

- 产品：muted sage, grey-green；小树、丘陵
- AI：muted blue-gray, misty slate；松树、山
- 商业：muted clay, peach beige；丘陵、小路、小树
- 自我系统：muted sand, beige, light ochre；山、等高线、小路
- 观察：muted grey-green, sage；灯塔、岩石、波纹

## 透明处理方法

内置 Image Gen 默认不直接输出项目可控的透明 PNG，因此使用色键背景加本地抠图。

### Logo 白底抠图和尺寸导出

Logo 当前使用白底图作为源文件，再通过项目脚本移除近白背景并导出尺寸集：

```powershell
python .\scripts\build_brand_assets.py
```

脚本会读取：

```text
assets/brand/raw/evan-logo-white-bg.png
```

并输出：

```text
assets/brand/evan-logo-transparent.png
assets/brand/evan-logo-white.png
assets/brand/apple-touch-icon.png
assets/brand/android-chrome-192x192.png
assets/brand/android-chrome-512x512.png
assets/brand/icons/favicon.ico
assets/brand/icons/evan-logo.ico
assets/brand/png/evan-logo-16.png
assets/brand/png/evan-logo-32.png
assets/brand/png/evan-logo-48.png
assets/brand/png/evan-logo-64.png
assets/brand/png/evan-logo-128.png
assets/brand/png/evan-logo-180.png
assets/brand/png/evan-logo-192.png
assets/brand/png/evan-logo-256.png
assets/brand/png/evan-logo-512.png
assets/brand/png/evan-logo-1024.png
```

ICO 文件包含的尺寸：

```text
favicon.ico: 16x16, 32x32, 48x48
evan-logo.ico: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
```

处理后应检查：

- `evan-logo-transparent.png` 是 `RGBA`
- 透明主图角落 alpha 为 `0`
- `evan-logo-white.png` 是 `RGB`
- ICO 文件包含预期尺寸
- 小尺寸 PNG 仍能看清主体轮廓

可用 Python 检查：

```powershell
python -c "from PIL import Image; files=['assets/brand/evan-logo-transparent.png','assets/brand/evan-logo-white.png','assets/brand/png/evan-logo-16.png','assets/brand/png/evan-logo-1024.png']; [print(f, Image.open(f).mode, Image.open(f).size, 'corner_alpha', Image.open(f).convert('RGBA').getpixel((0,0))[3]) for f in files]; ico=['assets/brand/icons/favicon.ico','assets/brand/icons/evan-logo.ico']; [print(f, sorted(Image.open(f).info.get('sizes', []))) for f in ico]"
```

### 岛屿色键抠图

内置 Image Gen 默认不直接输出项目可控的透明 PNG，因此岛屿资源使用色键背景加本地抠图。

生成岛屿时使用纯色背景：

```text
#ff00ff
```

然后运行本地色键移除脚本，先输出未压缩透明 PNG：

```powershell
python "C:\Users\ASUS\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py" `
  --input "assets\islands\raw\ai-raw.png" `
  --out "assets\uncompressed\islands\ai.png" `
  --auto-key border `
  --soft-matte `
  --transparent-threshold 12 `
  --opaque-threshold 220 `
  --despill
```

每个岛屿都按同样方式处理，再从未压缩 PNG 生成网页加载用 WebP：

```powershell
@'
from pathlib import Path
from PIL import Image

for src in sorted(Path("assets/uncompressed/islands").glob("*.png")):
    with Image.open(src) as img:
        img = img.convert("RGBA")
        img.thumbnail((720, 720), Image.Resampling.LANCZOS)
        img.save(Path("assets/islands") / f"{src.stem}.webp", "WEBP", quality=82, method=6)
'@ | python -
```

处理后应检查：

- 文件模式是 `RGBA`
- 有 alpha 通道
- 边缘没有明显品红色残留
- 岛屿主体没有被误抠

可用 Python 检查：

```powershell
@'
from pathlib import Path
from PIL import Image

for path in sorted(Path("assets/uncompressed/islands").glob("*.png")):
    img = Image.open(path)
    print(f"{path}: {img.size}, mode={img.mode}, alpha={'A' in img.mode}")
'@ | python -
```

检查网页加载资源大小：

```powershell
Get-ChildItem -LiteralPath "assets\islands" -Filter *.webp | Select-Object Name,Length
```

## 项目内整理规则

生成图片后，不要直接引用 Codex 默认生成目录。

正确流程：

1. 生成图片。
2. 找到生成文件。
3. 复制到项目目录。
4. Logo 白底源文件放入 `assets/brand/raw/`。
5. 岛屿原始色键图放入 `assets/islands/raw/`。
6. 岛屿抠图后的未压缩 PNG 放入 `assets/uncompressed/islands/`。
7. 岛屿网页加载版 WebP 放入 `assets/islands/`。
8. 页面只引用压缩后的网页加载资源。
9. 更新 `assets/README.md` 和对应子目录 README。

## 页面引用方式

首页 favicon 和 Apple touch icon 使用：

```html
<link rel="icon" href="assets/brand/icons/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png" />
```

首页中岛屿图片使用：

```html
<img class="island-img" src="assets/islands/ai.webp" alt="" aria-hidden="true" />
```

文字必须单独写在 HTML 中：

```html
<span class="island-title">AI</span>
<span class="island-question">智能的本质是什么，<br />与人类智能如何不同？</span>
```

这样可以保证后续更新主题名、问题、链接时不需要重新生成图片。

## 不要做的事

- 不要把整页 UI 设计图作为网页背景。
- 不要把页面文字生成进图片里。
- 不要用 `#` 作为最终链接。
- 不要让项目依赖 `C:\Users\ASUS\.codex\generated_images\...` 下的文件。
- 不要只保留最终图而删除原始色键图；后续需要重新抠图时会很麻烦。
- 不要把 `VI/` 里的整页视觉参考图直接当 logo、favicon 或页面图标使用。
- 不要手工逐个缩放 logo 图标；使用 `scripts/build_brand_assets.py` 统一生成。

## 当前执行记录

当前资源生成方式：

- Logo：基于 `VI/` 视觉参考图使用内置 Image Gen 生成白底主图，复制到 `assets/brand/raw/evan-logo-white-bg.png`。
- Logo 透明 PNG 和 ICO：使用 `scripts/build_brand_assets.py` 本地处理后保存到 `assets/brand/`。
- Logo 页面引用：首页已引用 `assets/brand/icons/favicon.ico` 和 `assets/brand/apple-touch-icon.png`。
- 纸张纹理：内置 Image Gen 生成，未压缩源文件归档到 `assets/uncompressed/textures/paper-warm.png`，网页加载版保存到 `assets/textures/paper-warm.webp`。
- 五个岛屿：内置 Image Gen 生成 `#ff00ff` 色键图，保存到 `assets/islands/raw/`。
- 透明 PNG：使用 `remove_chroma_key.py` 本地处理后保存到 `assets/uncompressed/islands/`。
- 网页加载版：从未压缩 PNG 缩放并压缩为 WebP，保存到 `assets/islands/`。
- 首页引用：真实 HTML 叠加透明 WebP，文字与链接保持可编辑。
