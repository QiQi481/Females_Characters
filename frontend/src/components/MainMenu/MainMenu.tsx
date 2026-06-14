import { useState } from 'react'
import AboutModal from './AboutModal'
import SettingsModal from './SettingsModal'
import './MainMenu.css'

interface MainMenuProps {
  onStartGame: () => void
  onContinueGame: () => void
  onSettings: () => void
  onAbout: () => void
}

function MainMenu({ onStartGame, onContinueGame, onSettings, onAbout }: MainMenuProps) {
  const [showAbout, setShowAbout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const handleAbout = () => {
    setShowAbout(true)
    onAbout()
  }

  const handleSettings = () => {
    setShowSettings(true)
    onSettings()
  }

  return (
    <div className="main-menu">
      {/* 背景图 */}
      <div className="main-menu-bg" />

      {/* 内容层 */}
      <div className="main-menu-content">
        {/* 标题区域 — 用图片覆盖 */}
        <div className="title-area">
          <img
            src="/assets/nushu/title_logo.png"
            alt="三朝书"
            className="title-logo"
          />
        </div>

        {/* 按钮组 */}
        <div className="menu-buttons">
          <button className="menu-btn btn-start" onClick={onStartGame}>
            开始游戏
          </button>
          <button className="menu-btn btn-continue" onClick={onContinueGame}>
            继续游戏
          </button>
          <button className="menu-btn btn-settings" onClick={handleSettings}>
            设置
          </button>
          <button className="menu-btn btn-about" onClick={handleAbout}>
            关于女书
          </button>
        </div>

        {/* 版本号 */}
        <div className="version-tag">v1.0.0</div>
      </div>

      {/* 关于女书弹窗 */}
      <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />

      {/* 设置弹窗 */}
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}

export default MainMenu
