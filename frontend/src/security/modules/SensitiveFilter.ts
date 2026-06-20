/**
 * SensitiveFilter — 敏感信息过滤器
 *
 * 职责：
 * 1. 递归扫描数据对象，检测可能的 PII（邮箱、IP、手机号等）
 * 2. 对检测到的敏感信息执行 mask/remove/redact 策略
 * 3. 返回扫描报告，用于安全审计日志
 *
 * 注意事项：
 * - 本项目为纯前端离线游戏，当前数据不对外传输
 * - 此模块为未来的网络通信/云存档做准备
 */

import type { SecurityConfig, SensitivePattern, SensitiveScanResult } from '../types'

// ──── 内置敏感信息检测模式 ────

const PATTERNS: SensitivePattern[] = [
  {
    name: 'email',
    test: (v) => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(v),
    strategy: 'mask',
  },
  {
    name: 'ipv4',
    test: (v) => /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(v),
    strategy: 'mask',
  },
  {
    name: 'phone_cn',
    test: (v) => /1[3-9]\d{9}/.test(v),
    strategy: 'mask',
  },
  {
    name: 'id_card_cn',
    test: (v) => /\b\d{17}[\dXx]\b/.test(v),
    strategy: 'remove',
  },
  {
    name: 'url_with_credentials',
    test: (v) => /https?:\/\/[^:]+:[^@]+@/.test(v),
    strategy: 'remove',
  },
  {
    name: 'debug_flag',
    test: (v) => /\b(?:__debug__|__dev__|DEV_MODE|DEBUG_MODE)\b/.test(v),
    strategy: 'redact',
  },
  {
    name: 'secret_key_pattern',
    test: (v) => /\b(?:sk-[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,})\b/.test(v),
    strategy: 'remove',
  },
]

// ──── 脱敏策略实现 ────

function maskMiddle(str: string): string {
  if (str.length <= 4) return '***'
  const head = str.slice(0, 2)
  const tail = str.slice(-2)
  return `${head}***${tail}`
}

function applyStrategy(value: string, strategy: SensitivePattern['strategy']): string {
  switch (strategy) {
    case 'mask':
      return maskMiddle(value)
    case 'remove':
      return '[REDACTED]'
    case 'redact':
      return '[FILTERED]'
  }
}

// ──── 递归扫描 ────

function scanValue(
  value: unknown,
  path: string,
  depth: number,
  config: SecurityConfig,
  found: string[],
): unknown {
  if (depth > 20) return value

  if (typeof value === 'string') {
    for (const pattern of PATTERNS) {
      if (pattern.test(value)) {
        found.push(`${path} [${pattern.name}]`)
        return applyStrategy(value, pattern.strategy)
      }
    }
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item, i) =>
      scanValue(item, `${path}[${i}]`, depth + 1, config, found),
    )
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>)) {
      result[key] = scanValue(
        (value as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
        depth + 1,
        config,
        found,
      )
    }
    return result
  }

  return value
}

// ──── 公开 API ────

/**
 * 扫描并过滤数据中的敏感信息
 *
 * @param data   - 待扫描的数据
 * @param config - 安全配置
 * @returns 扫描报告 + 脱敏后的数据
 */
export function scanAndFilter<T = unknown>(
  data: T,
  config: SecurityConfig,
): SensitiveScanResult {
  const paths: string[] = []
  const sanitized = scanValue(data, '', 0, config, paths)

  if (paths.length > 0 && !config.production) {
    console.warn(
      `[SensitiveFilter] 检测到 ${paths.length} 处敏感信息:`,
      paths,
    )
  }

  return {
    hasSensitive: paths.length > 0,
    paths,
    sanitized: sanitized as T,
  }
}

/**
 * 快速检测数据是否包含敏感信息（不执行脱敏）
 */
export function detectOnly(data: unknown): string[] {
  const paths: string[] = []
  scanValue(data, '', 0, { production: true } as SecurityConfig, paths)
  return paths
}
