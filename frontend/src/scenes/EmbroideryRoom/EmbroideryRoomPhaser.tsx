import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createEmbroideryRoomGameConfig } from '../SingingHall/config'
import type {
  DictionaryEntry,
  DictionaryPuzzle,
} from '../../systems/dictionary'
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
  onReturnToMenu: () => void
}

function EmbroideryRoomPhaser({
  isDictionaryOpen,
  openDictionary,
  closeDictionary,
  unlockEntry,
  onReturnToMenu,
}: EmbroideryRoomPhaserProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const openDictionaryRef = useRef(openDictionary)
  const closeDictionaryRef = useRef(closeDictionary)
  const unlockEntryRef = useRef(unlockEntry)
  const returnToMenuRef = useRef(onReturnToMenu)

  useEffect(() => {
    openDictionaryRef.current = openDictionary
    closeDictionaryRef.current = closeDictionary
    unlockEntryRef.current = unlockEntry
    returnToMenuRef.current = onReturnToMenu
  }, [onReturnToMenu, openDictionary, closeDictionary, unlockEntry])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const dictionaryBridge: EmbroideryDictionaryBridge = {
      openDictionary: (puzzle) => openDictionaryRef.current(puzzle),
      closeDictionary: () => closeDictionaryRef.current(),
      unlockEntry: (entryId) => unlockEntryRef.current(entryId),
      returnToMenu: () => returnToMenuRef.current(),
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
      <button
        className="embroidery-room-return-btn"
        type="button"
        onClick={onReturnToMenu}
      >
        返回主菜单
      </button>
    </section>
  )
}

export default EmbroideryRoomPhaser
