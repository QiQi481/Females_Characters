import { useState } from 'react'
import SceneSwitcher from './components/SceneSwitcher'
import { SaveSystem } from './game/systems'
import EmbroideryRoomPhaser from './scenes/EmbroideryRoom/EmbroideryRoomPhaser'
import SingingHall from './scenes/SingingHall'
import { DictionaryOverlay, useDictionary } from './systems/dictionary'
import './App.css'

const SCENE_OPTIONS = [
  { id: 'embroidery-room', label: '女红房' },
  { id: 'singing-hall', label: '坐歌堂' },
] as const

type SceneId = (typeof SCENE_OPTIONS)[number]['id']

function App() {
  const dictionary = useDictionary()
  const [gameSessionKey, setGameSessionKey] = useState(0)
  const [currentScene, setCurrentScene] =
    useState<SceneId>('embroidery-room')

  const changeScene = (sceneId: SceneId) => {
    dictionary.closeDictionary()
    setCurrentScene(sceneId)
  }

  const resetProgress = () => {
    new SaveSystem().reset()
    dictionary.resetDictionary()
    setCurrentScene('embroidery-room')
    setGameSessionKey((current) => current + 1)
  }

  return (
    <div className="app-shell">
      {currentScene === 'embroidery-room' ? (
        <EmbroideryRoomPhaser
          key={`embroidery-${gameSessionKey}`}
          isDictionaryOpen={dictionary.isDictionaryOpen}
          openDictionary={dictionary.openDictionary}
          unlockEntry={dictionary.unlockEntry}
        />
      ) : (
        <SingingHall
          key={`singing-${gameSessionKey}`}
          isDictionaryOpen={dictionary.isDictionaryOpen}
          openDictionary={dictionary.openDictionary}
          unlockEntry={dictionary.unlockEntry}
        />
      )}

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
