import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
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
  activeClueEntryId: DictionaryEntry['id'] | null
  activePuzzle: DictionaryPuzzle | null
  feedback: DictionaryFeedback
  failedSlotId: string | null
  isResolvingPuzzle: boolean
  placedSlots: Record<string, DictionaryEntry['id']>
  unlockedEntryIds: readonly DictionaryEntry['id'][]
  hasSeenGuide: boolean
  onClose: () => void
  onCloseClue: () => void
  onDismissGuide: () => void
  onOpenClue: (entryId: DictionaryEntry['id']) => void
  onPlaceEntryToSlot: (
    entryId: DictionaryEntry['id'],
    slotId: string,
  ) => boolean
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

function ClueTextWithGlyph({
  entry,
  text,
}: {
  entry: DictionaryEntry
  text: string
}) {
  const parts = text.split('{{nushu}}')

  return (
    <>
      {parts.map((part, index) => (
        <span key={`${entry.id}-clue-part-${index}`}>
          {part}
          {index < parts.length - 1 && (
            <span className="dictionary-clue-inline-glyph">
              <EntryGlyph entry={entry} />
            </span>
          )}
        </span>
      ))}
    </>
  )
}

export function DictionaryOverlay({
  isOpen,
  activeEntryId,
  activeClueEntryId,
  activePuzzle,
  feedback,
  failedSlotId,
  isResolvingPuzzle,
  placedSlots,
  unlockedEntryIds,
  hasSeenGuide,
  onClose,
  onCloseClue,
  onDismissGuide,
  onOpenClue,
  onPlaceEntryToSlot,
}: DictionaryOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [draggingEntryId, setDraggingEntryId] =
    useState<DictionaryEntry['id'] | null>(null)
  const unlockedIds = useMemo(
    () => new Set(unlockedEntryIds),
    [unlockedEntryIds],
  )
  const activeClueEntry = useMemo(
    () =>
      activeClueEntryId
        ? entries.find((entry) => entry.id === activeClueEntryId) ?? null
        : null,
    [activeClueEntryId],
  )
  const remainingEntryCount = entries.length - unlockedEntryIds.length
  const shouldShowGuide = !hasSeenGuide && !activeClueEntry
  const placedEntryIds = useMemo(
    () => new Set(Object.values(placedSlots)),
    [placedSlots],
  )

  useEffect(() => {
    if (!isOpen) return

    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key.toLowerCase() !== 'q') return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (activeClueEntryId) {
        onCloseClue()
        return
      }
      onClose()
    }

    window.addEventListener('keydown', closeOnEscape, true)
    return () => window.removeEventListener('keydown', closeOnEscape, true)
  }, [activeClueEntryId, isOpen, onClose, onCloseClue])

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

                    const requiredEntryId =
                      segment.requiredEntryId ?? segment.entryId
                    const placedEntryId = placedSlots[segment.slotId]
                    const placedEntry = placedEntryId
                      ? entries.find(
                          (candidate) => candidate.id === placedEntryId,
                        )
                      : null
                    const isPlaced = Boolean(placedEntry)
                    const isCurrentSlot =
                      activePuzzle?.activeEntryId === requiredEntryId
                    const isFailed = failedSlotId === segment.slotId

                    return (
                      <button
                        className={`dictionary-poem-slot${
                          isPlaced ? ' is-placed' : ''
                        }${isCurrentSlot ? ' is-current' : ''}${
                          isFailed ? ' is-error' : ''
                        }${
                          draggingEntryId && !isPlaced
                            ? ' is-drop-ready'
                            : ''
                        }`}
                        type="button"
                        onDragOver={(event) => {
                          if (isResolvingPuzzle) return
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'copy'
                        }}
                        onDrop={(event) => {
                          event.preventDefault()
                          const entryId =
                            event.dataTransfer.getData(
                              'application/x-sanchaoshu-entry-id',
                            ) || event.dataTransfer.getData('text/plain')

                          if (!entryId) return
                          setDraggingEntryId(null)
                          onPlaceEntryToSlot(entryId, segment.slotId)
                        }}
                        aria-label={
                          isPlaced
                            ? `已补全：${placedEntry?.label ?? placedEntryId}`
                            : `${segment.placeholder}，待补全文字`
                        }
                        key={segment.slotId}
                      >
                        {isPlaced
                          ? placedEntry?.label ?? segment.placeholder
                          : segment.placeholder}
                      </button>
                    )
                  })}
                </p>
              ))}
            </div>
          </article>

          <article className="dictionary-book-page right-book-page">
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

          <button
            ref={closeButtonRef}
            className="dictionary-book-close"
            type="button"
            onClick={onClose}
            aria-label="合上三朝书词典"
          >
            合
          </button>
          {draggingEntryId && (
            <p className="dictionary-drop-guide" role="status">
              将字牌放入空缺处。
            </p>
          )}
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
              const isPlacedEntry = placedEntryIds.has(entry.id)
              const isActive = activeEntryId === entry.id
              const isPuzzleTarget = activePuzzle?.activeEntryId === entry.id
              const displayStatus = isUnlocked ? 'unlocked' : 'locked'

              return (
                <button
                  className={`dictionary-entry dictionary-entry-${displayStatus}${
                    isActive ? ' is-active' : ''
                  }${isPuzzleTarget ? ' is-puzzle-target' : ''}${
                    isPlacedEntry ? ' is-placed-entry' : ''
                  }`}
                  style={
                    {
                      '--entry-x': `${entry.position.x}%`,
                      '--entry-y': `${entry.position.y}%`,
                      '--entry-size': `${entry.size}px`,
                    } as CSSProperties
                  }
                  disabled={isResolvingPuzzle}
                  draggable={isUnlocked && !isPlacedEntry}
                  type="button"
                  aria-label={
                    isUnlocked
                      ? `查看${entry.label}的线索`
                      : '尚未获得这个字的线索'
                  }
                  aria-pressed={isActive}
                  onClick={() => {
                    onDismissGuide()
                    onOpenClue(entry.id)
                  }}
                  onDragStart={(event) => {
                    if (!isUnlocked || isPlacedEntry) {
                      event.preventDefault()
                      return
                    }

                    onDismissGuide()
                    setDraggingEntryId(entry.id)
                    event.dataTransfer.effectAllowed = 'copy'
                    event.dataTransfer.setData(
                      'application/x-sanchaoshu-entry-id',
                      entry.id,
                    )
                    event.dataTransfer.setData('text/plain', entry.id)
                  }}
                  onDragEnd={() => setDraggingEntryId(null)}
                  key={entry.id}
                >
                  <span className="dictionary-entry-medallion">
                    <EntryGlyph entry={entry} />
                  </span>
                  <span className="dictionary-entry-hint">
                    {isPlacedEntry
                      ? '已补全 · 点按回看线索'
                      : isUnlocked
                      ? '点按查看线索 · 拖至残卷空缺'
                      : '尚未获得这个字的线索'}
                  </span>
                </button>
              )
            })}
          </div>

          {shouldShowGuide && (
            <div className="dictionary-first-guide" role="note">
              <span>点按女书字，可读她留下的线索。</span>
              <span>按住已得字牌，拖入残卷空缺处。</span>
              <button
                type="button"
                onClick={onDismissGuide}
                aria-label="收起词典引导"
              >
                知
              </button>
            </div>
          )}

          {feedback && (
            <p
              className={`dictionary-feedback-toast is-${feedback.type}`}
              role="status"
            >
              {feedback.message}
            </p>
          )}
        </aside>

        {activeClueEntry && (
          <div
            className="dictionary-clue-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) onCloseClue()
            }}
          >
            <section
              className="dictionary-clue-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dictionary-clue-title"
            >
              <button
                className="dictionary-clue-close"
                type="button"
                onClick={onCloseClue}
                aria-label="收起线索卡"
              >
                收
              </button>

              <h2 id="dictionary-clue-title">
                <ClueTextWithGlyph
                  entry={activeClueEntry}
                  text={activeClueEntry.clueTitle ?? activeClueEntry.label}
                />
              </h2>

              {activeClueEntry.clueImage && (
                <div className="dictionary-clue-image">
                  <img
                    src={activeClueEntry.clueImage}
                    alt={`${activeClueEntry.label}线索`}
                    draggable="false"
                  />
                </div>
              )}

              <div className="dictionary-clue-lines">
                {(activeClueEntry.clueLines ?? [
                  activeClueEntry.meaning,
                ]).map((line) => (
                  <p key={line}>
                    <ClueTextWithGlyph entry={activeClueEntry} text={line} />
                  </p>
                ))}
              </div>
              {!Object.values(placedSlots).includes(activeClueEntry.id) && (
                <p className="dictionary-clue-drag-note">
                  读过线索后，可将这个字拖入残卷。
                </p>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  )
}
