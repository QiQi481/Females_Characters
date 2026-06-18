import { useState, useRef, useEffect } from 'react'
import TitleCard from '../TitleCard/TitleCard'
import RainPhaserOverlay from './RainPhaserOverlay'
import './ChapterNight.css'

const MOVE_SPEED = 500
const SCENE_SCALE = 1.8
const SCENE_IMG = '/assets/FirstLevel/mainscene.png'

interface ChapterNightProps {
  onReturnToMenu: () => void
  isDictionaryOpen: boolean
  openDictionary: () => void
  unlockEntry: (entryId: string) => void
  unlockedEntryCount: number
}

function ChapterNight({ onReturnToMenu, isDictionaryOpen, openDictionary, unlockEntry: _unlockEntry, unlockedEntryCount }: ChapterNightProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const playerWorldRef = useRef({ x: 0, y: 0 })
  const cameraRef = useRef({ x: 0, y: 0 })
  const [playerScreenDelta, setPlayerScreenDelta] = useState({ dx: 0, dy: 0 })
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const [imgReady, setImgReady] = useState(false)
  const [titleDone, setTitleDone] = useState(false)
  const keysRef = useRef<Set<string>>(new Set())
  const animRef = useRef<number>(0)
  const vpRef = useRef({ w: window.innerWidth, h: window.innerHeight })

  // 深夜阿禾对话
  const [nightDialogueStep, setNightDialogueStep] = useState(-1) // -1=不活跃, 0..n=对话步数
  const nightDialogueLinesRef = useRef<string[]>([])
  const [showRain, setShowRain] = useState(false)

  // titleCard 结束后触发阿禾对话
  useEffect(() => {
    if (!titleDone) return
    const lines =
      unlockedEntryCount < 5
        ? ['夜已深了，还有一些词语没有破解，让我们继续加油吧']
        : [
            '已经到深夜了呢，今天真是辛苦您了，可惜我们还剩下两个字没有解开',
            '下雨了呢，淅淅沥沥的',
            '我还是想不出来',
            '千言写尽犹余半，千万句语言写到最后仍然不能写完',
            '留与XX作XX，留至什么，当作什么呢？',
            '你有答案了吗？',
          ]
    nightDialogueLinesRef.current = lines
    setNightDialogueStep(0)
  }, [titleDone, unlockedEntryCount])

  // 雨声先导延迟标记（防止延迟期间误触跳过）
  const rainDelayRef = useRef(false)

  // 阿禾说完第一条对话后开始下雨 + 1.5s 雨声先导
  const advanceNightDialogue = () => {
    if (nightDialogueStep < 0) return
    if (rainDelayRef.current) return // 雨声先导期间阻塞输入

    // 完整对话中，推进第一条后先播雨声，延迟再出阿禾的话
    if (nightDialogueStep === 0 && nightDialogueLinesRef.current.length > 1 && !showRain) {
      setShowRain(true)
      rainDelayRef.current = true
      setNightDialogueStep(-1) // 暂时隐藏对话框
      setTimeout(() => {
        rainDelayRef.current = false
        setNightDialogueStep(1) // 1.5s 后展示"下雨了呢，淅淅沥沥的"
      }, 1500)
      return
    }

    setNightDialogueStep((prev) => {
      if (prev < 0) return prev
      if (prev + 1 >= nightDialogueLinesRef.current.length) return -1
      return prev + 1
    })
  }

  const isNightDialogueActive = nightDialogueStep >= 0

  // 预加载图片
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })
      setImgReady(true)
    }
    img.src = SCENE_IMG
    return () => { img.onload = null }
  }, [])

  const sceneW = imgNatural.w * SCENE_SCALE
  const sceneH = imgNatural.h * SCENE_SCALE
  const maxX = Math.max(0, sceneW - vpRef.current.w)
  const maxY = Math.max(0, sceneH - vpRef.current.h)

  // 键盘监听
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isDictionaryOpen || !titleDone || isNightDialogueActive) return
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(k)) {
        e.preventDefault()
        keysRef.current.add(k)
      }
    }
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(k)) {
        keysRef.current.delete(k)
        if (k === 'a') keysRef.current.delete('a')
        if (k === 'd') keysRef.current.delete('d')
        if (k === 'w') keysRef.current.delete('w')
        if (k === 's') keysRef.current.delete('s')
      }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [isDictionaryOpen, titleDone, isNightDialogueActive])

  useEffect(() => {
    if (isDictionaryOpen) keysRef.current.clear()
  }, [isDictionaryOpen])

  // HUD 按键（Tab 词典 / E 交互 / Q 关闭）
  useEffect(() => {
    const handleHudKeyDown = (event: KeyboardEvent) => {
      if (isDictionaryOpen || !titleDone) return

      // 深夜对话中：E 推进对话
      if (isNightDialogueActive) {
        if (event.key === 'e' || event.key === 'E') {
          event.preventDefault()
          advanceNightDialogue()
        }
        return
      }

      // Tab — 打开词典
      if (event.key === 'Tab') {
        event.preventDefault()
        openDictionary()
        return
      }

      // Q / ESC — 暂无弹窗可关闭，预留
      if (event.key === 'Escape' || event.key.toLowerCase() === 'q') {
        event.preventDefault()
        return
      }

      // E — 交互（暂无可交互物品，预留）
      if (event.key === 'e' || event.key === 'E') {
        event.preventDefault()
        return
      }
    }

    window.addEventListener('keydown', handleHudKeyDown)
    return () => window.removeEventListener('keydown', handleHudKeyDown)
  }, [isDictionaryOpen, titleDone, openDictionary, isNightDialogueActive])

  // 窗口 resize
  useEffect(() => {
    const onResize = () => {
      vpRef.current = { w: window.innerWidth, h: window.innerHeight }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 动画帧 — WASD 平移
  useEffect(() => {
    if (!imgReady || isDictionaryOpen || !titleDone || isNightDialogueActive) return

    let lastTime = performance.now()
    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v))

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now

      let dx = 0, dy = 0
      const keys = keysRef.current
      if (keys.has('a')) dx -= 1
      if (keys.has('d')) dx += 1
      if (keys.has('w')) dy -= 1
      if (keys.has('s')) dy += 1

      if (dx !== 0 && dy !== 0) {
        dx /= Math.SQRT2
        dy /= Math.SQRT2
      }

      const speed = MOVE_SPEED * dt
      const halfW = vpRef.current.w / 2
      const halfH = vpRef.current.h / 2

      playerWorldRef.current.x += dx * speed
      playerWorldRef.current.y += dy * speed

      const camX = clamp(playerWorldRef.current.x, halfW, sceneW - halfW)
      const camY = clamp(playerWorldRef.current.y, halfH, sceneH - halfH)
      cameraRef.current = { x: camX, y: camY }

      setOffset({ x: camX - halfW, y: camY - halfH })

      let screenDx = playerWorldRef.current.x - camX
      let screenDy = playerWorldRef.current.y - camY

      const maxDx = halfW - 20
      const maxDy = halfH - 20
      screenDx = clamp(screenDx, -maxDx, maxDx)
      screenDy = clamp(screenDy, -maxDy, maxDy)

      if (playerWorldRef.current.x - camX !== screenDx) {
        playerWorldRef.current.x = camX + screenDx
      }
      if (playerWorldRef.current.y - camY !== screenDy) {
        playerWorldRef.current.y = camY + screenDy
      }

      setPlayerScreenDelta({ dx: screenDx, dy: screenDy })
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [imgReady, maxX, maxY, isDictionaryOpen, titleDone, sceneW, sceneH, isNightDialogueActive])

  // 初始位置：画面右下角
  useEffect(() => {
    if (!imgReady) return
    const hw = vpRef.current.w / 2
    const hh = vpRef.current.h / 2
    cameraRef.current = { x: maxX + hw, y: maxY + hh }
    playerWorldRef.current = { x: cameraRef.current.x, y: cameraRef.current.y }
    setOffset({ x: maxX, y: maxY })
    setPlayerScreenDelta({ dx: 0, dy: 0 })
  }, [imgReady, maxX, maxY])

  const handleTitleContinue = () => setTitleDone(true)

  return (
    <div className="chapter-night">
      {/* 报幕卡片 */}
      {!titleDone && (
        <TitleCard
          title="江永村：深宵"
          subtitle="夜色笼罩的江永村，似乎隐藏着结局的线索"
          onContinue={handleTitleContinue}
        />
      )}

      {/* 加载中 */}
      {!imgReady && (
        <div className="chapter-night-loading">
          <p>场景加载中…</p>
        </div>
      )}

      {/* 场景 */}
      {imgReady && titleDone && (
        <div
          className="chapter-night-scene"
          style={{
            width: sceneW,
            height: sceneH,
            transform: `translate(${-offset.x}px, ${-offset.y}px)`,
          }}
        >
          <img
            src={SCENE_IMG}
            alt="江永村夜景"
            className="chapter-night-bg"
            draggable={false}
          />
        </div>
      )}

      {/* 黑夜滤镜遮罩 */}
      {imgReady && titleDone && (
        <div className="chapter-night-overlay" />
      )}

      {/* 雨滴效果 — Phaser WebGL 渲染，阿禾说完第一条对话后渐入 */}
      <RainPhaserOverlay active={showRain} />

      {/* 词典按钮 */}
      {titleDone && (
        <button
          className="chapter-night-dictionary-btn"
          type="button"
          aria-label="打开词典"
          onClick={openDictionary}
        >
          <img src="/assets/ui/open_book_icon.png" alt="" />
          <span>词典</span>
        </button>
      )}

      {/* 操作提示 */}
      {titleDone && (
        <div className="chapter-night-hint">
          WASD 移动 | E 交互 | Q/ESC 关闭 | Tab 词典
        </div>
      )}

      {/* 返回主菜单按钮 */}
      {titleDone && (
        <button
          className="chapter-night-return-btn"
          type="button"
          onClick={onReturnToMenu}
        >
          返回主菜单
        </button>
      )}

      {/* 玩家标记点 */}
      {titleDone && (
        <div
          className="chapter-night-player-marker"
          aria-hidden="true"
          style={{
            transform: `translate(calc(-50% + ${playerScreenDelta.dx}px), calc(-50% + ${playerScreenDelta.dy}px))`,
          }}
        />
      )}

      {/* 深夜阿禾对话 */}
      {isNightDialogueActive && (
        <div className="chapter-night-dialog-layer" onClick={advanceNightDialogue}>
          <img
            src="/assets/FirstLevel/ahe-dialogue.png"
            alt="阿禾"
            className="chapter-night-dialog-portrait"
            draggable={false}
          />
          <section
            className="chapter-night-dialog-box"
            role="dialog"
            aria-label="阿禾对话"
          >
            <div className="chapter-night-dialog-name">阿禾</div>
            <p className="chapter-night-dialog-text" key={nightDialogueStep}>
              {nightDialogueLinesRef.current[nightDialogueStep]}
            </p>
          </section>
          <div className="chapter-night-dialog-controls">
            E / 点击继续 | Q / ESC 返回
          </div>
        </div>
      )}
    </div>
  )
}

export default ChapterNight

