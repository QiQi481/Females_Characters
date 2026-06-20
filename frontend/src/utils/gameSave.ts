/**
 * 游戏存档工具 — 江永村主线进度持久化
 *
 * 集成 HaSAnonymizer 安全管线:
 *   saveGame: GameSave → sanitize → filter → sign → store
 *   loadGame: store → verify → extract → GameSave
 *   兼容旧版未签名存档，自动迁移。
 */

import { anonymizer } from '../security'
import type { SecurePayload } from '../security'

/** 游戏进度阶段（数字越大进度越后） */
export const ProgressStage = {
  NOT_STARTED: 0,
  /** 开场旁白结束，即将进入对话 */
  DIALOG: 1,
  /** 阿禾对话结束，即将进入旁白2 */
  NARRATION2: 2,
  /** 旁白2结束，即将进入 Quiz */
  QUIZ: 3,
  /** Q1~Q2 完成，即将进入 Q3 匹配游戏 */
  MATCH_Q3: 4,
  /** 正在 Q3 匹配游戏中 */
  IN_MATCH: 5,
  /** 正在 Q4 最终问答中 */
  IN_Q4: 6,
  /** 全部完成 */
  DONE: 7,
} as const

export type ProgressStage =
  (typeof ProgressStage)[keyof typeof ProgressStage]

export interface GameSave {
  phase: string // 'chapter1' 等
  progress: ProgressStage
  savedAt: number
  /** 玩家所在的场景 ID，用于继续游戏时恢复到正确场景 */
  currentScene?: string
  /** 第一章发现的线索 ID 列表，用于继续游戏时恢复右上角线索进度 */
  clueFoundIds?: string[]
  /** 第一章教程是否已完成（防止边缘情况下重放教程） */
  tutorialDone?: boolean
  sceneSwitcherUnlocked?: boolean
}

const SAVE_KEY = 'sanchao-shu-save'
const storage = window.sessionStorage

/** 判断存储的 JSON 是否为 SecurePayload */
function isSecurePayload(raw: unknown): raw is SecurePayload {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'data' in raw &&
    'hash' in raw &&
    'version' in raw
  )
}

export function saveGame(save: GameSave): void {
  try {
    const secured = anonymizer.secure(save)
    storage.setItem(SAVE_KEY, JSON.stringify(secured))
  } catch {
    console.warn('游戏存档失败')
  }
}

export function loadGame(): GameSave | null {
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)

    // 检测是否为安全管线签名后的数据
    if (isSecurePayload(parsed)) {
      const { trusted, data } = anonymizer.unseal<GameSave>(
        parsed as SecurePayload<GameSave>,
      )
      if (!trusted) {
        console.warn('[游戏存档] 完整性校验失败，但仍尝试恢复数据')
      }
      return data
    }

    // 兼容旧版未签名存档：直接返回并自动迁移为签名版本
    const legacy = parsed as GameSave
    if (typeof legacy.phase === 'string' && typeof legacy.progress === 'number') {
      // 静默迁移：下次 saveGame 时会自动签名
      return legacy
    }

    return null
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  const save = loadGame()
  if (!save) return false
  // 校验存档必须包含必要字段，防止脏数据/残留数据误判为有效存档
  return typeof save.phase === 'string' && typeof save.progress === 'number'
}

export function deleteSave(): void {
  storage.removeItem(SAVE_KEY)
}
