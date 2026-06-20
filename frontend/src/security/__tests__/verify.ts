/**
 * HaSAnonymizer 安全系统验证脚本
 *
 * 运行方式: npx tsx src/security/__tests__/verify.ts
 *
 * 覆盖:
 *   1. DataSanitizer — 黑名单字段剔除、超长截断、undefined 移除
 *   2. SensitiveFilter — 邮箱/手机/身份证等 PII 检测与脱敏
 *   3. IntegrityGuard  — 签名 + 验章 + 篡改检测
 *   4. HaSAnonymizer — 完整管线 (secure → unseal), roundTrip
 *   5. 配置开关       — integrity/production 等
 *   6. gameSave 集成  — 存储/读取/兼容旧档
 *   7. SaveSystem 集成 — 女书字典/歌堂存档/篡改检测
 */

// ──── 前置 mock（必须在任何用到 window 的模块 import 之前）────
const mockStorage = new Map<string, string>()
;(globalThis as Record<string, unknown>).window = {
  sessionStorage: {
    getItem: (k: string) => mockStorage.get(k) ?? null,
    setItem: (k: string, v: string) => mockStorage.set(k, v),
    removeItem: (k: string) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
  },
}

import { HaSAnonymizer } from '../HaSAnonymizer'
import { sanitize, validateSaveStructure } from '../modules/DataSanitizer'
import { scanAndFilter, detectOnly } from '../modules/SensitiveFilter'
import { signSync, verifySync } from '../modules/IntegrityGuard'
import { DEFAULT_SECURITY_CONFIG } from '../types'
import type { SecurePayload } from '../types'

/** 判断 JSON 解析结果是否为 SecurePayload */
function isSecurePayload(raw: unknown): raw is SecurePayload {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'data' in raw &&
    'hash' in raw &&
    'version' in raw
  )
}

// ──── 简易测试框架 ────

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.error(`  ❌ ${label}`)
    failed++
  }
}

function section(title: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('='.repeat(60))
}

// ──── 1. DataSanitizer ────

section('1. DataSanitizer — 数据清洗')

{
  const config = { ...DEFAULT_SECURITY_CONFIG, production: true }

  // 1a: 剔除黑名单字段
  const dirty = {
    phase: 'chapter1',
    password: 'secret123',
    token: 'abc.def.ghi',
    apiKey: 'sk-xxxxxxxxxxxx',
    normalField: 'hello',
  }
  const clean = sanitize(dirty, config) as typeof dirty
  assert('phase' in clean && clean.phase === 'chapter1', '保留合法字段')
  assert(!('password' in clean), '剔除 password')
  assert(!('token' in clean), '剔除 token')
  assert(!('apiKey' in clean), '剔除 apiKey')
  assert(clean.normalField === 'hello', '保留普通字段')
}

{
  // 1b: 长字符串截断
  const config = { ...DEFAULT_SECURITY_CONFIG, production: true }
  const longStr = 'x'.repeat(15000)
  const result = sanitize({ text: longStr }, config) as { text: string }
  assert(
    result.text.endsWith('…[TRUNCATED]') && result.text.length < 11000,
    '超长字符串截断',
  )
}

{
  // 1c: undefined 移除
  const config = { ...DEFAULT_SECURITY_CONFIG, production: true }
  const obj = { a: 1, b: undefined, c: null, d: 'ok' }
  const result = sanitize(obj, config) as Record<string, unknown>
  assert(!('b' in result), '移除 undefined 字段')
  assert(result.c === null, '保留 null')
  assert(result.a === 1, '保留数字')
}

{
  // 1d: 嵌套对象清理
  const config = { ...DEFAULT_SECURITY_CONFIG, production: true }
  const nested = {
    player: { name: 'test', __debug: true, score: 100 },
  }
  const result = sanitize(nested, config) as { player: Record<string, unknown> }
  assert(!('__debug' in result.player), '嵌套剔除 __debug')
  assert(result.player.score === 100, '保留嵌套合法字段')
}

{
  // 1e: validateSaveStructure
  assert(validateSaveStructure({ phase: 'ch1', progress: 3 }), '校验合法存档')
  assert(!validateSaveStructure({ phase: 'ch1' }), '拒绝缺少 progress')
  assert(!validateSaveStructure(null), '拒绝 null')
  assert(!validateSaveStructure('string'), '拒绝非对象')
}

// ──── 2. SensitiveFilter ────

section('2. SensitiveFilter — 敏感信息过滤')

