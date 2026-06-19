import './ExplorationHud.css'

type ExplorationHudTheme = 'paper' | 'night'

type ClueProgress = {
  found: number
  total: number
}

type ExplorationHudProps = {
  bottomText?: string
  clueProgress?: ClueProgress
  onOpenDictionary?: () => void
  onReturnToMenu?: () => void
  showBottom?: boolean
  showClueProgress?: boolean
  showDictionary?: boolean
  theme?: ExplorationHudTheme
}

const DEFAULT_BOTTOM_TEXT = 'WASD 移动 | E 交互 | Tab 词典'

function ExplorationHud({
  bottomText = DEFAULT_BOTTOM_TEXT,
  clueProgress,
  onOpenDictionary,
  onReturnToMenu,
  showBottom = false,
  showClueProgress = false,
  showDictionary = false,
  theme = 'paper',
}: ExplorationHudProps) {
  const themeClassName = `exploration-hud--${theme}`

  return (
    <>
      {showDictionary && onOpenDictionary && (
        <button
          className={`exploration-hud__dictionary ${themeClassName}__dictionary`}
          type="button"
          aria-label="打开词典"
          onClick={onOpenDictionary}
        >
          <img src="/assets/ui/open_book_icon.png" alt="" />
          <span>词典</span>
        </button>
      )}

      {showClueProgress && clueProgress && (
        <div className={`exploration-hud__clue-progress ${themeClassName}__clue-progress`}>
          线索 {clueProgress.found}/{clueProgress.total}
        </div>
      )}

      {showBottom && onReturnToMenu && (
        <div className={`exploration-hud__bottom ${themeClassName}__bottom`}>
          <div className={`exploration-hud__hint ${themeClassName}__hint`}>{bottomText}</div>
          <button
            className={`exploration-hud__return ${themeClassName}__return`}
            type="button"
            onClick={onReturnToMenu}
          >
            返回主菜单
          </button>
        </div>
      )}
    </>
  )
}

export default ExplorationHud
