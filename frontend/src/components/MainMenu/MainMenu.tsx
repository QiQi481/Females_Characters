import { useState } from 'react'
import AboutModal from './AboutModal'
import SettingsModal from './SettingsModal'
import './MainMenu.css'

interface MainMenuProps {
  onStartGame: () => void
  onContinueGame: () => void
  onSettings: () => void
  onAbout: () => void
  hasSavedGame: boolean
}

function MainMenu({
  onStartGame,
  onContinueGame,
  onSettings,
  onAbout,
  hasSavedGame,
}: MainMenuProps) {
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
      <div className="main-menu-bg" />

      <div className="main-menu-content">
        <section className="main-menu-title" aria-label="三朝书">
          <img
            src="/assets/main-menu/title_logo.png"
            alt="三朝书"
            className="title-logo"
          />
          <div className="title-text-lockup" aria-hidden="true">
            <span>三</span>
            <i />
            <span>朝</span>
            <i />
            <span>书</span>
          </div>
          <p className="title-roman">SAN CHAO SHU</p>
        </section>

        <nav className="main-menu-actions" aria-label="主菜单">
          <button
            className="menu-btn menu-btn-primary"
            onClick={onStartGame}
            type="button"
          >
            <span className="menu-btn-marker" aria-hidden="true" />
            <span>开始游戏</span>
          </button>
          <button
            className={`menu-btn${!hasSavedGame ? ' disabled' : ''}`}
            onClick={onContinueGame}
            disabled={!hasSavedGame}
            type="button"
          >
            <span>继续游戏</span>
          </button>
          <button className="menu-btn" onClick={handleSettings} type="button">
            <span>设置</span>
          </button>
          <button className="menu-btn" onClick={handleAbout} type="button">
            <span>关于女书</span>
          </button>
        </nav>

        <div className="version-tag">v1.0.0</div>
      </div>

      <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}

export default MainMenu
