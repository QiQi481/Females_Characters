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
  unlockEntry: (entryId: DictionaryEntry['id']) => void
}

function EmbroideryRoomPhaser({
  isDictionaryOpen,
  openDictionary,
  unlockEntry,
}: EmbroideryRoomPhaserProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const openDictionaryRef = useRef(openDictionary)
  const unlockEntryRef = useRef(unlockEntry)

  useEffect(() => {
    openDictionaryRef.current = openDictionary
    unlockEntryRef.current = unlockEntry
  }, [openDictionary, unlockEntry])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const dictionaryBridge: EmbroideryDictionaryBridge = {
      openDictionary: (puzzle) => openDictionaryRef.current(puzzle),
      unlockEntry: (entryId) => unlockEntryRef.current(entryId),
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
    </section>
  )
}

export default EmbroideryRoomPhaser
