# 《命运转盘》Demo 0.1

Cocos Creator **3.8.8** / TypeScript / 手机横屏。保留现有主界面，从「开始挑战」进入独立战斗场景。

左侧七等分命运转盘随机抽取一个基础职业（每次 10 金币）→ 专属三选一转职并确认 → 拖动布阵 → 确认布阵 → 全队自主战斗 → 升级强化 → 下一波，共五波。

当前转盘改造、验收结果和本次文件清单见 [七等分转盘交付说明](docs/ROULETTE_UPDATE.md)。

直接在 Creator 打开本目录，打开 `assets/scenes/MainMenu.scene`，点击预览。建议首波招募三位，兼顾前排和输出。

完整的新增文件清单、测试数值、已完成内容、限制与运行步骤见 [Demo 交付说明](docs/DEMO_0.1.md)。

```powershell
npm test                       # 纯逻辑与 100 局五波回归
npm run typecheck              # 使用本机 Creator 自带 TypeScript 检查项目代码
.\tools\build-demo.ps1          # 构建 Web 手机版，包含主界面和战斗场景
npm run serve:demo             # http://127.0.0.1:4173
# 另一个终端，可选：npm ci && npm run test:browser
```

所有数值和临时职业名称都是 Demo 测试配置，不代表正式设计。未执行 Git 提交或推送。
