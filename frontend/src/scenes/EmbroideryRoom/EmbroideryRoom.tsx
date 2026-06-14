import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clueOrder,
  dialoguePuzzles,
  npcConfig,
  sceneObjects,
  type ClueName,
  type DialoguePuzzleConfig,
  type SceneObjectConfig,
} from './embroideryRoomData'
import './EmbroideryRoom.css'

const CAMERA_SPEED = 620
const NUSHU_TOKEN = '{{nushu}}'

function renderPuzzleSentence(
  sentence: string,
  puzzle: DialoguePuzzleConfig,
  interactive: boolean,
  onOpenDictionary?: () => void,
) {
  const [before, after] = sentence.split(NUSHU_TOKEN)

  return (
    <>
      {before}
      {interactive ? (
        <button
          className="inline-nushu-button"
          type="button"
          onClick={onOpenDictionary}
          aria-label={`破译女书字，线索${puzzle.label}`}
        >
          <img src={puzzle.nushuImage} alt="待破译女书字" />
          <span>点击破译</span>
        </button>
      ) : (
        <img
          className="inline-nushu-image"
          src={puzzle.nushuImage}
          alt="待破译女书字"
        />
      )}
      {after}
    </>
  )
}

function EmbroideryRoom() {
  const viewportRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const cameraInitializedRef = useRef(false)
  const cameraXRef = useRef(0)
  const cameraMaxRef = useRef(0)
  const progressionTimerRef = useRef<number | null>(null)
  const [cameraX, setCameraX] = useState(0)
  const [cameraMax, setCameraMax] = useState(0)
  const [collected, setCollected] = useState<Set<ClueName>>(new Set())
  const [activeCard, setActiveCard] = useState<SceneObjectConfig | null>(null)
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [isDialogueOpen, setIsDialogueOpen] = useState(false)
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false)
  const [isCurrentPuzzleSolved, setIsCurrentPuzzleSolved] = useState(false)
  const [dictionaryFeedback, setDictionaryFeedback] = useState('')
  const [unlockFeedback, setUnlockFeedback] = useState('')
  const [isClueTrayOpen, setIsClueTrayOpen] = useState(false)
  const isComplete = collected.size === clueOrder.length
  const allNpcPuzzlesSolved = puzzleIndex >= dialoguePuzzles.length
  const currentPuzzle = allNpcPuzzlesSolved
    ? null
    : dialoguePuzzles[puzzleIndex]
  const hasModalOpen = Boolean(activeCard || isDialogueOpen)

  const updateCamera = useCallback((nextCameraX: number) => {
    const clamped = Math.min(Math.max(nextCameraX, 0), cameraMaxRef.current)
    cameraXRef.current = clamped
    setCameraX(clamped)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const measureCameraBounds = () => {
      const viewportWidth = viewport.clientWidth
      const viewportHeight = viewport.clientHeight
      const worldWidth = viewportHeight * 3
      const nextMax = Math.max(worldWidth - viewportWidth, 0)

      cameraMaxRef.current = nextMax
      setCameraMax(nextMax)

      if (!cameraInitializedRef.current) {
        cameraInitializedRef.current = true
        updateCamera(nextMax * 0.34)
      } else {
        updateCamera(cameraXRef.current)
      }
    }

    measureCameraBounds()
    const resizeObserver = new ResizeObserver(measureCameraBounds)
    resizeObserver.observe(viewport)

    return () => resizeObserver.disconnect()
  }, [updateCamera])

  useEffect(() => {
    if (hasModalOpen) return

    const heldKeys = new Set<string>()
    let animationFrame = 0
    let previousTime = performance.now()

    const animateCamera = (time: number) => {
      const elapsed = Math.min((time - previousTime) / 1000, 0.05)
      previousTime = time
      const movingLeft = heldKeys.has('a') || heldKeys.has('arrowleft')
      const movingRight = heldKeys.has('d') || heldKeys.has('arrowright')
      const direction = Number(movingRight) - Number(movingLeft)

      if (direction !== 0) {
        updateCamera(cameraXRef.current + direction * CAMERA_SPEED * elapsed)
      }

      animationFrame = requestAnimationFrame(animateCamera)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!['a', 'd', 'arrowleft', 'arrowright'].includes(key)) return
      event.preventDefault()
      heldKeys.add(key)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      heldKeys.delete(event.key.toLowerCase())
    }

    const clearHeldKeys = () => heldKeys.clear()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearHeldKeys)
    animationFrame = requestAnimationFrame(animateCamera)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearHeldKeys)
      cancelAnimationFrame(animationFrame)
    }
  }, [hasModalOpen, updateCamera])

  useEffect(() => {
    if (!hasModalOpen) return

    closeButtonRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return

      if (isDictionaryOpen) {
        setIsDictionaryOpen(false)
        setDictionaryFeedback('')
      } else if (isDialogueOpen) {
        setIsDialogueOpen(false)
      } else {
        setActiveCard(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [hasModalOpen, isDialogueOpen, isDictionaryOpen])

  useEffect(
    () => () => {
      if (progressionTimerRef.current !== null) {
        window.clearTimeout(progressionTimerRef.current)
      }
    },
    [],
  )

  const collectClue = (clue: ClueName) => {
    setCollected((current) => {
      if (current.has(clue)) return current
      return new Set(current).add(clue)
    })
  }

  const openSceneObject = (sceneObject: SceneObjectConfig) => {
    if (sceneObject.kind === 'clue') collectClue(sceneObject.title)
    setActiveCard(sceneObject)
    setIsClueTrayOpen(false)
  }

  const talkToEmbroiderer = () => {
    if (isDialogueOpen) return

    if (progressionTimerRef.current !== null) {
      window.clearTimeout(progressionTimerRef.current)
      progressionTimerRef.current = null
    }

    setActiveCard(null)
    setIsDialogueOpen(true)
    setIsDictionaryOpen(false)
    setIsCurrentPuzzleSolved(false)
    setDictionaryFeedback('')
    setUnlockFeedback('')
    setIsClueTrayOpen(false)
  }

  const openDictionary = () => {
    if (!currentPuzzle || isCurrentPuzzleSolved) return
    setDictionaryFeedback('')
    setIsDictionaryOpen(true)
  }

  const selectDictionaryOption = (optionId: string) => {
    if (!currentPuzzle) return

    if (optionId !== currentPuzzle.correctOption) {
      setDictionaryFeedback('这个意思好像对不上这句话。')
      return
    }

    collectClue(currentPuzzle.label)
    setIsCurrentPuzzleSolved(true)
    setIsDictionaryOpen(false)
    setDictionaryFeedback('')
    setUnlockFeedback(currentPuzzle.unlockedText)

    progressionTimerRef.current = window.setTimeout(() => {
      const nextIndex = puzzleIndex + 1
      setPuzzleIndex(nextIndex)
      setIsCurrentPuzzleSolved(false)
      setUnlockFeedback('')

      if (nextIndex >= dialoguePuzzles.length) {
        setIsDialogueOpen(false)
      }

      progressionTimerRef.current = null
    }, 1600)
  }

  const closeDialogue = () => {
    if (progressionTimerRef.current !== null) {
      window.clearTimeout(progressionTimerRef.current)
      progressionTimerRef.current = null
    }

    if (isCurrentPuzzleSolved) {
      setPuzzleIndex((current) =>
        Math.min(current + 1, dialoguePuzzles.length),
      )
    }

    setIsDictionaryOpen(false)
    setDictionaryFeedback('')
    setUnlockFeedback('')
    setIsCurrentPuzzleSolved(false)
    setIsDialogueOpen(false)
  }

  const cameraProgress = cameraMax > 0 ? cameraX / cameraMax : 0

  return (
    <main className="embroidery-game">
      <section
        ref={viewportRef}
        className="game-viewport"
        aria-label="绣帕女红空间横版探索场景"
      >
        <div
          className="scene-world"
          style={{ transform: `translate3d(${-cameraX}px, 0, 0)` }}
        >
          <img
            className="scene-background"
            src="/assets/embroidery-room/background/embroidery-room-bg.png"
            alt=""
            draggable="false"
          />

          {sceneObjects.map((sceneObject) => (
            <img
              className={`world-prop world-prop-${sceneObject.kind}`}
              src={sceneObject.image}
              style={sceneObject.imagePosition}
              alt=""
              draggable="false"
              key={`${sceneObject.id}-image`}
            />
          ))}

          <img
            className="world-npc"
            src={npcConfig.image}
            style={npcConfig.imagePosition}
            alt=""
            draggable="false"
          />

          {sceneObjects.map((sceneObject) => (
            <button
              className="world-hotspot"
              style={sceneObject.hotspotPosition}
              type="button"
              onClick={() => openSceneObject(sceneObject)}
              aria-label={sceneObject.ariaLabel}
              key={`${sceneObject.id}-hotspot`}
            >
              <span className="hotspot-marker" />
              <span className="hotspot-label">{sceneObject.title}</span>
            </button>
          ))}

          <button
            className="world-hotspot hotspot-npc"
            style={npcConfig.hotspotPosition}
            type="button"
            onClick={talkToEmbroiderer}
            aria-label={npcConfig.ariaLabel}
          >
            <span className="npc-interaction">
              <i />
              {npcConfig.name} · 交谈
            </span>
          </button>
        </div>

        <div className="game-hud">
          <div className="scene-title">
            <span>三朝书 · 副场景一</span>
            <strong>绣帕 / 女红空间</strong>
          </div>

          <button
            className="clue-toggle"
            type="button"
            aria-expanded={isClueTrayOpen}
            onClick={() => setIsClueTrayOpen((isOpen) => !isOpen)}
          >
            线索 {collected.size}/{clueOrder.length}
          </button>

          {isClueTrayOpen && (
            <aside className="clue-tray" aria-label="已收集线索">
              <header>
                <span>已收集线索</span>
                <button
                  type="button"
                  onClick={() => setIsClueTrayOpen(false)}
                  aria-label="关闭线索面板"
                >
                  ×
                </button>
              </header>
              <div className="clue-grid">
                {clueOrder.map((clue, index) => (
                  <div
                    className={`clue-chip${collected.has(clue) ? ' is-found' : ''}`}
                    key={clue}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{collected.has(clue) ? clue : '未寻得'}</strong>
                  </div>
                ))}
              </div>
              <p>
                {npcConfig.name}的话：{Math.min(puzzleIndex, 3)} / 3
              </p>
            </aside>
          )}

          <button
            className="camera-button camera-button-left"
            type="button"
            onClick={() => updateCamera(cameraXRef.current - cameraMax * 0.2)}
            disabled={cameraX <= 1}
            aria-label="镜头向左移动"
          >
            ‹
          </button>
          <button
            className="camera-button camera-button-right"
            type="button"
            onClick={() => updateCamera(cameraXRef.current + cameraMax * 0.2)}
            disabled={cameraX >= cameraMax - 1}
            aria-label="镜头向右移动"
          >
            ›
          </button>

          <div className="camera-guide" aria-hidden="true">
            <span>A</span>
            <span>←</span>
            <p>移动镜头</p>
            <span>→</span>
            <span>D</span>
          </div>

          <div className="camera-map" aria-hidden="true">
            <i
              style={{
                transform: `translateX(${cameraProgress * 100}%)`,
              }}
            />
          </div>

          {isComplete && (
            <div className="completion-toast" role="status">
              女红空间的线索已经整理完成。
            </div>
          )}
        </div>

        {isDialogueOpen && (
          <section
            className="dialogue-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialogue-title"
          >
            <button
              ref={closeButtonRef}
              className="dialogue-close"
              type="button"
              onClick={closeDialogue}
              aria-label="关闭对话"
            >
              ×
            </button>
            <div className="dialogue-copy">
              <div className="dialogue-name" id="dialogue-title">
                {npcConfig.name}
                <small>
                  {currentPuzzle
                    ? `待破译 · ${puzzleIndex + 1}/${dialoguePuzzles.length}`
                    : '女书字已认全'}
                </small>
              </div>

              <div className="dialogue-lines">
                {currentPuzzle ? (
                  <>
                    {currentPuzzle.beforeLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    <p>
                      {isCurrentPuzzleSolved
                        ? currentPuzzle.solvedLine
                        : renderPuzzleSentence(
                            currentPuzzle.puzzleLine,
                            currentPuzzle,
                            true,
                            openDictionary,
                          )}
                    </p>
                    {currentPuzzle.afterLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </>
                ) : (
                  <p>{npcConfig.completedLine}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {isDictionaryOpen && currentPuzzle && (
          <aside
            className="dictionary-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dictionary-title"
          >
            <header>
              <div>
                <span>女书词典</span>
                <h2 id="dictionary-title">选择这个字的含义</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDictionaryOpen(false)
                  setDictionaryFeedback('')
                }}
                aria-label="关闭词典"
              >
                ×
              </button>
            </header>

            <div className="dictionary-character">
              <span>当前待解字</span>
              <img src={currentPuzzle.nushuImage} alt="当前待解女书字" />
            </div>

            <div className="dictionary-context">
              <span>它出现在这句话里</span>
              <p>
                “
                {renderPuzzleSentence(
                  currentPuzzle.contextSentence,
                  currentPuzzle,
                  false,
                )}
                ”
              </p>
            </div>

            <div className="dictionary-options">
              {currentPuzzle.options.map((option, index) => (
                <button
                  type="button"
                  onClick={() => selectDictionaryOption(option.id)}
                  key={option.id}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {option.label}
                </button>
              ))}
            </div>

            <p
              className={`dictionary-feedback${
                dictionaryFeedback ? ' is-visible' : ''
              }`}
              role="status"
            >
              {dictionaryFeedback}
            </p>
          </aside>
        )}

        {unlockFeedback && (
          <div className="unlock-feedback" role="status">
            {unlockFeedback}
          </div>
        )}

        {activeCard && (
          <div
            className="card-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setActiveCard(null)
            }}
          >
            <section
              className={`discovery-card card-${activeCard.kind}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="discovery-title"
            >
              <button
                ref={closeButtonRef}
                className="card-close"
                type="button"
                onClick={() => setActiveCard(null)}
                aria-label="关闭卡片"
              >
                ×
              </button>

              <p className="card-eyebrow">
                {activeCard.kind === 'clue' ? '主线线索' : '文化物件'}
              </p>
              <h2 id="discovery-title">{activeCard.title}</h2>

              <div className="card-object-visual">
                <img src={activeCard.image} alt={activeCard.title} />
              </div>

              <p className="card-description">{activeCard.description}</p>

              {activeCard.kind === 'clue' && (
                <div className="nushu-display" aria-label="女书字展示">
                  {activeCard.nushuImages.map((image) => (
                    <img src={image} alt="" key={image} />
                  ))}
                </div>
              )}

              <p className="card-footnote">
                {activeCard.kind === 'culture'
                  ? '此物件用于文化观察，不计入主线线索。'
                  : `线索「${activeCard.title}」已收入册中。`}
              </p>
            </section>
          </div>
        )}
      </section>
    </main>
  )
}

export default EmbroideryRoom
