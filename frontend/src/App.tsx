import { useState } from 'react'
import MainMenu from './components/MainMenu/MainMenu'
import Prologue from './components/Prologue/Prologue'

type GamePhase = 'menu' | 'prologue' | 'chapter1'

function App() {
  const [phase, setPhase] = useState<GamePhase>('menu')

  return (
    <>
      {phase === 'menu' && (
        <MainMenu
          onStartGame={() => setPhase('prologue')}
          onContinueGame={() => console.log('继续游戏')}
          onSettings={() => {}}
          onAbout={() => {}}
        />
      )}

      {phase === 'prologue' && (
        <Prologue onContinue={() => setPhase('chapter1')} />
      )}

      {phase === 'chapter1' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: "'STKaiti', 'KaiTi', 'SimSun', serif",
          fontSize: '1.5rem',
          color: '#8b4530',
          background: '#e8dcc4',
        }}>
          第一关 — 即将到来
        </div>
      )}
    </>
  )
}

export default App
