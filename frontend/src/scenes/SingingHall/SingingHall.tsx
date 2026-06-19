import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import type {
  DictionaryEntry,
  DictionaryPuzzle,
} from '../../systems/dictionary'
import ExplorationHud from '../../components/ExplorationHud/ExplorationHud'
import type { GlobalDictionaryBridge } from '../../game/GlobalDictionaryBridge'
import { createSingingHallGameConfig } from './config'
import { Scene5 } from './scenes/Scene5'
import { MainScene } from './scenes/MainScene'
import { SceneKeys } from './types'
import './SingingHall.css'

type SingingHallProps = {
  isDictionaryOpen: boolean
  openDictionary: (puzzle?: DictionaryPuzzle) => void
  closeDictionary: () => void
  unlockEntry: (entryId: DictionaryEntry['id']) => void
  onReturnToMenu: () => void
}

function SingingHall({
  isDictionaryOpen,
  openDictionary,
  closeDictionary,
  unlockEntry,
  onReturnToMenu,
}: SingingHallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const openDictionaryRef = useRef(openDictionary)
  const closeDictionaryRef = useRef(closeDictionary)
  const unlockEntryRef = useRef(unlockEntry)
  const returnToMenuRef = useRef(onReturnToMenu)
  const [clueProgress, setClueProgress] = useState({ found: 0, total: 7 })
  const [freeExplorationActive, setFreeExplorationActive] = useState(false)

  useEffect(() => {
    openDictionaryRef.current = openDictionary
    closeDictionaryRef.current = closeDictionary
    unlockEntryRef.current = unlockEntry
    returnToMenuRef.current = onReturnToMenu
  }, [onReturnToMenu, openDictionary, closeDictionary, unlockEntry])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const dictionaryBridge: GlobalDictionaryBridge = {
      openDictionary: (puzzle) => openDictionaryRef.current(puzzle),
      closeDictionary: () => closeDictionaryRef.current(),
      unlockEntry: (entryId) => unlockEntryRef.current(entryId),
      returnToMenu: () => returnToMenuRef.current(),
      setClueProgress,
      setFreeExplorationActive,
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
    const scene5 = gameRef.current?.scene.getScene(SceneKeys.SCENE5)
    if (scene5 instanceof Scene5) {
      scene5.setGlobalDictionaryOpen(isDictionaryOpen)
    }

    const mainScene = gameRef.current?.scene.getScene(SceneKeys.MAIN)
    if (mainScene instanceof MainScene) {
      mainScene.setGlobalDictionaryOpen(isDictionaryOpen)
    }
  }, [isDictionaryOpen])

  return (
    <section className="singing-hall" aria-label="坐歌堂 / 歌扇空间">
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

export default SingingHall
