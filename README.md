# NeoWarp 官网

NeoWarp 的静态官网。三个页面，没有构建步骤，没有第三方依赖。

## 页面

| 文件 | 内容 |
| --- | --- |
| `index.html` | 主页：AI 助手、协作与移动端、内置工作室、生态兼容、文件格式与安全 |
| `download.html` | 下载：各平台安装包、安装与升级说明 |
| `wiki.html` | 使用文档：15 个章节的目录 + 正文 |

## 目录结构

```
index.html  download.html  wiki.html   三个页面
css/style.css                          全部样式（设计令牌 + 组件 + 响应式）
js/main.js                             导航、主题切换、滚动进度条回退
js/wiki.js                             文档目录折叠、滚动高亮、移动端抽屉
font/                                  HarmonyOS Sans SC（子集化 woff2 + 原始 ttf）
assets/Logo.png                        站点图标与导航标识
*.png                                  应用截图
CNAME                                  GitHub Pages 域名
```

## 设计

深色「积木工作台」基调——产品本身是深色优先的代码编辑器，Logo 也压在黑底上，所以深色是品牌自洽的选择，而不是为了深色而深色。

配色直接取自 Logo：一条从蓝经紫过渡到橙、琥珀的渐变，用于字标与关键强调。各功能区块用 Scratch 积木的配色做分类标识（AI 蓝、协作橙、工作室紫、生态绿、文件粉），颜色在这里承担信息，而不是装饰。

浅色主题跟随系统，也可以在导航栏切换并记住选择；首屏内联脚本在首次绘制前应用主题，不会闪白。

## 性能

- 字体用 `fonttools` 子集化：只保留页面实际用到的 866 个字形，两个字重从 **16 MB 降到约 190 KB**（woff2），并 `preload` 关键权重。
- 图片按实际显示尺寸重新压缩（导航 Logo 从 539 KB 降到 16 KB）。
- 无框架、无构建、无第三方脚本；`main.js` 约 4 KB。

## 用到的现代 Web 能力

- **滚动进度条**：`animation-timeline: scroll()` 驱动，`@supports` 检测，不支持时用 `scroll` 监听回退。
- **跨文档视图过渡**：`@view-transition { navigation: auto }`，三个页面之间切换更连贯。
- **响应式**：容器查询、`clamp()` 流式字号（`rem + vw`）、`auto-fit` 网格、`dvh`。
- **颜色**：`color-mix(in oklab, …)` 做半透明叠色，深浅主题共用一套令牌。
- **偏好尊重**：`prefers-reduced-motion`、`prefers-color-scheme`、`prefers-contrast`。

页面刻意**没有**逐区块的滚动淡入：一个编排好的首屏动效（积木块依次吸附到位）加上进度条，比到处淡入更克制，也避免内容因动画而不可见。

## 无障碍

跳转链接、语义化 landmark（`header` / `nav` / `main` / `footer`）、每页唯一 `h1`、顺序标题层级、`focus-visible` 焦点环、装饰元素 `aria-hidden`、触控目标不小于 44px、正文行宽控制在 80 字符内。

## 本地预览

```bash
python -m http.server 8123
# 然后打开 http://127.0.0.1:8123/index.html
```

## 设计技能

本站在重写过程中使用了两个设计技能，已一并收录在 `.zcode/skills/` 下，便于后续会话复用：

- `frontend-design`（Anthropic）—— 视觉方向、字体与排版取舍、避免模板化设计。
- `modern-web-guidance`（Google Chrome）—— 现代 Web 最佳实践检索（动效、响应式、无障碍、视觉特效）。

## 部署

`CNAME` 指向 `e.np.sy1.top`，按 GitHub Pages 的静态站点方式发布：把仓库根目录作为站点根即可。
