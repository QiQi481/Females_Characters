# 三朝书 项目长期记忆

## 项目概述
- 游戏名：三朝书（SAN CHAO SHU）
- 类型：女书文化教育游戏
- 技术栈：React 19 + Phaser 3.90 + Vite 8 + TypeScript 6
- 架构：React 管理全局状态和UI覆盖层，Phaser 负责游戏场景交互

## 双字典系统（重要：两套并行）
1. **React 层字典**（`systems/dictionary/`）
   - `useDictionary` hook 管理，localStorage key: `san-chaoshu-global-dictionary` (v2)
   - `DictionaryOverlay` 全屏覆盖层UI，书本翻页+圆谱
   - `dictionaryData.ts` 定义16个词条（scene-1/2/3）和4行诗词拼图
   - 词条状态：locked → discovered → unlocked
   - 拼图匹配：用户选择词条 → 对比 correctEntryId → 成功解锁

2. **Phaser 层字典**（`game/systems/DictionarySystem` + `game/ui/DictionaryUI`）
   - `DictionarySystem` 封装 `SaveSystem`
   - `SaveSystem` localStorage key: `womenbook_singing_hall_save` (v3)
   - `DictionaryUI` 拖拽配对式面板
   - 坐歌堂 `MainScene` 直接使用这套系统
   - 女红房 `EmbroideryRoomPhaserScene` 也使用 `SaveSystem`，但通过 bridge 与 React 层通信

## 桥接机制
- `GlobalDictionaryBridge` 类型：`{ openDictionary(puzzle?), unlockEntry(id) }`
- 女红房：`EmbroideryDictionaryBridge = GlobalDictionaryBridge`（类型重导出）
- 实际 bridge 实例在 `EmbroideryRoomPhaser.tsx` 中创建，传入 Phaser Game registry
- 女红房 Phaser 场景内用 `SaveSystem`（Phaser层），但调用 `dictionaryBridge.openDictionary()` 时打开的是 React 层的 `DictionaryOverlay`

## 场景结构
- **女红房**（embroidery-room）：Phaser版（EmbroideryRoomPhaserScene）+ React版（EmbroideryRoom.tsx，已弃用）
- **坐歌堂**（singing-hall）：MainScene（Phaser）
- 场景切换：App.tsx 中 SceneSwitcher 组件

## 女红房交互流程
1. 进入 → 绣娘NPC自动开启intro对话
2. 探索6个交互物（5个clue + 1个culture）
3. 每个clue触发对话（含 `{{nushu}}` token），解锁对应词条
4. 收集5个前置clue后 → 绣娘触发"言"字拼图
5. Tab打开全局字典 → 选择正确词条 → 三朝书残页补入
6. 补入后 → 绣娘总结对话 → 场景完成

## CSS 变量设计系统
- `--ink`, `--paper`, `--cinnabar`, `--teal` 等
- 竖排书写：`writing-mode: vertical-rl`