{
  const config = { ...DEFAULT_SECURITY_CONFIG, production: true }

  // 2a: 邮箱检测
  const r1 = scanAndFilter({ contact: 'player@example.com' }, config)
  assert(r1.hasSensitive, '检测到邮箱')
  assert(r1.paths.some((p) => p.includes('email')), '标注 email 类型')

  // 2b: 手机号检测
  const r2 = scanAndFilter({ phone: '13800138000在留言里' }, config)
  assert(r2.hasSensitive, '检测到手机号')

  // 2c: 身份证检测
  const r3 = scanAndFilter({ id: '110101199001011234' }, config)
  assert(r3.hasSensitive, '检测到身份证号')

  // 2d: 无敏感信息
  const r4 = scanAndFilter({ text: '江永村的春天很美' }, config)
  assert(!r4.hasSensitive, '普通文本无敏感标记')

  // 2e: 脱敏效果
  const r5 = scanAndFilter({ email: 'admin@qq.com' }, config)
  const masked = r5.sanitized as { email: string }
  assert(masked.email !== 'admin@qq.com', '邮箱值已脱敏')
  assert(masked.email.includes('***'), '脱敏后含 *** 占位符')

  // 2f: detectOnly 快速检测
  const hits = detectOnly({ user: 'test@test.com' })
  assert(hits.length > 0, 'detectOnly 发现敏感信息')
}

// ──── 3. IntegrityGuard ────

section('3. IntegrityGuard — 完整性校验')

{
  // 3a: 签名 + 验证
  const data = { phase: 'chapter1', progress: 3 }
  const payload = signSync(data)
  assert(typeof payload.hash === 'string' && payload.hash.length >= 8, '生成有效 hash')
  assert(payload.version === 1, '版本号为 1')
  assert(payload.data === data, '数据引用正确')

  // 3b: 验证通过
  const { valid } = verifySync(payload)
  assert(valid, '完整性校验通过')

  // 3c: 篡改检测
  ;(payload as { data: { progress: number } }).data.progress = 999
  const { valid: tampered } = verifySync(payload)
  assert(!tampered, '检测到数据篡改')

  // 3d: 相同数据相同签名
  const p1 = signSync({ a: 1, b: 2 })
  const p2 = signSync({ a: 1, b: 2 })
  assert(p1.hash === p2.hash, '相同数据生成相同签名')

  // 3e: 不同数据不同签名
  const p3 = signSync({ a: 1, b: 3 })
  assert(p1.hash !== p3.hash, '不同数据生成不同签名')
}

// ──── 4. HaSAnonymizer 完整管线 ────

section('4. HaSAnonymizer — 安全门面')

{
  const anon = HaSAnonymizer.getInstance({ production: true })

  // 4a: secure + unseal 往返
  const original = { phase: 'chapter1', progress: 3, savedAt: Date.now() }
  const payload = anon.secure(original)
  assert('data' in payload && 'hash' in payload, 'secure 返回 SecurePayload')

  const { trusted, data } = anon.unseal(payload)
  assert(trusted, 'unseal 校验通过')
  assert(data.phase === original.phase, '数据正确恢复')

  // 4b: roundTrip 快捷测试
  const { trusted: rt, data: rtData } = anon.roundTrip({
    phase: 'chapter2',
    progress: 5,
  })
  assert(rt, 'roundTrip 校验通过')
  assert(rtData.phase === 'chapter2', 'roundTrip 数据一致')

  // 4c: 篡改检测（门面级）
  const payload2 = anon.secure({ phase: 'ch1', progress: 1 })
  ;(payload2 as { data: { progress: number } }).data.progress = 999
  const { trusted: t2 } = anon.unseal(payload2)
  assert(!t2, '门面级篡改检测生效')

  // 4d: validateSave 校验
  assert(anon.validateSave({ phase: 'ch1', progress: 1 }), '有效存档通过')
  assert(!anon.validateSave(null), 'null 被拒绝')
}

// ──── 5. 配置开关测试 ────

section('5. 配置开关')

{
  // 5a: 关闭完整性
  HaSAnonymizer.resetInstance()
  const anon = HaSAnonymizer.getInstance({
    integrity: false,
    production: true,
  })
  const payload = anon.secure({ test: 'data' })
  assert(payload.hash === 'unsigned', 'integrity=false 签名为 unsigned')

  // 5b: 生产模式静默
  const config = anon.getConfig()
  assert(config.production === true, '生产模式配置生效')

  // 恢复默认
  HaSAnonymizer.resetInstance()
}

// ──── 6. 模拟 gameSave 集成 ────

section('6. gameSave 集成模拟')

