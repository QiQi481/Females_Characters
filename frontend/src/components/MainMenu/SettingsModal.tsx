import { useState, useEffect } from 'react'
import './SettingsModal.css'

interface GameSettings {
  bgmVolume: number       // 0-100
  sfxVolume: number       // 0-100
  textSpeed: 'slow' | 'normal' | 'fast'
}

interface SettingsModalProps {
  visible: boolean
  onClose: () => void
}

const STORAGE_KEY = 'sanchao-shu-settings'

const DEFAULT_SETTINGS: GameSettings = {
  bgmVolume: 70,
  sfxVolume: 80,
  textSpeed: 'normal',
}

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(s: GameSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch { /* ignore */ }
}

const TEXT_SPEED_OPTIONS = [
  { key: 'slow',   label: '慢' },
  { key: 'normal', label: '中' },
  { key: 'fast',   label: '快' },
] as const

function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)

  // 每次打开弹窗时重新读取
  useEffect(() => {
    if (visible) setSettings(loadSettings())
  }, [visible])

  if (!visible) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const update = (patch: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }

  return (
    <div className="settings-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal">
        {/* 关闭按钮 */}
        <button className="settings-close" onClick={onClose}>
          关闭
        </button>

        <div className="settings-body">
          <h2>⚙ 设置</h2>

          {/* ===== 音量 ===== */}
          <section className="settings-section">
            <h3>🎵 音量</h3>

            <div className="setting-row">
              <label className="setting-label" htmlFor="bgm-vol">背景音乐</label>
              <div className="slider-wrap">
                <input
                  id="bgm-vol"
                  type="range"
                  min="0"
                  max="100"
                  value={settings.bgmVolume}
                  onChange={(e) => update({ bgmVolume: Number(e.target.value) })}
                  className="setting-slider"
                />
                <span className="slider-val">{settings.bgmVolume}</span>
              </div>
            </div>

            <div className="setting-row">
              <label className="setting-label" htmlFor="sfx-vol">音效</label>
              <div className="slider-wrap">
                <input
                  id="sfx-vol"
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sfxVolume}
                  onChange={(e) => update({ sfxVolume: Number(e.target.value) })}
                  className="setting-slider"
                />
                <span className="slider-val">{settings.sfxVolume}</span>
              </div>
            </div>
          </section>

          {/* ===== 文本显示 ===== */}
          <section className="settings-section">
            <h3>📝 文本显示</h3>

            <div className="setting-row">
              <span className="setting-label">文本速度</span>
              <div className="speed-options">
                {TEXT_SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    className={`speed-btn ${settings.textSpeed === opt.key ? 'active' : ''}`}
                    onClick={() => update({ textSpeed: opt.key as GameSettings['textSpeed'] })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>


          </section>
        </div>
      </div>
    </div>
  )
}

export type { GameSettings }
export default SettingsModal
