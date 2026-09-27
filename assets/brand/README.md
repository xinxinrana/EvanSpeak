# Evan 品牌资源

这个目录存放由 `VI/` 视觉参考产出的、可直接使用的 logo 资源。

## 可直接使用的文件

- `evan-logo-transparent.png` — 1024px 透明底主 logo。
- `evan-logo-white.png` — 1024px 白底主 logo。
- `apple-touch-icon.png` — 180px 透明 app icon。
- `android-chrome-192x192.png` — 192px 透明 app icon。
- `android-chrome-512x512.png` — 512px 透明 app icon。
- `icons/favicon.ico` — 含 16 / 32 / 48px 三层的多尺寸 ICO。
- `icons/evan-logo.ico` — 含 16 / 32 / 48 / 64 / 128 / 256px 六层的多尺寸 ICO。
- `png/evan-logo-*.png` — 从 16px 到 1024px 的透明方形 PNG 导出。

## 源文件

- `raw/evan-logo-white-bg.png` — Image Gen 输出的白底原图。
- `references/` — 原始 `VI/` 参考板的英文命名副本。

## 重新生成

需要 Python 3 和 Pillow。请先在所用的 Python 环境中安装 Pillow，再从仓库根目录运行：

```bash
python3 scripts/build_brand_assets.py
```

脚本会去掉近白背景、把 logo 裁切到方形透明画布上，并写出全部 PNG 与 ICO 输出。
