import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { createEmbroideryRoomGameConfig } from '../SingingHall/config'
import type {
  DictionaryEntry,
  DictionaryPuzzle,
} from '../../systems/dictionary'
import type { GlobalGlyphToastPayload } from '../../game/GlobalDictionaryBridge'
import ExplorationHud from '../../components/ExplorationHud/ExplorationHud'
import type { EmbroideryDictionaryBridge } from './phaser/EmbroideryDictionaryBridge'
import {
  EmbroideryRoomPhaserScene,
  EMBROIDERY_ROOM_SCENE_KEY,
} from './phaser/EmbroideryRoomPhaserScene'
import '../SingingHall/SingingHall.css'

type EmbroideryRoomPhaserProps = {
  isDictionaryOpen: boolean
  openDictionary: (puzzle?: DictionaryPuzzle) => void
  closeDictionary: () => void
  unlockEntry: (entryId: DictionaryEntry['id']) => void
  showGlyphToast: (payload: GlobalGlyphToastPayload) => void
  onReturnToMenu: () => void
}

function EmbroideryRoomPhaser({
  isDictionaryOpen,
  openDictionary,
  closeDictionary,
  unlockEntry,
  showGlyphToast,
  onReturnToMenu,
}: EmbroideryRoomPhaserProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const openDictionaryRef = useRef(openDictionary)
  const closeDictionaryRef = useRef(closeDictionary)
  const unlockEntryRef = useRef(unlockEntry)
  const showGlyphToastRef = useRef(showGlyphToast)
  const returnToMenuRef = useRef(onReturnToMenu)
  const [clueProgress, setClueProgress] = useState({ found: 0, total: 7 })
  const [freeExplorationActive, setFreeExplorationActive] = useState(false)

  useEffect(() => {
    openDictionaryRef.current = openDictionary
    closeDictionaryRef.current = closeDictionary
    unlockEntryRef.current = unlockEntry
    showGlyphToastRef.current = showGlyphToast
    returnToMenuRef.current = onReturnToMenu
  }, [onReturnToMenu, openDictionary, closeDictionary, unlockEntry, showGlyphToast])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const dictionaryBridge: EmbroideryDictionaryBridge = {
      openDictionary: (puzzle) => openDictionaryRef.current(puzzle),
      closeDictionary: () => closeDictionaryRef.current(),
      unlockEntry: (entryId) => unlockEntryRef.current(entryId),
      showGlyphToast: (payload) => showGlyphToastRef.current(payload),
      returnToMenu: () => returnToMenuRef.current(),
      setClueProgress,
      setFreeExplorationActive,
    }
    const game = new Phaser.Game(
      createEmbroideryRoomGameConfig(container, dictionaryBridge),
    )
    gameRef.current = game
    const resizeObserver = new ResizeObserver(() => {
      game.scale.refresh()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      gameRef.current = null
      game.destroy(true)
    }
  }, [])

  useEffect(() => {
    const scene = gameRef.current?.scene.getScene(
      EMBROIDERY_ROOM_SCENE_KEY,
    )
    if (scene instanceof EmbroideryRoomPhaserScene) {
      scene.setGlobalDictionaryOpen(isDictionaryOpen)
    }
  }, [isDictionaryOpen])

  return (
    <section className="singing-hall" aria-label="女红房 Phaser 场景">
      <div className="singing-hall__game" ref={containerRef} />
      {freeExplorationActive && !isDictionaryOpen && (
        <ExplorationHud
          clueProgress={clueProgress}
          onOpenDictionary={() => openDictionary()}
          onReturnToMenu={onReturnToMenu}
          showBottom
          showClueProgress
          showDictionary
        />
      )}
    </section>
  )
}

export default EmbroideryRoomPhaser
