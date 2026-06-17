import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import type {
  DictionaryEntry,
  DictionaryPuzzle,
} from '../../systems/dictionary'
import type { GlobalDictionaryBridge } from '../../game/GlobalDictionaryBridge'
import { createSingingHallGameConfig } from './config'
import { MainScene } from './scenes/MainScene'
import { SceneKeys } from './types'
import './SingingHall.css'

type SingingHallProps = {
  isDictionaryOpen: boolean
  openDictionary: (puzzle?: DictionaryPuzzle) => void
  unlockEntry: (entryId: DictionaryEntry['id']) => void
  onReturnToMenu: () => void
}

function SingingHall({
  isDictionaryOpen,
  openDictionary,
  unlockEntry,
  onReturnToMenu,
}: SingingHallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const openDictionaryRef = useRef(openDictionary)
  const unlockEntryRef = useRef(unlockEntry)
  const returnToMenuRef = useRef(onReturnToMenu)

  useEffect(() => {
    openDictionaryRef.current = openDictionary
    unlockEntryRef.current = unlockEntry
    returnToMenuRef.current = onReturnToMenu
  }, [onReturnToMenu, openDictionary, unlockEntry])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const dictionaryBridge: GlobalDictionaryBridge = {
      openDictionary: (puzzle) => openDictionaryRef.current(puzzle),
      unlockEntry: (entryId) => unlockEntryRef.current(entryId),
      returnToMenu: () => returnToMenuRef.current(),
    }
    const game = new Phaser.Game(
      createSingingHallGameConfig(container, dictionaryBridge),
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
    const scene = gameRef.current?.scene.getScene(SceneKeys.MAIN)
    if (scene instanceof MainScene) {
      scene.setGlobalDictionaryOpen(isDictionaryOpen)
    }
  }, [isDictionaryOpen])

  return (
    <section className="singing-hall" aria-label="坐歌堂 / 歌扇空间">
      <div className="singing-hall__game" ref={containerRef} />
    </section>
  )
}

export default SingingHall
