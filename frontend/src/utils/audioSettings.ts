/**
 * 音频设置工具
 * 背景音乐音量统一从 localStorage 读取，范围 0-100，转成 HTML5/Phaser 的 0-1
 */

const STORAGE_KEY = 'sanchao-shu-settings'

/** 自定义事件名，在 SettingsModal 修改音量时触发 */
export const BGM_VOLUME_CHANGE_EVENT = 'bgm-volume-changed'

export function getBgmVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.bgmVolume === 'number') {
        return Math.max(0, Math.min(100, parsed.bgmVolume)) / 100
      }
    }
  } catch { /* ignore */ }
  // 默认 40 → 0.4
  return 0.4
}
