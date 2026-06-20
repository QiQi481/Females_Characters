import { useState, useRef, useEffect, useCallback } from 'react'
import MainMenu from './components/MainMenu/MainMenu'
import Prologue from './components/Prologue/Prologue'
import TitleCard from './components/TitleCard/TitleCard'
import Chapter1 from './components/Chapter1/Chapter1'
import ChapterNight from './components/ChapterNight/ChapterNight'
import GlyphToast, {
  type GlyphToastState,
} from './components/GlyphToast/GlyphToast'
import SceneSwitcher from './components/SceneSwitcher'
import type { GlobalGlyphToastPayload } from './game/GlobalDictionaryBridge'
import { SaveSystem } from './game/systems'
import { loadGame, deleteSave, hasSave, saveGame, ProgressStage } from './utils/gameSave'
import { DictionaryOverlay, entries, useDictionary } from './systems/dictionary'
import EmbroideryRoomPhaser from './scenes/EmbroideryRoom/EmbroideryRoomPhaser'
import SingingHall from './scenes/SingingHall/SingingHall'
import { getBgmVolume, BGM_VOLUME_CHANGE_EVENT } from './utils/audioSettings'
import './App.css'

const JIANGYONG_BGM = '/audio/jiangyong_bgm.mp3'
const JIANGYONG_INTRO_BG = '/assets/FirstLevel/jiangyong_intro_bg.png'

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
  const [glyphToast, setGlyphToast] = useState<GlyphToastState | null>(null)
  const glyphToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [gameSessionKey, setGameSessionKey] = useState(0)
  const [currentScene, setCurrentScene] = useState<SceneId>(
    JIANGYONG_VILLAGE_SCENE_ID,
  )

  // ========== 全局背景音乐：女书长卷 ==========
  // 江永村流程（MainMenu/Prologue/TitleCard/Chapter1）播放，女红房/坐歌堂暂停
  const bgmRef = useRef<HTMLAudioElement | null>(null)

  const showGlyphToast = useCallback((payload: GlobalGlyphToastPayload) => {
    if (payload.nushuImages.length === 0) return

    if (glyphToastTimerRef.current) {
      clearTimeout(glyphToastTimerRef.current)
    }
    setGlyphToast({
      label: payload.label ?? payload.nushuImages.join('·'),
      nushuImages: payload.nushuImages,
    })
    glyphToastTimerRef.current = setTimeout(() => {
      setGlyphToast(null)
      glyphToastTimerRef.current = null
    }, 2500)
  }, [])

  const showEntryGlyphToast = useCallback(
    (entryIds: readonly string[]) => {
      const unlockedEntries = entryIds
        .map((entryId) => entries.find((entry) => entry.id === entryId))
        .filter((entry): entry is (typeof entries)[number] => Boolean(entry))
      if (unlockedEntries.length === 0) return

      showGlyphToast({
        label: unlockedEntries.map((entry) => entry.label).join('·'),
        nushuImages: unlockedEntries.flatMap((entry) => [...entry.nushuImages]),
      })
    },
    [showGlyphToast],
  )

  useEffect(
    () => () => {
      if (glyphToastTimerRef.current) clearTimeout(glyphToastTimerRef.current)
    },
    [],
  )

  // 创建 Audio 实例 + 用户交互触发播放（绕过浏览器自动播放限制）
  useEffect(() => {
    const audio = new Audio(JIANGYONG_BGM)
    audio.loop = true
    const initialVol = getBgmVolume()
    audio.volume = initialVol
    audio.muted = initialVol === 0
    bgmRef.current = audio

    // 监听从 SettingsModal 发出的音量变更事件，实时调整音量
    const onBgmVolumeChange = () => {
      const vol = getBgmVolume()
      audio.volume = vol
      audio.muted = vol === 0
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
      const vol = getBgmVolume()
      audio.volume = vol
      audio.muted = vol === 0
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
  const [resumeClueIds, setResumeClueIds] = useState<string[]>([])
  const [resumeTutorialDone, setResumeTutorialDone] = useState(false)
  const [resumeSceneSwitcherUnlocked, setResumeSceneSwitcherUnlocked] =
    useState(false)
  const [villageProgress, setVillageProgress] = useState<ProgressStage>(
    ProgressStage.NOT_STARTED,
  )
  const [sceneSwitcherUnlocked, setSceneSwitcherUnlocked] = useState(false)
  /** Chapter1 组件实时回调的线索 ID，供存档操作使用 */
  const latestClueIdsRef = useRef<string[]>([])
  /** Chapter1 组件实时回调的教程完成状态，供存档操作使用 */
  const latestTutorialDoneRef = useRef(false)
  const latestSceneSwitcherUnlockedRef = useRef(false)

  const handleClueIdsChange = (ids: string[]) => {
    latestClueIdsRef.current = ids
  }

  const handleTutorialDone = () => {
    latestTutorialDoneRef.current = true
  }

  const handleSceneSwitcherUnlocked = () => {
    latestSceneSwitcherUnlockedRef.current = true
    setSceneSwitcherUnlocked(true)
  }

  const shouldShowSceneSwitcher =
    currentScene !== JIANGYONG_VILLAGE_SCENE_ID ||
    (phase === 'chapter1' && sceneSwitcherUnlocked)

  const restoreVillageProgress = () => {
    const save = loadGame()
    if (!save) return

    setResumeProgress(save.progress)
    setResumeClueIds(save.clueFoundIds || [])
    setResumeTutorialDone(save.tutorialDone || false)
    const restoredSceneSwitcherUnlocked = Boolean(
      save.sceneSwitcherUnlocked ||
        save.progress >= ProgressStage.MATCH_Q3 ||
        (save.currentScene &&
          save.currentScene !== JIANGYONG_VILLAGE_SCENE_ID),
    )
    setResumeSceneSwitcherUnlocked(restoredSceneSwitcherUnlocked)
    setSceneSwitcherUnlocked(restoredSceneSwitcherUnlocked)
    latestSceneSwitcherUnlockedRef.current = restoredSceneSwitcherUnlocked
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
      // 离开江永村前往其他场景时，同时记录目标场景、线索进度和教程状态
      saveGame({
        phase: 'chapter1',
        progress: villageProgress,
        savedAt: Date.now(),
        currentScene: sceneId,
        clueFoundIds: [...latestClueIdsRef.current],
        tutorialDone: latestTutorialDoneRef.current,
        sceneSwitcherUnlocked: latestSceneSwitcherUnlockedRef.current,
      })
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
    setResumeClueIds([])
    setResumeTutorialDone(false)
    setResumeSceneSwitcherUnlocked(false)
    setVillageProgress(ProgressStage.NOT_STARTED)
    setSceneSwitcherUnlocked(false)
    latestClueIdsRef.current = []
    latestTutorialDoneRef.current = false
    latestSceneSwitcherUnlockedRef.current = false
    setGameSessionKey((current) => current + 1)
  }

  const resetProgress = () => {
    resetAllProgress()
  }

  const returnToMainMenu = () => {
    dictionary.closeDictionary()
    // 从任意场景返回主菜单时都保存进度（包括当前所在场景、线索和教程状态）
    saveGame({
      phase: 'chapter1',
      progress: villageProgress,
      savedAt: Date.now(),
      currentScene: currentScene,
      clueFoundIds: [...latestClueIdsRef.current],
      tutorialDone: latestTutorialDoneRef.current,
      sceneSwitcherUnlocked: latestSceneSwitcherUnlockedRef.current,
    })
    setCurrentScene(JIANGYONG_VILLAGE_SCENE_ID)
    setPhase('menu')
  }

  // ─── 故事模式事件处理（用户原有逻辑） ───

  /** 新游戏：清除旧存档，从序章开始 */
  const handleStartGame = () => {
    resetAllProgress()
    setPhase('prologue')
  }

  /** 继续游戏：读取存档并恢复到对应场景 */
  const handleContinueGame = () => {
    const save = loadGame()
    if (!save) return

    // 读取存档中记录的场景，兼容旧存档（无 currentScene 则默认江永村）
    const targetScene = (save.currentScene || JIANGYONG_VILLAGE_SCENE_ID) as SceneId

    setCurrentScene(targetScene)
    setResumeProgress(save.progress)
    setResumeClueIds(save.clueFoundIds || [])
    setResumeTutorialDone(save.tutorialDone || false)
    const restoredSceneSwitcherUnlocked = Boolean(
      save.sceneSwitcherUnlocked ||
        save.progress >= ProgressStage.MATCH_Q3 ||
        targetScene !== JIANGYONG_VILLAGE_SCENE_ID,
    )
    setResumeSceneSwitcherUnlocked(restoredSceneSwitcherUnlocked)
    setSceneSwitcherUnlocked(restoredSceneSwitcherUnlocked)
    latestSceneSwitcherUnlockedRef.current = restoredSceneSwitcherUnlocked
    setVillageProgress(save.progress)

    if (targetScene === JIANGYONG_VILLAGE_SCENE_ID) {
      // 江永村主线：需要恢复 phase 以进入对应剧情阶段
      setPhase(save.phase === 'chapter1' ? 'chapter1' : (save.phase as GamePhase))
    } else {
      // 其他场景（女红房/坐歌堂/深宵）：phase 设为 chapter1，
      // 以便后续通过场景切换器回到江永村时能正确加载 Chapter1 组件
      setPhase('chapter1')
      // 其他场景通过 SaveSystem（女红房/坐歌堂）或自身 React 状态（ChapterNight）管理进度
    }
  }

  /** 从游戏中离开 → 存档并返回主菜单 */
  const handleLeaveGame = (progress: ProgressStage) => {
    saveGame({
      phase: 'chapter1',
      progress,
      savedAt: Date.now(),
      currentScene: JIANGYONG_VILLAGE_SCENE_ID,
      clueFoundIds: [...latestClueIdsRef.current],
      tutorialDone: latestTutorialDoneRef.current,
      sceneSwitcherUnlocked: latestSceneSwitcherUnlockedRef.current,
    })
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
          backgroundImage={JIANGYONG_INTRO_BG}
          onContinue={() => setPhase('chapter1')}
        />
      )}
      {phase === 'chapter1' && (
        <Chapter1
          resumeProgress={resumeProgress}
          resumeClueIds={resumeClueIds}
          resumeTutorialDone={resumeTutorialDone}
          resumeSceneSwitcherUnlocked={resumeSceneSwitcherUnlocked}
          isDictionaryOpen={dictionary.isDictionaryOpen}
          openDictionary={dictionary.openDictionary}
          closeDictionary={dictionary.closeDictionary}
          unlockEntry={dictionary.unlockEntry}
          placedSlots={dictionary.placedSlots as Record<string, string>}
          onLeave={handleLeaveGame}
          onProgressChange={setVillageProgress}
          onClueIdsChange={handleClueIdsChange}
          onTutorialDone={handleTutorialDone}
          onSceneSwitcherUnlocked={handleSceneSwitcherUnlocked}
          onShowGlyphToast={showEntryGlyphToast}
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
            closeDictionary={dictionary.closeDictionary}
            unlockEntry={dictionary.unlockEntry}
            showGlyphToast={showGlyphToast}
            onReturnToMenu={returnToMainMenu}
          />
        )
      case 'singing-hall':
        return (
          <SingingHall
            key={`singing-${gameSessionKey}`}
            isDictionaryOpen={dictionary.isDictionaryOpen}
            openDictionary={dictionary.openDictionary}
            closeDictionary={dictionary.closeDictionary}
            unlockEntry={dictionary.unlockEntry}
            showGlyphToast={showGlyphToast}
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
            closeDictionary={dictionary.closeDictionary}
            unlockEntry={dictionary.unlockEntry}
            unlockedEntryCount={dictionary.unlockedEntryIds.length}
            placedSlots={dictionary.placedSlots as Record<string, string>}
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
        highlightAllEmptySlots={
          currentScene !== JIANGYONG_VILLAGE_SCENE_ID || sceneSwitcherUnlocked
        }
        onClose={dictionary.closeDictionary}
        onCloseClue={dictionary.closeClue}
        onDismissGuide={dictionary.dismissGuide}
        onOpenClue={dictionary.openClue}
        onSelectEntry={dictionary.selectEntry}
        onPlaceEntryToSlot={dictionary.placeEntryToSlot}
      />
      <GlyphToast toast={glyphToast} />
    </div>
  )
}

export default App
