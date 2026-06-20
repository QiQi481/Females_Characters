/**
 * HaSAnonymizer 安全体系 — 统一导出
 *
 * 使用方式:
 *
 *   // 基础使用
 *   import { anonymizer } from '@/security'
 *   const payload = anonymizer.secure(myData)
 *   const { trusted, data } = anonymizer.unseal(payload)
 *
 *   // 自定义配置
 *   import { HaSAnonymizer } from '@/security'
 *   const myAnon = HaSAnonymizer.getInstance({
 *     production: true,
 *     integrity: false,
 *   })
 */

export { HaSAnonymizer, anonymizer } from './HaSAnonymizer'
export { sanitize, validateSaveStructure } from './modules/DataSanitizer'
export { sign, signSync, verify, verifySync } from './modules/IntegrityGuard'
export { scanAndFilter, detectOnly } from './modules/SensitiveFilter'
export type {
  SecurityConfig,
  SecurePayload,
  SensitiveScanResult,
  SensitivePattern,
} from './types'
export { DEFAULT_SECURITY_CONFIG } from './types'
