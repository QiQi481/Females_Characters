import { useState } from 'react'
import MainMenu from './components/MainMenu/MainMenu'
import Prologue from './components/Prologue/Prologue'
import TitleCard from './components/TitleCard/TitleCard'
import Chapter1 from './components/Chapter1/Chapter1'
import SceneSwitcher from './components/SceneSwitcher'
import { SaveSystem } from './game/systems'
import { loadGame, deleteSave, hasSave, saveGame, ProgressStage } from './utils/gameSave'
import { DictionaryOverlay, useDictionary } from './systems/dictionary'
import EmbroideryRoomPhaser from './scenes/EmbroideryRoom/EmbroideryRoomPhaser'
import SingingHall from './scenes/SingingHall/SingingHall'
import './App.css'

type GamePhase = 'menu' | 'prologue' | 'titleCard' | 'chapter1'

const JIANGYONG_VILLAGE_SCENE_ID = 'jiangyong-village'

const SCENE_OPTIONS = [
  { id: JIANGYONG_VILLAGE_SCENE_ID, label: '江永村' },
  { id: 'embroidery-room', label: '女红房' },
  { id: 'singing-hall', label: '坐歌堂' },
] as const

type SceneId = (typeof SCENE_OPTIONS)[number]['id']

function App() {
  const dictionary = useDictionary()
  const [gameSessionKey, setGameSessionKey] = useState(0)
  const [currentScene, setCurrentScene] = useState<SceneId>(
    JIANGYONG_VILLAGE_SCENE_ID,
  )

  // ─── 故事模式状态（用户原有逻辑） ───
  const [phase, setPhase] = useState<GamePhase>('menu')
  const [resumeProgress, setResumeProgress] = useState<ProgressStage>(
    ProgressStage.NOT_STARTED,
  )
  const [villageProgress, setVillageProgress] = useState<ProgressStage>(
    ProgressStage.NOT_STARTED,
  )

  const shouldShowSceneSwitcher =
    currentScene !== JIANGYONG_VILLAGE_SCENE_ID || phase === 'chapter1'

  const saveVillageProgress = () => {
    if (phase !== 'chapter1') return

    saveGame({
      phase: 'chapter1',
      progress: villageProgress,
      savedAt: Date.now(),
    })
  }

  const restoreVillageProgress = () => {
    const save = loadGame()
    if (!save) return

    setResumeProgress(save.progress)
    setVillageProgress(save.progress)
    setPhase(save.phase === 'chapter1' ? 'chapter1' : (save.phase as GamePhase))
  }

  const changeScene = (sceneId: SceneId) => {
    dictionary.closeDictionary()
    if (sceneId === currentScene) return

    if (
      currentScene === JIANGYONG_VILLAGE_SCENE_ID &&
      sceneId !== JIANGYONG_VILLAGE_SCENE_ID
    ) {
      saveVillageProgress()
    }

    if (sceneId === JIANGYONG_VILLAGE_SCENE_ID) {
      restoreVillageProgress()
    }

    setCurrentScene(sceneId)
  }

  const resetAllProgress = () => {
    new SaveSystem().reset()
    dictionary.resetDictionary()
    deleteSave()
    setCurrentScene(JIANGYONG_VILLAGE_SCENE_ID)
    setPhase('menu')
    setResumeProgress(ProgressStage.NOT_STARTED)
    setVillageProgress(ProgressStage.NOT_STARTED)
    setGameSessionKey((current) => current + 1)
  }

  const resetProgress = () => {
    resetAllProgress()
  }

  const returnToMainMenu = () => {
    dictionary.closeDictionary()
    if (currentScene === JIANGYONG_VILLAGE_SCENE_ID && phase === 'chapter1') {
      saveVillageProgress()
    }
    setCurrentScene(JIANGYONG_VILLAGE_SCENE_ID)
    setPhase('menu')
  }

  // ─── 故事模式事件处理（用户原有逻辑） ───

  /** 新游戏：清除旧存档，从序章开始 */
  const handleStartGame = () => {
    resetAllProgress()
    setPhase('prologue')
  }

  /** 继续游戏：读取存档并跳转 */
  const handleContinueGame = () => {
    const save = loadGame()
    if (!save) return
    setCurrentScene(JIANGYONG_VILLAGE_SCENE_ID)
    setResumeProgress(save.progress)
    setVillageProgress(save.progress)
    if (save.phase === 'chapter1') {
      setPhase('chapter1')
    } else {
      setPhase(save.phase as GamePhase)
    }
  }

  /** 从游戏中离开 → 存档并返回主菜单 */
  const handleLeaveGame = (progress: ProgressStage) => {
    saveGame({ phase: 'chapter1', progress, savedAt: Date.now() })
    setVillageProgress(progress)
    setPhase('menu')
  }

  // ─── 场景渲染 ───

  const renderStoryMode = () => (
    <>
      {phase === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          onContinueGame={handleContinueGame}
          onSettings={() => {}}
          onAbout={() => {}}
          hasSavedGame={hasSave()}
        />
      )}
      {phase === 'prologue' && (
        <Prologue onContinue={() => setPhase('titleCard')} />
      )}
      {phase === 'titleCard' && (
        <TitleCard
          title="江永村：白昼"
          onContinue={() => setPhase('chapter1')}
        />
      )}
      {phase === 'chapter1' && (
        <Chapter1
          resumeProgress={resumeProgress}
          isDictionaryOpen={dictionary.isDictionaryOpen}
          openDictionary={dictionary.openDictionary}
          unlockEntry={dictionary.unlockEntry}
          onLeave={handleLeaveGame}
          onProgressChange={setVillageProgress}
          onComplete={() => deleteSave()}
          onReturnToMenu={returnToMainMenu}
        />
      )}
    </>
  )

  const renderSceneContent = () => {
    switch (currentScene) {
      case 'embroidery-room':
        return (
          <EmbroideryRoomPhaser
            key={`embroidery-${gameSessionKey}`}
            isDictionaryOpen={dictionary.isDictionaryOpen}
            openDictionary={dictionary.openDictionary}
            unlockEntry={dictionary.unlockEntry}
            onReturnToMenu={returnToMainMenu}
          />
        )
      case 'singing-hall':
        return (
          <SingingHall
            key={`singing-${gameSessionKey}`}
            isDictionaryOpen={dictionary.isDictionaryOpen}
            openDictionary={dictionary.openDictionary}
            unlockEntry={dictionary.unlockEntry}
            onReturnToMenu={returnToMainMenu}
          />
        )
      case 'jiangyong-village':
        return renderStoryMode()
    }
  }

  return (
    <div className="app-shell">
      {renderSceneContent()}

      {shouldShowSceneSwitcher && (
        <SceneSwitcher
          currentScene={currentScene}
          scenes={SCENE_OPTIONS}
          onSceneChange={changeScene}
          onResetProgress={resetProgress}
        />
      )}

      <DictionaryOverlay
        isOpen={dictionary.isDictionaryOpen}
        activeEntryId={dictionary.activeEntryId}
        activeClueEntryId={dictionary.activeClueEntryId}
        activePuzzle={dictionary.activePuzzle}
        feedback={dictionary.feedback}
        failedSlotId={dictionary.failedSlotId}
        isResolvingPuzzle={dictionary.isResolvingPuzzle}
        placedSlots={dictionary.placedSlots}
        unlockedEntryIds={dictionary.unlockedEntryIds}
        hasSeenGuide={dictionary.hasSeenGuide}
        onClose={dictionary.closeDictionary}
        onCloseClue={dictionary.closeClue}
        onDismissGuide={dictionary.dismissGuide}
        onOpenClue={dictionary.openClue}
        onPlaceEntryToSlot={dictionary.placeEntryToSlot}
      />
    </div>
  )
}

export default App
