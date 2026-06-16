import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import {
  dictionaryPoemLines,
  entries,
  type DictionaryEntry,
  type DictionaryPuzzle,
} from './dictionaryData'
import type { DictionaryFeedback } from './useDictionary'
import './DictionaryOverlay.css'

type DictionaryOverlayProps = {
  isOpen: boolean
  activeEntryId: DictionaryEntry['id'] | null
  activePuzzle: DictionaryPuzzle | null
  feedback: DictionaryFeedback
  isResolvingPuzzle: boolean
  unlockedEntryIds: readonly DictionaryEntry['id'][]
  onClose: () => void
  onSelectEntry: (entryId: DictionaryEntry['id']) => void
  onUnlockEntry: (entryId: DictionaryEntry['id']) => void
}

function EntryGlyph({ entry }: { entry: DictionaryEntry }) {
  if (entry.nushuImages.length === 0) {
    return <span className="dictionary-placeholder-mark">女书</span>
  }

  return (
    <span
      className={`dictionary-nushu-images${
        entry.nushuImages.length > 1 ? ' is-compound' : ''
      }`}
      aria-hidden="true"
    >
      {entry.nushuImages.map((image, index) => (
        <img src={image} alt="" key={`${entry.id}-${index}`} />
      ))}
    </span>
  )
}

export function DictionaryOverlay({
  isOpen,
  activeEntryId,
  activePuzzle,
  feedback,
  isResolvingPuzzle,
  unlockedEntryIds,
  onClose,
  onSelectEntry,
}: DictionaryOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const unlockedIds = useMemo(
    () => new Set(unlockedEntryIds),
    [unlockedEntryIds],
  )
  const remainingEntryCount = entries.length - unlockedEntryIds.length

  useEffect(() => {
    if (!isOpen) return

    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onClose()
    }

    window.addEventListener('keydown', closeOnEscape, true)
    return () => window.removeEventListener('keydown', closeOnEscape, true)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="dictionary-overlay-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <section
        className="dictionary-stage"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-dictionary-title"
      >
        <h1 id="global-dictionary-title" className="dictionary-sr-only">
          三朝书词典
        </h1>

        <div className="open-book-area">
          <div className="dictionary-page-stack dictionary-page-stack-left" />
          <div className="dictionary-page-stack dictionary-page-stack-right" />
          <div className="dictionary-book-spine" aria-hidden="true" />

          <article className="dictionary-book-page left-book-page">
            <div
              className="dictionary-volume-status"
              aria-label={`三朝书残卷，待补之字 ${remainingEntryCount}，已识之字 ${unlockedEntryIds.length}`}
            >
              <span className="dictionary-volume-status-title">
                三朝书残卷
              </span>
              <span>
                待补之字
                <strong>{remainingEntryCount}</strong>
              </span>
              <span>
                已识之字
                <strong>{unlockedEntryIds.length}</strong>
              </span>
            </div>
          </article>

          <article className="dictionary-book-page right-book-page">
            <div className="dictionary-poem" aria-label="挖空三朝书文本">
              {dictionaryPoemLines.map((line) => (
                <p key={line.id}>
                  {line.segments.map((segment, index) => {
                    if (segment.type === 'text') {
                      return (
                        <span key={`${line.id}-text-${index}`}>
                          {segment.value}
                        </span>
                      )
                    }

                    const entry = entries.find(
                      (candidate) => candidate.id === segment.entryId,
                    )
                    const isUnlocked = unlockedIds.has(segment.entryId)
                    const isCurrentSlot =
                      activePuzzle?.activeEntryId === segment.entryId

                    return (
                      <button
                        className={`dictionary-poem-slot${
                          isUnlocked ? ' is-unlocked' : ''
                        }${isCurrentSlot ? ' is-current' : ''}`}
                        type="button"
                        disabled={Boolean(activePuzzle) || isResolvingPuzzle}
                        onClick={() => onSelectEntry(segment.entryId)}
                        aria-label={
                          isUnlocked
                            ? `已补全：${entry?.label ?? segment.entryId}`
                            : `${segment.placeholder}，待补全文字`
                        }
                        key={segment.slotId}
                      >
                        {isUnlocked
                          ? entry?.label ?? segment.placeholder
                          : segment.placeholder}
                      </button>
                    )
                  })}
                </p>
              ))}
            </div>
          </article>

          <button
            ref={closeButtonRef}
            className="dictionary-book-close"
            type="button"
            onClick={onClose}
            aria-label="合上三朝书词典"
          >
            合
          </button>
        </div>

        <aside className="glyph-orbit-area">
          <header className="dictionary-orbit-heading">
            <span>女书字词</span>
            <h2>字词圆谱</h2>
            <p>
              已解 {unlockedEntryIds.length} / {entries.length}
            </p>
          </header>

          <div className="dictionary-orbit" aria-label="全局女书字词圆谱">
            <i className="dictionary-orbit-ring dictionary-orbit-ring-one" />
            <i className="dictionary-orbit-ring dictionary-orbit-ring-two" />
            {entries.map((entry) => {
              const isUnlocked = unlockedIds.has(entry.id)
              const isActive = activeEntryId === entry.id
              const isPuzzleTarget = activePuzzle?.activeEntryId === entry.id
              const isUnavailableFinalYan =
                entry.id === 'yan' && !isUnlocked && !isPuzzleTarget
              const displayStatus = isUnlocked ? 'unlocked' : entry.status

              return (
                <button
                  className={`dictionary-entry dictionary-entry-${displayStatus}${
                    isActive ? ' is-active' : ''
                  }${isPuzzleTarget ? ' is-puzzle-target' : ''}`}
                  style={
                    {
                      '--entry-x': `${entry.position.x}%`,
                      '--entry-y': `${entry.position.y}%`,
                      '--entry-size': `${entry.size}px`,
                    } as CSSProperties
                  }
                  disabled={isResolvingPuzzle || isUnavailableFinalYan}
                  type="button"
                  aria-label={
                    isUnlocked
                      ? `${entry.label}，已解锁`
                      : `选择女书词条${entry.label}`
                  }
                  aria-pressed={isActive}
                  onClick={() => onSelectEntry(entry.id)}
                  key={entry.id}
                >
                  <span className="dictionary-entry-medallion">
                    <EntryGlyph entry={entry} />
                  </span>
                  {isUnlocked && (
                    <strong className="dictionary-entry-label">
                      {entry.label}
                    </strong>
                  )}
                </button>
              )
            })}
          </div>

          {feedback && (
            <p
              className={`dictionary-feedback-toast is-${feedback.type}`}
              role="status"
            >
              {feedback.message}
            </p>
          )}
        </aside>
      </section>
    </div>
  )
}