{
  mockStorage.clear()
  HaSAnonymizer.resetInstance()

  const { saveGame, loadGame, hasSave, deleteSave } =
    await import('../../utils/gameSave')

  // 6a: 首次加载无存档
  const first = loadGame()
  assert(first === null, '首次加载返回 null')
  assert(!hasSave(), 'hasSave 返回 false')

  // 6b: 保存 + 读取
  saveGame({ phase: 'chapter1', progress: 3, savedAt: Date.now() })
  const loaded = loadGame()
  assert(loaded !== null, '保存后可读取')
  assert(loaded!.phase === 'chapter1', 'phase 正确')
  assert(loaded!.progress === 3, 'progress 正确')

  // 6c: hasSave 确认
  assert(hasSave(), 'hasSave 返回 true')

  // 6d: deleteSave
  deleteSave()
  assert(!hasSave(), 'deleteSave 后 hasSave 为 false')
  assert(loadGame() === null, 'deleteSave 后 loadGame 返回 null')

  // 6e: 兼容旧版未签名存档
  const legacySave = { phase: 'chapter1', progress: 1, savedAt: 1000 }
  mockStorage.set(
    'sanchao-shu-save',
    JSON.stringify(legacySave),
  )
  const legacy = loadGame()
  assert(legacy !== null, '可读取旧版未签名存档')
  assert(legacy!.phase === 'chapter1', '旧版数据正确恢复')

  // 6f: 脏数据拒绝
  mockStorage.set('sanchao-shu-save', JSON.stringify({ junk: true }))
  const junk = loadGame()
  assert(junk === null, '脏数据被拒绝')
}

// ──── 7. SaveSystem 集成（女书字典/歌堂存档）────

section('7. SaveSystem 集成模拟')

{
  // 测试用的 localStorage mock（SaveSystem 使用 localStorage）
  const ls = new Map<string, string>()
  const originalLS = globalThis.localStorage

  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => ls.get(k) ?? null,
      setItem: (k: string, v: string) => ls.set(k, v),
      removeItem: (k: string) => ls.delete(k),
      clear: () => ls.clear(),
    },
    writable: true,
  })

  HaSAnonymizer.resetInstance()

  // 动态导入以获取最新模块状态
  const { SaveSystem, GLOBAL_SAVE_KEY } =
    await import('../../game/systems/SaveSystem')

  // 7a: 新建 SaveSystem（无存档）→ 返回空数据结构
  ls.clear()
  const sys1 = new SaveSystem()
  const data1 = sys1.getSaveData()
  assert(data1.version === 3, '空存档 version=3')
  assert(data1.unlockedEntries.length === 0, '空存档无已解锁词条')

  // 7b: 修改数据后 save，检查 storage 中是否为 SecurePayload
  sys1.unlockEntry({
    id: 'test_entry',
    sceneId: 'singingHall' as const,
    nushuText: '𛆤',
    meaning: '测试',
    clueIds: [],
    isMainEntry: true,
  })
  const storedRaw = ls.get(GLOBAL_SAVE_KEY)!
  const storedParsed = JSON.parse(storedRaw)
  assert(isSecurePayload(storedParsed), 'SaveSystem 写入的是 SecurePayload')
  assert(storedParsed.version === 1, 'payload version=1')

  // 7c: 新建另一个 SaveSystem 读取 → 数据一致
  const sys2 = new SaveSystem()
  const data2 = sys2.getSaveData()
  assert(data2.unlockedEntries.includes('test_entry'), '重新读取后词条仍在')
  assert(data2.entryDefinitions['test_entry']?.meaning === '测试', '词条含义正确')

  // 7d: 篡改检测 — hash 不匹配时 trusted=false，但仍返回数据（游戏宁可恢复数据）
  const hacked = { ...storedParsed, data: { ...storedParsed.data, unlockedEntries: ['hacked_entry'] } }
  ls.set(GLOBAL_SAVE_KEY, JSON.stringify(hacked))
  const sys3 = new SaveSystem()
  const data3 = sys3.getSaveData()
  assert(data3.unlockedEntries.length > 0, '篡改后仍返回可用数据')

  // 7e: 兼容旧版未签名存档
  ls.clear()
  const legacySave = {
    version: 3,
    entryDefinitions: {},
    unlockedEntries: ['legacy_entry'],
    matchedEntries: [],
    discoveredClues: [],
    completedScenes: [],
    playerPositions: {},
    filledSanChaoBookSlots: {},
  }
  ls.set(GLOBAL_SAVE_KEY, JSON.stringify(legacySave))
  const sys4 = new SaveSystem()
  const data4 = sys4.getSaveData()
  assert(data4.unlockedEntries.includes('legacy_entry'), '可读取旧版未签名存档')

  // 7f: 脏数据拒绝（字段缺失）
  ls.set(GLOBAL_SAVE_KEY, JSON.stringify({ junk: true }))
  const sys5 = new SaveSystem()
  const data5 = sys5.getSaveData()
  assert(data5.unlockedEntries.length === 0, '脏数据退回空存档')

  // 恢复 localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    value: originalLS,
    writable: true,
  })
}

// ──── 结果 ────

section('测试结果')
console.log(`\n  通过: ${passed}  失败: ${failed}`)
if (failed === 0) {
  console.log('  🎉 HaSAnonymizer 安全系统全部验证通过！\n')
} else {
  console.error(`  ⚠️  有 ${failed} 项测试未通过\n`)
  process.exit(1)
}
