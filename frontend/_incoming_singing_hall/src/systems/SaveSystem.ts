/**
 * SaveSystem - localStorage 存档系统
 * 负责游戏进度的保存和读取
 */
import type { SaveData, DictionaryEntry } from '../types';
import { SAVE_KEY } from '../config';

/** 默认空存档 */
function createEmptySave(): SaveData {
  return {
    dictionary: {},
    sceneFlags: {},
    lastScene: 'MainScene',
    lastPosition: { x: 400, y: 300 },
  };
}

export class SaveSystem {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  // ==================== 存档读写 ====================

  /** 从 localStorage 加载存档 */
  load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        return JSON.parse(raw) as SaveData;
      }
    } catch (e) {
      console.warn('存档读取失败，使用新存档', e);
    }
    return createEmptySave();
  }

  /** 保存到 localStorage */
  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('存档保存失败', e);
    }
  }

  /** 重置存档 */
  reset(): void {
    this.data = createEmptySave();
    this.save();
  }

  // ==================== 词典操作 ====================

  /** 获取所有词典词条 */
  getDictionary(): Record<string, DictionaryEntry> {
    return this.data.dictionary;
  }

  /** 获取某个词条 */
  getEntry(id: string): DictionaryEntry | undefined {
    return this.data.dictionary[id];
  }

  /** 解锁词条（发现女书符号） */
  unlockEntry(entry: DictionaryEntry): void {
    if (!this.data.dictionary[entry.id]) {
      this.data.dictionary[entry.id] = { ...entry, unlocked: true, matched: false };
    } else {
      this.data.dictionary[entry.id].unlocked = true;
    }
    this.save();
  }

  /** 完成配对（将女书符号匹配到正确中文） */
  matchEntry(id: string): void {
    if (this.data.dictionary[id]) {
      this.data.dictionary[id].matched = true;
      this.save();
    }
  }

  /** 检查某词条是否已配对 */
  isEntryMatched(id: string): boolean {
    return this.data.dictionary[id]?.matched === true;
  }

  /** 获取已解锁但未配对的词条 */
  getUnmatchedEntries(): DictionaryEntry[] {
    return Object.values(this.data.dictionary).filter(
      (e) => e.unlocked && !e.matched
    );
  }

  /** 获取已配对的词条 */
  getMatchedEntries(): DictionaryEntry[] {
    return Object.values(this.data.dictionary).filter((e) => e.matched);
  }

  // ==================== 场景标记 ====================

  /** 设置场景完成标记 */
  setSceneFlag(sceneId: string, completed: boolean): void {
    this.data.sceneFlags[sceneId] = completed;
    this.save();
  }

  /** 检查场景是否完成 */
  isSceneCompleted(sceneId: string): boolean {
    return this.data.sceneFlags[sceneId] === true;
  }

  // ==================== 玩家状态 ====================

  /** 保存玩家最后位置 */
  setLastPosition(scene: string, x: number, y: number): void {
    this.data.lastScene = scene;
    this.data.lastPosition = { x, y };
    this.save();
  }

  /** 获取玩家最后位置 */
  getLastPosition(): { scene: string; x: number; y: number } {
    return {
      scene: this.data.lastScene,
      x: this.data.lastPosition.x,
      y: this.data.lastPosition.y,
    };
  }
}
