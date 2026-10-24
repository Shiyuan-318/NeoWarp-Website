# NeoWarp 官网

NeoWarp（<https://github.com/Shiyuan-318/NeoWarp>）的静态多页官网，使用 **HTML + CSS + TypeScript** 编写。

顶部导航栏完全复刻 [SyServer 官网](https://github.com/Shiyuan-318/SyServer)的"液态玻璃"效果：贴顶全宽直角条，滚动后形变为居中悬浮圆角胶囊，含毛玻璃 + 边缘折射（SVG feDisplacementMap）+ 方向性高光，以及移动端汉堡菜单与错位淡入动画。

## 页面

| 文件 | 说明 |
| --- | --- |
| `index.html` | 主页：Hero、数据统计、功能特色卡片、**NeoWarp SOLO 与待办清单的 UI 操作演示**、CTA |
| `download.html` | 下载页：最新版本横幅、Windows / macOS / Linux 平台卡片、文件格式表格 |
| `wiki.html` | Wiki 页：侧边目录（滚动高亮）、快速上手 / 界面导览 / 文件格式 / AI 模型配置 / 协作 / 手机编程 / 扩展开发 / FAQ |

## 界面演示说明

- **NeoWarp SOLO**（主页）：纯 AI 工作台界面演示，与实际一致——左侧项目与会话栏、AI 对话（流式打字机输出、待办联动步骤卡片）、模型选择；可点击「打开独立舞台」体验绿旗 / 暂停 / 停止控制、变量监视器与项目"询问并等待"问答框。**按要求不含任何设置界面**。
- **待办清单**（主页）：液态玻璃风格界面，可交互——新增待办（可设提醒时间）、勾选完成、删除、筛选（全部 / 待完成 / 已完成）、进度统计，以及模拟的"到点系统通知"Toast。

两个演示仅供观看 UI，不具备真实的项目修改能力。

## 目录结构

```
├── index.html / download.html / wiki.html
├── assets/
│   ├── css/style.css        # 全部样式（设计系统复刻 SyServer）
│   ├── img/logo.png         # NeoWarp 官方 Logo
│   └── js/                  # tsc 编译产物（ESM）
└── src/
    ├── tsconfig.json
    └── ts/
        ├── nav.ts           # 液态玻璃导航栏（复刻 SyServer 逻辑）
        ├── main.ts          # 滚动入场动画、统计数字、当前页高亮
        ├── solo-demo.ts     # SOLO 界面演示交互
        ├── todo-demo.ts     # 待办清单演示交互
        └── wiki.ts          # Wiki 目录 scroll-spy
```

## 构建与预览

```bash
# 编译 TypeScript（输出到 js/）
tsc -p src/tsconfig.json

# 本地预览（任选一种静态服务器）
python3 -m http.server 8765
```

浏览器直接打开 `index.html` 亦可运行（脚本为标准 ESM，需通过 http:// 访问而非 file://）。

## 设计参考

- 导航栏 / 设计语言：SyServer 官网（Apple 风格深色 + 液态玻璃）
- 液态玻璃观感复刻 [Kyant0/AndroidLiquidGlass](https://github.com/Kyant0/AndroidLiquidGlass)（Apache-2.0）
- 产品信息与界面描述：NeoWarp README
