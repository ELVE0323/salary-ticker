# 秒薪 · 源码说明

## 这是什么
一个纯静态的实时工资计算器 PWA（原生 HTML/CSS/JS，无框架、无构建、无后端）。
打开 `index.html` 就能跑，双击即可，不需要装任何环境。

## 目录结构

| 文件 | 作用 | 重要度 |
|---|---|---|
| `index.html` | **主程序**。HTML + CSS + 全部 JS 都在这一个文件里（约 380KB） | ★★★ 改 95% 的改动都在这里 |
| `sw.js` | Service Worker。缓存策略是「网络优先」，断网兜底回本地缓存 | ★★ 改功能后要把 `CACHE` 版本号 +1 |
| `manifest.json` | PWA 清单，装到手机桌面用 | ★ 别动 |
| `icon.svg` / `icon-maskable.svg` | 图标 | ★ 别动 |
| `_dev/` | 开发用测试脚本，**不影响程序运行**，可以不带走 | ☆ |

## 关键内部结构（改之前先知道东西在哪）

- **配置对象 `CFG`**：月薪、上下班时间、午休时间、休息制度（`double`双休 / `single`单休 / `alt`大小周）、
  调休上班日 `MAKEUP`、法定节假日 `HOLIDAYS`，都存在浏览器 `localStorage` 里，换设备不会同步。
- **日历状态 `baseStatus(key)` / `statusOf(key)`**：
  返回 0=休息、1=上班、2=全天请假、3=半天假。**大小周轮换、调休、法定假日全靠这里算**。
- **语录状态机 `getQuoteMode(now)`**：返回 `hol` / `start` / `normal` / `off`，
  四个库分别是 `Q_HOL`（放假）/ `Q_START`（上班后2小时）/ `Q_NORMAL`（上班满2小时到下班）/ `Q_OFF`（下班后到次日上班前）。
  放假语录跟日历状态强绑定，改日历逻辑时这里要一起看。
- **时间轴 `tlSeg`（每段 `{s,e,manual,disp,live}`）**：
  - `s/e` 真实工作时间（分钟），只来自 `CFG`，拖动绝不修改；
  - `live` = **liveProgress**，`calcLivePct(i, now, today)` 每帧按真实时间算（手动状态也照算）；
  - `disp` = **displayProgress**，页面实际显示的进度；
  - `manual=false` 时 `disp` 恒等于 `live`；`manual=true` 时 `disp` 由用户拖动控制，`live` 只算不覆盖；
  - **非工作日**（`today.tStatus` 为 0 或 2）三条 `live` 全 0；
  - `tlEnsureToday(today)` 每帧校验，跨天 / 配置变更自动重建并清掉上一工作日残留的 `manual`；
  - **所有视觉元素统一用 `disp`**：滑块 left、填充 width、斜纹、百分比文字 `pctA/B/C`；
  - **复位语义**：单条只清该段 `manual` 并把 `disp` 同步到该段最新 `live`；全部复位三段都同步。
    复位不改 `s/e`、不动 `CFG`/工资/日历、不触发拖动彩蛋。
- **彩蛋语录 `EGG_QUOTES`**：拖动时间轴触发的独立彩蛋层，和上面四个库互不干扰；
  语录自动轮播/状态切换在 `eggActive` 时不打断彩蛋。
- **版本号 `APP_VER`**：`var` 声明（用 `var` 是为了避免 TDZ 报错），**每次改功能就 +1**。

## 改完之后必须做的三件事

1. `APP_VER` +1（页面底部会显示版本号，方便确认手机上是不是新版）
2. `sw.js` 里 `CACHE = 'salary-ticker-vN'` 也要 +1 —— **不然手机会一直卡在旧缓存**，这个坑踩过一次
3. 跑一遍测试：`cd _dev && node test-quote.mjs` 等，全绿再发布

## 测试说明（`_dev/`）

```bash
cd _dev
node test.mjs        # 工资计算
node test-timeline.mjs  # 时间轴真实/显示进度分离（13 条验收 + 非工作日 + 跨天）
node test-quote.mjs  # 语录四态状态机（19 个时段/场景仿真）
... 共 15 套，约 817 项断言
```

依赖：Node.js 18+（不需要 `npm install`）。测试会从 `../index.html` 里抽取脚本跑逻辑仿真，
所以**改完代码先跑测试再发布**。

## 发布

把 `index.html` / `sw.js` / `manifest.json` / `icon*.svg` 上传到静态托管即可。
注意：`index.html` 要放在目录的 `index.html`（很多静态服务器需要它在入口）。

## 提醒

- `localStorage` 里的配置（月薪等）是**按设备、按浏览器**存的。手机上设的上下班时间不会带到电脑，
  反之亦然。语录、时间轴这些都是纯本地，不上传。
- 这个项目没有后端，所有计算都在浏览器里完成，不产生任何网络请求（除了读你自己配的背景图）。