# 代码冻结说明（v16 稳定基线）

**生效时间**：2026-10-12 11:52
**冻结对象**：`index.html` / `sw.js` / `manifest.json` / `icon*.svg`

## 冻结规则

v16 是当前**唯一可信版本**。除非测试跑出 BUG，否则**不准改动**已发布的功能代码。
具体包括：

- 工资计算、日历判定、请假扣款、加班费
- 语录四态状态机（`getQuoteMode` + `Q_START/Q_NORMAL/Q_OFF/Q_HOL`）
- 时间轴真实/显示进度分离（`tlSeg` 的 `live` / `disp` / `manual`）
- 四个复位按钮的语义
- 自定义背景图、毛玻璃、皮肤系统、PWA、Service Worker 策略

**允许的改动**：纯新增皮肤/主题的 CSS 与装饰层，且必须满足——
新增代码不得修改上述任何函数的签名与行为；
新增 CSS 一律挂在 `[data-theme="xxx"]` 命名空间下，不得写全局裸选择器；
每加一个主题就跑一遍 `_dev/test9.mjs`（PWA 完整性）与 `_dev/test-timeline.mjs`。

## 三重保护

| 层级 | 位置 | 恢复方式 |
|---|---|---|
| git 标签（主） | 本地 + GitHub，tag `stable-v16` | `cd salary-ticker && git reset --hard stable-v16` |
| 离线快照 | `../_frozen-v16/`（工作区根，**不会被部署**） | 直接拷贝文件回 `salary-ticker/` |
| 测试套件 | `salary-ticker/_dev/` 15 套 817 断言 | `cd _dev && node test.mjs` … |

快照目录里的 `CHECKSUMS.txt` 记录了每个文件的 SHA256，可用于判断当前文件是否被意外改动。

## 已知未验证项

- 真机触摸交互（测试是 mock DOM 模拟鼠标事件）
- 真实时钟驱动的 45 秒语录轮播
- 各皮肤在窄屏上的视觉排版

## 改动流程（解冻时）

1. `git checkout -b feat/xxx` 开分支，**不要直接改 main**
2. 改完跑 `_dev/` 全量测试
3. 全绿后再合回 main、打新 tag、发布
4. 发布后更新本文件的版本号与快照