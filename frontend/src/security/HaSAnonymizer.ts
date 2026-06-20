/**
 * HaSAnonymizer — 游戏信息安全门面
 *
 * 取名含义：Hash and Sanitize Anonymizer
 *
 * 作为整个安全体系的统一入口，协调三个子模块:
 *   1. DataSanitizer  — 数据清洗 + 结构校验
 *   2. IntegrityGuard  — 完整性签名 + 篡改检测
 *   3. SensitiveFilter — 敏感信息检测 + 脱敏
 *
 * 设计原则:
 *   - 单例模式，全局唯一实例
 *   - 管线式处理: Sanitize → Filter → Sign
 *   - 可配置开关，按环境裁剪
 *   - 为未来账户系统/Auth 留好挂载点
 */

import type { SecurityConfig, SecurePayload } from './types'
import { DEFAULT_SECURITY_CONFIG } from './types'
import { sanitize, validateSaveStructure } from './modules/DataSanitizer'
import { signSync, verifySync } from './modules/IntegrityGuard'
import { scanAndFilter } from './modules/SensitiveFilter'

export class HaSAnonymizer {
  private config: SecurityConfig
  private static instance: HaSAnonymizer | null = null

  private constructor(config?: Partial<SecurityConfig>) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config }
  }

  /** 获取单例实例 */
  static getInstance(config?: Partial<SecurityConfig>): HaSAnonymizer {
    if (!HaSAnonymizer.instance) {
      HaSAnonymizer.instance = new HaSAnonymizer(config)
    }
    return HaSAnonymizer.instance
  }

  /** 重置单例（用于测试或运行时切换配置） */
  static resetInstance(): void {
    HaSAnonymizer.instance = null
  }

  /** 动态更新配置 */
  configure(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /** 获取当前配置（只读） */
  getConfig(): Readonly<SecurityConfig> {
    return this.config
  }

  // ──── 核心管线 ────

  /**
   * 【写入管线】存档 → 清洗 → 过滤 → 签名 → 存储
   *
   * @param data - 原始游戏数据
   * @returns 签名后的安全载荷（可直接序列化存储）
   */
  secure<TData>(data: TData): SecurePayload<TData> {
    let processed = data

    // Step 1: 数据清洗
    if (this.config.sanitize) {
      processed = sanitize(processed, this.config)
    }

    // Step 2: 敏感信息过滤
    if (this.config.sensitiveFilter) {
      const result = scanAndFilter(processed, this.config)
      if (result.hasSensitive && !this.config.production) {
        console.warn(
          `[HaSAnonymizer] 安全管线检测到 ${result.paths.length} 处敏感信息`,
        )
      }
      processed = result.sanitized as TData
    }

    // Step 3: 完整性签名
    if (this.config.integrity) {
      return signSync(processed)
    }

    // 如果关闭完整性，返回一个占位签名
    return {
      data: processed,
      hash: 'unsigned',
      timestamp: Date.now(),
      version: 1,
    }
  }

  /**
   * 【读取管线】存储 → 校验签名 → 提取数据
   *
   * @param payload - 从存储中读取的安全载荷
   * @returns { trusted, data, reason } — trusted 为 true 时数据可靠
   */
  unseal<TData>(payload: SecurePayload<TData>): {
    trusted: boolean
    data: TData
    reason?: string
  } {
    // 完整性校验
    if (this.config.integrity) {
      const { valid } = verifySync(payload)
      if (!valid) {
        return {
          trusted: false,
          data: payload.data,
          reason: '数据完整性校验失败：存档可能已被篡改',
        }
      }
    }

    // 再次清洗（防御性：防止脏数据绕过写入管线直接注入存储）
    if (this.config.sanitize) {
      payload.data = sanitize(payload.data, this.config)
    }

    return { trusted: true, data: payload.data }
  }

  // ──── 便捷方法 ────

  /**
   * 校验存档数据结构是否合法
   */
  validateSave(data: unknown): boolean {
    return validateSaveStructure(data)
  }

  /**
   * 完整的安全管线（secure + 立即 unseal，用于自测）
   */
  roundTrip<TData>(data: TData): { trusted: boolean; data: TData } {
    const payload = this.secure(data)
    const { trusted, data: result } = this.unseal(payload)
    return { trusted, data: result }
  }
}

/** 便捷导出: 默认单例 */
export const anonymizer = HaSAnonymizer.getInstance()
