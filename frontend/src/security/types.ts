/**
 * HaSAnonymizer 安全体系 — 类型定义
 *
 * 职责：
 * - DataSanitizer:  清洗数据结构，移除 null/undefined/敏感字段
 * - IntegrityGuard: 数据完整性校验，防篡改
 * - SensitiveFilter: 识别并过滤 PII / 调试信息等敏感内容
 */

/** 安全管线处理后的存档包装 */
export interface SecurePayload<TData = unknown> {
  /** 原始数据 */
  data: TData
  /** 完整性的哈希值 */
  hash: string
  /** 生成时间戳 */
  timestamp: number
  /** 安全管线版本 */
  version: 1
}

/** 敏感信息扫描结果 */
export interface SensitiveScanResult {
  /** 是否发现敏感内容 */
  hasSensitive: boolean
  /** 发现的具体字段路径列表 */
  paths: string[]
  /** 脱敏后的数据 */
  sanitized: unknown
}

/** 敏感信息模式 */
export interface SensitivePattern {
  name: string
  /** 正则或检测函数 */
  test: (value: string) => boolean
  /** 替换策略: 'mask' | 'remove' | 'redact' */
  strategy: 'mask' | 'remove' | 'redact'
}

/** 安全管线配置 */
export interface SecurityConfig {
  /** 是否启用完整性校验 */
  integrity: boolean
  /** 是否启用敏感信息过滤 */
  sensitiveFilter: boolean
  /** 是否启用数据清洗 */
  sanitize: boolean
  /** 生产模式 (true 时日志静默) */
  production: boolean
}

/** 默认配置 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  integrity: true,
  sensitiveFilter: true,
  sanitize: true,
  production: false,
}
