import { useCallback, useEffect, useRef, useState } from 'react'
import type { DictionaryPuzzle } from '../../systems/dictionary'
import EmbroideryRoomScene from './EmbroideryRoomScene'
import {
  clueOrder,
  dialoguePuzzles,
  embroideryEntryLabels,
  npcConfig,
  sceneObjects,
  type ClueName,
  type DialoguePuzzleConfig,
  type SceneObjectConfig,
} from './embroideryRoomData'
import type { EmbroideryRoomPropId } from './embroideryRoomSceneData'
import './EmbroideryRoom.css'

const CAMERA_SPEED = 620
const NUSHU_TOKEN = '{{nushu}}'

type PuzzleSentenceProps = {
  sentence: string
  puzzle: DialoguePuzzleConfig
  onOpenDictionary: () => void
}

function PuzzleSentence({
  sentence,
  puzzle,
  onOpenDictionary,
}: PuzzleSentenceProps) {
  const [before, after] = sentence.split(NUSHU_TOKEN)

  return (
    <>
      {before}
      <button
        className="inline-nushu-button"
        type="button"
        onClick={onOpenDictionary}
        aria-label={`破译女书字，线索${puzzle.label}`}
      >
        <img src={puzzle.nushuImage} alt="待破译女书字" />
        <span>点击破译</span>
      </button>
      {after}
    </>
  )
}

type EmbroideryRoomProps = {
  openDictionary: (puzzle: DictionaryPuzzle) => void
}

function EmbroideryRoom({ openDictionary }: EmbroideryRoomProps) {
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
  const [isCurrentPuzzleSolved, setIsCurrentPuzzleSolved] = useState(false)
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

      if (isDialogueOpen) {
        setIsDialogueOpen(false)
      } else {
        setActiveCard(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [hasModalOpen, isDialogueOpen])

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
    if (sceneObject.kind === 'clue') {
      collectClue(embroideryEntryLabels[sceneObject.unlockEntryId])
    }
    setActiveCard(sceneObject)
    setIsClueTrayOpen(false)
  }

  const openSceneProp = (propId: EmbroideryRoomPropId) => {
    const sceneObject = sceneObjects.find((candidate) => candidate.id === propId)
    if (sceneObject) openSceneObject(sceneObject)
  }

  const talkToEmbroiderer = () => {
    if (isDialogueOpen) return

    if (progressionTimerRef.current !== null) {
      window.clearTimeout(progressionTimerRef.current)
      progressionTimerRef.current = null
    }

    setActiveCard(null)
    setIsDialogueOpen(true)
    setIsCurrentPuzzleSolved(false)
    setIsClueTrayOpen(false)
  }

  const openCurrentPuzzleDictionary = () => {
    if (!currentPuzzle || isCurrentPuzzleSolved) return

    openDictionary({
      puzzleId: currentPuzzle.id,
      activeEntryId: currentPuzzle.activeEntryId,
      contextSentence: currentPuzzle.contextSentence,
      correctEntryId: currentPuzzle.correctEntryId,
      onSuccess: () => {
        collectClue(currentPuzzle.label)
        setIsCurrentPuzzleSolved(true)

        progressionTimerRef.current = window.setTimeout(() => {
          const nextIndex = puzzleIndex + 1
          setPuzzleIndex(nextIndex)
          setIsCurrentPuzzleSolved(false)

          if (nextIndex >= dialoguePuzzles.length) {
            setIsDialogueOpen(false)
          }

          progressionTimerRef.current = null
        }, 1600)
      },
    })
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

    setIsCurrentPuzzleSolved(false)
    setIsDialogueOpen(false)
  }

  const cameraProgress = cameraMax > 0 ? cameraX / cameraMax : 0

  return (
    <main className="embroidery-game">
      <section
        ref={viewportRef}
        className="game-viewport"
        aria-label="绣帕女红房横版探索场景"
      >
        <div
          className="scene-world"
          style={{ transform: `translate3d(${-cameraX}px, 0, 0)` }}
        >
          <EmbroideryRoomScene
            activePropId={activeCard?.id as EmbroideryRoomPropId | undefined}
            onSelectProp={openSceneProp}
            onClearSelection={() => setActiveCard(null)}
          />

          <img
            className="world-npc"
            src={npcConfig.image}
            style={npcConfig.imagePosition}
            alt=""
            draggable="false"
          />

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
              女红房的线索已经整理完成。
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
                        : (
                            <PuzzleSentence
                              sentence={currentPuzzle.puzzleLine}
                              puzzle={currentPuzzle}
                              onOpenDictionary={openCurrentPuzzleDictionary}
                            />
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
                  : `线索「${embroideryEntryLabels[activeCard.unlockEntryId]}」已收入册中。`}
              </p>
            </section>
          </div>
        )}
      </section>
    </main>
  )
}

export default EmbroideryRoom
