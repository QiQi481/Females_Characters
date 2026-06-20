/**
 * IntegrityGuard — 数据完整性守护
 *
 * 职责：
 * 1. 为存档数据生成哈希指纹
 * 2. 加载时校验哈希，检测数据是否被篡改
 * 3. 提供版本戳，追踪数据来源
 *
 * 使用 SubtleCrypto API 做 SHA-256，纯浏览器端实现，无需外部依赖。
 */

import type { SecurePayload } from '../types'

/** 当前安全协议版本 */
export const INTEGRITY_VERSION = 1

/**
 * 使用 Web Crypto API 生成 SHA-256 哈希
 */
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 对数据签名，生成带完整性标记的安全载荷
 */
export async function sign<TData>(data: TData): Promise<SecurePayload<TData>> {
  const payload = JSON.stringify(data)
  const hash = await sha256(payload)

  return {
    data,
    hash,
    timestamp: Date.now(),
    version: INTEGRITY_VERSION,
  }
}

/**
 * 同步签名（用于不需要 async 的场景，生成简化哈希）
 * 注意：这不是加密级哈希，只用于快速完整性检查
 */
export function signSync<TData>(data: TData): SecurePayload<TData> {
  const payload = JSON.stringify(data)
  const hash = simpleHash(payload)

  return {
    data,
    hash,
    timestamp: Date.now(),
    version: INTEGRITY_VERSION,
  }
}

/**
 * 校验安全载荷的完整性
 * @returns { valid, data } — valid 为 true 时数据可信
 */
export async function verify<TData>(
  payload: SecurePayload<TData>,
): Promise<{ valid: boolean; data: TData }> {
  try {
    const expectedHash = await sha256(JSON.stringify(payload.data))
    const valid = expectedHash === payload.hash && payload.version === INTEGRITY_VERSION
    return { valid, data: payload.data }
  } catch {
    return { valid: false, data: payload.data }
  }
}

/**
 * 同步校验（配合 signSync 使用）
 */
export function verifySync<TData>(
  payload: SecurePayload<TData>,
): { valid: boolean; data: TData } {
  try {
    const expectedHash = simpleHash(JSON.stringify(payload.data))
    const valid = expectedHash === payload.hash && payload.version === INTEGRITY_VERSION
    return { valid, data: payload.data }
  } catch {
    return { valid: false, data: payload.data }
  }
}

/**
 * 简单非加密哈希（FNV-1a 变体），用于快速完整性校验
 */
function simpleHash(str: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    hash = hash >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
