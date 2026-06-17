import { useState, useRef, useEffect } from 'react'
import MainMenu from './components/MainMenu/MainMenu'
import Prologue from './components/Prologue/Prologue'
import TitleCard from './components/TitleCard/TitleCard'
import Chapter1 from './components/Chapter1/Chapter1'
import ChapterNight from './components/ChapterNight/ChapterNight'
import SceneSwitcher from './components/SceneSwitcher'
import { SaveSystem } from './game/systems'
import { loadGame, deleteSave, hasSave, saveGame, ProgressStage } from './utils/gameSave'
import { DictionaryOverlay, useDictionary } from './systems/dictionary'
import EmbroideryRoomPhaser from './scenes/EmbroideryRoom/EmbroideryRoomPhaser'
import SingingHall from './scenes/SingingHall/SingingHall'
import { getBgmVolume, BGM_VOLUME_CHANGE_EVENT } from './utils/audioSettings'
import './App.css'

const JIANGYONG_BGM = '/audio/jiangyong_bgm.mp3'

type GamePhase = 'menu' | 'prologue' | 'titleCard' | 'chapter1'

const JIANGYONG_VILLAGE_SCENE_ID = 'jiangyong-village'

const SCENE_OPTIONS = [
  { id: JIANGYONG_VILLAGE_SCENE_ID, label: '江永村' },
  { id: 'embroidery-room', label: '女红房' },
  { id: 'singing-hall', label: '坐歌堂' },
  { id: 'jiangyong-night', label: '江永村：深宵' },
] as const

type SceneId = (typeof SCENE_OPTIONS)[number]['id']

function App() {
  const dictionary = useDictionary()

  const [gameSessionKey, setGameSessionKey] = useState(0)
  const [currentScene, setCurrentScene] = useState<SceneId>(
    JIANGYONG_VILLAGE_SCENE_ID,
  )

  // ========== 全局背景音乐：女书长卷 ==========
  // 江永村流程（MainMenu/Prologue/TitleCard/Chapter1）播放，女红房/坐歌堂暂停
  const bgmRef = useRef<HTMLAudioElement | null>(null)

  // 创建 Audio 实例 + 用户交互触发播放（绕过浏览器自动播放限制）
  useEffect(() => {
    const audio = new Audio(JIANGYONG_BGM)
    audio.loop = true
    audio.volume = getBgmVolume()
    bgmRef.current = audio

    // 监听从 SettingsModal 发出的音量变更事件，实时调整音量
    const onBgmVolumeChange = () => {
      audio.volume = getBgmVolume()
    }
    window.addEventListener(BGM_VOLUME_CHANGE_EVENT, onBgmVolumeChange)

    const tryPlay = () => {
      if (audio.paused && currentScene === JIANGYONG_VILLAGE_SCENE_ID) {
        audio.play().catch(() => {})
      }
    }

    // 用户首次交互时触发播放
    const onUserInteract = () => {
      tryPlay()
    }

    const events = ['click', 'touchstart', 'keydown']
    events.forEach((e) => document.addEventListener(e, onUserInteract, { once: true }))

    return () => {
      events.forEach((e) => document.removeEventListener(e, onUserInteract))
      window.removeEventListener(BGM_VOLUME_CHANGE_EVENT, onBgmVolumeChange)
    }
  }, [])

  // 根据场景切换播放/暂停，并同步最新音量设置
  useEffect(() => {
    const audio = bgmRef.current
    if (!audio) return

    if (currentScene === JIANGYONG_VILLAGE_SCENE_ID) {
      audio.volume = getBgmVolume()
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [currentScene])

  // 组件卸载时清理 BGM
  useEffect(() => {
    return () => {
      const a = bgmRef.current
      if (a) {
        a.pause()
        a.src = ''
        a.load()
      }
    }
  }, [])

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
      case 'jiangyong-night':
        return (
          <ChapterNight
            onReturnToMenu={returnToMainMenu}
            isDictionaryOpen={dictionary.isDictionaryOpen}
            openDictionary={dictionary.openDictionary}
            unlockEntry={dictionary.unlockEntry}
            unlockedEntryCount={dictionary.unlockedEntryIds.length}
          />
        )
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
        onSelectEntry={dictionary.selectEntry}
        onPlaceEntryToSlot={dictionary.placeEntryToSlot}
      />
    </div>
  )
}

export default App
