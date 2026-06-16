/**
 * DictionarySystem - 女书词典系统
 * 管理词条解锁、配对验证、推测句子验证
 */
import type { DictionaryEntry } from '../types';
import { SaveSystem } from './SaveSystem';

export class DictionarySystem {
  private saveSystem: SaveSystem;

  constructor(saveSystem: SaveSystem) {
    this.saveSystem = saveSystem;
  }

  // ==================== 词条解锁 ====================

  /** 解锁一个词条 */
  unlock(entry: DictionaryEntry): void {
    this.saveSystem.unlockEntry(entry);
  }

  /** 获取所有已解锁词条 */
  getUnlocked(): DictionaryEntry[] {
    const dict = this.saveSystem.getDictionary();
    return Object.values(dict).filter((e) => e.unlocked);
  }

  /** 获取所有已配对词条 */
  getMatched(): DictionaryEntry[] {
    return this.saveSystem.getMatchedEntries();
  }

  /** 获取未配对的词条 */
  getUnmatched(): DictionaryEntry[] {
    return this.saveSystem.getUnmatchedEntries();
  }

  // ==================== 配对验证 ====================

  /**
   * 尝试将女书符号配对到中文含义
   * @param entryId 词条ID
   * @param chinese 玩家选择的中文
   * @returns 是否正确配对
   */
  tryMatch(entryId: string, chinese: string): boolean {
    const entry = this.saveSystem.getEntry(entryId);
    if (!entry) return false;

    if (entry.chinese === chinese) {
      this.saveSystem.matchEntry(entryId);
      return true;
    }
    return false;
  }

  /** 检查某个词条是否已配对 */
  isMatched(entryId: string): boolean {
    return this.saveSystem.isEntryMatched(entryId);
  }

  // ==================== 句子推测验证 ====================

  /**
   * 验证玩家推测的句子
   * @param entries 词条ID数组（按句子顺序）
   * @param expected 期望的词条ID顺序
   * @returns 是否正确
   */
  verifySentence(entries: string[], expected: string[]): boolean {
    if (entries.length !== expected.length) return false;
    return entries.every((id, i) => id === expected[i]);
  }

  /**
   * 根据词条ID顺序，获取对应中文句子
   */
  buildChineseSentence(entryIds: string[]): string {
    return entryIds
      .map((id) => {
        const entry = this.saveSystem.getEntry(id);
        return entry ? entry.chinese : '?';
      })
      .join('');
  }

  // ==================== 场景完成检查 ====================

  /** 检查指定词条是否全部配对 */
  areAllMatched(entryIds: string[]): boolean {
    return entryIds.every((id) => this.saveSystem.isEntryMatched(id));
  }

  /** 设置场景完成 */
  completeScene(sceneId: string): void {
    this.saveSystem.setSceneFlag(sceneId, true);
  }

  /** 检查场景是否已完成 */
  isSceneComplete(sceneId: string): boolean {
    return this.saveSystem.isSceneCompleted(sceneId);
  }
}
