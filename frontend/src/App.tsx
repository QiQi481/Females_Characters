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

const SCENE_OPTIONS = [
  { id: 'embroidery-room', label: '女红房' },
  { id: 'singing-hall', label: '坐歌堂' },
  { id: 'story', label: '故事' },
] as const

type SceneId = (typeof SCENE_OPTIONS)[number]['id']

function App() {
  const dictionary = useDictionary()
  const [gameSessionKey, setGameSessionKey] = useState(0)
  const [currentScene, setCurrentScene] = useState<SceneId>('story')

  // ─── 故事模式状态（用户原有逻辑） ───
  const [phase, setPhase] = useState<GamePhase>('menu')
  const [resumeProgress, setResumeProgress] = useState(ProgressStage.NOT_STARTED)

  const changeScene = (sceneId: SceneId) => {
    dictionary.closeDictionary()
    setCurrentScene(sceneId)
  }

  const resetProgress = () => {
    new SaveSystem().reset()
    dictionary.resetDictionary()
    deleteSave()
    setCurrentScene('story')
    setPhase('menu')
    setResumeProgress(ProgressStage.NOT_STARTED)
    setGameSessionKey((current) => current + 1)
  }

  // ─── 故事模式事件处理（用户原有逻辑） ───

  /** 新游戏：清除旧存档，从序章开始 */
  const handleStartGame = () => {
    deleteSave()
    setResumeProgress(ProgressStage.NOT_STARTED)
    setPhase('prologue')
  }

  /** 继续游戏：读取存档并跳转 */
  const handleContinueGame = () => {
    const save = loadGame()
    if (!save) return
    setResumeProgress(save.progress)
    if (save.phase === 'chapter1') {
      setPhase('chapter1')
    } else {
      setPhase(save.phase as GamePhase)
    }
  }

  /** 从游戏中离开 → 存档并返回主菜单 */
  const handleLeaveGame = (progress: ProgressStage) => {
    saveGame({ phase: 'chapter1', progress, savedAt: Date.now() })
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
          onLeave={handleLeaveGame}
          onComplete={() => deleteSave()}
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
          />
        )
      case 'singing-hall':
        return (
          <SingingHall
            key={`singing-${gameSessionKey}`}
            isDictionaryOpen={dictionary.isDictionaryOpen}
            openDictionary={dictionary.openDictionary}
            unlockEntry={dictionary.unlockEntry}
          />
        )
      case 'story':
        return renderStoryMode()
    }
  }

  return (
    <div className="app-shell">
      {renderSceneContent()}

      <SceneSwitcher
        currentScene={currentScene}
        scenes={SCENE_OPTIONS}
        onSceneChange={changeScene}
        onResetProgress={resetProgress}
      />

      <DictionaryOverlay
        isOpen={dictionary.isDictionaryOpen}
        activeEntryId={dictionary.activeEntryId}
        activePuzzle={dictionary.activePuzzle}
        feedback={dictionary.feedback}
        isResolvingPuzzle={dictionary.isResolvingPuzzle}
        unlockedEntryIds={dictionary.unlockedEntryIds}
        onClose={dictionary.closeDictionary}
        onSelectEntry={dictionary.selectEntry}
        onUnlockEntry={dictionary.unlockEntry}
      />
    </div>
  )
}

export default App
