# XP 界面资源来源

下载日期：2026-09-20。用于本地历史界面复刻，不是 AI 生成资产。

## 原版 Bliss 壁纸

- 本地：`../xp-bliss-original.bmp`
- 来源：<https://raw.githubusercontent.com/bartekl1/windows-ui-assets/main/Wallpapers/Windows%20XP/Desktop/Bliss.bmp>
- 归档目录：<https://github.com/bartekl1/windows-ui-assets/blob/main/Tables/Windows%20XP%20Wallpapers.md>
- BMP，800 × 600，1,440,054 bytes。
- SHA-256：`a7fe06971e9b8755ba46074d6a6a67087f264ba0386e24515f79f59388d930bb`
- 下载后未重绘、裁切、滤色或转码。CSS 按桌面拉伸显示。

## 原版 Shell 图标

来源目录：<https://github.com/bartekl1/windows-ui-assets/blob/main/Tables/Windows%20XP%20Icons.md>

原始 URL 模板：`https://raw.githubusercontent.com/bartekl1/windows-ui-assets/main/Icons/Windows%20XP/ico/shell32.dll/ICON{ID}_1.ico`

| 本地文件 | 来源 ID | 用途 |
| --- | --- | --- |
| shell-16.ico | 16 | 我的电脑 |
| shell-18.ico | 18 | 网上邻居 |
| shell-32.ico | 32 | 回收站 |
| shell-235.ico | 235 | 我的文档 |

## IE 与开始菜单位图

来源：<https://github.com/ShizukuIchi/winXP/tree/master/src/assets/windowsIcons>

URL 模板：`https://raw.githubusercontent.com/ShizukuIchi/winXP/master/src/assets/windowsIcons/{原文件名}`

| 本地文件 | 原文件名 |
| --- | --- |
| ie.png / mail.png / user.png | 同名 |
| back.png / forward.png / history.png / home.png / refresh.png / stop.png | 同名 |
| search.png | 299(32x32).png |
| favorite.png | 744(32x32).png |
| go.png | 290.png |
| ie-paper.png / windows.png | 同名 |

这些是第三方历史资源归档及仿真项目中的静态文件，不是微软官方下载渠道。下载可用不等于已获得商业再分发授权；发布前需单独核实原始资源权利。未下载或执行上述仓库的软件代码。

## Outlook Express 原型参考

- 本地：`../oe-reference-p1.jpg`
- 来源：<https://jsc.cc.ntu.edu.tw/ntucc/email/faq/header/p1.jpg>
- 用途：Outlook Express 6 工具栏位图的 CSS 精灵参考；仅裁取原图中的工具栏图标，邮件内容仍由本机剧情数据渲染。

## 2026-09-29 补充

- `folder.png`、`up.png`：同一 ShizukuIchi/winXP/src/assets/windowsIcons 目录中的同名文件，分别用于文件夹与向上按钮，原文件未经修改。
- `view-info.ico`：曾下载核对，图形与Explorer“视图”不符，未接入。当前“视图”按钮为依据参考结构的代码绘制，不能称作原版提取图标。
- 本轮参考截图位于 `artifacts/ui-reference/`，来源与界面差异详见设计文档71。

## 2026-10-01 启动音与开始图标
启动音：../audio/xp-startup.wav；来源 https://github.com/MCPlayer2015/all-windows-sounds/blob/main/(2001)%20Windows%20XP/Windows%20XP%20Startup.wav 。Microsoft 原系统音效，非自制或开放授权声明。
开始按钮改用手写透明 SVG：../xp-start-mark.svg，避免原 PNG 白底。
