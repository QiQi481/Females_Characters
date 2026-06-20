/**
 * DataSanitizer — 数据清洗器
 *
 * 职责：
 * 1. 递归遍历数据对象，移除 undefined 值
 * 2. 截断超长字符串（防止注入大量垃圾数据）
 * 3. 白名单过滤字段（确保不出现在存档中）
 * 4. 类型强制校验——确保必要字段类型正确
 */

import type { SecurityConfig } from '../types'

/** 存档数据中绝不允许出现的字段（白名单反模式: 黑名单剔除） */
const FORBIDDEN_KEYS = new Set([
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'credential',
  'privateKey',
  '__debug',
  '__dev',
])

/** 字符串最大长度限制 */
const MAX_STRING_LENGTH = 10_000

/** 对象最大嵌套深度 */
const MAX_DEPTH = 20

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeValue(value: unknown, depth: number, config: SecurityConfig): unknown {
  if (depth > MAX_DEPTH) return '[MAX_DEPTH_EXCEEDED]'

  // null 保留（区分"无"和"未设置"）
  if (value === null) return null
  if (value === undefined) return undefined

  // 字符串: 截断过长内容
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      if (!config.production) {
        console.warn(
          `[DataSanitizer] 字符串过长 (${value.length} chars)，已截断至 ${MAX_STRING_LENGTH}`,
        )
      }
      return value.slice(0, MAX_STRING_LENGTH) + '…[TRUNCATED]'
    }
    return value
  }

  // 基本类型直接返回
  if (typeof value !== 'object') return value

  // 数组递归清洗
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, depth + 1, config))
      .filter((item) => item !== undefined)
  }

  // 普通对象递归清洗 + 黑名单剔除
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) {
      if (!config.production) {
        console.warn(`[DataSanitizer] 已剔除禁用字段: ${key}`)
      }
      continue
    }

    const cleaned = sanitizeValue((value as Record<string, unknown>)[key], depth + 1, config)
    if (cleaned !== undefined) {
      result[key] = cleaned
    }
  }
  return result
}

/**
 * 清洗数据对象，返回干净的拷贝
 * - 移除 undefined 字段
 * - 剔除黑名单中的敏感 key
 * - 截断超长字符串
 */
export function sanitize<T = unknown>(data: T, config: SecurityConfig): T {
  return sanitizeValue(data, 0, config) as T
}

/**
 * 校验 GameSave 结构是否合法
 * - 必须有 phase (string) 和 progress (number)
 */
export function validateSaveStructure(data: unknown): boolean {
  if (!isPlainObject(data)) return false
  return typeof data.phase === 'string' && typeof data.progress === 'number'
}
