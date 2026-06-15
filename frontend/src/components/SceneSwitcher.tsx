import { useEffect, useRef, useState } from 'react'
import './SceneSwitcher.css'

type SceneOption<SceneId extends string> = {
  id: SceneId
  label: string
}

type SceneSwitcherProps<SceneId extends string> = {
  currentScene: SceneId
  scenes: readonly SceneOption<SceneId>[]
  onSceneChange: (sceneId: SceneId) => void
  onResetProgress: () => void
}

function SceneSwitcher<SceneId extends string>({
  currentScene,
  scenes,
  onSceneChange,
  onResetProgress,
}: SceneSwitcherProps<SceneId>) {
  const [isOpen, setIsOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const currentLabel =
    scenes.find((scene) => scene.id === currentScene)?.label ?? ''

  useEffect(() => {
    if (!isOpen) return

    const closeMenu = (event: MouseEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', closeMenu)
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeMenu)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return (
    <div className="scene-switcher" ref={switcherRef}>
      <span className="scene-switcher__brand">
        三朝书 · SAN CHAO SHU
      </span>
      <button
        className="scene-switcher__trigger"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{currentLabel}</span>
        <span
          className={`scene-switcher__arrow${isOpen ? ' is-open' : ''}`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="scene-switcher__menu" role="menu">
          {scenes.map((scene) => {
            const isCurrent = scene.id === currentScene

            return (
              <button
                className={`scene-switcher__option${isCurrent ? ' is-current' : ''}`}
                type="button"
                role="menuitem"
                key={scene.id}
                onClick={() => {
                  onSceneChange(scene.id)
                  setIsOpen(false)
                }}
              >
                <span>{scene.label}</span>
                {isCurrent && <span aria-hidden="true">·</span>}
              </button>
            )
          })}
          <button
            className="scene-switcher__option scene-switcher__reset"
            type="button"
            role="menuitem"
            onClick={() => {
              const shouldReset = window.confirm(
                '确定开始新游戏并清除当前进度吗？',
              )
              if (!shouldReset) return
              onResetProgress()
              setIsOpen(false)
            }}
          >
            <span>新游戏 / 重置进度</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default SceneSwitcher
