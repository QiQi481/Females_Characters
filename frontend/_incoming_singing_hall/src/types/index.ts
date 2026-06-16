/**
 * 女书游戏 - 全局类型定义
 */

// ==================== 女书词条 ====================

/** 单个女书词条 */
export interface DictionaryEntry {
  /** 词条唯一ID，如 "song_ge" */
  id: string;
  /** 女书符号的展示文本（暂时用中文占位，后续替换为图片） */
  nvshuChar: string;
  /** 对应的中文含义 */
  chinese: string;
  /** 是否已解锁（玩家已发现） */
  unlocked: boolean;
  /** 是否已完成配对（玩家在词典中正确配对） */
  matched: boolean;
  /** 来源场景，如 "song" */
  sceneId: string;
  /** 语境提示文本 */
  hint: string;
}

// ==================== 存档结构 ====================

/** 玩家存档 */
export interface SaveData {
  /** 已解锁的词典词条（key = 词条ID） */
  dictionary: Record<string, DictionaryEntry>;
  /** 各场景完成标记 */
  sceneFlags: Record<string, boolean>;
  /** 玩家最后所在场景 */
  lastScene: string;
  /** 玩家最后位置 */
  lastPosition: { x: number; y: number };
}

// ==================== 线索类型 ====================

/** 线索交互类型 */
export type ClueType = 'view' | 'listen' | 'collect';

/** 场景中的线索对象 */
export interface Clue {
  /** 线索ID */
  id: string;
  /** 线索名称 */
  name: string;
  /** 线索位置 */
  x: number;
  y: number;
  /** 交互类型 */
  type: ClueType;
  /** 交互提示文字 */
  prompt: string;
  /** 是否为错误线索（不给女书符号，只给语境） */
  isFake: boolean;
  /** 关联的女书词条ID列表 */
  entryIds: string[];
  /** 查看时显示的文本 */
  displayText: string;
}

// ==================== NPC ====================

/** NPC 定义 */
export interface NPC {
  /** NPC ID */
  id: string;
  /** NPC 名称 */
  name: string;
  /** NPC 位置 */
  x: number;
  y: number;
  /** 对话内容（多条） */
  dialogues: string[];
  /** 交互提示 */
  prompt: string;
}

// ==================== 场景Key常量 ====================

/** 所有场景Key */
export const SceneKeys = {
  BOOT: 'BootScene',
  MAIN: 'MainScene',
  WEDDING: 'WeddingScene', // 场景1（队友开发）
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
